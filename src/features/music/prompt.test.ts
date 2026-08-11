import { describe, expect, it } from "vitest";
import {
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
  hasMicTake: false,
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

  it("builds an instrumental suno-ready style prompt", () => {
    const prompt = buildStylePrompt(base);
    expect(prompt).toContain("Instrumental loopable backing track in G major");
    expect(prompt).toContain("96 BPM");
    expect(prompt).toContain("chord progression Pop axis · I V vi IV");
    expect(prompt).toContain("Warm pad harmony");
    expect(prompt).toContain("Soft pop drum groove");
    expect(prompt).toContain("no vocals, no lyrics");
    expect(prompt).not.toContain("inspired by a hummed");
  });

  it("mentions mic take and custom notes when present", () => {
    const prompt = buildStylePrompt({
      ...base,
      hasMicTake: true,
      notes: "warm Rhodes, slight swing",
    });
    expect(prompt).toContain("inspired by a hummed or recorded melodic reference");
    expect(prompt).toContain("warm Rhodes, slight swing");
  });

  it("builds a short title", () => {
    expect(buildTrackTitle(base)).toBe("G 96 I–V–vi–IV");
    expect(
      buildTrackTitle({
        ...base,
        progressionId: "blues-12",
        bars: 12,
      }),
    ).toBe("G 96 Blues");
  });
});
