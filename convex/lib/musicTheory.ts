/**
 * Pure music theory shared by the /music studio (client) and the ElevenLabs
 * prompt builder (Convex). No runtime imports so both bundles can use it.
 *
 * Chords are stored relative to the tonic (`offset` in semitones) so a whole
 * progression transposes when the key changes.
 */

export type Mode = "major" | "minor";

export type ChordQuality =
  | "maj"
  | "min"
  | "dim"
  | "aug"
  | "sus2"
  | "sus4"
  | "7"
  | "maj7"
  | "m7"
  | "m7b5"
  | "dim7"
  | "6"
  | "add9"
  | "9"
  | "m9";

export type Chord = { offset: number; quality: ChordQuality };

export type StyleId =
  | "lofi"
  | "pop"
  | "rock"
  | "shuffle"
  | "jazz"
  | "bossa"
  | "funk"
  | "reggae"
  | "ballad";

export const STYLE_IDS: StyleId[] = [
  "lofi",
  "pop",
  "rock",
  "shuffle",
  "jazz",
  "bossa",
  "funk",
  "reggae",
  "ballad",
];

/** Words used to describe each groove to the music model. */
export const STYLE_PROMPTS: Record<StyleId, { name: string; prompt: string }> = {
  lofi: {
    name: "Lo-fi",
    prompt: "lo-fi hip hop, dusty swung drums, mellow Rhodes, warm round bass, tape warmth",
  },
  pop: {
    name: "Pop",
    prompt: "modern pop band, punchy drums, clean piano and synth pads, tight bass",
  },
  rock: {
    name: "Rock",
    prompt: "classic rock band, driving live drums, overdriven rhythm guitar, organ, picked bass",
  },
  shuffle: {
    name: "Blues shuffle",
    prompt: "Chicago blues shuffle, triplet swing feel, boogie bass line, piano and guitar comping",
  },
  jazz: {
    name: "Jazz swing",
    prompt: "small jazz combo, swinging ride cymbal and brushes, walking upright bass, piano comping",
  },
  bossa: {
    name: "Bossa nova",
    prompt: "bossa nova, nylon guitar, soft rim clicks and shaker, gentle upright bass",
  },
  funk: {
    name: "Funk",
    prompt: "tight funk groove, syncopated drums with ghost notes, slap bass, clavinet stabs",
  },
  reggae: {
    name: "Reggae",
    prompt: "roots reggae one drop, offbeat organ and guitar skank, deep melodic bass",
  },
  ballad: {
    name: "Ballad",
    prompt: "slow ballad, soft brushes, lush pads and piano, sustained bass",
  },
};

export const CHORD_QUALITIES: Record<
  ChordQuality,
  { intervals: number[]; suffix: string; minorish: boolean; label: string }
> = {
  maj: { intervals: [0, 4, 7], suffix: "", minorish: false, label: "Major" },
  min: { intervals: [0, 3, 7], suffix: "m", minorish: true, label: "Minor" },
  dim: { intervals: [0, 3, 6], suffix: "°", minorish: true, label: "Dim" },
  aug: { intervals: [0, 4, 8], suffix: "+", minorish: false, label: "Aug" },
  sus2: { intervals: [0, 2, 7], suffix: "sus2", minorish: false, label: "Sus2" },
  sus4: { intervals: [0, 5, 7], suffix: "sus4", minorish: false, label: "Sus4" },
  "7": { intervals: [0, 4, 7, 10], suffix: "7", minorish: false, label: "Dom 7" },
  maj7: { intervals: [0, 4, 7, 11], suffix: "maj7", minorish: false, label: "Maj 7" },
  m7: { intervals: [0, 3, 7, 10], suffix: "m7", minorish: true, label: "Min 7" },
  m7b5: { intervals: [0, 3, 6, 10], suffix: "ø7", minorish: true, label: "Half-dim" },
  dim7: { intervals: [0, 3, 6, 9], suffix: "°7", minorish: true, label: "Dim 7" },
  "6": { intervals: [0, 4, 7, 9], suffix: "6", minorish: false, label: "6th" },
  add9: { intervals: [0, 4, 7, 14], suffix: "add9", minorish: false, label: "Add 9" },
  "9": { intervals: [0, 4, 7, 10, 14], suffix: "9", minorish: false, label: "Dom 9" },
  m9: { intervals: [0, 3, 7, 10, 14], suffix: "m9", minorish: true, label: "Min 9" },
};

