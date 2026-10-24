import type { StyleId } from "../../../convex/lib/musicTheory";

export const DRUM_LANES = ["kick", "snare", "rim", "hat", "open", "ride"] as const;
export type DrumLane = (typeof DRUM_LANES)[number];

/** 16 chars per lane: "x" hit, "o" ghost, "." rest. */
export type DrumGrid = Record<DrumLane, string>;

export const DRUM_LANE_LABELS: Record<DrumLane, string> = {
  kick: "Kick",
  snare: "Snare",
  rim: "Rim",
  hat: "Hat",
  open: "Open",
  ride: "Ride",
};

export type VoiceId = "epiano" | "piano" | "organ" | "pad" | "pluck";

export const VOICES: Record<VoiceId, { label: string; blurb: string }> = {
  epiano: { label: "Rhodes", blurb: "Bell-y electric keys" },
  piano: { label: "Piano", blurb: "Bright and percussive" },
  organ: { label: "Organ", blurb: "Drawbars, slight wobble" },
  pad: { label: "Pad", blurb: "Lush analog wash" },
  pluck: { label: "Pluck", blurb: "Guitar-ish stabs" },
};

export const VOICE_IDS = Object.keys(VOICES) as VoiceId[];

/**
 * Bass note: semitones above the chord root, or a chord-relative tone:
 * "3" third, "5" fifth, "7" seventh (falls back to octave), "A" chromatic
 * approach into the next bar's root.
 */
export type BassNote = number | "3" | "5" | "7" | "A";
export type BassEvent = { s: number; l: number; n: BassNote; v?: number };
export type CompEvent = { s: number; l: number; v?: number };

export type Groove = {
  id: StyleId;
  name: string;
  emoji: string;
  tagline: string;
  /** Hue used for the style card and stage glow. */
  hue: number;
  tempo: number;
  swing: { grid: 8 | 16; amount: number };
  voice: VoiceId;
  drums: DrumGrid;
  bass: BassEvent[];
  comp: CompEvent[];
};

const EMPTY = "................";

function grid(partial: Partial<DrumGrid>): DrumGrid {
  return {
    kick: partial.kick ?? EMPTY,
    snare: partial.snare ?? EMPTY,
    rim: partial.rim ?? EMPTY,
    hat: partial.hat ?? EMPTY,
    open: partial.open ?? EMPTY,
    ride: partial.ride ?? EMPTY,
  };
}

const eighths = (n: BassNote = 0, v = 0.85): BassEvent[] =>
  [0, 2, 4, 6, 8, 10, 12, 14].map((s) => ({ s, l: 2, n, v: s % 4 === 0 ? v : v * 0.8 }));

