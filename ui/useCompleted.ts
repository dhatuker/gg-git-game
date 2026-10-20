"use client";

import { useMemo, useSyncExternalStore } from "react";
import { parseCompleted, progressSnapshot, subscribeProgress } from "./progress";

/** Level yang sudah selesai menurut localStorage. Di server dan render hidrasi pertama selalu [] agar HTML cocok. */
export function useCompleted(): number[] {
  const raw = useSyncExternalStore(subscribeProgress, progressSnapshot, () => null);
  return useMemo(() => parseCompleted(raw), [raw]);
}
