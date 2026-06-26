import { spawnSync } from "child_process";

let _ffmpegPath = "ffmpeg";

export function setFfmpegPath(path: string): void {
  _ffmpegPath = path;
}

/**
 * Check if FFmpeg is available
 */
export function checkFfmpeg(): boolean {
  try {
    const result = spawnSync(_ffmpegPath, ["-version"], { stdio: "pipe" });
    return result.status === 0;
  } catch {
    return false;
  }
}

/**
 * Get FFmpeg version string
 */
export function getFfmpegVersion(): string | null {
  try {
    const result = spawnSync(_ffmpegPath, ["-version"], { stdio: "pipe" });
    if (result.status === 0) {
      const firstLine = result.stdout.toString().split("\n")[0];
      return firstLine;
    }
    return null;
  } catch {
    return null;
  }
}
