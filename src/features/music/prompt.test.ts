import { describe, expect, it } from "vitest";
import {
  buildCompositionPlan,
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

  it("builds compact positive styles for composition plans", () => {
    const styles = buildPositiveStyles(base);
    expect(styles).toContain("96 BPM");
    expect(styles).toContain("G major");
    expect(styles).toContain("chord progression Pop axis · I V vi IV");
    expect(styles).toContain("Warm pad");
    expect(styles).toContain("Soft pop drums");
    expect(styles).toContain("instrumental backing track");
  });

  it("includes custom notes in styles when present", () => {
    const styles = buildPositiveStyles({
      ...base,
      notes: "warm Rhodes, slight swing",
    });
    expect(styles).toContain("warm Rhodes, slight swing");
  });

  it("builds a composition plan conditioned on uploaded audio", () => {
    const plan = buildCompositionPlan({
      songId: "abc123",
      conditionEndMs: 30_000,
      positiveStyles: buildPositiveStyles(base),
      negativeStyles: ["vocals", "lyrics"],
    });
    expect(plan.chunks).toHaveLength(2);
    expect(plan.chunks[0]?.conditioning_ref?.song_id).toBe("abc123");
    expect(plan.chunks[0]?.conditioning_ref?.range.end_ms).toBe(30_000);
    expect(plan.chunks[0]?.condition_strength).toBe("high");
    expect(plan.chunks[0]?.duration_ms + plan.chunks[1]!.duration_ms).toBe(120_000);
  });

  it("builds a short title and style summary", () => {
    expect(buildTrackTitle(base)).toBe("G 96 I–V–vi–IV");
    expect(buildStylePrompt(base)).toContain("96 BPM");
  });
});
