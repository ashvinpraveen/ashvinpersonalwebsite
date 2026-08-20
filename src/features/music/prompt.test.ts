import { describe, expect, it } from "vitest";
import {
  buildPositiveStyles,
  buildStylePrompt,
  buildTrackTitle,
  formatChordProgression,
  resolveChords,
} from "./prompt";
import type { BackingTrackParams } from "./types";

const base: BackingTrackParams = {
  tempoBpm: 96,
  key: "G",
  progressionId: "I-V-vi-IV",
  chords: ["I", "V", "vi", "IV"],
  drumPatternId: "softPop",
  padVoiceId: "warm",
  bars: 4,
  notes: "",
};

describe("music prompt builder", () => {
  it("resolves preset chords", () => {
    expect(resolveChords(base)).toEqual(["I", "V", "vi", "IV"]);
    expect(formatChordProgression(base)).toBe("Pop axis · I V vi IV");
  });

  it("resolves 12-bar blues", () => {
    const blues = resolveChords({
      progressionId: "blues-12",
      chords: [],
    });
    expect(blues).toHaveLength(12);
    expect(blues.slice(0, 4)).toEqual(["I7", "I7", "I7", "I7"]);
    expect(blues.slice(8)).toEqual(["V7", "IV7", "I7", "V7"]);
  });

  it("uses custom chords when progression is custom", () => {
    expect(
      resolveChords({
        progressionId: "custom",
        chords: ["I", "IV", "V"],
      }),
    ).toEqual(["I", "IV", "V"]);
  });

  it("builds styles that ask for a demo re-recorded by pros", () => {
    const styles = buildPositiveStyles(base);
    expect(styles).toContain("96 BPM");
    expect(styles).toContain("G major");
    expect(styles).toContain("harmony follows Pop axis · I V vi IV");
    expect(styles).toContain("then fully re-recorded by professional session musicians");
    expect(buildStylePrompt(base)).toContain("avoid: vocals");
  });

  it("includes custom notes in styles when present", () => {
    const styles = buildPositiveStyles({
      ...base,
      notes: "warm Rhodes, slight swing",
    });
    expect(styles).toContain("warm Rhodes, slight swing");
  });

  it("builds a short title", () => {
    expect(buildTrackTitle(base)).toBe("G 96 I–V–vi–IV");
  });
});
