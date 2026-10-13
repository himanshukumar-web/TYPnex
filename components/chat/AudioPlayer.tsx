"use client";

import React, { useState, useRef, useEffect } from "react";
import { Play, Pause, Volume2 } from "lucide-react";

interface AudioPlayerProps {
  src: string;
  durationSeconds?: number;
}

export function AudioPlayer({ src, durationSeconds = 0 }: AudioPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(durationSeconds);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onLoaded = () => {
      if (audio.duration && !isNaN(audio.duration)) {
        setDuration(audio.duration);
      }
    };

    const onTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const onEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    audio.addEventListener("loadedmetadata", onLoaded);
    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("ended", onEnded);

    return () => {
      audio.removeEventListener("loadedmetadata", onLoaded);
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("ended", onEnded);
    };
  }, []);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  const formatSec = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <div className="flex items-center gap-3 p-2.5 rounded-2xl glass-card border border-white/20 dark:border-white/10 w-full max-w-[280px]">
      <audio ref={audioRef} src={src} preload="metadata" />

      {/* Play/Pause Button */}
      <button
        type="button"
        onClick={togglePlay}
        className="w-9 h-9 rounded-full bg-blue-600 hover:bg-blue-500 text-white flex items-center justify-center shrink-0 shadow-md transition-all active:scale-95"
      >
        {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
      </button>

      {/* Audio Waveform Track Simulation */}
      <div className="flex-1 flex flex-col gap-1">
        <div className="flex items-center gap-0.5 h-6">
          {Array.from({ length: 18 }).map((_, i) => {
            const barHeight = 6 + Math.abs(Math.sin(i * 0.7)) * 16;
            const progress = duration > 0 ? currentTime / duration : 0;
            const isPassed = i / 18 <= progress;

            return (
              <div
                key={i}
                className={`flex-1 rounded-full transition-colors duration-150 ${
                  isPassed
                    ? "bg-blue-600 dark:bg-blue-400"
                    : "bg-slate-300 dark:bg-slate-600"
                }`}
                style={{ height: `${barHeight}px` }}
              />
            );
          })}
        </div>

        {/* Timestamps */}
        <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400 font-mono">
          <span>{formatSec(currentTime)}</span>
          <span className="flex items-center gap-0.5">
            <Volume2 className="w-2.5 h-2.5 opacity-60" />
            {formatSec(duration || durationSeconds || 0)}
          </span>
        </div>
      </div>
    </div>
  );
}

export default AudioPlayer;
