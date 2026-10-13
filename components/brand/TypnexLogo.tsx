"use client";

import React from "react";

interface TypnexLogoProps {
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  iconOnly?: boolean;
  showTagline?: boolean;
  className?: string;
}

export function TypnexLogo({
  size = "md",
  iconOnly = false,
  showTagline = false,
  className = "",
}: TypnexLogoProps) {
  const sizeMap = {
    xs: { icon: 20, text: "text-base", tagline: "text-[9px]" },
    sm: { icon: 28, text: "text-lg", tagline: "text-[10px]" },
    md: { icon: 36, text: "text-xl", tagline: "text-xs" },
    lg: { icon: 48, text: "text-2xl", tagline: "text-sm" },
    xl: { icon: 64, text: "text-3xl", tagline: "text-base" },
  };

  const { icon, text, tagline } = sizeMap[size];

  return (
    <div className={`inline-flex items-center gap-3 select-none ${className}`}>
      {/* Premium Typnex Icon */}
      <div
        className="relative flex items-center justify-center shrink-0 rounded-2xl shadow-lg transition-transform hover:scale-105 duration-300"
        style={{
          width: `${icon}px`,
          height: `${icon}px`,
        }}
      >
        <svg
          viewBox="0 0 100 100"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full drop-shadow-md"
        >
          <defs>
            <linearGradient id="typnex-grad-1" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#3B82F6" />
              <stop offset="50%" stopColor="#6366F1" />
              <stop offset="100%" stopColor="#8B5CF6" />
            </linearGradient>
            <linearGradient id="typnex-grad-2" x1="100%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#06B6D4" />
              <stop offset="50%" stopColor="#3B82F6" />
              <stop offset="100%" stopColor="#10B981" />
            </linearGradient>
            <radialGradient id="typnex-glow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#60A5FA" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#60A5FA" stopOpacity="0" />
            </radialGradient>
          </defs>

          {/* Liquid Glass Background Card */}
          <rect
            x="4"
            y="4"
            width="92"
            height="92"
            rx="24"
            fill="url(#typnex-grad-1)"
            fillOpacity="0.12"
            stroke="url(#typnex-grad-1)"
            strokeWidth="2.5"
          />

          {/* Ambient Glow */}
          <circle cx="50" cy="50" r="38" fill="url(#typnex-glow)" />

          {/* Central Connecting "T" and "X" Wave */}
          {/* Top Horizontal Bar of T with message bubble accent */}
          <path
            d="M26 30C26 27.2386 28.2386 25 31 25H69C71.7614 25 74 27.2386 74 30C74 32.7614 71.7614 35 69 35H31C28.2386 35 26 32.7614 26 30Z"
            fill="url(#typnex-grad-1)"
          />

          {/* Central dynamic stem morphing into intersecting X communication nodes */}
          <path
            d="M50 33V52L36 68C34.3431 69.6569 34.3431 72.3431 36 74C37.6569 75.6569 40.3431 75.6569 42 74L50 64L58 74C59.6569 75.6569 62.3431 75.6569 64 74C65.6569 72.3431 65.6569 69.6569 64 68L50 52"
            stroke="url(#typnex-grad-2)"
            strokeWidth="8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Typing Active Pulsing Dots */}
          <circle cx="34" cy="46" r="3.5" fill="#38BDF8" className="animate-pulse" />
          <circle cx="50" cy="42" r="4.5" fill="#818CF8" />
          <circle cx="66" cy="46" r="3.5" fill="#34D399" className="animate-pulse" />
        </svg>
      </div>

      {/* Wordmark */}
      {!iconOnly && (
        <div className="flex flex-col">
          <div className={`font-extrabold tracking-tight leading-none ${text} flex items-center`}>
            <span className="text-slate-900 dark:text-white font-black tracking-normal">TYP</span>
            <span className="bg-gradient-to-r from-blue-600 via-indigo-500 to-teal-400 bg-clip-text text-transparent font-black">
              nex
            </span>
          </div>
          {showTagline && (
            <p className={`font-medium tracking-wide text-slate-500 dark:text-slate-400 mt-0.5 ${tagline}`}>
              One place to talk, share and get things done.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export default TypnexLogo;
