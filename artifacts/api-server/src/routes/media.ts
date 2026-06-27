import { Router, type Request, type Response } from "express";
import multer from "multer";
import { existsSync, mkdirSync, createReadStream, unlinkSync } from "fs";
import { stat } from "fs/promises";
import { join } from "path";
import { spawn } from "child_process";
import { v4 as uuid } from "uuid";

import {
  getMediaInfo,
  convertMedia,
  checkYtDlp,
} from "../services/ytdlp.js";
import {
  createJob,
  getJob,
  updateJob,
  addSSEClient,
  removeSSEClient,
  sendSSEEvent,
} from "../services/job-manager.js";
import { ConvertRequestSchema, MediaInfoRequestSchema } from "@workspace/api-zod";

const router = Router();

// Ensure temp directory
const TMP_DIR = process.env.TMP_DIR || "./tmp";
if (!existsSync(TMP_DIR)) {
  mkdirSync(TMP_DIR, { recursive: true });
}

// Multer config for file uploads
const MAX_FILE_SIZE = (parseInt(process.env.MAX_FILE_SIZE_MB || "500", 10)) * 1024 * 1024;
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, TMP_DIR);
  },
  filename: (_req, file, cb) => {
    const uniqueName = `${uuid()}-${file.originalname}`;
    cb(null, uniqueName);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE },
});

// ─── GET /api/media/info ─────────────────────────────────────────────────────

router.post("/api/media/info", async (req: Request, res: Response) => {
  try {
    const parsed = MediaInfoRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: "URL invalide",
        details: parsed.error.issues.map((i) => i.message).join("; "),
      });
    }

    const info = await getMediaInfo(parsed.data.url);
    return res.json(info);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erreur inconnue";
    return res.status(500).json({ error: message });
  }
});

// ─── POST /api/media/convert ────────────────────────────────────────────────

router.post("/api/media/convert", async (req: Request, res: Response) => {
  try {
    const parsed = ConvertRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: "Requête invalide",
        details: parsed.error.issues.map((i) => i.message).join("; "),
      });
    }

    const { url, format, quality } = parsed.data;
    const job = createJob(format, quality, url);

    // Start conversion in background (don't await)
    processConversion(job.id, url, format, quality).catch((err) => {
      console.error(`Job ${job.id} failed:`, err);
    });

    return res.status(201).json({
      jobId: job.id,
      status: job.status,
      message: "Conversion démarrée",
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erreur inconnue";
    return res.status(500).json({ error: message });
  }
});

// ─── GET /api/media/progress/:jobId (SSE) ───────────────────────────────────

router.get("/api/media/progress/:jobId", (req: Request, res: Response) => {
  const { jobId } = req.params;
  const job = getJob(jobId);

  if (!job) {
    return res.status(404).json({ error: "Job non trouvé" });
  }

  // SSE headers
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
  });

  // Send initial state
  res.write(
    `event: info\ndata: ${JSON.stringify({ message: "Connexion établie", status: job.status, progress: job.progress })}\n\n`
  );

  const clientId = uuid();
  addSSEClient(jobId, { id: clientId, res });

  // If job is already completed, send complete event immediately
  if (job.status === "completed") {
    sendSSEEvent(jobId, "complete", {
      fileName: job.fileName,
      fileSize: job.fileSize,
      percent: 100,
    });
  } else if (job.status === "failed") {
    sendSSEEvent(jobId, "error", {
      message: job.error || "Échec de la conversion",
    });
  }

  // Cleanup on client disconnect
  req.on("close", () => {
    removeSSEClient(jobId, clientId);
  });
});

// ─── GET /api/media/download/:jobId ─────────────────────────────────────────

router.get("/api/media/download/:jobId", (req: Request, res: Response) => {
  const { jobId } = req.params;
  const job = getJob(jobId);

  if (!job) {
    return res.status(404).json({ error: "Job non trouvé" });
  }

  if (job.status !== "completed" || !job.filePath) {
    return res.status(400).json({ error: "Conversion pas encore terminée" });
  }

  if (!existsSync(job.filePath)) {
    return res.status(404).json({ error: "Fichier non trouvé" });
  }

  const fileName = job.fileName || `download.${job.format}`;
  const sanitized = fileName.replace(/[^\x20-\x7E]/g, "_").replace(/"/g, "'");
  const encoded = encodeURIComponent(fileName).replace(/%20/g, " ");
  res.setHeader("Content-Disposition", `attachment; filename="${sanitized}"; filename*=UTF-8''${encoded}`);
  res.setHeader("Content-Type", "application/octet-stream");

  const stream = createReadStream(job.filePath);
  stream.pipe(res);

  stream.on("end", () => {
    // Clean up the temporary file after download
    if (job.filePath) {
      try {
        unlinkSync(job.filePath);
      } catch {
        // ignore
      }
    }
  });
});

// ─── POST /api/media/upload ─────────────────────────────────────────────────

router.post(
  "/api/media/upload",
  upload.single("file"),
  async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "Aucun fichier fourni" });
      }

      const format = (req.body.format as string) || "mp4";
      const quality = (req.body.quality as string) || "best";

      // Validate format
      if (!["mp4", "mkv", "mp3", "wav"].includes(format)) {
        return res.status(400).json({ error: "Format invalide" });
      }

      const job = createJob(format, quality);
      const filePath = req.file.path;

      // Process local file conversion in background
      processLocalFileConversion(job.id, filePath, format, quality).catch(
        (err) => {
          console.error(`Upload job ${job.id} failed:`, err);
        }
      );

      return res.status(201).json({
        jobId: job.id,
        status: job.status,
        fileName: req.file.originalname,
        message: "Fichier uploadé, conversion démarrée",
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erreur inconnue";
      return res.status(500).json({ error: message });
    }
  }
);

