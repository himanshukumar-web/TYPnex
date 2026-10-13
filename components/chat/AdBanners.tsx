"use client";

import React, { useState } from "react";
import { ExternalLink, X, Sparkles } from "lucide-react";
import { SPONSORED_ADS, AdUnit } from "@/lib/ads/types";

interface AdBannerProps {
  position: "top" | "bottom";
  userRole?: string;
}

export function AdBanner({ position, userRole = "USER" }: AdBannerProps) {
  const [isDismissed, setIsDismissed] = useState(false);

  // STRICT REQUIREMENT: Zero ads in Admin, Employee, Department!
  if (userRole !== "USER" || isDismissed) {
    return null;
  }

  const ad: AdUnit =
    position === "top"
      ? SPONSORED_ADS.find((a) => a.type === "BANNER_TOP") || SPONSORED_ADS[0]
      : SPONSORED_ADS.find((a) => a.type === "BANNER_BOTTOM") || SPONSORED_ADS[1];

  return (
    <div
      className={`w-full px-3 py-1.5 transition-all duration-300 ${
        position === "top" ? "border-b border-white/20 dark:border-white/10" : "border-t border-white/20 dark:border-white/10"
      }`}
    >
      <div className="glass-card rounded-xl p-2.5 flex items-center justify-between gap-3 shadow-sm border border-blue-500/15 dark:border-blue-400/10">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className={`p-1.5 rounded-lg bg-gradient-to-br ${ad.accentColor} text-white shrink-0`}>
            <Sparkles className="w-3.5 h-3.5" />
          </div>

          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded bg-blue-500/10 dark:bg-blue-400/10 text-blue-600 dark:text-blue-400">
                {ad.badge}
              </span>
              <span className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">
                {ad.title}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
              {ad.description}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <a
            href={ad.ctaUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-medium transition-colors shadow-sm"
          >
            <span>{ad.ctaText}</span>
            <ExternalLink className="w-2.5 h-2.5" />
          </a>

          <button
            type="button"
            onClick={() => setIsDismissed(true)}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
            title="Dismiss"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  );
}

export default AdBanner;
