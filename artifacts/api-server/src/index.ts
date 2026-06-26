import express from "express";
import cors from "cors";
import healthRouter from "./routes/health.js";
import mediaRouter from "./routes/media.js";
import { checkYtDlp } from "./services/ytdlp.js";
import { checkFfmpeg } from "./services/ffmpeg.js";

const app = express();
const PORT = parseInt(process.env.PORT || "3000", 10);

// ─── Middleware ──────────────────────────────────────────────────────────────

app.use(cors());
app.use(express.json({ limit: "10mb" }));

// ─── Routes ─────────────────────────────────────────────────────────────────

app.use(healthRouter);
app.use(mediaRouter);

// ─── 404 Handler ─────────────────────────────────────────────────────────────

app.use((_req, res) => {
  res.status(404).json({ error: "Route non trouvée" });
});

// ─── Error Handler ───────────────────────────────────────────────────────────

app.use(
  (
    err: Error,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction
  ) => {
    console.error("Unhandled error:", err);
    res.status(500).json({ error: "Erreur interne du serveur" });
  }
);

// ─── Start ───────────────────────────────────────────────────────────────────

async function main() {
  // Check prerequisites on startup
  const ytDlpOk = checkYtDlp();
  const ffmpegOk = checkFfmpeg();

  console.log("╔══════════════════════════════════════════╗");
  console.log("║        NEXUS CONVERTER - API SERVER       ║");
  console.log("╚══════════════════════════════════════════╝");
  console.log(`  Port:        ${PORT}`);
  console.log(`  yt-dlp:      ${ytDlpOk ? "✅" : "❌"}`);
  console.log(`  FFmpeg:      ${ffmpegOk ? "✅" : "❌"}`);
  console.log(`  TMP_DIR:     ${process.env.TMP_DIR || "./tmp"}`);
  console.log(`  Node.js:     ${process.version}`);
  console.log("────────────────────────────────────────────");

  if (!ytDlpOk) {
    console.warn("  ⚠️  yt-dlp n'est pas installé. Installez-le avec: pip install yt-dlp");
  }
  if (!ffmpegOk) {
    console.warn("  ⚠️  FFmpeg n'est pas installé. https://ffmpeg.org/download.html");
  }

  app.listen(PORT, () => {
    console.log(`  🚀 Serveur démarré sur http://localhost:${PORT}`);
    console.log(`  📋 Health: http://localhost:${PORT}/api/healthz`);
    console.log("────────────────────────────────────────────");
  });
}

main().catch(console.error);

export default app;