export const QUALITY_IDS = Object.keys(CHORD_QUALITIES) as ChordQuality[];

export const MODE_SCALES: Record<Mode, number[]> = {
  major: [0, 2, 4, 5, 7, 9, 11],
  minor: [0, 2, 3, 5, 7, 8, 10],
};

const SHARP_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const FLAT_NAMES = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"];

/** Keys whose signature uses flats (by tonic pitch class). */
const FLAT_MAJOR_TONICS = new Set([5, 10, 3, 8, 1]);
const FLAT_MINOR_TONICS = new Set([2, 7, 0, 5, 10, 3]);

export function mod12(value: number) {
  return ((value % 12) + 12) % 12;
}

export function prefersFlats(tonic: number, mode: Mode) {
  return mode === "major"
    ? FLAT_MAJOR_TONICS.has(mod12(tonic))
    : FLAT_MINOR_TONICS.has(mod12(tonic));
}

export function noteName(pitchClass: number, flats: boolean) {
  return (flats ? FLAT_NAMES : SHARP_NAMES)[mod12(pitchClass)]!;
}

export function tonicLabel(tonic: number, mode: Mode) {
  return noteName(tonic, prefersFlats(tonic, mode));
}

export function keyName(tonic: number, mode: Mode) {
  return `${tonicLabel(tonic, mode)} ${mode}`;
}

/** Chromatic offsets spelled as raised degrees (the rest are lowered). */
const RAISED: Record<Mode, Set<number>> = {
  major: new Set([6]),
  minor: new Set([4, 9, 11]),
};

/** Scale degree (0–6) and accidental (-1, 0, 1) for an offset from the tonic. */
export function degreeOf(offset: number, mode: Mode) {
  const value = mod12(offset);
  const scale = MODE_SCALES[mode];
  const exact = scale.indexOf(value);
  if (exact >= 0) return { degree: exact, accidental: 0 };
  if (RAISED[mode].has(value)) {
    return { degree: scale.indexOf(mod12(value - 1)), accidental: 1 };
  }
  return { degree: scale.indexOf(mod12(value + 1)), accidental: -1 };
}

const LETTERS = ["C", "D", "E", "F", "G", "A", "B"];
const LETTER_PCS = [0, 2, 4, 5, 7, 9, 11];

/** Spell a root by its degree in the key, so ♭II in A minor is Bb, not A#. */
export function rootName(offset: number, tonic: number, mode: Mode) {
  const pc = mod12(tonic + offset);
  const tonicLetter = LETTERS.indexOf(tonicLabel(tonic, mode)[0]!);
  const { degree } = degreeOf(offset, mode);
  const letter = (tonicLetter + degree) % 7;
  const diff = mod12(pc - LETTER_PCS[letter]!);
  if (diff === 0) return LETTERS[letter]!;
  if (diff === 1) return `${LETTERS[letter]}#`;
  if (diff === 11) return `${LETTERS[letter]}b`;
  return noteName(pc, prefersFlats(tonic, mode));
}

export function chordName(chord: Chord, tonic: number, mode: Mode) {
  return `${rootName(chord.offset, tonic, mode)}${CHORD_QUALITIES[chord.quality].suffix}`;
}

const ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII"];

/** Roman numeral relative to the mode, e.g. vi7, ♭VII, iiø7. */
export function romanNumeral(chord: Chord, mode: Mode) {
  const { degree, accidental: shift } = degreeOf(chord.offset, mode);
  const accidental = shift < 0 ? "♭" : shift > 0 ? "♯" : "";
  const info = CHORD_QUALITIES[chord.quality];
  const base = ROMAN[degree] ?? "I";
  const numeral = info.minorish ? base.toLowerCase() : base;
  const suffix =
    chord.quality === "maj" || chord.quality === "min"
      ? ""
      : chord.quality === "m7"
        ? "7"
        : chord.quality === "m9"
          ? "9"
          : info.minorish
            ? info.suffix.replace(/^m/, "")
            : info.suffix;
  return `${accidental}${numeral}${suffix}`;
}

