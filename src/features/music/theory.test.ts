import { describe, expect, it } from "vitest";
import {
  PROGRESSIONS,
  STYLE_IDS,
  buildPolishPrompt,
  buildPolishTitle,
  chordName,
  diatonicChords,
  findProgression,
  keyName,
  parseChordToken,
  romanNumeral,
  soloScaleHint,
} from "../../../convex/lib/musicTheory";
import { swingOffset } from "./engine";
import { GROOVES, cycleStep } from "./grooves";
import {
  applyStyle,
  decodeJam,
  defaultJam,
  encodeJam,
  sanitizeJam,
  setChords,
  surpriseJam,
} from "./jam";
import { bassMidi, voiceProgression } from "./voicing";

describe("chord naming", () => {
  it("names chords in the key with sensible spelling", () => {
    expect(chordName({ offset: 9, quality: "min" }, 0, "major")).toBe("Am");
    expect(chordName({ offset: 7, quality: "7" }, 10, "major")).toBe("F7");
    expect(chordName({ offset: 10, quality: "maj" }, 5, "major")).toBe("Eb");
    expect(chordName({ offset: 5, quality: "maj" }, 5, "major")).toBe("Bb");
    expect(chordName({ offset: 4, quality: "m7" }, 7, "major")).toBe("Bm7");
    expect(chordName({ offset: 0, quality: "m7b5" }, 2, "minor")).toBe("Dø7");
    expect(keyName(1, "major")).toBe("Db major");
    expect(keyName(8, "minor")).toBe("G# minor");
  });

  it("spells chromatic roots by their degree", () => {
    expect(chordName({ offset: 1, quality: "maj" }, 9, "minor")).toBe("Bb");
    expect(chordName({ offset: 11, quality: "dim7" }, 9, "minor")).toBe("G#°7");
    expect(chordName({ offset: 8, quality: "maj" }, 0, "major")).toBe("Ab");
    expect(chordName({ offset: 6, quality: "m7b5" }, 0, "major")).toBe("F#ø7");
    expect(romanNumeral({ offset: 11, quality: "dim7" }, "minor")).toBe("♯vii°7");
    expect(romanNumeral({ offset: 1, quality: "maj" }, "minor")).toBe("♭II");
  });

  it("writes roman numerals relative to the mode", () => {
    expect(romanNumeral({ offset: 9, quality: "min" }, "major")).toBe("vi");
    expect(romanNumeral({ offset: 10, quality: "maj" }, "major")).toBe("♭VII");
    expect(romanNumeral({ offset: 8, quality: "maj" }, "minor")).toBe("VI");
    expect(romanNumeral({ offset: 2, quality: "m7" }, "major")).toBe("ii7");
    expect(romanNumeral({ offset: 11, quality: "dim" }, "major")).toBe("vii°");
    expect(romanNumeral({ offset: 0, quality: "maj7" }, "major")).toBe("Imaj7");
  });

  it("builds diatonic triads and sevenths", () => {
    expect(diatonicChords("major", false).map((c) => chordName(c, 0, "major"))).toEqual([
      "C", "Dm", "Em", "F", "G", "Am", "B°",
    ]);
    expect(diatonicChords("major", true).map((c) => chordName(c, 0, "major"))).toEqual([
      "Cmaj7", "Dm7", "Em7", "Fmaj7", "G7", "Am7", "Bø7",
    ]);
    expect(diatonicChords("minor", false).map((c) => chordName(c, 9, "minor"))).toEqual([
      "Am", "B°", "C", "Dm", "Em", "F", "G",
    ]);
  });

  it("round-trips chord tokens and rejects junk", () => {
    expect(parseChordToken("9:m7")).toEqual({ offset: 9, quality: "m7" });
    expect(parseChordToken("12:maj")).toBeNull();
    expect(parseChordToken("3:nope")).toBeNull();
    expect(parseChordToken("<script>")).toBeNull();
  });

  it("suggests a scale to solo with", () => {
    const blues = findProgression("blues")!;
    expect(soloScaleHint(7, "major", blues.chords)).toMatch(/^G blues/);
    expect(soloScaleHint(9, "minor", findProgression("epic")!.chords)).toMatch(/^A minor pentatonic/);
    expect(soloScaleHint(2, "minor", findProgression("dorian")!.chords)).toMatch(/^D dorian/);
  });

  it("ships progressions whose tokens all parse", () => {
    for (const preset of PROGRESSIONS) {
      expect(preset.chords.length).toBeGreaterThan(0);
      for (const chord of preset.chords) {
        expect(parseChordToken(`${chord.offset}:${chord.quality}`)).not.toBeNull();
      }
    }
  });
});

describe("polish prompt", () => {
  const spec = {
    tonic: 7,
    mode: "major" as const,
    tempoBpm: 300,
    styleId: "shuffle" as const,
    chords: findProgression("blues")!.chords,
    notes: "  harmonica   vibes  ",
  };

  it("spells the real changes and clamps tempo", () => {
    const prompt = buildPolishPrompt(spec);
    expect(prompt).toContain("220 BPM");
    expect(prompt).toContain("key of G major");
    expect(prompt).toContain("G7 | G7 | G7 | G7 | C7");
    expect(prompt).toContain("extra direction: harmonica vibes");
    expect(prompt).toContain("avoid: vocals");
    expect(buildPolishTitle(spec)).toBe("G major · Blues shuffle · 220 BPM");
  });
});

