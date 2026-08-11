"use client";

import { useCallback, useRef, useState } from "react";
import {
  DEFAULT_TEMPO_BPM,
  MAX_TEMPO_BPM,
  MIN_TEMPO_BPM,
  TAP_TEMPO_WINDOW_MS,
} from "./config";

function averageInterval(taps: number[]) {
  if (taps.length < 2) return null;
  let total = 0;
  for (let i = 1; i < taps.length; i += 1) {
    total += taps[i]! - taps[i - 1]!;
  }
  return total / (taps.length - 1);
}

export function useTapTempo(initialBpm = DEFAULT_TEMPO_BPM) {
  const [tempoBpm, setTempoBpm] = useState(initialBpm);
  const [tapCount, setTapCount] = useState(0);
  const tapsRef = useRef<number[]>([]);

  const clamp = useCallback((value: number) => {
    return Math.round(Math.min(MAX_TEMPO_BPM, Math.max(MIN_TEMPO_BPM, value)));
  }, []);

  const setTempo = useCallback(
    (value: number) => {
      setTempoBpm(clamp(value));
    },
    [clamp],
  );

  const tap = useCallback(() => {
    const now = performance.now();
    const recent = tapsRef.current.filter((t) => now - t < TAP_TEMPO_WINDOW_MS);
    recent.push(now);
    tapsRef.current = recent;
    setTapCount(recent.length);

    const interval = averageInterval(recent);
    if (interval && interval > 0) {
      setTempoBpm(clamp(60_000 / interval));
    }
  }, [clamp]);

  const resetTaps = useCallback(() => {
    tapsRef.current = [];
    setTapCount(0);
  }, []);

  return { tempoBpm, setTempo, tap, tapCount, resetTaps };
}
