"use client";

import { useCallback, useRef, useState } from "react";
import { clampTempo } from "../../../convex/lib/musicTheory";

const TAP_WINDOW_MS = 2500;

/** Median of recent tap intervals → BPM (median shrugs off one sloppy tap). */
export function tempoFromTaps(taps: number[]) {
  if (taps.length < 2) return null;
  const intervals: number[] = [];
  for (let i = 1; i < taps.length; i += 1) intervals.push(taps[i]! - taps[i - 1]!);
  const sorted = [...intervals].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const median = sorted.length % 2 ? sorted[mid]! : (sorted[mid - 1]! + sorted[mid]!) / 2;
  if (median <= 0) return null;
  return clampTempo(60_000 / median);
}

export function useTapTempo(onTempo: (bpm: number) => void) {
  const [tapCount, setTapCount] = useState(0);
  const taps = useRef<number[]>([]);

  const tap = useCallback(() => {
    const now = performance.now();
    const last = taps.current[taps.current.length - 1];
    const recent = last != null && now - last > TAP_WINDOW_MS ? [] : taps.current.slice(-7);
    recent.push(now);
    taps.current = recent;
    setTapCount(recent.length);
    const bpm = tempoFromTaps(recent);
    if (bpm) onTempo(bpm);
  }, [onTempo]);

  return { tap, tapCount };
}
