import { useState } from "react";
import { AnimatePresence } from "framer-motion";
import Home from "./pages/Home";
import GamingUI from "./components/GamingUI";

export default function App() {
  const [jobId, setJobId] = useState<string | null>(null);
  const [currentFormat, setCurrentFormat] = useState<string>("mp4");

  return (
    <div className="min-h-screen bg-[#0a0a1a] text-[#e0e0ff] relative overflow-hidden">
      {/* Background Geometric Pattern */}
      <div className="bg-geometric-light fixed inset-0 pointer-events-none z-0" />

      {/* Scanline effect */}
      <div className="fixed inset-0 pointer-events-none z-10 opacity-[0.03]"
        style={{
          backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 2px, white 2px, white 3px)",
        }}
      />

      {/* Content */}
      <div className="relative z-20">
        {/* Header */}
        <GamingUI.Header
          jobId={jobId}
          onReset={() => {
            setJobId(null);
            setCurrentFormat("mp4");
          }}
        />

        {/* Main Content */}
        <main className="container mx-auto px-4 py-8 max-w-5xl">
          <AnimatePresence mode="wait">
            <Home
              key={jobId || "home"}
              jobId={jobId}
              onJobStart={(id, format) => {
                setJobId(id);
                setCurrentFormat(format);
              }}
              currentFormat={currentFormat}
            />
          </AnimatePresence>
        </main>

        {/* Footer */}
        <footer className="border-t border-[#2a2a4a] py-6 mt-12">
          <div className="container mx-auto px-4 text-center">
            <p className="text-[#8888aa] text-sm font-body">
              <span className="font-display text-[#e94560] text-xs">NEXUS</span>{" "}
              CONVERTER v1.0 &mdash; Propulsé par yt-dlp &amp; FFmpeg
            </p>
          </div>
        </footer>
      </div>
    </div>
  );
}
