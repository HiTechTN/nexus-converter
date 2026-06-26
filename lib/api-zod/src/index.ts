import { z } from "zod";

// ─── Common ──────────────────────────────────────────────────────────────────

export const FormatEnum = z.enum(["mp4", "mkv", "mp3", "wav"]);
export type Format = z.infer<typeof FormatEnum>;

export const QualityEnum = z.enum(["480p", "720p", "1080p", "4k", "best"]);
export type Quality = z.infer<typeof QualityEnum>;

export const JobStatusEnum = z.enum(["queued", "processing", "completed", "failed"]);
export type JobStatus = z.infer<typeof JobStatusEnum>;

// ─── Health ──────────────────────────────────────────────────────────────────

export const HealthResponseSchema = z.object({
  status: z.enum(["ok", "degraded"]),
  timestamp: z.string().datetime(),
  version: z.string().optional(),
  uptime: z.number().optional(),
  checks: z
    .object({
      "yt-dlp": z.boolean().optional(),
      ffmpeg: z.boolean().optional(),
      tmp_dir: z.boolean().optional(),
    })
    .optional(),
});
export type HealthResponse = z.infer<typeof HealthResponseSchema>;

// ─── Media Info ──────────────────────────────────────────────────────────────

export const MediaInfoRequestSchema = z.object({
  url: z.string().url(),
});
export type MediaInfoRequest = z.infer<typeof MediaInfoRequestSchema>;

export const FormatInfoSchema = z.object({
  format_id: z.string().optional(),
  ext: z.string().optional(),
  resolution: z.string().optional(),
  filesize: z.number().optional(),
  format_note: z.string().optional(),
  vcodec: z.string().optional(),
  acodec: z.string().optional(),
  fps: z.number().optional(),
});
export type FormatInfo = z.infer<typeof FormatInfoSchema>;

export const MediaInfoResponseSchema = z.object({
  title: z.string(),
  url: z.string().url(),
  duration: z.number(),
  thumbnail: z.string().url().optional(),
  formats: z.array(FormatInfoSchema),
  webpage_url: z.string().url().optional(),
});
export type MediaInfoResponse = z.infer<typeof MediaInfoResponseSchema>;

// ─── Convert ─────────────────────────────────────────────────────────────────

export const ConvertRequestSchema = z.object({
  url: z.string().url(),
  format: FormatEnum,
  quality: QualityEnum.default("best"),
});
export type ConvertRequest = z.infer<typeof ConvertRequestSchema>;

export const ConvertResponseSchema = z.object({
  jobId: z.string().uuid(),
  status: JobStatusEnum,
  fileName: z.string().optional(),
  message: z.string().optional(),
});
export type ConvertResponse = z.infer<typeof ConvertResponseSchema>;

// ─── SSE Event ───────────────────────────────────────────────────────────────

export const SSEEventTypeEnum = z.enum(["progress", "complete", "error", "info"]);
export type SSEEventType = z.infer<typeof SSEEventTypeEnum>;

export const SSEProgressDataSchema = z.object({
  percent: z.number().min(0).max(100).optional(),
  speed: z.string().optional(),
  eta: z.number().optional(),
  message: z.string().optional(),
  fileName: z.string().optional(),
  fileSize: z.number().optional(),
});
export type SSEProgressData = z.infer<typeof SSEProgressDataSchema>;

export const SSEEventSchema = z.object({
  event: SSEEventTypeEnum,
  data: SSEProgressDataSchema,
});
export type SSEEvent = z.infer<typeof SSEEventSchema>;

// ─── Error ───────────────────────────────────────────────────────────────────

export const ErrorResponseSchema = z.object({
  error: z.string(),
  code: z.string().optional(),
  details: z.string().optional(),
});
export type ErrorResponse = z.infer<typeof ErrorResponseSchema>;

// ─── Upload ──────────────────────────────────────────────────────────────────

export const UploadRequestSchema = z.object({
  format: FormatEnum,
  quality: QualityEnum.default("best"),
});
export type UploadRequest = z.infer<typeof UploadRequestSchema>;
