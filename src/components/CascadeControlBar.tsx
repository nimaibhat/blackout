"use client";

import type { CascadeAnimationState } from "@/hooks/useCascadeAnimation";

interface CascadeControlBarProps extends CascadeAnimationState {
  onClose: () => void;
}

export default function CascadeControlBar({
  isPlaying,
  currentStep,
  totalSteps,
  speed,
  stats,
  play,
  pause,
  reset,
  setSpeed,
  goToStep,
  onClose,
}: CascadeControlBarProps) {
  const displayStep = Math.max(0, currentStep + 1);

  return (
    <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3 bg-[#111]/90 backdrop-blur-md border border-[#1a1a1a] rounded-xl px-5 py-3 shadow-2xl">
      {/* Play / Pause */}
      <button
        onClick={isPlaying ? pause : play}
        className="w-9 h-9 rounded-lg bg-[#1a1a1a] border border-[#27272a] flex items-center justify-center text-white hover:border-[#22c55e]/50 transition-colors cursor-pointer"
      >
        {isPlaying ? (
          <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
            <rect x="2" y="1" width="3.5" height="12" rx="1" />
            <rect x="8.5" y="1" width="3.5" height="12" rx="1" />
          </svg>
        ) : (
          <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
            <path d="M3 1.5v11l9.5-5.5L3 1.5z" />
          </svg>
        )}
      </button>

      {/* Reset */}
      <button
        onClick={reset}
        className="w-9 h-9 rounded-lg bg-[#1a1a1a] border border-[#27272a] flex items-center justify-center text-white/60 hover:text-white hover:border-[#27272a] transition-colors cursor-pointer"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="18" height="18" rx="2" />
        </svg>
      </button>

      <div className="w-px h-6 bg-[#27272a]" />

      {/* Step scrubber */}
      <div className="flex items-center gap-2">
        <div className="flex gap-0.5">
          {Array.from({ length: totalSteps }, (_, i) => (
            <button
              key={i}
              onClick={() => goToStep(i)}
              className={`w-5 h-1.5 rounded-full transition-all cursor-pointer ${
                i <= currentStep
                  ? "bg-[#ef4444]"
                  : "bg-[#27272a] hover:bg-[#3f3f46]"
              }`}
            />
          ))}
        </div>
        <span className="text-xs font-mono text-[#a1a1aa] ml-1 tabular-nums whitespace-nowrap">
          Step {displayStep}/{totalSteps}
        </span>
      </div>

      <div className="w-px h-6 bg-[#27272a]" />

      {/* Speed */}
      <div className="flex gap-1">
        {[1, 2, 4].map((s) => (
          <button
            key={s}
            onClick={() => setSpeed(s)}
            className={`px-2 py-1 rounded text-xs font-mono transition-colors cursor-pointer ${
              speed === s
                ? "bg-[#22c55e]/20 text-[#22c55e] border border-[#22c55e]/30"
                : "text-[#52525b] hover:text-[#a1a1aa] border border-transparent"
            }`}
          >
            {s}x
          </button>
        ))}
      </div>

      <div className="w-px h-6 bg-[#27272a]" />

      {/* Stats */}
      <div className="flex items-center gap-3 text-xs font-mono tabular-nums">
        <span className="text-[#ef4444]">
          {stats.failedCount}
          <span className="text-[#52525b] ml-1">failed</span>
        </span>
        <span className="text-[#f59e0b]">
          {stats.loadShedMW.toLocaleString()}
          <span className="text-[#52525b] ml-1">MW shed</span>
        </span>
      </div>

      <div className="w-px h-6 bg-[#27272a]" />

      {/* Close */}
      <button
        onClick={onClose}
        className="w-7 h-7 rounded-lg flex items-center justify-center text-[#52525b] hover:text-white transition-colors cursor-pointer"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <path d="M18 6L6 18M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}
