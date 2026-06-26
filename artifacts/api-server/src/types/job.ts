import type { Response } from "express";

export type JobStatus = "queued" | "processing" | "completed" | "failed";

export interface Job {
  id: string;
  status: JobStatus;
  url?: string;
  format: string;
  quality: string;
  fileName?: string;
  filePath?: string;
  fileSize?: number;
  error?: string;
  progress: number;
  speed?: string;
  eta?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface SSEClient {
  id: string;
  res: Response;
}
