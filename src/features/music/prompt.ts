import { DRUM_PATTERNS, PROGRESSION_PRESETS } from "./config";
import type { BackingTrackParams } from "./types";

function clampTempo(tempoBpm: number) {
  return Math.round(Math.min(180, Math.max(60, tempoBpm)));
}

export function resolveChords(params: Pick<BackingTrackParams, "progressionId" | "chords">) {
  if (params.progressionId === "custom") {
    return params.chords.length > 0 ? params.chords : (["I", "V", "IV", "V"] as const);
  }
  return PROGRESSION_PRESETS[params.progressionId].chords;
}

export function formatChordProgression(params: Pick<BackingTrackParams, "progressionId" | "chords">) {
  return resolveChords(params).join(" – ");
}

export function buildStylePrompt(params: BackingTrackParams) {
  const tempo = clampTempo(params.tempoBpm);
  const chords = formatChordProgression(params);
  const drums = DRUM_PATTERNS[params.drumPatternId];
  const bars = Math.max(1, Math.min(16, Math.round(params.bars)));
  const notes = params.notes.trim();

  const parts = [
    `Instrumental loopable backing track in ${params.key} major`,
    `${tempo} BPM`,
    `4/4 time`,
    `${bars}-bar loop`,
    `chord progression ${chords}`,
    drums.label === "No drums"
      ? "no drums, soft harmonic pads only"
      : `${drums.label} drum groove (${drums.description})`,
    "clean mix, studio quality, seamless loop, no vocals, no lyrics, no singing",
  ];

  if (params.hasMicTake) {
    parts.push("inspired by a hummed or recorded melodic reference from the musician");
  }
  if (notes) {
    parts.push(notes);
  }

  return parts.join(", ");
}

export function buildTrackTitle(params: BackingTrackParams) {
  const chords = resolveChords(params).join("-");
  return `${params.key} ${clampTempo(params.tempoBpm)} ${chords}`.slice(0, 80);
}

export function buildLocalPreviewLabel(params: BackingTrackParams) {
  return `${params.key} · ${clampTempo(params.tempoBpm)} BPM · ${formatChordProgression(params)}`;
}
