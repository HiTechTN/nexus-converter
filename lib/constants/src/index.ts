// ─── Default Port Configuration ───────────────────────────────────────────────
//
// Single source of truth for all port defaults across the monorepo.
// Actual values are overridden by env vars (.env, start.sh, etc.).

/** Default port for the API server (Express) */
export const DEFAULT_API_PORT = 3000;

/** Default port for the frontend dev server (Vite) */
export const DEFAULT_FRONTEND_PORT = 5173;

/** Default port for the Electron desktop app's API server */
export const DEFAULT_ELECTRON_API_PORT = 3099;
