import { spawn, spawnSync } from "child_process";
import { existsSync } from "fs";
import { mkdtemp } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";

/**
 * Find yt-dlp binary path
 */
function findYtDlp(): string {
  const envPath = process.env.YTDLP_PATH;
  if (envPath && existsSync(envPath)) return envPath;

  // Common locations
  const candidates = ["yt-dlp", "/usr/local/bin/yt-dlp", "/usr/bin/yt-dlp"];
  for (const candidate of candidates) {
    try {
      const result = spawnSync(candidate, ["--version"], { stdio: "pipe" });
      if (result.status === 0) return candidate;
    } catch {
      continue;
    }
  }
  return "yt-dlp"; // fallback
}

const YTDLP_BIN = findYtDlp();

export interface MediaInfo {
  title: string;
  url: string;
  duration: number;
  thumbnail?: string;
  formats: Array<{
    format_id: string;
    ext: string;
    resolution?: string;
    filesize?: number;
    format_note?: string;
    vcodec?: string;
    acodec?: string;
    fps?: number;
  }>;
  webpage_url?: string;
}

/**
 * Get media info from a URL
 */
export async function getMediaInfo(url: string): Promise<MediaInfo> {
  return new Promise((resolve, reject) => {
    const args = [
      "--dump-json",
      "--no-playlist",
      "--flat",
      url,
    ];

    const proc = spawn(YTDLP_BIN, args, {
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";

    proc.stdout.on("data", (data: Buffer) => {
      stdout += data.toString();
    });

    proc.stderr.on("data", (data: Buffer) => {
      stderr += data.toString();
    });

    proc.on("close", (code) => {
      if (code !== 0) {
        return reject(new Error(stderr || `yt-dlp exited with code ${code}`));
      }
      try {
        const parsed = JSON.parse(stdout.split("\n")[0]);
        resolve({
          title: parsed.title || parsed.fulltitle || "Untitled",
          url: parsed.webpage_url || url,
          duration: parsed.duration || 0,
          thumbnail: parsed.thumbnail,
          formats: (parsed.formats || []).map((f: Record<string, unknown>) => ({
            format_id: String(f.format_id || ""),
            ext: String(f.ext || ""),
            resolution: f.resolution ? String(f.resolution) : undefined,
            filesize: f.filesize ? Number(f.filesize) : undefined,
            format_note: f.format_note ? String(f.format_note) : undefined,
            vcodec: f.vcodec ? String(f.vcodec) : undefined,
            acodec: f.acodec ? String(f.acodec) : undefined,
            fps: f.fps ? Number(f.fps) : undefined,
          })),
          webpage_url: parsed.webpage_url,
        });
      } catch (e) {
        reject(new Error("Failed to parse yt-dlp output"));
      }
    });

    proc.on("error", (err) => {
      reject(new Error(`yt-dlp not found: ${err.message}`));
    });
  });
}

export interface ConvertOptions {
  url: string;
  format: string;
  quality: string;
  onProgress?: (percent: number, speed?: string, eta?: number) => void;
}

/**
 * Download and convert media using yt-dlp + FFmpeg
 * Returns the path to the output file
 */
export async function convertMedia(
  options: ConvertOptions
): Promise<{ filePath: string; fileName: string }> {
  const tmpDir = await mkdtemp(join(tmpdir(), "nexus-converter-"));
  const outputTemplate = join(tmpDir, "%(title)s.%(ext)s");

  const formatMap: Record<string, string> = {
    mp4: "bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best",
    mkv: "bestvideo+bestaudio/best",
    mp3: "bestaudio/best",
    wav: "bestaudio/best",
  };

  const formatOpt = formatMap[options.format] || formatMap.mp4;

  const args = [
    "--no-playlist",
    "--print", "filename",
    "-o", outputTemplate,
    "-f", formatOpt,
    ...(options.format === "mp3" || options.format === "wav"
      ? ["-x", "--audio-format", options.format]
      : ["--merge-output-format", options.format]),
    options.url,
  ];

  return new Promise((resolve, reject) => {
    const proc = spawn(YTDLP_BIN, args, {
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stderr = "";
    let outputFile = "";

    proc.stdout.on("data", (data: Buffer) => {
      const line = data.toString().trim();
      if (line && !line.startsWith("[")) {
        outputFile = line;
      }
    });

    proc.stderr.on("data", (data: Buffer) => {
      stderr += data.toString();
      // Parse progress from yt-dlp stderr output
      const text = data.toString();
      const progressMatch = text.match(/(\d+\.?\d*)%/);
      if (progressMatch && options.onProgress) {
        const percent = parseFloat(progressMatch[1]);
        const speedMatch = text.match(/at\s+([\d.]+[KMG]?i?B\/s)/);
        const etaMatch = text.match(/ETA\s+(\d+):(\d+)/);
        const speed = speedMatch ? speedMatch[1] : undefined;
        const eta = etaMatch
          ? parseInt(etaMatch[1]) * 60 + parseInt(etaMatch[2])
          : undefined;
        options.onProgress(percent, speed, eta);
      }
    });

    proc.on("close", (code) => {
      if (code !== 0) {
        return reject(
          new Error(stderr || `yt-dlp exited with code ${code}`)
        );
      }
      if (!outputFile) {
        return reject(new Error("Could not determine output file path"));
      }

      const fileName = outputFile.split("/").pop() || "output." + options.format;
      resolve({ filePath: outputFile, fileName });
    });

    proc.on("error", (err) => {
      reject(new Error(`yt-dlp not found: ${err.message}`));
    });
  });
}

/**
 * Check if yt-dlp is available
 */
export function checkYtDlp(): boolean {
  try {
    const result = spawnSync(YTDLP_BIN, ["--version"], { stdio: "pipe" });
    return result.status === 0;
  } catch {
    return false;
  }
}
