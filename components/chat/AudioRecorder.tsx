"use client";

import React, { useState, useRef, useEffect } from "react";
import { Square, Trash2, Send, Play, Pause } from "lucide-react";

interface AudioRecorderProps {
  onAudioReady: (file: File, durationSeconds: number) => void;
  onCancel: () => void;
}

export function AudioRecorder({ onAudioReady, onCancel }: AudioRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);

  // Start recording on mount
  useEffect(() => {
    startRecording();
    return () => {
      stopTracks();
      if (timerRef.current) clearInterval(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stopTracks = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.stream) {
      mediaRecorderRef.current.stream.getTracks().forEach((track) => track.stop());
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        setAudioBlob(blob);
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
      };

      mediaRecorder.start(200);
      setIsRecording(true);

      timerRef.current = setInterval(() => {
        setSeconds((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      console.error("Microphone access error:", err);
      alert("Microphone access is required to record audio.");
      onCancel();
    }
  };

  const handleStopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
      stopTracks();
    }
    if (timerRef.current) clearInterval(timerRef.current);
    setIsRecording(false);
  };

  const handleTogglePlayPreview = () => {
    if (!audioPlayerRef.current && audioUrl) {
      audioPlayerRef.current = new Audio(audioUrl);
      audioPlayerRef.current.onended = () => setIsPlaying(false);
    }

    if (audioPlayerRef.current) {
      if (isPlaying) {
        audioPlayerRef.current.pause();
        setIsPlaying(false);
      } else {
        audioPlayerRef.current.play();
        setIsPlaying(true);
      }
    }
  };

  const handleSend = () => {
    if (audioBlob) {
      const file = new File([audioBlob], `voice_recording_${Date.now()}.webm`, {
        type: "audio/webm",
      });
      onAudioReady(file, seconds);
    }
  };

  const formatTimer = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const remainder = sec % 60;
    return `${mins.toString().padStart(2, "0")}:${remainder.toString().padStart(2, "0")}`;
  };

  return (
    <div className="flex items-center gap-3 w-full py-2 px-3 glass-panel rounded-2xl border border-blue-500/30 animate-in fade-in duration-200">
      {/* Visual Indicator */}
      <div className="flex items-center gap-2">
        <span className="relative flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500" />
        </span>
        <span className="text-xs font-mono font-bold text-slate-800 dark:text-slate-100">
          {formatTimer(seconds)}
        </span>
      </div>

      {/* Pulsing Animated Waveform Simulation */}
      <div className="flex-1 flex items-center justify-center gap-1 h-8 px-2 overflow-hidden">
        {Array.from({ length: 24 }).map((_, i) => (
          <div
            key={i}
            className={`w-1 rounded-full bg-blue-500 transition-all duration-150 ${
              isRecording ? "animate-pulse" : ""
            }`}
            style={{
              height: isRecording ? `${Math.max(4, Math.sin(i + seconds * 2) * 24 + 14)}px` : "6px",
              opacity: isRecording ? 0.8 : 0.4,
            }}
          />
        ))}
      </div>

      {/* Control Actions */}
      <div className="flex items-center gap-2">
        {isRecording ? (
          <button
            type="button"
            onClick={handleStopRecording}
            className="p-2 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 hover:bg-amber-500/30 transition-colors"
            title="Stop recording"
          >
            <Square className="w-4 h-4 fill-current" />
          </button>
        ) : (
          <button
            type="button"
            onClick={handleTogglePlayPreview}
            className="p-2 rounded-xl bg-blue-500/20 text-blue-600 dark:text-blue-400 hover:bg-blue-500/30 transition-colors"
            title={isPlaying ? "Pause Preview" : "Play Preview"}
          >
            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          </button>
        )}

        <button
          type="button"
          onClick={onCancel}
          className="p-2 rounded-xl bg-rose-500/20 text-rose-600 dark:text-rose-400 hover:bg-rose-500/30 transition-colors"
          title="Cancel"
        >
          <Trash2 className="w-4 h-4" />
        </button>

        <button
          type="button"
          disabled={isRecording}
          onClick={handleSend}
          className="p-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md hover:shadow-lg disabled:opacity-40 transition-all"
          title="Send Audio Message"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

export default AudioRecorder;

