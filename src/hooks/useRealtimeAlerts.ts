"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";

export interface LiveAlert {
  id: string;
  session_id: string | null;
  grid_region: string;
  severity: string;
  title: string;
  description: string;
  alert_type: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

export function useRealtimeAlerts(gridRegion: string = "ERCOT") {
  const [liveAlerts, setLiveAlerts] = useState<LiveAlert[]>([]);

  useEffect(() => {
    const channel = supabase
      .channel("live_alerts_changes")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "live_alerts",
          filter: `grid_region=eq.${gridRegion}`,
        },
        (payload) => {
          const row = payload.new as LiveAlert;
          setLiveAlerts((prev) => [row, ...prev]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [gridRegion]);

  const clearAlerts = useCallback(() => {
    setLiveAlerts([]);
  }, []);

  return { liveAlerts, clearAlerts };
}
