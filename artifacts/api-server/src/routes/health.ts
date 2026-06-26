import { Router, type Request, type Response } from "express";
import { checkYtDlp } from "../services/ytdlp.js";
import { checkFfmpeg, getFfmpegVersion } from "../services/ffmpeg.js";
import { existsSync, mkdirSync } from "fs";

const router = Router();

router.get("/api/healthz", (_req: Request, res: Response) => {
  const ytDlpOk = checkYtDlp();
  const ffmpegOk = checkFfmpeg();

  // Ensure tmp dir exists
  const tmpDir = process.env.TMP_DIR || "./tmp";
  if (!existsSync(tmpDir)) {
    try {
      mkdirSync(tmpDir, { recursive: true });
    } catch {
      // ignore
    }
  }
  const tmpDirOk = existsSync(tmpDir);

  const allOk = ytDlpOk && ffmpegOk && tmpDirOk;

  res.json({
    status: allOk ? "ok" : "degraded",
    timestamp: new Date().toISOString(),
    version: "1.0.0",
    uptime: process.uptime(),
    checks: {
      "yt-dlp": ytDlpOk,
      ffmpeg: ffmpegOk,
      tmp_dir: tmpDirOk,
    },
  });
});

export default router;
