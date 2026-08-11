import type {
  DrumPatternId,
  MusicKey,
  PadVoiceId,
  ProgressionPresetId,
  RomanNumeral,
} from "./types";

export const DEFAULT_TEMPO_BPM = 96;
export const MIN_TEMPO_BPM = 60;
export const MAX_TEMPO_BPM = 180;
export const DEFAULT_KEY: MusicKey = "G";
export const DEFAULT_BARS = 4;
export const DEFAULT_PAD_VOICE: PadVoiceId = "warm";
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
  "I7",
  "ii",
  "iii",
  "IV",
  "IV7",
  "V",
  "V7",
  "vi",
  "vii°",
];

export const PROGRESSION_PRESETS: Record<
  Exclude<ProgressionPresetId, "custom">,
  { label: string; shortLabel: string; chords: RomanNumeral[] }
> = {
  "blues-12": {
    label: "12-bar blues",
    shortLabel: "Blues",
    chords: [
      "I7",
      "I7",
      "I7",
      "I7",
      "IV7",
      "IV7",
      "I7",
      "I7",
      "V7",
      "IV7",
      "I7",
      "V7",
    ],
  },
  "I-V-vi-IV": {
    label: "Pop axis · I V vi IV",
    shortLabel: "I–V–vi–IV",
    chords: ["I", "V", "vi", "IV"],
  },
  "I-vi-IV-V": {
    label: "Doo-wop · I vi IV V",
    shortLabel: "I–vi–IV–V",
    chords: ["I", "vi", "IV", "V"],
  },
  "vi-IV-I-V": {
    label: "Emotional pop · vi IV I V",
    shortLabel: "vi–IV–I–V",
    chords: ["vi", "IV", "I", "V"],
  },
  "I-IV-V-I": {
    label: "Classic · I IV V I",
    shortLabel: "I–IV–V–I",
    chords: ["I", "IV", "V", "I"],
  },
  "I-IV-I-V": {
    label: "Folk · I IV I V",
    shortLabel: "I–IV–I–V",
    chords: ["I", "IV", "I", "V"],
  },
  "ii-V-I-I": {
    label: "Jazz turnaround · ii V I",
    shortLabel: "ii–V–I",
    chords: ["ii", "V", "I", "I"],
  },
  canon: {
    label: "Canon · I V vi iii IV I IV V",
    shortLabel: "Canon",
    chords: ["I", "V", "vi", "iii", "IV", "I", "IV", "V"],
  },
};

export const PAD_VOICES: Record<
  PadVoiceId,
  { label: string; description: string }
> = {
  warm: {
    label: "Warm pad",
    description: "Soft sine blend",
  },
  rhodes: {
    label: "Rhodes",
    description: "Bell-y electric keys",
  },
  organ: {
    label: "Organ",
    description: "Drawbar-ish stack",
  },
  softSaw: {
    label: "Soft saw",
    description: "Filtered analog wash",
  },
  glass: {
    label: "Glass",
    description: "Shimmering highs",
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
  {
    root: number;
    third: number;
    fifth: number;
    seventh?: number;
    quality: "maj" | "min" | "dim" | "dom7";
  }
> = {
  I: { root: 0, third: 4, fifth: 7, quality: "maj" },
  I7: { root: 0, third: 4, fifth: 7, seventh: 10, quality: "dom7" },
  ii: { root: 2, third: 5, fifth: 9, quality: "min" },
  iii: { root: 4, third: 7, fifth: 11, quality: "min" },
  IV: { root: 5, third: 9, fifth: 12, quality: "maj" },
  IV7: { root: 5, third: 9, fifth: 12, seventh: 15, quality: "dom7" },
  V: { root: 7, third: 11, fifth: 14, quality: "maj" },
  V7: { root: 7, third: 11, fifth: 14, seventh: 17, quality: "dom7" },
  vi: { root: 9, third: 12, fifth: 16, quality: "min" },
  "vii°": { root: 11, third: 14, fifth: 17, quality: "dim" },
};
