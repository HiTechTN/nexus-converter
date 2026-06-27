import { spawnSync } from "child_process";
import { existsSync } from "fs";

function findFfmpeg(): string {
  const envPath = process.env.FFMPEG_PATH;
  if (envPath && existsSync(envPath)) return envPath;

  const candidates = ["ffmpeg", "/usr/local/bin/ffmpeg", "/usr/bin/ffmpeg"];
  for (const candidate of candidates) {
    try {
      const result = spawnSync(candidate, ["-version"], { stdio: "pipe" });
      if (result.status === 0) return candidate;
    } catch {
      continue;
    }
  }
  return "ffmpeg";
}

const FFMPEG_BIN = findFfmpeg();

/**
 * Check if FFmpeg is available
 */
export function checkFfmpeg(): boolean {
  try {
    const result = spawnSync(FFMPEG_BIN, ["-version"], { stdio: "pipe" });
    return result.status === 0;
  } catch {
    return false;
  }
}

export function getFfmpegVersion(): string | null {
  try {
    const result = spawnSync(FFMPEG_BIN, ["-version"], { stdio: "pipe" });
    if (result.status === 0) {
      const firstLine = result.stdout.toString().split("\n")[0];
      return firstLine;
    }
    return null;
  } catch {
    return null;
  }
}
