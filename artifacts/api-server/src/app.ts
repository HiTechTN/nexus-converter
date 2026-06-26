import express from "express";
import cors from "cors";
import healthRouter from "./routes/health.js";
import mediaRouter from "./routes/media.js";

const app = express();

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

export default app;
