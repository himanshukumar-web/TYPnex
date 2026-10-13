"use client";

import React from "react";

export function LiquidGlassBackground() {
  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 pointer-events-none -z-10 overflow-hidden select-none"
    >
      {/* Base Light/Dark Background Tone */}
      <div className="absolute inset-0 bg-slate-50 dark:bg-[#070b14] transition-colors duration-500" />

      {/* Floating Animated Liquid Glass Blobs */}
      <div className="absolute -top-[10%] -left-[10%] w-[55vw] h-[55vw] max-w-[650px] max-h-[650px] rounded-full bg-gradient-to-tr from-blue-400/25 to-indigo-400/20 dark:from-blue-600/15 dark:to-indigo-500/10 blur-[80px] animate-blob-slow transform-gpu" />
      
      <div className="absolute top-[35%] -right-[15%] w-[50vw] h-[50vw] max-w-[600px] max-h-[600px] rounded-full bg-gradient-to-br from-teal-300/20 via-sky-400/20 to-indigo-300/15 dark:from-teal-600/10 dark:via-sky-600/10 dark:to-indigo-600/10 blur-[90px] animate-blob-reverse transform-gpu" />

      <div className="absolute -bottom-[10%] left-[20%] w-[45vw] h-[45vw] max-w-[550px] max-h-[550px] rounded-full bg-gradient-to-t from-violet-400/20 to-fuchsia-300/15 dark:from-violet-600/10 dark:to-purple-800/10 blur-[85px] animate-blob-float transform-gpu" />

      {/* Subtle Micro-Glass Grid Pattern */}
      <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05] bg-[radial-gradient(#3b82f6_1px,transparent_1px)] [background-size:24px_24px]" />
    </div>
  );
}

export default LiquidGlassBackground;
