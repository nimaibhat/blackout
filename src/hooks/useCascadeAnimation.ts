"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import type { CascadeResult, RerouteArc } from "@/lib/api";

export interface CascadeAnimationState {
  isPlaying: boolean;
  currentStep: number;
  totalSteps: number;
  speed: number;
  failedNodeIds: Set<string>;
  activeReroutes: RerouteArc[];
  stats: { failedCount: number; loadShedMW: number };
  play: () => void;
  pause: () => void;
  reset: () => void;
  setSpeed: (s: number) => void;
  goToStep: (n: number) => void;
}

export function useCascadeAnimation(
  cascadeData: CascadeResult | null
): CascadeAnimationState {
  const [currentStep, setCurrentStep] = useState(-1); // -1 = before first step
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const totalSteps = cascadeData?.steps.length ?? 0;

  // Auto-start when cascade data arrives
  useEffect(() => {
    if (cascadeData && cascadeData.steps.length > 0) {
      setCurrentStep(-1);
      setIsPlaying(true);
    } else {
      setCurrentStep(-1);
      setIsPlaying(false);
    }
  }, [cascadeData]);

  // Timer for stepping through cascade
  useEffect(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    if (!isPlaying || !cascadeData || totalSteps === 0) return;

    const ms = 2000 / speed;
    intervalRef.current = setInterval(() => {
      setCurrentStep((prev) => {
        const next = prev + 1;
        if (next >= totalSteps) {
          setIsPlaying(false);
          return totalSteps - 1;
        }
        return next;
      });
    }, ms);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isPlaying, speed, cascadeData, totalSteps]);

  // Cumulative failed node IDs through currentStep
  const failedNodeIds = useMemo(() => {
    const set = new Set<string>();
    if (!cascadeData) return set;
    for (let i = 0; i <= currentStep && i < cascadeData.steps.length; i++) {
      for (const f of cascadeData.steps[i].new_failures) {
        set.add(f.id);
      }
    }
    return set;
  }, [cascadeData, currentStep]);

  // Reroute arcs for current step only
  const activeReroutes = useMemo(() => {
    if (!cascadeData || currentStep < 0 || currentStep >= cascadeData.steps.length) {
      return [];
    }
    return cascadeData.steps[currentStep].reroutes ?? [];
  }, [cascadeData, currentStep]);

  // Stats
  const stats = useMemo(() => {
    if (!cascadeData || currentStep < 0 || currentStep >= cascadeData.steps.length) {
      return { failedCount: 0, loadShedMW: 0 };
    }
    const step = cascadeData.steps[currentStep];
    return {
      failedCount: step.total_failed,
      loadShedMW: step.total_load_shed_mw,
    };
  }, [cascadeData, currentStep]);

  const play = useCallback(() => {
    if (currentStep >= totalSteps - 1) {
      // If at end, restart
      setCurrentStep(-1);
    }
    setIsPlaying(true);
  }, [currentStep, totalSteps]);

  const pause = useCallback(() => setIsPlaying(false), []);

  const reset = useCallback(() => {
    setIsPlaying(false);
    setCurrentStep(-1);
  }, []);

  const goToStep = useCallback(
    (n: number) => {
      setIsPlaying(false);
      setCurrentStep(Math.max(-1, Math.min(n, totalSteps - 1)));
    },
    [totalSteps]
  );

  return {
    isPlaying,
    currentStep,
    totalSteps,
    speed,
    failedNodeIds,
    activeReroutes,
    stats,
    play,
    pause,
    reset,
    setSpeed,
    goToStep,
  };
}
