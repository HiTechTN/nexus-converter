import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface MediaPlayerProps {
  /** URL du fichier média à lire */
  src: string;
  /** Nom du fichier */
  fileName?: string;
  /** Type MIME (optionnel, détection auto) */
  mimeType?: string;
  /** Appelé quand le téléchargement est demandé */
  onDownload?: () => void;
}

type MediaType = "video" | "audio" | "unknown";

/**
 * Lecteur média universel NEXUS
 * Détecte automatiquement si le fichier est vidéo ou audio
 * Contrôles customisés au thème gaming Red Magic
 */
export default function MediaPlayer({
  src,
  fileName,
  mimeType,
  onDownload,
}: MediaPlayerProps) {
  const mediaRef = useRef<HTMLVideoElement & HTMLAudioElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);

  const [mediaType, setMediaType] = useState<MediaType>("unknown");
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const controlsTimeout = useRef<ReturnType<typeof setTimeout>>();

  // ─── Détection du type média ──────────────────────────────────────────────
  useEffect(() => {
    if (!src) return;

    setError(null);
    setIsLoaded(false);

    if (mimeType) {
      if (mimeType.startsWith("video/")) setMediaType("video");
      else if (mimeType.startsWith("audio/")) setMediaType("audio");
      else setMediaType("unknown");
    } else {
      // Détection par extension
      const ext = src.split(".").pop()?.toLowerCase() || "";
      const videoExts = ["mp4", "mkv", "webm", "avi", "mov", "m4v", "ogv"];
      const audioExts = ["mp3", "wav", "ogg", "aac", "flac", "m4a", "opus"];

      if (videoExts.includes(ext)) setMediaType("video");
      else if (audioExts.includes(ext)) setMediaType("audio");
      else setMediaType("video"); // Vidéo par défaut
    }
  }, [src, mimeType]);

  // ─── Contrôles ────────────────────────────────────────────────────────────

  const togglePlay = useCallback(() => {
    const media = mediaRef.current;
    if (!media) return;

    if (media.paused) {
      media.play().catch(() => {});
    } else {
      media.pause();
    }
  }, []);

  const toggleMute = useCallback(() => {
    const media = mediaRef.current;
    if (!media) return;
    media.muted = !media.muted;
    setIsMuted(media.muted);
  }, []);

  const handleVolumeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const v = parseFloat(e.target.value);
    const media = mediaRef.current;
    if (!media) return;
    media.volume = v;
    setVolume(v);
    if (v === 0) {
      media.muted = true;
      setIsMuted(true);
    } else if (isMuted) {
      media.muted = false;
      setIsMuted(false);
    }
  }, [isMuted]);

  const handleSeek = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const bar = progressRef.current;
    const media = mediaRef.current;
    if (!bar || !media) return;

    const rect = bar.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const time = x * duration;
    media.currentTime = time;
    setCurrentTime(time);
  }, [duration]);

  const handleSpeedChange = useCallback((speed: number) => {
    const media = mediaRef.current;
    if (!media) return;
    media.playbackRate = speed;
    setPlaybackRate(speed);
    setShowSpeedMenu(false);
  }, []);

  const toggleFullscreen = useCallback(async () => {
    const el = containerRef.current;
    if (!el) return;

    if (!document.fullscreenElement) {
      try {
        await el.requestFullscreen();
        setIsFullscreen(true);
      } catch {
        // Fallback pour iOS Safari
        try {
          const media = mediaRef.current;
          if (media && media.webkitEnterFullscreen) {
            media.webkitEnterFullscreen();
            setIsFullscreen(true);
          }
        } catch {
          // ignore
        }
      }
    } else {
      await document.exitFullscreen();
      setIsFullscreen(false);
    }
  }, []);

  // ─── Timer pour cacher les contrôles ──────────────────────────────────────
  const resetControlsTimer = useCallback(() => {
    setShowControls(true);
    if (controlsTimeout.current) clearTimeout(controlsTimeout.current);
    controlsTimeout.current = setTimeout(() => {
      if (isPlaying) setShowControls(false);
    }, 3000);
  }, [isPlaying]);

  // ─── Event listeners média ────────────────────────────────────────────────
  useEffect(() => {
    const media = mediaRef.current;
    if (!media) return;

    const onPlay = () => setIsPlaying(true);
    const onPause = () => {
      setIsPlaying(false);
      setShowControls(true);
    };
    const onTimeUpdate = () => setCurrentTime(media.currentTime);
    const onDurationChange = () => setDuration(media.duration || 0);
    const onVolumeChange = () => {
      setVolume(media.volume);
      setIsMuted(media.muted);
    };
    const onLoaded = () => {
      setIsLoaded(true);
      setDuration(media.duration || 0);
    };
    const onWaiting = () => setIsBuffering(true);
    const onCanPlay = () => setIsBuffering(false);
    const onPlaying = () => {
      setIsBuffering(false);
      setIsPlaying(true);
    };
    const onError = () => {
      setError("Impossible de charger le média. Le fichier est peut-être corrompu ou dans un format non supporté.");
    };

    media.addEventListener("play", onPlay);
    media.addEventListener("pause", onPause);
    media.addEventListener("timeupdate", onTimeUpdate);
    media.addEventListener("durationchange", onDurationChange);
    media.addEventListener("volumechange", onVolumeChange);
    media.addEventListener("loadedmetadata", onLoaded);
    media.addEventListener("waiting", onWaiting);
    media.addEventListener("canplay", onCanPlay);
    media.addEventListener("playing", onPlaying);
    media.addEventListener("error", onError);

    return () => {
      media.removeEventListener("play", onPlay);
      media.removeEventListener("pause", onPause);
      media.removeEventListener("timeupdate", onTimeUpdate);
      media.removeEventListener("durationchange", onDurationChange);
      media.removeEventListener("volumechange", onVolumeChange);
      media.removeEventListener("loadedmetadata", onLoaded);
      media.removeEventListener("waiting", onWaiting);
      media.removeEventListener("canplay", onCanPlay);
      media.removeEventListener("playing", onPlaying);
      media.removeEventListener("error", onError);
    };
  }, []);

  // ─── Fullscreen change ────────────────────────────────────────────────────
  useEffect(() => {
    const onFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", onFullscreenChange);
  }, []);

  // ─── Formatage du temps ───────────────────────────────────────────────────
  const formatTime = (t: number): string => {
    if (isNaN(t) || !isFinite(t)) return "0:00";
    const m = Math.floor(t / 60);
    const s = Math.floor(t % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  // ─── Rendu du lecteur audio ───────────────────────────────────────────────
  if (mediaType === "audio") {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card rounded-xl p-4 sm:p-6"
      >
        <audio
          ref={mediaRef as React.RefObject<HTMLAudioElement>}
          src={src}
          preload="metadata"
          className="hidden"
        />

        {/* Interface audio */}
        <div className="space-y-4">
          {/* En-tête */}
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-xl bg-gradient-to-br from-[#e94560]/20 to-[#0f3460]/20 flex items-center justify-center flex-shrink-0">
              <motion.span
                className="text-2xl sm:text-3xl"
                animate={isPlaying ? { scale: [1, 1.1, 1] } : { scale: 1 }}
                transition={{ duration: 1, repeat: isPlaying ? Infinity : 0 }}
              >
                🎵
              </motion.span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-display text-sm sm:text-base text-white truncate">
                {fileName || "Fichier audio"}
              </p>
              <p className="text-xs text-[#8888aa] font-body">
                {isPlaying ? "Lecture en cours..." : "Prêt"}
              </p>
            </div>
          </div>

          {/* Barre de progression */}
          <div
            ref={progressRef}
            className="progress-bar cursor-pointer h-2 sm:h-3"
            onClick={handleSeek}
          >
            <div
              className="progress-bar-fill"
              style={{ width: `${progress}%` }}
            />
          </div>

          {/* Contrôles */}
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] sm:text-xs font-body text-[#8888aa] min-w-[40px]">
              {formatTime(currentTime)}
            </span>

            <div className="flex items-center gap-1 sm:gap-2">
              {/* Play/Pause */}
              <button
                onClick={togglePlay}
                className="p-2 rounded-full hover:bg-white/5 transition-all"
                aria-label={isPlaying ? "Pause" : "Play"}
              >
                {isBuffering ? (
                  <svg className="animate-spin w-5 h-5 sm:w-6 sm:h-6 text-[#e94560]" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.3" />
                    <path d="M12 2a10 10 0 019.95 9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                  </svg>
                ) : isPlaying ? (
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 sm:w-6 sm:h-6 text-white">
                    <rect x="6" y="4" width="4" height="16" rx="1" />
                    <rect x="14" y="4" width="4" height="16" rx="1" />
                  </svg>
                ) : (
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 sm:w-6 sm:h-6 text-white">
                    <polygon points="5,3 19,12 5,21" />
                  </svg>
                )}
              </button>
            </div>

            <span className="text-[10px] sm:text-xs font-body text-[#8888aa] min-w-[40px] text-right">
              {formatTime(duration)}
            </span>
          </div>

          {/* Contrôles secondaires */}
          <div className="flex items-center justify-between border-t border-[#2a2a4a] pt-3">
            {/* Volume */}
            <div className="flex items-center gap-2">
              <button onClick={toggleMute} className="text-[#8888aa] hover:text-white transition-all">
                {isMuted || volume === 0 ? (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                    <line x1="23" y1="9" x2="17" y2="15" />
                    <line x1="17" y1="9" x2="23" y2="15" />
                  </svg>
                ) : (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                    <path d="M19.07 4.93a10 10 0 010 14.14M15.54 8.46a5 5 0 010 7.07" />
                  </svg>
                )}
              </button>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={isMuted ? 0 : volume}
                onChange={handleVolumeChange}
                className="w-16 sm:w-20 h-1 accent-[#e94560] bg-[#2a2a4a] rounded-full appearance-none cursor-pointer"
              />
            </div>

            {/* Vitesse */}
            <div className="relative">
              <button
                onClick={() => setShowSpeedMenu(!showSpeedMenu)}
                className="text-[10px] sm:text-xs font-display tracking-wider text-[#8888aa] hover:text-white px-2 py-1 border border-[#2a2a4a] rounded transition-all"
              >
                {playbackRate}x
              </button>
              <AnimatePresence>
                {showSpeedMenu && (
                  <motion.div
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -5 }}
                    className="absolute bottom-full right-0 mb-2 bg-[#12122a] border border-[#2a2a4a] rounded-lg p-1 shadow-xl z-30"
                  >
                    {[0.5, 0.75, 1, 1.25, 1.5, 2].map((speed) => (
                      <button
                        key={speed}
                        onClick={() => handleSpeedChange(speed)}
                        className={`block w-full text-left px-3 py-1.5 text-xs font-body rounded transition-all whitespace-nowrap ${
                          playbackRate === speed
                            ? "bg-[#e94560]/20 text-[#e94560]"
                            : "text-[#8888aa] hover:text-white hover:bg-white/5"
                        }`}
                      >
                        {speed}x
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Download */}
            {onDownload && (
              <button
                onClick={onDownload}
                className="flex items-center gap-1 text-[10px] sm:text-xs font-display tracking-wider text-[#00ff88] hover:text-white px-2 py-1 border border-[#00ff88]/30 rounded transition-all"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                TÉLÉCHARGER
              </button>
            )}
          </div>
        </div>
      </motion.div>
    );
  }

  // ─── Rendu du lecteur vidéo ───────────────────────────────────────────────
  return (
    <motion.div
      ref={containerRef}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative group rounded-xl overflow-hidden glass-card"
      onMouseMove={resetControlsTimer}
      onMouseEnter={() => setShowControls(true)}
      onTouchStart={() => setShowControls(true)}
    >
      {/* Élément vidéo */}
      <video
        ref={mediaRef as React.RefObject<HTMLVideoElement>}
        src={src}
        className="w-full aspect-video bg-black cursor-pointer"
        onClick={togglePlay}
        preload="metadata"
        playsInline
        controls={false}
      />

      {/* Superposition des contrôles */}
      <AnimatePresence>
        {showControls && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black/80 via-black/20 to-transparent pointer-events-none"
          >
            {/* Centre: bouton play/pause large */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-auto">
              <motion.button
                onClick={togglePlay}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                className="w-14 h-14 sm:w-20 sm:h-20 rounded-full bg-[#e94560]/80 backdrop-blur-sm flex items-center justify-center
                           shadow-lg shadow-[#e94560]/30 hover:bg-[#e94560] transition-all"
                aria-label={isPlaying ? "Pause" : "Play"}
              >
                {isBuffering ? (
                  <svg className="animate-spin w-6 h-6 sm:w-8 sm:h-8 text-white" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.3" />
                    <path d="M12 2a10 10 0 019.95 9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                  </svg>
                ) : isPlaying ? (
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 sm:w-8 sm:h-8">
                    <rect x="6" y="4" width="4" height="16" rx="1" />
                    <rect x="14" y="4" width="4" height="16" rx="1" />
                  </svg>
                ) : (
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 sm:w-8 sm:h-8 ml-1">
                    <polygon points="5,3 19,12 5,21" />
                  </svg>
                )}
              </motion.button>
            </div>

            {/* Barre de contrôles inférieure */}
            <div className="relative z-10 px-2 sm:px-4 pb-2 sm:pb-3 space-y-1 pointer-events-auto">
              {/* Barre de progression */}
              <div
                ref={progressRef}
                className="progress-bar cursor-pointer h-1.5 sm:h-2 hover:h-2.5 transition-all"
                onClick={handleSeek}
              >
                <div
                  className="progress-bar-fill"
                  style={{ width: `${progress}%` }}
                />
              </div>

              {/* Boutons */}
              <div className="flex items-center justify-between gap-1 sm:gap-2">
                {/* Groupe gauche */}
                <div className="flex items-center gap-1 sm:gap-3">
                  {/* Play/Pause */}
                  <button
                    onClick={togglePlay}
                    className="p-1 sm:p-1.5 rounded hover:bg-white/10 transition-all"
                    aria-label={isPlaying ? "Pause" : "Play"}
                  >
                    {isPlaying ? (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 sm:w-5 sm:h-5">
                        <rect x="6" y="4" width="4" height="16" rx="1" />
                        <rect x="14" y="4" width="4" height="16" rx="1" />
                      </svg>
                    ) : (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 sm:w-5 sm:h-5">
                        <polygon points="5,3 19,12 5,21" />
                      </svg>
                    )}
                  </button>

                  {/* Volume */}
                  <div className="items-center gap-1.5 hidden sm:flex">
                    <button onClick={toggleMute} className="p-1 rounded hover:bg-white/10 transition-all">
                      {isMuted || volume === 0 ? (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                          <line x1="23" y1="9" x2="17" y2="15" />
                          <line x1="17" y1="9" x2="23" y2="15" />
                        </svg>
                      ) : (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                          <path d="M19.07 4.93a10 10 0 010 14.14M15.54 8.46a5 5 0 010 7.07" />
                        </svg>
                      )}
                    </button>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={isMuted ? 0 : volume}
                      onChange={handleVolumeChange}
                      className="w-16 sm:w-20 h-1 accent-[#e94560] bg-white/20 rounded-full appearance-none cursor-pointer"
                    />
                  </div>

                  {/* Temps */}
                  <span className="text-[10px] sm:text-xs font-body text-white/80 min-w-[70px] sm:min-w-[90px]">
                    {formatTime(currentTime)} / {formatTime(duration)}
                  </span>
                </div>

                {/* Groupe droit */}
                <div className="flex items-center gap-1 sm:gap-2">
                  {/* Vitesse */}
                  <div className="relative hidden sm:block">
                    <button
                      onClick={() => setShowSpeedMenu(!showSpeedMenu)}
                      className="text-[10px] font-display tracking-wider text-white/70 hover:text-white px-1.5 py-0.5 border border-white/20 rounded transition-all"
                    >
                      {playbackRate}x
                    </button>
                    <AnimatePresence>
                      {showSpeedMenu && (
                        <motion.div
                          initial={{ opacity: 0, y: -5 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -5 }}
                          className="absolute bottom-full right-0 mb-2 bg-[#12122a] border border-[#2a2a4a] rounded-lg p-1 shadow-xl z-30"
                        >
                          {[0.5, 0.75, 1, 1.25, 1.5, 2].map((speed) => (
                            <button
                              key={speed}
                              onClick={() => handleSpeedChange(speed)}
                              className={`block w-full text-left px-3 py-1.5 text-xs font-body rounded transition-all whitespace-nowrap ${
                                playbackRate === speed
                                  ? "bg-[#e94560]/20 text-[#e94560]"
                                  : "text-[#8888aa] hover:text-white hover:bg-white/5"
                              }`}
                            >
                              {speed}x
                            </button>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Download */}
                  {onDownload && (
                    <button
                      onClick={onDownload}
                      className="flex items-center gap-1 text-[10px] sm:text-xs font-display tracking-wider text-[#00ff88] hover:text-white px-1.5 sm:px-2 py-1 border border-[#00ff88]/30 rounded transition-all"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                        <polyline points="7 10 12 15 17 10" />
                        <line x1="12" y1="15" x2="12" y2="3" />
                      </svg>
                      <span className="hidden sm:inline">TÉLÉCHARGER</span>
                    </button>
                  )}

                  {/* Fullscreen */}
                  <button
                    onClick={toggleFullscreen}
                    className="p-1 sm:p-1.5 rounded hover:bg-white/10 transition-all"
                    aria-label="Plein écran"
                  >
                    {isFullscreen ? (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="4 14 10 14 10 20" />
                        <polyline points="20 10 14 10 14 4" />
                        <line x1="14" y1="10" x2="21" y2="3" />
                        <line x1="3" y1="21" x2="10" y2="14" />
                      </svg>
                    ) : (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="15 3 21 3 21 9" />
                        <polyline points="9 21 3 21 3 15" />
                        <line x1="21" y1="3" x2="14" y2="10" />
                        <line x1="3" y1="21" x2="10" y2="14" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Message d'erreur */}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80 p-4">
          <div className="text-center max-w-sm">
            <p className="text-3xl mb-2">⚠️</p>
            <p className="text-sm text-[#e94560] font-body">{error}</p>
          </div>
        </div>
      )}

      {/* Loading spinner */}
      {!isLoaded && !error && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
          <div className="text-center">
            <svg className="animate-spin w-10 h-10 text-[#e94560] mx-auto mb-2" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.3" />
              <path d="M12 2a10 10 0 019.95 9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
            </svg>
            <p className="text-xs text-[#8888aa] font-body">Chargement...</p>
          </div>
        </div>
      )}
    </motion.div>
  );
}