// ─── Background Conversion Logic ────────────────────────────────────────────

async function processConversion(
  jobId: string,
  url: string,
  format: string,
  quality: string
): Promise<void> {
  updateJob(jobId, { status: "processing" });
  sendSSEEvent(jobId, "info", { message: "Démarrage de la conversion..." });

  try {
    const result = await convertMedia({
      url,
      format,
      quality,
      onProgress: (percent, speed, eta) => {
        updateJob(jobId, { progress: percent, speed, eta });
        sendSSEEvent(jobId, "progress", { percent, speed, eta });
      },
    });

    const stats = await getFileSize(result.filePath);

    updateJob(jobId, {
      status: "completed",
      progress: 100,
      fileName: result.fileName,
      filePath: result.filePath,
      fileSize: stats,
    });

    sendSSEEvent(jobId, "complete", {
      fileName: result.fileName,
      fileSize: stats,
      percent: 100,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erreur inconnue";
    updateJob(jobId, { status: "failed", error: message });
    sendSSEEvent(jobId, "error", { message });
  }
}

async function processLocalFileConversion(
  jobId: string,
  filePath: string,
  format: string,
  quality: string
): Promise<void> {
  updateJob(jobId, { status: "processing" });
  sendSSEEvent(jobId, "info", { message: "Conversion du fichier local..." });

  try {
    // For local files, use FFmpeg directly
    const outputPath = join(TMP_DIR, `${jobId}.${format}`);

    // Determine ffmpeg arguments based on target format
    const ffmpegArgs = buildFfmpegArgs(filePath, outputPath, format);

    await new Promise<void>((resolve, reject) => {
      const proc = spawn("ffmpeg", ffmpegArgs, { stdio: ["ignore", "pipe", "pipe"] });

      proc.stderr.on("data", (data: Buffer) => {
        const text = data.toString();
        // Parse progress from FFmpeg stderr
        const timeMatch = text.match(/time=(\d+):(\d+):(\d+\.\d+)/);
        if (timeMatch) {
          const totalSec =
            parseInt(timeMatch[1]) * 3600 +
            parseInt(timeMatch[2]) * 60 +
            parseFloat(timeMatch[3]);
          // We can't know total duration easily, so send incremental updates
          sendSSEEvent(jobId, "progress", { message: text.slice(0, 100) });
        }
      });

      proc.on("close", (code) => {
        if (code === 0) resolve();
        else reject(new Error(`FFmpeg exited with code ${code}`));
      });

      proc.on("error", (err) => reject(err));
    });

    const stats = await getFileSize(outputPath);

    updateJob(jobId, {
      status: "completed",
      progress: 100,
      fileName: `converted.${format}`,
      filePath: outputPath,
      fileSize: stats,
    });

    sendSSEEvent(jobId, "complete", {
      fileName: `converted.${format}`,
      fileSize: stats,
      percent: 100,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erreur inconnue";
    updateJob(jobId, { status: "failed", error: message });
    sendSSEEvent(jobId, "error", { message });
  }
}

function buildFfmpegArgs(input: string, output: string, format: string): string[] {
  const args = ["-i", input];

  switch (format) {
    case "mp3":
      args.push("-vn", "-acodec", "libmp3lame", "-q:a", "2");
      break;
    case "wav":
      args.push("-vn", "-acodec", "pcm_s16le");
      break;
    case "mkv":
      args.push("-c:v", "libx264", "-preset", "medium", "-c:a", "aac");
      break;
    case "mp4":
    default:
      args.push("-c:v", "libx264", "-preset", "medium", "-c:a", "aac");
      break;
  }

  args.push("-y", output);
  return args;
}

async function getFileSize(filePath: string): Promise<number> {
  const stats = await stat(filePath);
  return stats.size;
}

export default router;