export const GROOVES: Record<StyleId, Groove> = {
  lofi: {
    id: "lofi",
    name: "Lo-fi",
    emoji: "☕",
    tagline: "Dusty, lazy, swung",
    hue: 28,
    tempo: 80,
    swing: { grid: 16, amount: 0.6 },
    voice: "epiano",
    drums: grid({
      kick: "x......x..x.....",
      snare: "....x.......x...",
      hat: "x.o.x.o.x.o.x.oo",
    }),
    bass: [
      { s: 0, l: 6, n: 0 },
      { s: 7, l: 3, n: 0, v: 0.7 },
      { s: 10, l: 5, n: "5", v: 0.75 },
    ],
    comp: [
      { s: 0, l: 10, v: 0.9 },
      { s: 10, l: 6, v: 0.55 },
    ],
  },
  pop: {
    id: "pop",
    name: "Pop",
    emoji: "✨",
    tagline: "Bright, tight, radio",
    hue: 330,
    tempo: 104,
    swing: { grid: 16, amount: 0.5 },
    voice: "piano",
    drums: grid({
      kick: "x.......x.x.....",
      snare: "....x.......x...",
      hat: "x.x.x.x.x.x.x.x.",
      open: "..............o.",
    }),
    bass: eighths(0),
    comp: [
      { s: 0, l: 6, v: 0.9 },
      { s: 6, l: 4, v: 0.65 },
      { s: 10, l: 6, v: 0.75 },
    ],
  },
  rock: {
    id: "rock",
    name: "Rock",
    emoji: "🎸",
    tagline: "Big drums, organ wall",
    hue: 8,
    tempo: 120,
    swing: { grid: 8, amount: 0.5 },
    voice: "organ",
    drums: grid({
      kick: "x.....x.x.x.....",
      snare: "....x.......x...",
      hat: "x.x.x.x.x.x.x...",
      open: "..............x.",
    }),
    bass: eighths(0, 0.9),
    comp: [
      { s: 0, l: 8, v: 0.85 },
      { s: 8, l: 8, v: 0.75 },
    ],
  },
  shuffle: {
    id: "shuffle",
    name: "Blues shuffle",
    emoji: "🎷",
    tagline: "Triplet strut, boogie bass",
    hue: 215,
    tempo: 92,
    swing: { grid: 8, amount: 0.67 },
    voice: "piano",
    drums: grid({
      kick: "x.......x.......",
      snare: "....x.......x...",
      hat: "x.x.x.x.x.x.x.x.",
    }),
    bass: [0, "3", "5", 9, 10, 9, "5", "3"].map((n, i) => ({
      s: i * 2,
      l: 2,
      n: n as BassNote,
      v: i % 2 === 0 ? 0.9 : 0.7,
    })),
    comp: [
      { s: 2, l: 2, v: 0.7 },
      { s: 6, l: 2, v: 0.6 },
      { s: 10, l: 2, v: 0.7 },
      { s: 14, l: 2, v: 0.6 },
    ],
  },
  jazz: {
    id: "jazz",
    name: "Jazz swing",
    emoji: "🎺",
    tagline: "Ride, walk, comp",
    hue: 262,
    tempo: 132,
    swing: { grid: 8, amount: 0.66 },
    voice: "piano",
    drums: grid({
      kick: "o...o...o...o...",
      snare: "..........o.....",
      hat: "....x.......x...",
      ride: "x...x.x.x...x.x.",
    }),
    bass: [
      { s: 0, l: 4, n: 0 },
      { s: 4, l: 4, n: "3", v: 0.8 },
      { s: 8, l: 4, n: "5", v: 0.85 },
      { s: 12, l: 4, n: "A", v: 0.8 },
    ],
    comp: [
      { s: 0, l: 3, v: 0.7 },
      { s: 6, l: 2, v: 0.6 },
    ],
  },
  bossa: {
    id: "bossa",
    name: "Bossa nova",
    emoji: "🌴",
    tagline: "Rim clicks and sunshine",
    hue: 160,
    tempo: 120,
    swing: { grid: 16, amount: 0.5 },
    voice: "pluck",
    drums: grid({
      kick: "x..ox..ox..ox..o",
      rim: "x..x..x...x..x..",
      hat: "xoxoxoxoxoxoxoxo",
    }),
    bass: [
      { s: 0, l: 6, n: 0 },
      { s: 6, l: 2, n: "5", v: 0.75 },
      { s: 8, l: 6, n: "5", v: 0.85 },
      { s: 14, l: 2, n: 0, v: 0.7 },
    ],
    comp: [
      { s: 0, l: 2, v: 0.8 },
      { s: 3, l: 2, v: 0.6 },
      { s: 6, l: 2, v: 0.7 },
      { s: 10, l: 2, v: 0.65 },
      { s: 12, l: 3, v: 0.7 },
    ],
  },
  funk: {
    id: "funk",
    name: "Funk",
    emoji: "🕺",
    tagline: "Ghost notes, octave pops",
    hue: 48,
    tempo: 100,
    swing: { grid: 16, amount: 0.54 },
    voice: "pluck",
    drums: grid({
      kick: "x.....x..x.x....",
      snare: "....x..o.o..x..o",
      hat: "xoxoxoxoxoxoxoxo",
      open: "..........x.....",
    }),
    bass: [
      { s: 0, l: 2, n: 0 },
      { s: 3, l: 1, n: 12, v: 0.75 },
      { s: 6, l: 1, n: 0, v: 0.8 },
      { s: 7, l: 1, n: 12, v: 0.7 },
      { s: 10, l: 2, n: 0, v: 0.85 },
      { s: 12, l: 1, n: "7", v: 0.7 },
      { s: 14, l: 1, n: 12, v: 0.75 },
    ],
    comp: [
      { s: 2, l: 1, v: 0.8 },
      { s: 5, l: 1, v: 0.6 },
      { s: 8, l: 1, v: 0.75 },
      { s: 11, l: 1, v: 0.6 },
      { s: 14, l: 1, v: 0.75 },
    ],
  },
  reggae: {
    id: "reggae",
    name: "Reggae",
    emoji: "🌞",
    tagline: "One drop, offbeat skank",
    hue: 95,
    tempo: 76,
    swing: { grid: 16, amount: 0.55 },
    voice: "pluck",
    drums: grid({
      kick: "........x.......",
      rim: "........x.......",
      hat: "x.o.x.o.x.o.x.o.",
    }),
    bass: [
      { s: 0, l: 3, n: 0 },
      { s: 4, l: 2, n: "5", v: 0.8 },
      { s: 6, l: 2, n: 12, v: 0.75 },
      { s: 10, l: 2, n: "5", v: 0.8 },
      { s: 12, l: 3, n: "3", v: 0.8 },
    ],
    comp: [
      { s: 2, l: 1, v: 0.75 },
      { s: 6, l: 1, v: 0.7 },
      { s: 10, l: 1, v: 0.75 },
      { s: 14, l: 1, v: 0.7 },
    ],
  },
  ballad: {
    id: "ballad",
    name: "Ballad",
    emoji: "🌙",
    tagline: "Slow, lush, spacious",
    hue: 235,
    tempo: 68,
    swing: { grid: 16, amount: 0.5 },
    voice: "pad",
    drums: grid({
      kick: "x.........x.....",
      rim: "....x.......x...",
      hat: "o...o...o...o...",
    }),
    bass: [
      { s: 0, l: 8, n: 0 },
      { s: 8, l: 8, n: "5", v: 0.75 },
    ],
    comp: [{ s: 0, l: 16, v: 0.85 }],
  },
};

export function grooveFor(id: StyleId) {
  return GROOVES[id] ?? GROOVES.lofi;
}

export function cloneGrid(drums: DrumGrid): DrumGrid {
  return { ...drums };
}

/** Cycle a step: rest → hit → ghost → rest. */
export function cycleStep(drums: DrumGrid, lane: DrumLane, step: number): DrumGrid {
  const row = drums[lane].padEnd(16, ".").slice(0, 16);
  const current = row[step];
  const next = current === "x" ? "o" : current === "o" ? "." : "x";
  return { ...drums, [lane]: row.slice(0, step) + next + row.slice(step + 1) };
}

export function gridsEqual(a: DrumGrid, b: DrumGrid) {
  return DRUM_LANES.every((lane) => a[lane] === b[lane]);
}
