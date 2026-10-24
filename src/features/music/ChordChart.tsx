"use client";

import { Plus } from "lucide-react";
import { MAX_BARS, chordName, romanNumeral } from "../../../convex/lib/musicTheory";
import type { JamEngine } from "./engine";
import type { JamState } from "./jam";
import { usePosition } from "./usePosition";
import { cn } from "@/lib/utils";

type ChordChartProps = {
  jam: JamState;
  engine: JamEngine | null;
  onEdit: (index: number) => void;
  onAdd: () => void;
};

export default function ChordChart({ jam, engine, onEdit, onAdd }: ChordChartProps) {
  const position = usePosition(engine);
  const live = position.playing && position.step >= 0;
  const activeBar = live ? position.bar % jam.chords.length : -1;
  const progress = live ? (position.step + 1) / 16 : 0;

  return (
    <ol className="grid grid-cols-4 gap-2">
      {jam.chords.map((chord, index) => {
        const active = index === activeBar;
        const name = chordName(chord, jam.tonic, jam.mode);
        return (
          <li key={index}>
            <button
              type="button"
              onClick={() => onEdit(index)}
              aria-label={`Bar ${index + 1}: ${name}. Tap to change.`}
              className={cn(
                "relative flex h-[4.5rem] w-full flex-col justify-between overflow-hidden rounded-2xl px-2.5 py-2 text-left transition-[background-color,transform] duration-150 active:scale-[0.97]",
                active
                  ? "bg-foreground text-background"
                  : "bg-background/70 hover:bg-background",
              )}
            >
              <span
                className={cn(
                  "font-mono text-[10px] tracking-[0.08em]",
                  active ? "text-background/60" : "text-muted-foreground",
                )}
              >
                {index + 1} · {romanNumeral(chord, jam.mode)}
              </span>
              <span
                className={cn(
                  "truncate font-display leading-none tracking-tight",
                  name.length > 5 ? "text-base sm:text-xl" : name.length > 3 ? "text-lg sm:text-2xl" : "text-xl sm:text-2xl",
                )}
              >
                {name}
              </span>
              {active ? (
                <span
                  className="absolute bottom-0 left-0 h-1 bg-[hsl(var(--jam-hue)_90%_60%)] transition-[width] duration-100 ease-linear"
                  style={{ width: `${progress * 100}%` }}
                  aria-hidden="true"
                />
              ) : null}
            </button>
          </li>
        );
      })}
      {jam.chords.length < MAX_BARS ? (
        <li>
          <button
            type="button"
            onClick={onAdd}
            className="flex h-[4.5rem] w-full flex-col items-center justify-center gap-1 rounded-2xl border border-dashed border-foreground/20 text-muted-foreground transition-colors hover:border-foreground/40 hover:text-foreground"
            aria-label="Add a bar"
          >
            <Plus size={18} />
            <span className="text-[11px]">Add bar</span>
          </button>
        </li>
      ) : null}
    </ol>
  );
}
