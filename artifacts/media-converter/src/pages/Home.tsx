import { useState, useCallback, useRef, useMemo, useEffect, type DragEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  useMediaInfo,
  useStartConversion,
  useUploadFile,
} from "@workspace/api-client-react";
import GamingUI from "../components/GamingUI";
import MediaPlayer from "../components/MediaPlayer";
import { useSSE } from "../hooks/use-sse";

interface HomeProps {
  jobId: string | null;
  onJobStart: (jobId: string, format: string) => void;
  currentFormat: string;
}

export default function Home({ jobId, onJobStart, currentFormat }: HomeProps) {
  // ─── State ────────────────────────────────────────────────────────────────
  const [url, setUrl] = useState("");
  const [format, setFormat] = useState<"mp4" | "mkv" | "mp3" | "wav">(currentFormat as "mp4" | "mkv" | "mp3" | "wav" || "mp4");
  const [quality, setQuality] = useState<"480p" | "720p" | "1080p" | "4k" | "best">("best");
  const [activeTab, setActiveTab] = useState<"url" | "upload">("url");
  const [dragActive, setDragActive] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [showPlayer, setShowPlayer] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const urlInputRef = useRef<HTMLInputElement>(null);
  const { toast } = GamingUI.useToast();

  // ─── Mutations ────────────────────────────────────────────────────────────
  const mediaInfoMutation = useMediaInfo();
  const convertMutation = useStartConversion();
  const uploadMutation = useUploadFile();

  // ─── SSE ──────────────────────────────────────────────────────────────────
  const { progress: sseProgress } = useSSE(jobId);

  // ─── Media Info State ─────────────────────────────────────────────────────
  const [mediaInfo, setMediaInfo] = useState<{
    title: string;
    thumbnail?: string;
    duration?: number;
  } | null>(null);

  // Simulate loading
  useEffect(() => {
    const t = setTimeout(() => setIsLoading(false), 400);
    return () => clearTimeout(t);
  }, []);

  // Keyboard shortcut: Enter to convert
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Enter" && e.ctrlKey) {
        e.preventDefault();
        if (activeTab === "url") handleConvert();
        else handleUpload();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  });

  // ─── Handlers ─────────────────────────────────────────────────────────────

  const handleFetchInfo = useCallback(async () => {
    if (!url.trim()) return;
    try {
      const info = await mediaInfoMutation.mutateAsync({ url: url.trim() });
      setMediaInfo({
        title: info.title,
        thumbnail: info.thumbnail,
        duration: info.duration,
      });
    } catch (err) {
      setMediaInfo(null);
      toast("Impossible de récupérer les infos du média", "error");
    }
  }, [url, mediaInfoMutation, toast]);

  const handleConvert = useCallback(async () => {
    if (!url.trim()) return;
    try {
      const result = await convertMutation.mutateAsync({
        url: url.trim(),
        format,
        quality,
      });
      onJobStart(result.jobId, format);
    } catch (err) {
      toast("Échec du démarrage de la conversion", "error");
    }
  }, [url, format, quality, convertMutation, onJobStart, toast]);

  const handleUpload = useCallback(async () => {
    if (!uploadFile) return;
    const formData = new FormData();
    formData.append("file", uploadFile);
    formData.append("format", format);
    formData.append("quality", quality);
    try {
      const result = await uploadMutation.mutateAsync(formData);
      onJobStart(result.jobId, format);
    } catch (err) {
      toast("Échec de l'upload", "error");
    }
  }, [uploadFile, format, quality, uploadMutation, onJobStart, toast]);

  const handleDrag = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setUploadFile(e.dataTransfer.files[0]);
      setActiveTab("upload");
    }
  }, []);

  // Auto-fetch on paste
  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    const pasted = e.clipboardData.getData("text");
    setTimeout(() => {
      if (pasted && pasted !== url) {
        handleFetchInfo();
      }
    }, 150);
  }, [url, handleFetchInfo]);

  const formatDuration = (seconds?: number): string => {
    if (!seconds) return "--:--";
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  // ─── URL de téléchargement pour le lecteur ────────────────────────────────
  const downloadUrl = useMemo(() => {
    if (!jobId) return "";
    const base = typeof window !== "undefined" ? window.location.origin : "";
    return `${base}/api/media/download/${jobId}`;
  }, [jobId]);

  // ─── If a job is active, show progress + lecteur ──────────────────────────
  if (jobId && sseProgress.status !== "idle") {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="space-y-6 max-w-3xl mx-auto"
      >
        <div className="text-center mb-2">
          <h2 className="font-display text-xl sm:text-2xl font-bold tracking-wider mb-2">
            CONVERSION EN COURS
          </h2>
          <div className="w-24 h-0.5 bg-gradient-to-r from-transparent via-[#e94560] to-transparent mx-auto" />
        </div>

        {/* Barre de progression */}
        <GamingUI.ProgressDisplay
          percent={sseProgress.percent}
          speed={sseProgress.speed}
          eta={sseProgress.eta}
          status={sseProgress.status}
          fileName={sseProgress.fileName}
        />

        {/* Lecteur universel intégré (après conversion terminée) */}
        {sseProgress.status === "completed" && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            <div className="flex items-center gap-2 justify-center text-sm">
              <span className="text-[#00ff88]">✓</span>
              <span className="text-[#8888aa] font-body">
                Conversion terminée — {sseProgress.fileName || "fichier prêt"}
              </span>
            </div>

            {/* Lecteur intégré */}
            {showPlayer && (
              <MediaPlayer
                src={downloadUrl}
                fileName={sseProgress.fileName || `converted.${currentFormat}`}
                onDownload={() => {
                  const a = document.createElement("a");
                  a.href = downloadUrl;
                  a.download = sseProgress.fileName || `converted.${currentFormat}`;
                  a.click();
                }}
              />
            )}

            {/* Boutons d'action */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              {!showPlayer && (
                <button
                  onClick={() => setShowPlayer(true)}
                  className="w-full sm:w-auto px-6 py-3 bg-[#0f3460] text-white font-display text-sm tracking-wider rounded-lg
                             hover:bg-[#1a4a80] transition-all flex items-center justify-center gap-2"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polygon points="5 3 19 12 5 21 5 3" />
                  </svg>
                  LIRE LE FICHIER
                </button>
              )}
              <a
                href={downloadUrl}
                download={sseProgress.fileName || `converted.${currentFormat}`}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3
                           bg-[#e94560] text-white font-display text-sm tracking-wider rounded-lg
                           hover:bg-[#d63850] transition-all hover-glow"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                TÉLÉCHARGER
              </a>
            </div>
          </motion.div>
        )}

        {sseProgress.status === "failed" && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center"
          >
            <p className="text-[#e94560] text-sm font-body mb-4">{sseProgress.message || "La conversion a échoué"}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-2 border border-[#e94560]/50 text-[#e94560] font-display text-sm rounded-lg hover:bg-[#e94560]/10 transition-all"
            >
              RÉESSAYER
            </button>
          </motion.div>
        )}
      </motion.div>
    );
  }

  // ─── Loading skeleton ───────────────────────────────────────────────────
  if (isLoading) {
    return <GamingUI.ConverterSkeleton />;
  }

  // ─── Main UI (no active job) ──────────────────────────────────────────────
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8"
    >
      {/* Hero Section */}
      <div className="text-center space-y-4 mb-6 sm:mb-8">
        <motion.h2
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="font-display text-3xl sm:text-4xl md:text-5xl font-bold tracking-wider px-2"
        >
          CONVERTISSEUR
          <br />
          <span className="text-[#e94560] neon-text">MÉDIA</span>
        </motion.h2>
        <p className="text-[#8888aa] font-body text-base sm:text-lg max-w-xl mx-auto px-4">
          Téléchargez et convertissez vos médias depuis{" "}
          <span className="text-white">1000+ sites</span> en un clic
        </p>
        <div className="flex flex-wrap justify-center gap-2 text-xs font-body text-[#666688]">
          <span className="px-2 py-1 border border-[#2a2a4a] rounded">YouTube</span>
          <span className="px-2 py-1 border border-[#2a2a4a] rounded">TikTok</span>
          <span className="px-2 py-1 border border-[#2a2a4a] rounded">Instagram</span>
          <span className="px-2 py-1 border border-[#2a2a4a] rounded">Twitter/X</span>
          <span className="px-2 py-1 border border-[#2a2a4a] rounded">Twitch</span>
          <span className="px-2 py-1 border border-[#2a2a4a] rounded">+1000 autres</span>
        </div>
        <p className="text-[#555577] text-[10px] font-body">
          <kbd className="px-1 bg-[#1a1a2e] rounded">Ctrl</kbd>+<kbd className="px-1 bg-[#1a1a2e] rounded">Enter</kbd> pour lancer
        </p>
      </div>

      {/* Tabs: URL / Upload */}
      <div className="flex justify-center gap-1 mb-6">
        {(["url", "upload"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`
              px-6 py-2 font-display text-sm tracking-widest rounded-t-lg transition-all
              ${activeTab === tab
                ? "bg-[#12122a] text-white border-t border-l border-r border-[#2a2a4a]"
                : "bg-transparent text-[#8888aa] hover:text-white"
              }
            `}
          >
            {tab === "url" ? "LIEN URL" : "UPLOAD FICHIER"}
          </button>
        ))}
      </div>

      {/* Converter Card */}
      <div className="glass-card rounded-xl p-6 md:p-8 max-w-2xl mx-auto relative">
        {/* Drag overlay */}
        <AnimatePresence>
          {dragActive && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-10 bg-[#e94560]/10 backdrop-blur-sm rounded-xl flex items-center justify-center border-2 border-dashed border-[#e94560]"
            >
              <div className="text-center">
                <p className="text-5xl mb-3">📂</p>
                <p className="font-display text-lg text-white">Déposez votre fichier ici</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence mode="wait">
          {activeTab === "url" ? (
            <motion.div
              key="url"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-5"
            >
              {/* URL Input */}
              <div>
                <label className="block text-xs font-display tracking-widest text-[#8888aa] mb-2 uppercase">
                  URL du média
                </label>
                <div className="flex gap-2">
                  <input
                    ref={urlInputRef}
                    type="url"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    onPaste={handlePaste}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.ctrlKey) {
                        e.preventDefault();
                        handleFetchInfo();
                      }
                    }}
                    placeholder="https://www.youtube.com/watch?v=..."
                    className="flex-1 px-4 py-3 bg-[#0a0a1a] border border-[#2a2a4a] rounded-lg text-white font-body text-sm
                               focus:outline-none focus:border-[#e94560] focus:shadow-[0_0_10px_rgba(233,69,96,0.2)]
                               placeholder:text-[#555577] transition-all"
                  />
                  <button
                    onClick={handleFetchInfo}
                    disabled={!url.trim() || mediaInfoMutation.isPending}
                    className="px-4 py-3 bg-[#0f3460] text-white font-display text-xs tracking-wider rounded-lg
                               hover:bg-[#1a4a80] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    {mediaInfoMutation.isPending ? (
                      <span className="flex items-center gap-2">
                        <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ANALYSE
                      </span>
                    ) : (
                      "ANALYSER"
                    )}
                  </button>
                </div>
              </div>

              {/* Media Info Preview */}
              <AnimatePresence>
                {mediaInfoMutation.isPending && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="flex items-center gap-4 p-3 bg-[#0a0a1a] border border-[#2a2a4a] rounded-lg"
                  >
                    <GamingUI.Skeleton className="w-16 h-10 rounded" />
                    <div className="flex-1 space-y-2">
                      <GamingUI.Skeleton className="h-4 w-3/4" />
                      <GamingUI.Skeleton className="h-3 w-1/4" />
                    </div>
                  </motion.div>
                )}
                {mediaInfo && !mediaInfoMutation.isPending && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="flex items-center gap-4 p-3 bg-[#0a0a1a] border border-[#2a2a4a] rounded-lg"
                  >
                    {mediaInfo.thumbnail && (
                      <img
                        src={mediaInfo.thumbnail}
                        alt=""
                        className="w-16 h-10 object-cover rounded"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = "none";
                        }}
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-body text-white truncate">
                        {mediaInfo.title}
                      </p>
                      <p className="text-xs font-body text-[#8888aa]">
                        Durée: {formatDuration(mediaInfo.duration)}
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ) : (
            <motion.div
              key="upload"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-5"
            >
              {/* Drop Zone */}
              <div
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`
                  drop-zone p-8 text-center transition-all cursor-pointer
                  ${dragActive ? "active border-[#e94560]" : ""}
                  ${uploadFile ? "border-[#00ff88]/50 bg-[rgba(0,255,136,0.03)]" : ""}
                `}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="video/*,audio/*"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files?.[0]) {
                      setUploadFile(e.target.files[0]);
                    }
                  }}
                />

                {uploadFile ? (
                  <div className="space-y-2">
                    <p className="text-3xl">📁</p>
                    <p className="font-display text-sm text-[#00ff88]">
                      {uploadFile.name}
                    </p>
                    <p className="text-xs text-[#8888aa] font-body">
                      {(uploadFile.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p className="text-4xl mb-2">📂</p>
                    <p className="font-display text-sm text-white">
                      Glissez-déposez un fichier ici
                    </p>
                    <p className="text-xs text-[#8888aa] font-body">
                      ou cliquez pour parcourir — Vidéo / Audio
                    </p>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Format Selection */}
        <div className="mt-6 space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-xs font-display tracking-widest text-[#8888aa] uppercase">
              Format
            </span>
            <div className="flex gap-2">
              {(["mp4", "mkv", "mp3", "wav"] as const).map((fmt) => (
                <GamingUI.FormatBadge
                  key={fmt}
                  format={fmt}
                  active={format === fmt}
                  onClick={() => setFormat(fmt)}
                />
              ))}
            </div>
          </div>

          <GamingUI.QualitySelector quality={quality} onChange={(q) => setQuality(q as "480p" | "720p" | "1080p" | "4k" | "best")} />
        </div>

        {/* Convert Button */}
        <motion.div
          className="mt-8 text-center"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <button
            onClick={activeTab === "url" ? handleConvert : handleUpload}
            disabled={
              (activeTab === "url" && (!url.trim() || convertMutation.isPending)) ||
              (activeTab === "upload" && (!uploadFile || uploadMutation.isPending))
            }
            className="px-10 py-4 bg-[#e94560] text-white font-display text-sm tracking-widest rounded-lg
                       hover:bg-[#d63850] disabled:opacity-50 disabled:cursor-not-allowed transition-all
                       shadow-lg shadow-[#e94560]/20 hover:shadow-xl hover:shadow-[#e94560]/30
                       animate-pulse-glow relative overflow-hidden group"
          >
            <span className="relative z-10 flex items-center gap-2 justify-center">
              {(convertMutation.isPending || uploadMutation.isPending) ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  CONVERSION EN COURS...
                </>
              ) : (
                <>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polygon points="5 3 19 12 5 21 5 3" />
                  </svg>
                  LANCER LA CONVERSION
                </>
              )}
            </span>
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
          </button>
        </motion.div>

        {/* Error display */}
        {convertMutation.isError && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-4 text-sm text-[#e94560] font-body text-center"
          >
            {convertMutation.error.message}
          </motion.p>
        )}
        {uploadMutation.isError && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-4 text-sm text-[#e94560] font-body text-center"
          >
            {uploadMutation.error.message}
          </motion.p>
        )}
      </div>

      {/* Features Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 max-w-2xl mx-auto mt-6 sm:mt-8">
        {[
          { icon: "🌐", title: "1000+ Sites", desc: "YouTube, TikTok, Instagram, Twitter/X, Twitch et plus" },
          { icon: "⚡", title: "Temps réel", desc: "Progression en direct via SSE" },
          { icon: "🧹", title: "Auto-nettoyage", desc: "Fichiers temporaires supprimés automatiquement" },
        ].map((feature) => (
          <motion.div
            key={feature.title}
            whileHover={{ y: -5 }}
            className="glass-card rounded-xl p-4 text-center"
          >
            <p className="text-2xl mb-2">{feature.icon}</p>
            <h3 className="font-display text-xs tracking-widest text-white mb-1 uppercase">
              {feature.title}
            </h3>
            <p className="text-xs text-[#8888aa] font-body">{feature.desc}</p>
          </motion.div>
        ))}
      </div>

      <GamingUI.ParticleBackground />
    </motion.div>
  );
}
