"use client";

import React, { useState, useEffect } from "react";
import { Sparkles, Clock, CheckCircle2, ArrowRight } from "lucide-react";
import { SPONSORED_ADS } from "@/lib/ads/types";

interface InterstitialAdModalProps {
  userRole?: string;
}

export function InterstitialAdModal({ userRole = "USER" }: InterstitialAdModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(30);
  const [canSkip, setCanSkip] = useState(false);

  useEffect(() => {
    // Only normal users see ads!
    if (userRole !== "USER") return;

    // Check last shown timestamp from localStorage
    const STORAGE_KEY = "typnex_last_interstitial_ts";
    const TWELVE_HOURS_MS = 12 * 60 * 60 * 1000;
    const now = Date.now();
    const lastShown = localStorage.getItem(STORAGE_KEY);

    if (!lastShown || now - parseInt(lastShown, 10) > TWELVE_HOURS_MS) {
      // Trigger after a brief natural delay (5 seconds after chat open)
      const timeout = setTimeout(() => {
        setIsOpen(true);
        localStorage.setItem(STORAGE_KEY, now.toString());
      }, 5000);

      return () => clearTimeout(timeout);
    }
  }, [userRole]);

  useEffect(() => {
    if (!isOpen) return;

    const timer = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setCanSkip(true);
          return 0;
        }
        // Allow skipping after 5 seconds to provide excellent user UX while adhering to policies
        if (prev <= 25) {
          setCanSkip(true);
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isOpen]);

  if (!isOpen) return null;

  const ad = SPONSORED_ADS.find((a) => a.type === "INTERSTITIAL") || SPONSORED_ADS[2];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-300">
      <div className="glass-panel w-full max-w-md rounded-3xl p-6 shadow-2xl border border-white/20 dark:border-white/10 relative overflow-hidden flex flex-col items-center text-center">
        {/* Top Badge & Timer */}
        <div className="w-full flex items-center justify-between pb-3 border-b border-white/10 text-xs">
          <span className="px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-500 font-semibold uppercase tracking-wider">
            {ad.badge}
          </span>
          <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 font-mono">
            <Clock className="w-3.5 h-3.5" />
            <span>{secondsLeft > 0 ? `${secondsLeft}s remaining` : "Completed"}</span>
          </div>
        </div>

        {/* Sponsor Content */}
        <div className="my-6 flex flex-col items-center">
          <div className={`w-16 h-16 rounded-2xl bg-gradient-to-tr ${ad.accentColor} flex items-center justify-center text-white shadow-xl mb-4 animate-bounce`}>
            <Sparkles className="w-8 h-8" />
          </div>

          <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
            {ad.title}
          </h3>

          <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-widest mb-3">
            {ad.sponsor}
          </p>

          <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed max-w-sm mb-6">
            {ad.description}
          </p>

          {/* Action CTA */}
          <a
            href={ad.ctaUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold text-sm shadow-lg hover:shadow-blue-500/30 transition-all hover:scale-105"
          >
            <span>{ad.ctaText}</span>
            <ArrowRight className="w-4 h-4" />
          </a>
        </div>

        {/* Progress Bar & Dismiss Button */}
        <div className="w-full pt-4 border-t border-white/10 flex flex-col items-center gap-3">
          <div className="w-full bg-slate-200 dark:bg-slate-700/50 h-1.5 rounded-full overflow-hidden">
            <div
              className="bg-blue-600 h-full transition-all duration-1000 ease-linear"
              style={{ width: `${((30 - secondsLeft) / 30) * 100}%` }}
            />
          </div>

          {canSkip ? (
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-blue-500 transition-colors py-1"
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              <span>Continue to Typnex Chat</span>
            </button>
          ) : (
            <span className="text-xs text-slate-400">
              Skip available in {Math.max(0, secondsLeft - 25)}s...
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export default InterstitialAdModal;
