"use client";

import React, { useState, useEffect } from "react";
import { ShieldCheck, Download, Clock } from "lucide-react";
import { SPONSORED_ADS } from "@/lib/ads/types";

interface ProtectedFileGateModalProps {
  isOpen: boolean;
  filename: string;
  fileKey: string;
  durationSec: number;
  onAdComplete: (fileKey: string) => void;
  onClose: () => void;
}

export function ProtectedFileGateModal({
  isOpen,
  filename,
  fileKey,
  durationSec = 5,
  onAdComplete,
  onClose,
}: ProtectedFileGateModalProps) {
  const [secondsRemaining, setSecondsRemaining] = useState(durationSec);
  const [isFinished, setIsFinished] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setSecondsRemaining(durationSec);
      setIsFinished(false);
      return;
    }

    setSecondsRemaining(durationSec);
    setIsFinished(false);

    const timer = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setIsFinished(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isOpen, durationSec]);

  if (!isOpen) return null;

  const ad = SPONSORED_ADS.find((a) => a.type === "FILE_GATE") || SPONSORED_ADS[3];

  const handleDownloadNow = () => {
    onAdComplete(fileKey);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-200">
      <div className="glass-panel w-full max-w-md rounded-3xl p-6 shadow-2xl border border-amber-500/20 text-center relative overflow-hidden flex flex-col items-center">
        {/* Shield Icon */}
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-white shadow-lg mb-4">
          <ShieldCheck className="w-7 h-7" />
        </div>

        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">
          Protected Official Document
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 font-mono truncate max-w-xs mb-4">
          {filename}
        </p>

        {/* Sponsor Card */}
        <div className="w-full glass-card rounded-2xl p-4 border border-amber-500/15 mb-5 text-left">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400">
              {ad.badge}
            </span>
            <span className="text-xs text-slate-400">{ad.sponsor}</span>
          </div>
          <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-1">
            {ad.title}
          </h4>
          <p className="text-xs text-slate-600 dark:text-slate-300">
            {ad.description}
          </p>
        </div>

        {/* Progress & Countdown */}
        <div className="w-full mb-6">
          <div className="w-full bg-slate-200 dark:bg-slate-700/50 h-2 rounded-full overflow-hidden mb-2">
            <div
              className="bg-amber-500 h-full transition-all duration-1000 ease-linear"
              style={{
                width: `${((durationSec - secondsRemaining) / durationSec) * 100}%`,
              }}
            />
          </div>
          <div className="flex items-center justify-center gap-1.5 text-xs text-slate-500 font-medium">
            <Clock className="w-3.5 h-3.5" />
            <span>
              {isFinished
                ? "Verification complete!"
                : `Sponsored unlock in ${secondsRemaining}s...`}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="w-full flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
          >
            Cancel
          </button>

          <button
            type="button"
            disabled={!isFinished}
            onClick={handleDownloadNow}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 text-white font-semibold text-xs shadow-lg hover:shadow-amber-500/25 disabled:opacity-40 transition-all hover:scale-105"
          >
            <Download className="w-4 h-4" />
            <span>Download Original File</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export default ProtectedFileGateModal;
