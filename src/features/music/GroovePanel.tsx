"use client";

import { RotateCcw } from "lucide-react";
import { STYLE_IDS, type StyleId } from "../../../convex/lib/musicTheory";
import type { JamEngine } from "./engine";
import {
  DRUM_LANES,
  DRUM_LANE_LABELS,
  GROOVES,
  VOICES,
  VOICE_IDS,
  cycleStep,
  type DrumGrid,
  type VoiceId,
} from "./grooves";
import type { JamState } from "./jam";
import { Chip, Label } from "./ui";
import { usePosition } from "./usePosition";
import { cn } from "@/lib/utils";

type GroovePanelProps = {
  jam: JamState;
  engine: JamEngine | null;
  onStyle: (id: StyleId) => void;
  onVoice: (voice: VoiceId) => void;
  onDrums: (drums: DrumGrid) => void;
  onResetDrums: () => void;
};

export default function GroovePanel({
  jam,
  engine,
  onStyle,
  onVoice,
  onDrums,
  onResetDrums,
}: GroovePanelProps) {
  return (
    <div className="space-y-6">
      <div>
        <Label>Style</Label>
        <div className="mt-3 grid grid-cols-3 gap-2">
          {STYLE_IDS.map((id) => {
            const groove = GROOVES[id];
            const active = jam.styleId === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => onStyle(id)}
                aria-pressed={active}
                className={cn(
                  "group relative flex min-h-[5.5rem] flex-col justify-between overflow-hidden rounded-2xl p-3 text-left transition-[transform,background-color] active:scale-[0.97]",
                  active ? "text-white" : "bg-background/70 hover:bg-background",
                )}
                style={
                  active
                    ? {
                        background: `linear-gradient(140deg, hsl(${groove.hue} 70% 42%), hsl(${groove.hue + 30} 65% 28%))`,
                      }
                    : undefined
                }
              >
                <span className="text-2xl leading-none transition-transform group-hover:scale-110" aria-hidden="true">
                  {groove.emoji}
                </span>
                <span>
                  <span className="block text-sm font-semibold leading-tight">{groove.name}</span>
                  <span
                    className={cn(
                      "hidden text-[11px] leading-tight sm:block",
                      active ? "text-white/75" : "text-muted-foreground",
                    )}
                  >
                    {groove.tagline}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <Label>Keys sound</Label>
        <div className="jam-scroll -mx-4 mt-3 flex gap-1.5 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0">
          {VOICE_IDS.map((id) => (
            <Chip key={id} active={jam.voice === id} onClick={() => onVoice(id)} className="shrink-0">
              {VOICES[id].label}
            </Chip>
          ))}
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between gap-3">
          <Label>Drums · tap steps to edit</Label>
          {jam.drumsEdited ? (
            <button
              type="button"
              onClick={onResetDrums}
              className="inline-flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
            >
              <RotateCcw size={12} /> Reset
            </button>
          ) : null}
        </div>
        <DrumMachine drums={jam.drums} engine={engine} onChange={onDrums} />
        <p className="mt-2 text-[11px] text-muted-foreground">
          Tap once for a hit, twice for a ghost note, three times to clear.
        </p>
      </div>
    </div>
  );
}

function DrumMachine({
  drums,
  engine,
  onChange,
}: {
  drums: DrumGrid;
  engine: JamEngine | null;
  onChange: (drums: DrumGrid) => void;
}) {
  const position = usePosition(engine);
  const playhead = position.playing && position.countIn === 0 ? position.step : -1;

  return (
    <div className="mt-3 space-y-1.5 rounded-2xl bg-background/60 p-2.5">
      {DRUM_LANES.map((lane) => (
        <div key={lane} className="flex items-center gap-2">
          <span className="w-10 shrink-0 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
            {DRUM_LANE_LABELS[lane]}
          </span>
          <div className="grid flex-1 grid-cols-4 gap-1.5">
            {[0, 1, 2, 3].map((group) => (
              <div key={group} className="grid grid-cols-4 gap-[3px]">
                {[0, 1, 2, 3].map((i) => {
                  const step = group * 4 + i;
                  const value = drums[lane][step];
                  const isHead = step === playhead;
                  return (
                    <button
                      key={step}
                      type="button"
                      onClick={() => onChange(cycleStep(drums, lane, step))}
                      aria-label={`${DRUM_LANE_LABELS[lane]} step ${step + 1}: ${value === "x" ? "hit" : value === "o" ? "ghost" : "off"}`}
                      className={cn(
                        "h-7 w-full rounded-[5px] transition-[background-color,transform] duration-75",
                        value === "x"
                          ? "bg-[hsl(var(--jam-drums))]"
                          : value === "o"
                            ? "bg-[hsl(var(--jam-drums)/0.4)]"
                            : i === 0
                              ? "bg-foreground/[0.12]"
                              : "bg-foreground/[0.06]",
                        isHead && (value === "." ? "bg-foreground/30" : "scale-110 brightness-125"),
                      )}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
