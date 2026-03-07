"use client";

import { useState, useRef } from "react";
import {
  Play,
  Pause,
  Maximize2,
  Volume2,
  VolumeX,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface VideoPlayerProps {
  src?: string;
  poster?: string;
  watermarked?: boolean;
  className?: string;
}

export function VideoPlayer({
  src,
  poster,
  watermarked = false,
  className,
}: VideoPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [progress, setProgress] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  function handleProgressClick(e: React.MouseEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = ((e.clientX - rect.left) / rect.width) * 100;
    setProgress(Math.min(100, Math.max(0, pct)));
  }

  function handleFullscreen() {
    containerRef.current?.requestFullscreen?.();
  }

  if (!src) {
    return (
      <div
        className={cn(
          "relative flex aspect-video items-center justify-center rounded-2xl bg-gray-900",
          className,
        )}
      >
        <div className="flex flex-col items-center gap-2 text-gray-400">
          <AlertTriangle className="h-10 w-10" />
          <span className="text-sm font-medium">Video not available</span>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={cn(
        "group relative aspect-video overflow-hidden rounded-2xl bg-gray-900",
        className,
      )}
    >
      {poster && (
        <img
          src={poster}
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
        />
      )}

      {watermarked && (
        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
          <span className="select-none text-3xl font-bold tracking-widest text-white/20 sm:text-5xl">
            DRAFT — WATERMARKED
          </span>
        </div>
      )}

      {!isPlaying && (
        <button
          onClick={() => setIsPlaying(true)}
          className="absolute inset-0 z-20 flex items-center justify-center bg-black/30 transition-colors hover:bg-black/40"
        >
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#0E61FF] text-white shadow-lg transition-transform hover:scale-105">
            <Play className="h-7 w-7 translate-x-0.5" fill="currentColor" />
          </div>
        </button>
      )}

      <div className="absolute inset-x-0 bottom-0 z-20 translate-y-full bg-gradient-to-t from-black/80 to-transparent px-4 pb-3 pt-8 transition-transform group-hover:translate-y-0">
        {/* Progress bar */}
        <div
          className="mb-3 h-1 cursor-pointer rounded-full bg-white/30"
          onClick={handleProgressClick}
        >
          <div
            className="h-full rounded-full bg-[#0E61FF] transition-[width] duration-150"
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-white hover:bg-white/20"
            onClick={() => setIsPlaying((p) => !p)}
          >
            {isPlaying ? (
              <Pause className="h-4 w-4" fill="currentColor" />
            ) : (
              <Play className="h-4 w-4" fill="currentColor" />
            )}
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-white hover:bg-white/20"
            onClick={() => setIsMuted((m) => !m)}
          >
            {isMuted ? (
              <VolumeX className="h-4 w-4" />
            ) : (
              <Volume2 className="h-4 w-4" />
            )}
          </Button>

          <div className="flex-1" />

          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-white hover:bg-white/20"
            onClick={handleFullscreen}
          >
            <Maximize2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
