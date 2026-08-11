import { describe, expect, it } from "vitest";
import { MAX_TEMPO_BPM, MIN_TEMPO_BPM } from "./config";

function averageInterval(taps: number[]) {
  if (taps.length < 2) return null;
  let total = 0;
  for (let i = 1; i < taps.length; i += 1) {
    total += taps[i]! - taps[i - 1]!;
  }
  return total / (taps.length - 1);
}

function tempoFromTaps(taps: number[]) {
  const interval = averageInterval(taps);
  if (!interval || interval <= 0) return null;
  return Math.round(
    Math.min(MAX_TEMPO_BPM, Math.max(MIN_TEMPO_BPM, 60_000 / interval)),
  );
}

describe("tap tempo math", () => {
  it("estimates 120 bpm from 500ms taps", () => {
    expect(tempoFromTaps([0, 500, 1000, 1500])).toBe(120);
  });

  it("clamps extreme tempos", () => {
    expect(tempoFromTaps([0, 100, 200])).toBe(MAX_TEMPO_BPM);
    expect(tempoFromTaps([0, 2000, 4000])).toBe(MIN_TEMPO_BPM);
  });
});
