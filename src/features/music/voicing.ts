import {
  CHORD_QUALITIES,
  mod12,
  type Chord,
} from "../../../convex/lib/musicTheory";
import type { BassNote } from "./grooves";

const VOICE_LOW = 52; // E3
const VOICE_HIGH = 76; // E5
const VOICE_CENTER = 63;
const BASS_LOW = 33; // A1

function average(values: number[]) {
  return values.reduce((sum, v) => sum + v, 0) / Math.max(1, values.length);
}

/** Tones the keys play. Big chords drop the fifth; the bass covers the root. */
export function keysTones(chord: Chord) {
  const intervals = CHORD_QUALITIES[chord.quality].intervals;
  if (intervals.length > 4) {
    return intervals.filter((i) => i !== 7);
  }
  return intervals;
}

function candidates(pitchClasses: number[]) {
  const options = pitchClasses.map((pc) => {
    const notes: number[] = [];
    for (let midi = VOICE_LOW; midi <= VOICE_HIGH; midi += 1) {
      if (mod12(midi) === pc) notes.push(midi);
    }
    return notes;
  });
  let results: number[][] = [[]];
  for (const choices of options) {
    const next: number[][] = [];
    for (const partial of results) {
      for (const note of choices) next.push([...partial, note]);
    }
    results = next;
  }
  return results
    .map((notes) => [...notes].sort((a, b) => a - b))
    .filter((notes) => {
      const span = notes[notes.length - 1]! - notes[0]!;
      if (span > 14) return false;
      for (let i = 1; i < notes.length; i += 1) {
        if (notes[i] === notes[i - 1]) return false;
      }
      return true;
    });
}

function movement(from: number[], to: number[]) {
  if (from.length === to.length) {
    return from.reduce((sum, note, i) => sum + Math.abs(note - to[i]!), 0);
  }
  return Math.abs(average(from) - average(to)) * Math.max(from.length, to.length);
}

/** Pick the closest inversion to the previous voicing (smooth voice leading). */
export function voiceChord(chord: Chord, tonic: number, previous: number[] | null) {
  const root = mod12(tonic + chord.offset);
  const pcs = keysTones(chord).map((i) => mod12(root + i));
  const options = candidates(pcs);
  if (options.length === 0) {
    return pcs.map((pc) => 60 + pc);
  }
  let best = options[0]!;
  let bestScore = Number.POSITIVE_INFINITY;
  for (const option of options) {
    const drift = Math.abs(average(option) - VOICE_CENTER);
    const score = previous ? movement(previous, option) + drift * 0.35 : drift;
    if (score < bestScore) {
      bestScore = score;
      best = option;
    }
  }
  return best;
}

export function voiceProgression(chords: Chord[], tonic: number) {
  const voicings: number[][] = [];
  let previous: number[] | null = null;
  for (const chord of chords) {
    const voiced = voiceChord(chord, tonic, previous);
    voicings.push(voiced);
    previous = voiced;
  }
  return voicings;
}

export function bassRoot(chord: Chord, tonic: number) {
  return BASS_LOW + mod12(tonic + chord.offset - BASS_LOW);
}

/** Resolve a groove's bass note into a MIDI note for this bar. */
export function bassMidi(note: BassNote, chord: Chord, next: Chord, tonic: number) {
  const root = bassRoot(chord, tonic);
  const intervals = CHORD_QUALITIES[chord.quality].intervals;
  switch (note) {
    case "3":
      return root + (intervals[1] ?? 4);
    case "5":
      return root + (intervals[2] ?? 7);
    case "7":
      return root + (intervals[3] !== undefined && intervals[3] < 12 ? intervals[3] : 12);
    case "A": {
      const target = bassRoot(next, tonic);
      const below = target - 1;
      // Approach from whichever side is closer to where the line is.
      const above = target + 1;
      return Math.abs(below - root) <= Math.abs(above - root) ? below : above;
    }
    default:
      return root + note;
  }
}
