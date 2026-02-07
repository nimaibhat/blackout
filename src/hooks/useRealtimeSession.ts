"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";

export interface SimulationSession {
  id: string;
  scenario: string;
  grid_region: string;
  status: string;
  forecast_hour: number;
  total_failed_nodes: number | null;
  cascade_depth: number | null;
  total_load_shed_mw: number | null;
  failed_node_ids: string[] | null;
  peak_price_mwh: number | null;
  avg_price_mwh: number | null;
  crews_dispatched: number | null;
  avg_eta_minutes: number | null;
  alerts_generated: number | null;
  created_at: string;
  completed_at: string | null;
}

export function useRealtimeSession() {
  const [session, setSession] = useState<SimulationSession | null>(null);
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    const channel = supabase
      .channel("simulation_sessions_changes")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "simulation_sessions",
        },
        (payload) => {
          const row = payload.new as SimulationSession;
          setSession(row);
          setIsActive(row.status !== "completed");
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "simulation_sessions",
        },
        (payload) => {
          const row = payload.new as SimulationSession;
          setSession(row);
          setIsActive(row.status !== "completed");
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const clearSession = useCallback(() => {
    setSession(null);
    setIsActive(false);
  }, []);

  return { session, isActive, clearSession };
}
