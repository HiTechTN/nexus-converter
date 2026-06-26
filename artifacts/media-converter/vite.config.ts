import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { DEFAULT_API_PORT, DEFAULT_FRONTEND_PORT } from "@workspace/constants";

const API_PORT = process.env.VITE_API_PORT || String(DEFAULT_API_PORT);
const API_TARGET = `http://localhost:${API_PORT}`;

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: parseInt(process.env.FRONTEND_PORT || String(DEFAULT_FRONTEND_PORT), 10),
    proxy: {
      "/api": {
        target: API_TARGET,
        changeOrigin: true,
        configure: (proxy) => {
          proxy.on("error", (err: NodeJS.ErrnoException, req, res) => {
            const target = API_TARGET;
            console.error(`\n  ⚠️  [Vite Proxy] ${req.method} ${req.url} → ${target}`);
            console.error(`     Error: ${err.code || "UNKNOWN"} — ${err.message}\n`);

            // Send a structured JSON error to the client so the UI can display it
            if (!res.headersSent) {
              res.writeHead(502, { "Content-Type": "application/json" });
            }
            res.end(
              JSON.stringify({
                error: "Proxy error",
                target,
                code: err.code,
                message: err.message,
              })
            );
          });
        },
      },
    },
  },
  build: {
    outDir: "dist",
    sourcemap: true,
  },
});
