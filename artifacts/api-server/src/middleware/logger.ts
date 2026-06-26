import { type Request, type Response, type NextFunction } from "express";

// ─── Color helpers for terminal output ────────────────────────────────────────

const DIM = "\x1b[2m";
const RESET = "\x1b[0m";
const BOLD = "\x1b[1m";
const RED = "\x1b[31m";
const YELLOW = "\x1b[33m";
const GREEN = "\x1b[32m";
const CYAN = "\x1b[36m";
const GRAY = "\x1b[90m";

function statusColor(status: number): string {
  if (status >= 500) return RED;
  if (status >= 400) return YELLOW;
  if (status >= 300) return CYAN;
  return GREEN;
}

function methodColor(method: string): string {
  switch (method) {
    case "GET": return GREEN;
    case "POST": return YELLOW;
    case "PUT":
    case "PATCH": return CYAN;
    case "DELETE": return RED;
    default: return GRAY;
  }
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

// ─── Request Logger Middleware ────────────────────────────────────────────────

export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const start = Date.now();
  const timestamp = new Date().toISOString().slice(11, 23);

  // Capture the original end to intercept response
  const originalEnd = res.end.bind(res);
  res.end = function (this: Response, ...args: Parameters<typeof originalEnd>) {
    const duration = Date.now() - start;
    const status = res.statusCode;
    const color = statusColor(status);
    const mColor = methodColor(req.method);

    // Skip noisy health checks in normal log (only log errors)
    const isHealthCheck = req.path === "/api/healthz";
    if (isHealthCheck && status < 400) {
      return originalEnd(...args);
    }

    // Skip SSE progress polling (very frequent)
    const isProgress = req.path.startsWith("/api/media/progress/");
    if (isProgress && status < 400) {
      return originalEnd(...args);
    }

    const logLine = [
      `${DIM}${timestamp}${RESET}`,
      `${mColor}${BOLD}${req.method}${RESET}`,
      `${req.path}`,
      `${color}${status}${RESET}`,
      `${DIM}${formatDuration(duration)}${RESET}`,
    ].join(" ");

    if (status >= 400) {
      console.error(`  ${logLine}`);
    } else {
      console.log(`  ${logLine}`);
    }

    return originalEnd(...args);
  } as typeof originalEnd;

  next();
}

// ─── Error Logger Middleware ──────────────────────────────────────────────────

export function errorLogger(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  const timestamp = new Date().toISOString().slice(11, 23);

  console.error("");
  console.error(`  ${RED}${BOLD}╔═══ ERROR ═══════════════════════════════════╗${RESET}`);
  console.error(`  ${RED}║${RESET}  ${DIM}${timestamp}${RESET}`);
  console.error(`  ${RED}║${RESET}  ${BOLD}Method:${RESET}  ${req.method}`);
  console.error(`  ${RED}║${RESET}  ${BOLD}Path:${RESET}    ${req.path}`);
  console.error(`  ${RED}║${RESET}  ${BOLD}Error:${RESET}   ${RED}${err.message}${RESET}`);

  if (err.stack) {
    const stackLines = err.stack.split("\n").slice(1, 4);
    for (const line of stackLines) {
      console.error(`  ${RED}║${RESET}  ${DIM}${line.trim()}${RESET}`);
    }
  }

  // Log client disconnects distinctly
  if (err.message?.includes("ECONNRESET") || err.message?.includes("aborted")) {
    console.error(`  ${YELLOW}║${RESET}  ${YELLOW}Client disconnected${RESET}`);
  }

  console.error(`  ${RED}${BOLD}╚═════════════════════════════════════════════╝${RESET}`);
  console.error("");

  // Send structured error response
  if (!res.headersSent) {
    res.status(500).json({
      error: "Erreur interne du serveur",
      ...(process.env.NODE_ENV !== "production" && { message: err.message }),
    });
  }
}

// ─── Client Disconnect Handler ───────────────────────────────────────────────

export function clientDisconnectHandler(
  req: Request,
  _res: Response,
  next: NextFunction
): void {
  req.on("error", (err: NodeJS.ErrnoException) => {
    if (err.code === "ECONNRESET" || err.code === "EPIPE") {
      // Client disconnected — not a server error, just log it
      const timestamp = new Date().toISOString().slice(11, 23);
      console.log(
        `  ${DIM}${timestamp}${RESET} ${YELLOW}Client disconnected${RESET} ${req.method} ${req.path} ${DIM}(${err.code})${RESET}`
      );
    }
  });

  next();
}