describe("voicing", () => {
  it("keeps voices in a comfortable range and moves smoothly", () => {
    const chords = findProgression("axis")!.chords;
    const voicings = voiceProgression(chords, 0);
    for (const voicing of voicings) {
      for (const note of voicing) {
        expect(note).toBeGreaterThanOrEqual(52);
        expect(note).toBeLessThanOrEqual(76);
      }
    }
    for (let i = 1; i < voicings.length; i += 1) {
      const moved = voicings[i]!.reduce((sum, n, j) => sum + Math.abs(n - voicings[i - 1]![j]!), 0);
      expect(moved).toBeLessThanOrEqual(8);
    }
  });

  it("drops the fifth from big chords", () => {
    const [voicing] = voiceProgression([{ offset: 0, quality: "9" }], 0);
    expect(voicing).toHaveLength(4);
    expect(voicing!.map((n) => n % 12)).not.toContain(7);
  });

  it("resolves bass tones per chord", () => {
    const am = { offset: 9, quality: "min" as const };
    const f = { offset: 5, quality: "maj" as const };
    expect(bassMidi(0, am, f, 0) % 12).toBe(9);
    expect(bassMidi("3", am, f, 0) % 12).toBe(0);
    expect(bassMidi("5", am, f, 0) % 12).toBe(4);
    expect([4, 6]).toContain(bassMidi("A", am, f, 0) % 12);
  });
});

describe("swing", () => {
  it("leaves straight time alone", () => {
    expect(swingOffset(2, { grid: 8, amount: 0.5 }, 0.1)).toBe(0);
  });

  it("delays offbeat eighths toward the triplet", () => {
    const stepDur = 0.125;
    expect(swingOffset(0, { grid: 8, amount: 2 / 3 }, stepDur)).toBe(0);
    // Offbeat 8th lands 2/3 of the way through the beat instead of halfway.
    expect(swingOffset(2, { grid: 8, amount: 2 / 3 }, stepDur)).toBeCloseTo((2 / 3 - 0.5) * 4 * stepDur);
    expect(swingOffset(1, { grid: 16, amount: 0.6 }, stepDur)).toBeCloseTo(0.2 * stepDur);
    expect(swingOffset(2, { grid: 16, amount: 0.6 }, stepDur)).toBe(0);
  });
});

describe("grooves", () => {
  it("defines 16-step lanes for every style", () => {
    for (const id of STYLE_IDS) {
      const groove = GROOVES[id];
      for (const row of Object.values(groove.drums)) expect(row).toMatch(/^[xo.]{16}$/);
      for (const event of [...groove.bass, ...groove.comp]) {
        expect(event.s).toBeGreaterThanOrEqual(0);
        expect(event.s).toBeLessThan(16);
      }
    }
  });

  it("cycles a drum step hit → ghost → off", () => {
    const drums = GROOVES.pop.drums;
    const one = cycleStep(drums, "rim", 3);
    expect(one.rim[3]).toBe("x");
    expect(cycleStep(one, "rim", 3).rim[3]).toBe("o");
    expect(cycleStep(cycleStep(one, "rim", 3), "rim", 3).rim[3]).toBe(".");
  });
});

describe("jam state", () => {
  it("survives garbage drafts", () => {
    const jam = sanitizeJam({ tonic: "x", tempo: 9999, chords: ["99:zz"], mix: { drums: { level: 7 } } });
    expect(jam.tempo).toBe(220);
    expect(jam.chords.length).toBeGreaterThan(0);
    expect(jam.mix.drums.level).toBe(1);
    expect(sanitizeJam(null)).toEqual(defaultJam());
  });

  it("round-trips share links, including edited drums", () => {
    const base = applyStyle({ ...defaultJam(), tonic: 4, mode: "major" }, "funk");
    const edited = setChords(
      { ...base, drums: { ...base.drums, rim: "x...x...x...x..." }, drumsEdited: true },
      [{ offset: 0, quality: "9" }, { offset: 5, quality: "9" }],
    );
    const decoded = decodeJam(encodeJam(edited), defaultJam());
    expect(decoded).not.toBeNull();
    expect(decoded!.tonic).toBe(4);
    expect(decoded!.styleId).toBe("funk");
    expect(decoded!.chords).toEqual(edited.chords);
    expect(decoded!.drums.rim).toBe("x...x...x...x...");
    expect(decoded!.progressionId).toBeNull();
    expect(decodeJam("not-a-real-code", defaultJam())).toBeNull();
  });

  it("recognises presets after editing back to them", () => {
    const jam = setChords(defaultJam(), findProgression("epic")!.chords);
    expect(jam.progressionId).toBe("epic");
  });

  it("surprises with a coherent jam", () => {
    let seed = 1;
    const random = () => {
      seed = (seed * 16807) % 2147483647;
      return seed / 2147483647;
    };
    const jam = surpriseJam(defaultJam(), random);
    const preset = findProgression(jam.progressionId!)!;
    expect(preset.mode).toBe(jam.mode);
    expect(jam.styleId).not.toBe(defaultJam().styleId);
  });
});
