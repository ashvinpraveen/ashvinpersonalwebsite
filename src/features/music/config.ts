import type {
  DrumPatternId,
  MusicKey,
  ProgressionPresetId,
  RomanNumeral,
} from "./types";

export const DEFAULT_TEMPO_BPM = 96;
export const MIN_TEMPO_BPM = 60;
export const MAX_TEMPO_BPM = 180;
export const DEFAULT_KEY: MusicKey = "G";
export const DEFAULT_BARS = 4;
export const TAP_TEMPO_WINDOW_MS = 2500;
export const MAX_MIC_SECONDS = 20;
export const MUSIC_CLIENT_ID_KEY = "ashvin-music-client-id-v1";
export const MUSIC_DRAFT_KEY = "ashvin-music-draft-v1";

export const KEYS: MusicKey[] = [
  "C",
  "C#",
  "D",
  "Eb",
  "E",
  "F",
  "F#",
  "G",
  "Ab",
  "A",
  "Bb",
  "B",
];

export const ROMAN_OPTIONS: RomanNumeral[] = [
  "I",
  "ii",
  "iii",
  "IV",
  "V",
  "vi",
  "vii°",
];

export const PROGRESSION_PRESETS: Record<
  Exclude<ProgressionPresetId, "custom">,
  { label: string; chords: RomanNumeral[] }
> = {
  "I-V-vi-IV": {
    label: "I · V · vi · IV",
    chords: ["I", "V", "vi", "IV"],
  },
  "I-IV-V-I": {
    label: "I · IV · V · I",
    chords: ["I", "IV", "V", "I"],
  },
  "I-V-IV-V": {
    label: "I · V · IV · V",
    chords: ["I", "V", "IV", "V"],
  },
  "ii-V-I-I": {
    label: "ii · V · I · I",
    chords: ["ii", "V", "I", "I"],
  },
  "I-vi-IV-V": {
    label: "I · vi · IV · V",
    chords: ["I", "vi", "IV", "V"],
  },
};

export const DRUM_PATTERNS: Record<
  DrumPatternId,
  { label: string; description: string }
> = {
  none: {
    label: "No drums",
    description: "Pads and harmony only",
  },
  fourFloor: {
    label: "Four on the floor",
    description: "Steady 4/4 kick pulse",
  },
  softPop: {
    label: "Soft pop",
    description: "Light kick + snare backbeat",
  },
  rockBasic: {
    label: "Rock basic",
    description: "Kick / snare / open hats",
  },
  boomBap: {
    label: "Boom bap",
    description: "Hip-hop pocket with swung hats",
  },
};

export const KEY_SEMITONE: Record<MusicKey, number> = {
  C: 0,
  "C#": 1,
  D: 2,
  Eb: 3,
  E: 4,
  F: 5,
  "F#": 6,
  G: 7,
  Ab: 8,
  A: 9,
  Bb: 10,
  B: 11,
};

/** Scale degrees (semitones from tonic) for major-key roman numerals. */
export const ROMAN_INTERVALS: Record<
  RomanNumeral,
  { root: number; third: number; fifth: number; quality: "maj" | "min" | "dim" }
> = {
  I: { root: 0, third: 4, fifth: 7, quality: "maj" },
  ii: { root: 2, third: 5, fifth: 9, quality: "min" },
  iii: { root: 4, third: 7, fifth: 11, quality: "min" },
  IV: { root: 5, third: 9, fifth: 12, quality: "maj" },
  V: { root: 7, third: 11, fifth: 14, quality: "maj" },
  vi: { root: 9, third: 12, fifth: 16, quality: "min" },
  "vii°": { root: 11, third: 14, fifth: 17, quality: "dim" },
};