/** Diatonic triads (or sevenths) for the palette. */
export function diatonicChords(mode: Mode, sevenths: boolean): Chord[] {
  const scale = MODE_SCALES[mode];
  return scale.map((offset, i) => {
    const third = mod12(scale[(i + 2) % 7]! - offset);
    const fifth = mod12(scale[(i + 4) % 7]! - offset);
    const seventh = mod12(scale[(i + 6) % 7]! - offset);
    let quality: ChordQuality;
    if (third === 4) {
      quality = sevenths ? (seventh === 11 ? "maj7" : "7") : "maj";
    } else if (fifth === 6) {
      quality = sevenths ? "m7b5" : "dim";
    } else {
      quality = sevenths ? "m7" : "min";
    }
    return { offset, quality };
  });
}

export function chordPitchClasses(chord: Chord, tonic: number) {
  return CHORD_QUALITIES[chord.quality].intervals.map((i) => mod12(tonic + chord.offset + i));
}

/** Compact string token for a chord, e.g. "9:m7" (offset:quality). */
export function chordToken(chord: Chord) {
  return `${mod12(chord.offset)}:${chord.quality}`;
}

export function parseChordToken(token: string): Chord | null {
  const match = /^(\d{1,2}):([a-z0-9]+)$/.exec(token.trim());
  if (!match) return null;
  const offset = Number(match[1]);
  const quality = match[2] as ChordQuality;
  if (!Number.isInteger(offset) || offset < 0 || offset > 11) return null;
  if (!(quality in CHORD_QUALITIES)) return null;
  return { offset, quality };
}

const c = (offset: number, quality: ChordQuality): Chord => ({ offset, quality });

export type ProgressionPreset = {
  id: string;
  name: string;
  vibe: string;
  mode: Mode;
  chords: Chord[];
};

export const PROGRESSIONS: ProgressionPreset[] = [
  { id: "axis", name: "Pop axis", vibe: "Every chart hit ever", mode: "major", chords: [c(0, "maj"), c(7, "maj"), c(9, "min"), c(5, "maj")] },
  { id: "doowop", name: "Doo-wop", vibe: "50s sock hop", mode: "major", chords: [c(0, "maj"), c(9, "min"), c(5, "maj"), c(7, "maj")] },
  { id: "sadpop", name: "Sad pop", vibe: "Heartbreak anthem", mode: "major", chords: [c(9, "min"), c(5, "maj"), c(0, "maj"), c(7, "maj")] },
  { id: "blues", name: "12-bar blues", vibe: "The one everyone jams", mode: "major", chords: [c(0, "7"), c(0, "7"), c(0, "7"), c(0, "7"), c(5, "7"), c(5, "7"), c(0, "7"), c(0, "7"), c(7, "7"), c(5, "7"), c(0, "7"), c(7, "7")] },
  { id: "two-five", name: "ii–V–I", vibe: "Jazz 101", mode: "major", chords: [c(2, "m7"), c(7, "7"), c(0, "maj7"), c(0, "maj7")] },
  { id: "neosoul", name: "Neo-soul", vibe: "Silky turnaround", mode: "major", chords: [c(0, "maj7"), c(9, "m7"), c(2, "m7"), c(7, "9")] },
  { id: "royal", name: "Royal road", vibe: "J-pop lift", mode: "major", chords: [c(5, "maj7"), c(7, "7"), c(4, "m7"), c(9, "min")] },
  { id: "canon", name: "Canon", vibe: "Pachelbel's greatest hit", mode: "major", chords: [c(0, "maj"), c(7, "maj"), c(9, "min"), c(4, "min"), c(5, "maj"), c(0, "maj"), c(5, "maj"), c(7, "maj")] },
  { id: "mixo", name: "Mixolydian rock", vibe: "Stadium swagger", mode: "major", chords: [c(0, "maj"), c(10, "maj"), c(5, "maj"), c(0, "maj")] },
  { id: "folk", name: "Campfire", vibe: "Three chords & the truth", mode: "major", chords: [c(0, "maj"), c(5, "maj"), c(0, "maj"), c(7, "maj")] },
  { id: "andalusian", name: "Andalusian", vibe: "Flamenco drama", mode: "minor", chords: [c(0, "min"), c(10, "maj"), c(8, "maj"), c(7, "7")] },
  { id: "epic", name: "Epic minor", vibe: "Movie trailer energy", mode: "minor", chords: [c(0, "min"), c(8, "maj"), c(3, "maj"), c(10, "maj")] },
  { id: "minorpop", name: "Minor pop", vibe: "Moody radio", mode: "minor", chords: [c(0, "min"), c(5, "min"), c(10, "maj"), c(3, "maj")] },
  { id: "dorian", name: "Dorian vamp", vibe: "Two-chord funk jam", mode: "minor", chords: [c(0, "m7"), c(5, "7"), c(0, "m7"), c(5, "7")] },
  { id: "lofi-minor", name: "Late-night lo-fi", vibe: "Rainy window", mode: "minor", chords: [c(0, "m9"), c(5, "m7"), c(10, "9"), c(3, "maj7")] },
  { id: "minor-blues", name: "Minor blues", vibe: "The Thrill Is Gone", mode: "minor", chords: [c(0, "m7"), c(0, "m7"), c(0, "m7"), c(0, "m7"), c(5, "m7"), c(5, "m7"), c(0, "m7"), c(0, "m7"), c(8, "7"), c(7, "7"), c(0, "m7"), c(7, "7")] },
  { id: "minor-251", name: "Minor ii–V–i", vibe: "Noir jazz", mode: "minor", chords: [c(2, "m7b5"), c(7, "7"), c(0, "m7"), c(0, "m7")] },
];

