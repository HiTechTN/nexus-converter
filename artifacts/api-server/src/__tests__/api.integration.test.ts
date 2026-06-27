import { describe, it, expect, vi } from "vitest";
import request from "supertest";
import type { Readable } from "stream";
import app from "../app.js";
import { createJob, getJob, updateJob } from "../services/job-manager.js";

// ─── Mock external services ─────────────────────────────────────────────────

vi.mock("../services/ytdlp.js", () => ({
  checkYtDlp: vi.fn(() => true),
  getMediaInfo: vi.fn(async (url: string) => ({
    title: "Test Video",
    url,
    duration: 213,
    thumbnail: "https://example.com/thumb.jpg",
    formats: [
      {
        format_id: "137",
        ext: "mp4",
        resolution: "1920x1080",
        filesize: 102400000,
        format_note: "1080p",
        vcodec: "avc1",
        acodec: "mp4a",
        fps: 30,
      },
      {
        format_id: "140",
        ext: "m4a",
        resolution: undefined,
        filesize: 5120000,
        format_note: "128k",
        vcodec: "none",
        acodec: "mp4a",
        fps: undefined,
      },
    ],
    webpage_url: url,
  })),
  convertMedia: vi.fn(async (options: { format: string }) => ({
    filePath: `/tmp/test-output.${options.format}`,
    fileName: `Test Video.${options.format}`,
  })),
}));

vi.mock("../services/ffmpeg.js", () => ({
  checkFfmpeg: vi.fn(() => true),
  getFfmpegVersion: vi.fn(() => "ffmpeg version 6.0"),
}));

// ─── Tests ──────────────────────────────────────────────────────────────────

describe("API Routes (E2E)", () => {
  // ─── Health ───────────────────────────────────────────────────────────────

  describe("GET /api/healthz", () => {
    it("returns healthy status with all checks", async () => {
      const res = await request(app).get("/api/healthz");

      expect(res.status).toBe(200);
      expect(res.body.status).toBe("ok");
      expect(res.body.checks).toEqual({
        "yt-dlp": true,
        ffmpeg: true,
        tmp_dir: true,
      });
      expect(res.body.version).toBeDefined();
      expect(res.body.uptime).toBeGreaterThan(0);
      expect(res.body.timestamp).toBeDefined();
    });
  });

  // ─── Media Info ───────────────────────────────────────────────────────────

  describe("POST /api/media/info", () => {
    it("returns media info for a valid URL", async () => {
      const res = await request(app)
        .post("/api/media/info")
        .send({ url: "https://www.youtube.com/watch?v=test123" });

      expect(res.status).toBe(200);
      expect(res.body.title).toBe("Test Video");
      expect(res.body.duration).toBe(213);
      expect(res.body.formats).toHaveLength(2);
      expect(res.body.formats[0].format_id).toBe("137");
    });

    it("returns 400 for missing URL", async () => {
      const res = await request(app)
        .post("/api/media/info")
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.error).toBeDefined();
    });

    it("returns 400 for invalid URL format", async () => {
      const res = await request(app)
        .post("/api/media/info")
        .send({ url: "not-a-url" });

      expect(res.status).toBe(400);
      expect(res.body.error).toBeDefined();
    });
  });

  // ─── Convert ──────────────────────────────────────────────────────────────

  describe("POST /api/media/convert", () => {
    it("starts a conversion job and returns 201", async () => {
      const res = await request(app)
        .post("/api/media/convert")
        .send({
          url: "https://www.youtube.com/watch?v=test123",
          format: "mp4",
          quality: "best",
        });

      expect(res.status).toBe(201);
      expect(res.body.jobId).toBeDefined();
      expect(["queued", "processing"]).toContain(res.body.status);
      expect(res.body.message).toBeDefined();
    });

    it("returns 400 for missing required fields", async () => {
      const res = await request(app)
        .post("/api/media/convert")
        .send({ url: "https://example.com" });

      expect(res.status).toBe(400);
      expect(res.body.error).toBeDefined();
    });

    it("returns 400 for invalid format", async () => {
      const res = await request(app)
        .post("/api/media/convert")
        .send({
          url: "https://www.youtube.com/watch?v=test123",
          format: "avi",
          quality: "best",
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBeDefined();
    });
  });

  // ─── SSE Progress ─────────────────────────────────────────────────────────

  describe("GET /api/media/progress/:jobId", () => {
    it("returns 404 for non-existent job", async () => {
      const res = await request(app)
        .get("/api/media/progress/non-existent-id");

      expect(res.status).toBe(404);
      expect(res.body.error).toBe("Job non trouvé");
    });

    it("returns SSE stream for existing job", async () => {
      const job = createJob("mp4", "best", "https://example.com");

      const res = await request(app)
        .get(`/api/media/progress/${job.id}`)
        .buffer(false)
        .parse((res, callback) => {
          const stream = res as unknown as Readable;
          let data = "";
          stream.on("data", (chunk: Buffer) => {
            data += chunk.toString();
            stream.destroy();
          });
          stream.on("end", () => callback(null, data));
        });

      expect(res.status).toBe(200);
      expect(res.headers["content-type"]).toContain("text/event-stream");
    });

    it("sends complete event for completed job", async () => {
      const job = createJob("mp4", "best", "https://example.com");
      updateJob(job.id, {
        status: "completed",
        progress: 100,
        fileName: "test.mp4",
        fileSize: 1024000,
      });

      const res = await request(app)
        .get(`/api/media/progress/${job.id}`)
        .buffer(false)
        .parse((res, callback) => {
          const stream = res as unknown as Readable;
          let data = "";
          stream.on("data", (chunk: Buffer) => {
            data += chunk.toString();
            stream.destroy();
          });
          stream.on("end", () => callback(null, data));
        });

      expect(res.status).toBe(200);
      expect(res.headers["content-type"]).toContain("text/event-stream");
    });
  });

  // ─── Download ─────────────────────────────────────────────────────────────

  describe("GET /api/media/download/:jobId", () => {
    it("returns 404 for non-existent job", async () => {
      const res = await request(app)
        .get("/api/media/download/non-existent-id");

      expect(res.status).toBe(404);
      expect(res.body.error).toBe("Job non trouvé");
    });

    it("returns 400 for incomplete job", async () => {
      const job = createJob("mp4", "best", "https://example.com");

      const res = await request(app)
        .get(`/api/media/download/${job.id}`);

      expect(res.status).toBe(400);
      expect(res.body.error).toBe("Conversion pas encore terminée");
    });

    it("returns 404 for completed job with missing file", async () => {
      const job = createJob("mp4", "best", "https://example.com");
      updateJob(job.id, {
        status: "completed",
        progress: 100,
        fileName: "test.mp4",
        filePath: "/tmp/nonexistent-file.mp4",
      });

      const res = await request(app)
        .get(`/api/media/download/${job.id}`);

      expect(res.status).toBe(404);
      expect(res.body.error).toBe("Fichier non trouvé");
    });
  });

  // ─── 404 Handler ──────────────────────────────────────────────────────────

  describe("Unknown routes", () => {
    it("returns 404 for unknown routes", async () => {
      const res = await request(app)
        .get("/api/nonexistent");

      expect(res.status).toBe(404);
      expect(res.body.error).toBe("Route non trouvée");
    });
  });

  // ─── Upload ───────────────────────────────────────────────────────────────

  describe("POST /api/media/upload", () => {
    it("returns 400 when no file is provided", async () => {
      const res = await request(app)
        .post("/api/media/upload");

      expect(res.status).toBe(400);
      expect(res.body.error).toBe("Aucun fichier fourni");
    });
  });
});
