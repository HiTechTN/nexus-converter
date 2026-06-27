import { motion, AnimatePresence } from "framer-motion";

export interface ApiError {
  error?: string;
  target?: string;
  code?: string;
  message?: string;
}

interface ApiErrorDisplayProps {
  error: ApiError | string | null;
  onDismiss?: () => void;
  onRetry?: () => void;
  className?: string;
}

/** Parse a raw error (from react-query) into a structured ApiError if possible */
export function parseApiError(err: unknown): ApiError {
  if (!err) return {};

  // Already structured
  if (typeof err === "object" && "code" in err) return err as ApiError;

  // String message — try to detect proxy errors
  const msg = err instanceof Error ? err.message : String(err);

  if (msg.includes("Proxy error") || msg.includes("EADDRNOTAVAIL") || msg.includes("ECONNREFUSED")) {
    return {
      error: "Proxy error",
      code: msg.includes("EADDRNOTAVAIL") ? "EADDRNOTAVAIL" : "ECONNREFUSED",
      message: msg,
    };
  }

  return { error: msg };
}

/** Error code → human-friendly label */
function errorLabel(code?: string): string {
  switch (code) {
    case "EADDRNOTAVAIL":
      return "Serveur API indisponible";
    case "ECONNREFUSED":
      return "Connexion refusée par le serveur";
    case "ETIMEDOUT":
      return "Délai d'attente dépassé";
    case "ENOTFOUND":
      return "Serveur introuvable";
    default:
      return "Erreur de connexion";
  }
}

/** Error code → suggestion */
function errorHint(code?: string): string {
  switch (code) {
    case "EADDRNOTAVAIL":
      return "Vérifiez que le serveur API est démarré sur le bon port.";
    case "ECONNREFUSED":
      return "Le serveur API refuse les connexions. Redémarrez-le avec ./start.sh";
    case "ETIMEDOUT":
      return "Le serveur met trop de temps à répondre. Vérifiez votre connexion.";
    case "ENOTFOUND":
      return "L'adresse du serveur est incorrecte.";
    default:
      return "Redémarrez l'application et réessayez.";
  }
}

export default function ApiErrorDisplay({
  error,
  onDismiss,
  onRetry,
  className = "",
}: ApiErrorDisplayProps) {
  const structured = typeof error === "string" ? parseApiError(error) : error;

  return (
    <AnimatePresence>
      {structured?.error && (
        <motion.div
          initial={{ opacity: 0, y: 10, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10, scale: 0.98 }}
          className={`glass-card rounded-xl border border-[#e94560]/30 overflow-hidden ${className}`}
        >
          {/* Header bar */}
          <div className="flex items-center justify-between px-4 py-2.5 bg-[#e94560]/10 border-b border-[#e94560]/20">
            <div className="flex items-center gap-2">
              <span className="text-[#e94560] text-sm">⚠</span>
              <span className="font-display text-xs tracking-widest text-[#e94560] uppercase">
                {errorLabel(structured.code)}
              </span>
            </div>
            {onDismiss && (
              <button
                onClick={onDismiss}
                className="text-[#8888aa] hover:text-white text-sm transition-colors"
                aria-label="Fermer"
              >
                ✕
              </button>
            )}
          </div>

          {/* Body */}
          <div className="p-4 space-y-3">
            {/* Error code badge */}
            {structured.code && (
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-bold tracking-wider bg-[#e94560]/15 text-[#e94560] border border-[#e94560]/20">
                  {structured.code}
                </span>
                {structured.target && (
                  <span className="text-xs font-mono text-[#8888aa]">
                    → {structured.target}
                  </span>
                )}
              </div>
            )}

            {/* Hint */}
            <p className="text-sm font-body text-[#8888aa]">
              {errorHint(structured.code)}
            </p>

            {/* Retry button */}
            {onRetry && (
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={onRetry}
                className="w-full sm:w-auto px-5 py-2.5 bg-[#0f3460] text-white font-display text-xs tracking-wider rounded-lg
                           hover:bg-[#1a4a80] transition-all flex items-center justify-center gap-2"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="23 4 23 10 17 10" />
                  <path d="M20.49 15a9 9 0 11-2.12-9.36L23 10" />
                </svg>
                RÉESSAYER
              </motion.button>
            )}

            {/* Raw message (collapsed details) */}
            {structured.message && structured.message !== structured.error && (
              <details className="group">
                <summary className="text-[10px] font-display tracking-widest text-[#666688] uppercase cursor-pointer hover:text-[#8888aa] transition-colors">
                  Détails techniques
                </summary>
                <pre className="mt-2 p-3 bg-[#0a0a1a] rounded-lg text-[11px] font-mono text-[#ffaa00]/70 overflow-x-auto whitespace-pre-wrap break-all border border-[#2a2a4a]">
                  {structured.message}
                </pre>
              </details>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
