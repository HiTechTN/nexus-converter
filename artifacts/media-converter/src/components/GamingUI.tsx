import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useHealthCheck } from "@workspace/api-client-react";

type ConnectionStatus = "online" | "degraded" | "offline";

/* ─── Header Component ─────────────────────────────────────────────────────── */

function Header({
  jobId,
  onReset,
}: {
  jobId: string | null;
  onReset: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const { data: health, isError, failureCount } = useHealthCheck();

  const connectionStatus: ConnectionStatus = isError
    ? "offline"
    : health?.status === "ok"
    ? "online"
    : "degraded";

  return (
    <header className="border-b border-[#2a2a4a] bg-[#0a0a1a]/80 backdrop-blur-md sticky top-0 z-50">
      <div className="container mx-auto px-3 sm:px-4 py-2 sm:py-3 flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <motion.div
            className="relative flex-shrink-0 w-7 h-7 sm:w-8 sm:h-8"
            animate={{ rotate: 360 }}
            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          >
            <HexIcon />
          </motion.div>
          <div className="min-w-0">
            <h1 className="font-display text-base sm:text-xl font-bold tracking-wider truncate">
              <span className="text-[#e94560] neon-text">NEXUS</span>
              <span className="text-white hidden xs:inline sm:inline"> CONVERTER</span>
            </h1>
            <p className="text-[#8888aa] text-[10px] sm:text-xs font-body -mt-0.5 tracking-widest uppercase hidden sm:block">
              Media Conversion Engine
            </p>
          </div>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
          {/* Status indicator - hidden on very small screens */}
          <div className="items-center gap-2 text-xs font-body hidden sm:flex">
            <StatusDot status={connectionStatus} />
            <span className="text-[#8888aa]">
              {connectionStatus === "online"
                ? "SYSTEM OK"
                : connectionStatus === "degraded"
                ? "DEGRADED"
                : "OFFLINE"}
            </span>
          </div>

          {/* Mini status dot for mobile */}
          <div className="sm:hidden">
            <StatusDot status={connectionStatus} />
          </div>

          {/* Reset button */}
          {jobId && (
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              onClick={onReset}
              className="px-2 sm:px-3 py-1.5 text-[10px] sm:text-xs font-display tracking-wider
                         border border-[#e94560]/50 text-[#e94560] rounded
                         hover:bg-[#e94560]/10 transition-all whitespace-nowrap"
            >
              NOUVEAU
            </motion.button>
          )}

          {/* Mobile menu toggle */}
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="sm:hidden p-1.5 text-[#8888aa] hover:text-white"
            aria-label="Menu"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              {menuOpen ? (
                <>
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </>
              ) : (
                <>
                  <line x1="3" y1="6" x2="21" y2="6" />
                  <line x1="3" y1="12" x2="21" y2="12" />
                  <line x1="3" y1="18" x2="21" y2="18" />
                </>
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* Offline warning banner */}
      <AnimatePresence>
        {connectionStatus === "offline" && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-[#e94560]/10 border-t border-[#e94560]/30"
          >
            <div className="container mx-auto px-4 py-1.5 flex items-center justify-center gap-2 text-xs font-body">
              <div className="w-2 h-2 bg-[#e94560] rounded-full animate-pulse" />
              <span className="text-[#e94560]">
                API unreachable — running in degraded mode{failureCount > 1 ? ` (retry ${failureCount})` : ""}
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Status bar - desktop */}
      <div className="bg-[#12122a] border-t border-[#2a2a4a] px-4 py-1 hidden sm:block">
        <div className="container mx-auto flex items-center justify-between text-[10px] font-body text-[#666688]">
          <span>
            API:{" "}
            <span className={
              connectionStatus === "online"
                ? "text-[#00ff88]"
                : connectionStatus === "degraded"
                ? "text-[#ffaa00]"
                : "text-[#e94560]"
            }>
              {connectionStatus === "online"
                ? "ONLINE"
                : connectionStatus === "degraded"
                ? "DEGRADED"
                : "OFFLINE"}
            </span>
          </span>
          <span>
            yt-dlp:{" "}
            <span className={health?.checks?.["yt-dlp"] ? "text-[#00ff88]" : "text-[#e94560]"}>
              {health?.checks?.["yt-dlp"] ? "✓" : "✗"}
            </span>
            {" | "}FFmpeg:{" "}
            <span className={health?.checks?.ffmpeg ? "text-[#00ff88]" : "text-[#e94560]"}>
              {health?.checks?.ffmpeg ? "✓" : "✗"}
            </span>
          </span>
          <span className="hidden md:inline">UPTIME: {health ? formatUptime(health.uptime || 0) : "--"}</span>
          <span className="hidden md:inline">NEXUS v1.0</span>
        </div>
      </div>

      {/* Mobile menu dropdown */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="sm:hidden bg-[#12122a] border-t border-[#2a2a4a] overflow-hidden"
          >
            <div className="px-4 py-3 space-y-2 text-xs font-body text-[#8888aa]">
              <div className="flex justify-between">
                <span>API</span>
                <span className={
                  connectionStatus === "online"
                    ? "text-[#00ff88]"
                    : connectionStatus === "degraded"
                    ? "text-[#ffaa00]"
                    : "text-[#e94560]"
                }>
                  {connectionStatus === "online"
                    ? "ONLINE"
                    : connectionStatus === "degraded"
                    ? "DEGRADED"
                    : "OFFLINE"}
                </span>
              </div>
              <div className="flex justify-between">
                <span>yt-dlp</span>
                <span className={health?.checks?.["yt-dlp"] ? "text-[#00ff88]" : "text-[#e94560]"}>
                  {health?.checks?.["yt-dlp"] ? "✓ Installé" : "✗ Manquant"}
                </span>
              </div>
              <div className="flex justify-between">
                <span>FFmpeg</span>
                <span className={health?.checks?.ffmpeg ? "text-[#00ff88]" : "text-[#e94560]"}>
                  {health?.checks?.ffmpeg ? "✓ Installé" : "✗ Manquant"}
                </span>
              </div>
              <div className="flex justify-between border-t border-[#2a2a4a] pt-2 mt-2 text-[10px]">
                <span>NEXUS v1.0</span>
                <span>UPTIME: {formatUptime(health?.uptime || 0)}</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}

/* ─── Sub-components ───────────────────────────────────────────────────────── */

function HexIcon() {
  return (
    <svg width="100%" height="100%" viewBox="0 0 64 64" fill="none">
      <polygon points="32,4 56,18 56,46 32,60 8,46 8,18" fill="none" stroke="#e94560" strokeWidth="2.5" />
      <polygon points="32,12 48,21 48,43 32,52 16,43 16,21" fill="none" stroke="#0f3460" strokeWidth="1.5" />
      <circle cx="32" cy="32" r="6" fill="#e94560" opacity="0.8" />
      <circle cx="32" cy="32" r="2" fill="#fff" />
    </svg>
  );
}

function StatusDot({ status }: { status: ConnectionStatus }) {
  const color = status === "online" ? "#00ff88" : status === "degraded" ? "#ffaa00" : "#e94560";
  return (
    <span className="relative flex h-2 w-2">
      <span
        className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-75"
        style={{ backgroundColor: color }}
      />
      <span
        className="relative inline-flex h-2 w-2 rounded-full"
        style={{ backgroundColor: color }}
      />
    </span>
  );
}

function formatUptime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${h}h ${m.toString().padStart(2, "0")}m`;
}

/* ─── Format Badge ─────────────────────────────────────────────────────────── */

function FormatBadge({ format, active, onClick }: {
  format: string;
  active: boolean;
  onClick: () => void;
}) {
  const icons: Record<string, string> = {
    mp4: "🎬",
    mkv: "📦",
    mp3: "🎵",
    wav: "🎧",
  };

  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className={`
        px-3 sm:px-4 py-2 rounded-lg font-display text-xs sm:text-sm tracking-wider transition-all min-w-[60px] sm:min-w-0
        ${active
          ? "bg-[#e94560] text-white shadow-lg shadow-[#e94560]/30"
          : "bg-[#12122a] text-[#8888aa] border border-[#2a2a4a] hover:border-[#e94560]/50 hover:text-white"
        }
      `}
    >
      <span className="mr-1">{icons[format] || "📄"}</span>
      {format.toUpperCase()}
    </motion.button>
  );
}

/* ─── Quality Selector ─────────────────────────────────────────────────────── */

function QualitySelector({
  quality,
  onChange,
}: {
  quality: string;
  onChange: (q: string) => void;
}) {
  const qualities = ["480p", "720p", "1080p", "4k", "best"];

  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-2">
      <span className="text-xs font-display tracking-wider uppercase text-[#8888aa]">
        Qualité
      </span>
      <div className="flex flex-wrap gap-1">
        {qualities.map((q) => (
          <button
            key={q}
            onClick={() => onChange(q)}
            className={`
              px-2.5 py-1.5 text-xs font-body rounded transition-all min-h-[32px]
              ${quality === q
                ? "bg-[#0f3460] text-white border border-[#0f3460]"
                : "bg-transparent text-[#8888aa] border border-[#2a2a4a] hover:border-[#0f3460]/50"
              }
            `}
          >
            {q.toUpperCase()}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ─── Progress Display ─────────────────────────────────────────────────────── */

function ProgressDisplay({
  percent,
  speed,
  eta,
  status,
  fileName,
}: {
  percent: number;
  speed?: string;
  eta?: number;
  status: string;
  fileName?: string;
}) {
  const isComplete = status === "completed";
  const isFailed = status === "failed";
  const displayPercent = isComplete ? 100 : Math.round(percent);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card rounded-xl p-4 sm:p-6 w-full"
    >
      {/* Status */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-display text-xs sm:text-sm tracking-widest uppercase text-[#8888aa]">
          {isComplete ? "Terminé" : isFailed ? "Erreur" : "Conversion"}
        </h3>
        {isComplete ? (
          <span className="text-[#00ff88] text-lg">✓</span>
        ) : isFailed ? (
          <span className="text-[#e94560] text-lg">✗</span>
        ) : (
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-[#e94560] rounded-full animate-pulse" />
            <span className="text-[10px] sm:text-xs font-body text-[#8888aa]">PROCESSING</span>
          </div>
        )}
      </div>

      {/* Progress bar */}
      <div className="progress-bar mb-2">
        <motion.div
          className="progress-bar-fill"
          initial={{ width: 0 }}
          animate={{ width: `${displayPercent}%` }}
          transition={{ duration: 0.5 }}
        />
      </div>

      {/* Details */}
      <div className="flex items-center justify-between text-[10px] sm:text-xs font-body flex-wrap gap-1">
        <span className="text-[#e94560] font-display">{displayPercent}%</span>
        {speed && <span className="text-[#8888aa]">Vitesse: {speed}</span>}
        {eta !== undefined && eta > 0 && (
          <span className="text-[#8888aa]">
            ETA: {Math.floor(eta / 60)}:{String(eta % 60).padStart(2, "0")}
          </span>
        )}
      </div>

      {/* Complete message */}
      {isComplete && fileName && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mt-3 text-xs sm:text-sm text-[#00ff88] font-body truncate"
        >
          ✓ {fileName}
        </motion.p>
      )}

      {/* Failed message */}
      {isFailed && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mt-3 text-xs sm:text-sm text-[#e94560] font-body"
        >
          La conversion a échoué. Veuillez réessayer.
        </motion.p>
      )}
    </motion.div>
  );
}

/* ─── Particle Background ──────────────────────────────────────────────────── */

function ParticleBackground() {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {Array.from({ length: 20 }).map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-1 h-1 bg-[#e94560]/20 rounded-full"
          style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
          }}
          animate={{
            y: [0, -30, 0],
            opacity: [0.2, 0.8, 0.2],
          }}
          transition={{
            duration: 3 + Math.random() * 4,
            repeat: Infinity,
            delay: Math.random() * 5,
          }}
        />
      ))}
    </div>
  );
}

/* ─── Export ────────────────────────────────────────────────────────────────── */

const GamingUI = {
  Header,
  FormatBadge,
  QualitySelector,
  ProgressDisplay,
  ParticleBackground,
  HexIcon,
};

export default GamingUI;
