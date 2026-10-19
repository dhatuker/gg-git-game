import { useEffect, useState } from "react";
import type { GitEvent } from "../engine/types";
import { useReducedMotion } from "./useReducedMotion";

/** Lama event terakhir tetap disorot sebelum sorotan hilang. */
const LINGER_MS = 1600;

interface QueueState {
  source: GitEvent[];
  index: number;
}

/**
 * Memutar event satu per satu untuk sorotan dan penjelasan. State repo sudah final;
 * antrean ini hanya kosmetik dan bisa dilewati.
 */
export function useEventQueue(events: GitEvent[], stepMs = 600): { active: GitEvent | null; skip: () => void; playing: boolean } {
  const reduced = useReducedMotion();
  const [queue, setQueue] = useState<QueueState>({ source: events, index: -1 });

  // Event baru: mulai dari awal (atau langsung ke akhir bila gerakan dikurangi).
  if (queue.source !== events) {
    setQueue({ source: events, index: events.length === 0 ? -1 : reduced ? events.length - 1 : 0 });
  }

  const { index, source } = queue;
  useEffect(() => {
    if (index < 0) return;
    const last = index >= source.length - 1;
    const timer = setTimeout(
      () => setQueue((q) => (q.source === source ? { source, index: last ? -1 : q.index + 1 } : q)),
      last ? LINGER_MS : stepMs,
    );
    return () => clearTimeout(timer);
  }, [index, source, stepMs]);

  return {
    active: index >= 0 ? (source[index] ?? null) : null,
    playing: index >= 0 && index < source.length - 1,
    skip: () => setQueue((q) => ({ ...q, index: -1 })),
  };
}
