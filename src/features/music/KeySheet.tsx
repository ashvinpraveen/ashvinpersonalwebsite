"use client";

import {
  chordName,
  mod12,
  noteName,
  prefersFlats,
  progressionsForMode,
  type Mode,
} from "../../../convex/lib/musicTheory";
import type { JamState } from "./jam";
import { Label, Sheet } from "./ui";
import { cn } from "@/lib/utils";

const FIFTHS = [0, 7, 2, 9, 4, 11, 6, 1, 8, 3, 10, 5];
const SIZE = 320;
const CENTER = SIZE / 2;

function polar(radius: number, angle: number) {
  const rad = ((angle - 90) * Math.PI) / 180;
  return [CENTER + radius * Math.cos(rad), CENTER + radius * Math.sin(rad)] as const;
}

function wedge(inner: number, outer: number, start: number, end: number) {
  const [x1, y1] = polar(outer, start);
  const [x2, y2] = polar(outer, end);
  const [x3, y3] = polar(inner, end);
  const [x4, y4] = polar(inner, start);
  return `M${x1},${y1} A${outer},${outer} 0 0 1 ${x2},${y2} L${x3},${y3} A${inner},${inner} 0 0 0 ${x4},${y4} Z`;
}

type KeySheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  jam: JamState;
  onKey: (tonic: number, mode: Mode) => void;
  onProgression: (id: string) => void;
};

export default function KeySheet({ open, onOpenChange, jam, onKey, onProgression }: KeySheetProps) {
  const activeMajor = jam.mode === "major" ? jam.tonic : mod12(jam.tonic + 3);

  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title="Key & progression"
      description="Outer ring for major keys, inner ring for their relative minors. Chords transpose with you."
    >
      <div className="mx-auto w-full max-w-[20rem]">
        <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="w-full touch-manipulation" role="group" aria-label="Circle of fifths">
          {FIFTHS.map((pc, i) => {
            const start = i * 30 - 15;
            const end = start + 30;
            const minorPc = mod12(pc + 9);
            const majorActive = jam.mode === "major" && jam.tonic === pc;
            const minorActive = jam.mode === "minor" && jam.tonic === minorPc;
            const near = Math.min(
              Math.abs(FIFTHS.indexOf(activeMajor) - i),
              12 - Math.abs(FIFTHS.indexOf(activeMajor) - i),
            ) <= 1;
            const [mx, my] = polar(127, i * 30);
            const [nx, ny] = polar(83, i * 30);
            return (
              <g key={pc}>
                <path
                  d={wedge(104, 156, start + 1, end - 1)}
                  className={cn(
                    "cursor-pointer transition-colors",
                    majorActive
                      ? "fill-foreground"
                      : near
                        ? "fill-[hsl(var(--selection)/0.45)] hover:fill-[hsl(var(--selection)/0.7)]"
                        : "fill-muted hover:fill-accent",
                  )}
                  onClick={() => onKey(pc, "major")}
                  role="button"
                  aria-label={`${noteName(pc, prefersFlats(pc, "major"))} major`}
                  aria-pressed={majorActive}
                />
                <text
                  x={mx}
                  y={my}
                  textAnchor="middle"
                  dominantBaseline="central"
                  className={cn(
                    "pointer-events-none font-display text-[19px]",
                    majorActive ? "fill-background" : "fill-foreground",
                  )}
                >
                  {noteName(pc, prefersFlats(pc, "major"))}
                </text>
                <path
                  d={wedge(62, 102, start + 1, end - 1)}
                  className={cn(
                    "cursor-pointer transition-colors",
                    minorActive
                      ? "fill-foreground"
                      : near
                        ? "fill-[hsl(var(--selection)/0.3)] hover:fill-[hsl(var(--selection)/0.6)]"
                        : "fill-muted/70 hover:fill-accent",
                  )}
                  onClick={() => onKey(minorPc, "minor")}
                  role="button"
                  aria-label={`${noteName(minorPc, prefersFlats(minorPc, "minor"))} minor`}
                  aria-pressed={minorActive}
                />
                <text
                  x={nx}
                  y={ny}
                  textAnchor="middle"
                  dominantBaseline="central"
                  className={cn(
                    "pointer-events-none text-[12px] font-medium",
                    minorActive ? "fill-background" : "fill-muted-foreground",
                  )}
                >
                  {noteName(minorPc, prefersFlats(minorPc, "minor"))}m
                </text>
              </g>
            );
          })}
          <text
            x={CENTER}
            y={CENTER - 8}
            textAnchor="middle"
            className="fill-foreground font-display text-[26px]"
          >
            {noteName(jam.tonic, prefersFlats(jam.tonic, jam.mode))}
            {jam.mode === "minor" ? "m" : ""}
          </text>
          <text
            x={CENTER}
            y={CENTER + 16}
            textAnchor="middle"
            className="fill-muted-foreground font-mono text-[9px] uppercase tracking-[0.2em]"
          >
            {jam.mode}
          </text>
        </svg>
      </div>

      {(["major", "minor"] as const).map((mode) => (
        <div key={mode} className="mt-5">
          <Label>{mode === "major" ? "Major progressions" : "Minor progressions"}</Label>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {progressionsForMode(mode).map((preset) => {
              const active = jam.progressionId === preset.id;
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => onProgression(preset.id)}
                  aria-pressed={active}
                  className={cn(
                    "rounded-2xl px-4 py-3 text-left transition-colors",
                    active ? "bg-foreground text-background" : "bg-muted/70 hover:bg-accent",
                  )}
                >
                  <span className="flex items-baseline justify-between gap-2">
                    <span className="text-sm font-semibold">{preset.name}</span>
                    <span className={cn("text-[11px]", active ? "text-background/60" : "text-muted-foreground")}>
                      {preset.vibe}
                    </span>
                  </span>
                  <span
                    className={cn(
                      "mt-1 block truncate font-mono text-xs",
                      active ? "text-background/75" : "text-foreground/70",
                    )}
                  >
                    {preset.chords
                      .slice(0, 8)
                      .map((ch) => chordName(ch, jam.tonic, mode))
                      .join(" · ")}
                    {preset.chords.length > 8 ? " …" : ""}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </Sheet>
  );
}