export function progressionsForMode(mode: Mode) {
  return PROGRESSIONS.filter((p) => p.mode === mode);
}

export function findProgression(id: string) {
  return PROGRESSIONS.find((p) => p.id === id) ?? null;
}

/** What to noodle with over the changes. */
export function soloScaleHint(tonic: number, mode: Mode, chords: Chord[]) {
  const name = tonicLabel(tonic, mode);
  const dominantHeavy =
    chords.length > 0 &&
    chords.filter((ch) => ch.quality === "7" || ch.quality === "9").length / chords.length >= 0.5;
  if (mode === "major" && dominantHeavy) return `${name} blues · ${name} major pentatonic`;
  if (mode === "major") return `${name} major pentatonic · ${name} major`;
  const dorianish = chords.some((ch) => mod12(ch.offset) === 5 && !CHORD_QUALITIES[ch.quality].minorish);
  if (dorianish) return `${name} dorian · ${name} minor pentatonic`;
  return `${name} minor pentatonic · ${name} blues`;
}

export const MIN_TEMPO = 40;
export const MAX_TEMPO = 220;
export const MAX_BARS = 16;

export function clampTempo(value: number) {
  if (!Number.isFinite(value)) return 96;
  return Math.round(Math.min(MAX_TEMPO, Math.max(MIN_TEMPO, value)));
}

export type PolishSpec = {
  tonic: number;
  mode: Mode;
  tempoBpm: number;
  styleId: StyleId;
  chords: Chord[];
  notes: string;
};

/** Text prompt for ElevenLabs Music, built from validated structured params only. */
export function buildPolishPrompt(spec: PolishSpec) {
  const style = STYLE_PROMPTS[spec.styleId];
  const names = spec.chords.map((ch) => chordName(ch, spec.tonic, spec.mode));
  const notes = spec.notes.replace(/\s+/g, " ").trim().slice(0, 240);
  const parts = [
    "Instrumental practice backing track",
    `${clampTempo(spec.tempoBpm)} BPM`,
    `key of ${keyName(spec.tonic, spec.mode)}`,
    style.prompt,
    `chord progression repeating every ${names.length} bars: ${names.join(" | ")}`,
    "one chord per bar, steady form the whole time so a soloist can play along",
    "real studio musicians, warm polished mix, great production quality",
    "about two minutes long",
  ];
  if (notes) parts.push(`extra direction: ${notes}`);
  parts.push(
    "avoid: vocals, lyrics, singing, choir, spoken word, lead melody that competes with a soloist, dramatic intro, big finale, key changes",
  );
  return parts.join(", ");
}

export function buildPolishTitle(spec: PolishSpec) {
  const style = STYLE_PROMPTS[spec.styleId].name;
  return `${keyName(spec.tonic, spec.mode)} · ${style} · ${clampTempo(spec.tempoBpm)} BPM`;
}
