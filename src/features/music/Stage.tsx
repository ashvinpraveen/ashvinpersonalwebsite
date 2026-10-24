"use client";

import { AnimatePresence, motion } from "motion/react";
import { ChevronDown } from "lucide-react";
import {
  chordName,
  keyName,
  romanNumeral,
  soloScaleHint,
} from "../../../convex/lib/musicTheory";
import type { JamEngine } from "./engine";
import { grooveFor } from "./grooves";
import type { JamState } from "./jam";
import { usePosition } from "./usePosition";
import { cn } from "@/lib/utils";

type StageProps = {
  jam: JamState;
  engine: JamEngine | null;
  onOpenKey: () => void;
  onOpenGroove: () => void;
};

export default function Stage({ jam, engine, onOpenKey, onOpenGroove }: StageProps) {
  const position = usePosition(engine);
  const groove = grooveFor(jam.styleId);
  const count = jam.chords.length;
  const live = position.playing && position.step >= 0;
  const bar = live ? position.bar % count : 0;
  const chord = jam.chords[bar]!;
  const next = jam.chords[(bar + 1) % count]!;
  const beat = live ? Math.floor(position.step / 4) + 1 : 0;
  const name = chordName(chord, jam.tonic, jam.mode);
  const nextName = chordName(next, jam.tonic, jam.mode);
  // Glance at what's coming in the last beat of the bar.
  const heads = live && position.step >= 12 && count > 1;

  return (
    <section
      className="jam-stage relative overflow-hidden rounded-[1.75rem] p-4 sm:p-6"
      aria-label="Now playing"
    >
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={onOpenKey}
          className="inline-flex h-9 items-center gap-1 rounded-full bg-white/10 px-3 text-sm font-medium transition-colors hover:bg-white/15"
        >
          {keyName(jam.tonic, jam.mode)}
          <ChevronDown size={14} className="opacity-60" />
        </button>
        <button
          type="button"
          onClick={onOpenGroove}
          className="inline-flex h-9 min-w-0 items-center gap-1.5 rounded-full bg-white/10 px-3 text-sm font-medium transition-colors hover:bg-white/15"
        >
          <span aria-hidden="true">{groove.emoji}</span>
          <span className="truncate">{groove.name}</span>
          <span className="tabular-nums opacity-60">· {jam.tempo}</span>
        </button>
      </div>

      <div className="relative mt-5 flex min-h-[9.5rem] items-end justify-between gap-3 sm:min-h-[11rem]">
        <div className="min-w-0">
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.p
              key={`${bar}-${name}`}
              initial={{ opacity: 0, y: 18, filter: "blur(6px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              exit={{ opacity: 0, y: -14, filter: "blur(6px)" }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              className="truncate font-display text-[5.5rem] leading-[0.9] tracking-tight sm:text-[7.5rem]"
            >
              {name}
            </motion.p>
          </AnimatePresence>
          <p className="mt-2 font-mono text-xs tracking-[0.12em] text-white/55">
            {romanNumeral(chord, jam.mode)} · bar {bar + 1}/{count}
            {live && position.loop > 0 ? ` · loop ${position.loop + 1}` : ""}
          </p>
        </div>

        <div
          className={cn(
            "shrink-0 rounded-2xl px-3 py-2 text-right transition-colors duration-150",
            heads ? "bg-white/20" : "bg-white/[0.06]",
          )}
        >
          <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-white/50">Next</p>
          <p className="font-display text-2xl leading-tight tracking-tight sm:text-3xl">
            {nextName}
          </p>
        </div>

        <AnimatePresence>
          {position.countIn > 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.12 }}
              className="absolute -inset-2 flex items-center justify-center gap-6 rounded-2xl bg-[hsl(30_12%_9%)]"
              aria-live="assertive"
              aria-label={`Count in ${position.countIn}`}
            >
              {[1, 2, 3, 4].map((n) => (
                <span
                  key={n}
                  className={cn(
                    "font-display leading-none tabular-nums transition-[opacity,transform,color] duration-100",
                    n === position.countIn
                      ? "scale-100 text-[5.5rem] text-[hsl(var(--jam-hue)_95%_65%)] opacity-100"
                      : n < position.countIn
                        ? "scale-75 text-5xl opacity-25"
                        : "scale-75 text-5xl opacity-10",
                  )}
                >
                  {n}
                </span>
              ))}
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>

      <div className="mt-5 grid grid-cols-4 gap-2" aria-hidden="true">
        {[1, 2, 3, 4].map((b) => (
          <span
            key={b}
            className="jam-led h-2 rounded-full"
            data-on={beat === b || position.countIn === b}
            data-downbeat={b === 1}
          />
        ))}
      </div>

      <p className="mt-4 truncate text-xs text-white/60">
        <span className="text-white/40">Solo with </span>
        {soloScaleHint(jam.tonic, jam.mode, jam.chords)}
      </p>
    </section>
  );
}
