import { describe, expect, it } from "vitest";
import { MAX_TEMPO, MIN_TEMPO } from "../../../convex/lib/musicTheory";
import { tempoFromTaps } from "./useTapTempo";

describe("tap tempo", () => {
  it("estimates 120 bpm from 500ms taps", () => {
    expect(tempoFromTaps([0, 500, 1000, 1500])).toBe(120);
  });

  it("ignores a single sloppy tap", () => {
    expect(tempoFromTaps([0, 500, 1000, 1700, 2200, 2700])).toBe(120);
  });

  it("needs two taps", () => {
    expect(tempoFromTaps([0])).toBeNull();
  });

  it("clamps extreme tempos", () => {
    expect(tempoFromTaps([0, 100, 200])).toBe(MAX_TEMPO);
    expect(tempoFromTaps([0, 3000, 6000])).toBe(MIN_TEMPO);
  });
});
