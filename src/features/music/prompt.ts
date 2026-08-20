import { DRUM_PATTERNS, PAD_VOICES, PROGRESSION_PRESETS } from "./config";
import type { BackingTrackParams } from "./types";

export const POLISH_DURATION_MS = 120_000;

function clampTempo(tempoBpm: number) {
  return Math.round(Math.min(180, Math.max(60, tempoBpm)));
}

export function resolveChords(params: Pick<BackingTrackParams, "progressionId" | "chords">) {
  if (params.progressionId === "custom") {
    return params.chords.length > 0 ? params.chords : (["I", "V", "IV", "V"] as const);
  }
  return PROGRESSION_PRESETS[params.progressionId].chords;
}

export function formatChordProgression(
  params: Pick<BackingTrackParams, "progressionId" | "chords">,
) {
  if (params.progressionId !== "custom") {
    return PROGRESSION_PRESETS[params.progressionId].label;
  }
  return resolveChords(params).join(" – ");
}

export function buildPositiveStyles(params: BackingTrackParams) {
  const tempo = clampTempo(params.tempoBpm);
  const drums = DRUM_PATTERNS[params.drumPatternId];
  const pad = PAD_VOICES[params.padVoiceId];
  const chordCount = resolveChords(params).length;
  const bars = Math.max(1, Math.min(16, Math.round(params.bars || chordCount)));
  const isBlues = params.progressionId === "blues-12";
  const notes = params.notes.trim();

  const styles = [
    `${tempo} BPM`,
    isBlues ? `${params.key} blues` : `${params.key} major`,
    isBlues
      ? "classic 12-bar blues harmony"
      : `harmony follows ${formatChordProgression(params)}`,
    `repeating ${bars}-bar form`,
    `${pad.label} inspired harmony`,
    drums.label === "No drums"
      ? "pads and harmony only, no drums"
      : `${drums.label} groove with polished live drums`,
    "started as a rough bedroom demo",
    "then fully re-recorded by professional session musicians",
    "real studio instruments and human performance",
    "radio-ready instrumental practice backing",
    "tight mix with depth and polish",
    "great production quality",
  ];

  if (notes) styles.push(notes);
  return styles.slice(0, 50);
}

export function buildNegativeStyles() {
  return [
    "vocals",
    "lyrics",
    "singing",
    "rap",
    "choir",
    "spoken word",
    "simple sine wave demo",
    "raw oscillator tones",
    "toy synth",
    "MIDI sketch",
    "amateur demo",
    "thin placeholder loop",
    "dramatic intro",
    "big finale",
  ];
}

/** Prompt for ElevenLabs prompt-mode compose (no audio conditioning). */
export function buildStylePrompt(params: BackingTrackParams) {
  const styles = buildPositiveStyles(params);
  const negatives = buildNegativeStyles();
  return [
    "Instrumental practice backing track",
    ...styles,
    "avoid: " + negatives.join(", "),
  ].join(", ");
}

export function buildTrackTitle(params: BackingTrackParams) {
  if (params.progressionId !== "custom") {
    const short = PROGRESSION_PRESETS[params.progressionId].shortLabel;
    return `${params.key} ${clampTempo(params.tempoBpm)} ${short}`.slice(0, 80);
  }
  const chords = resolveChords(params).join("-");
  return `${params.key} ${clampTempo(params.tempoBpm)} ${chords}`.slice(0, 80);
}

export function buildLocalPreviewLabel(params: BackingTrackParams) {
  return `${params.key} · ${clampTempo(params.tempoBpm)} BPM · ${formatChordProgression(params)}`;
}
