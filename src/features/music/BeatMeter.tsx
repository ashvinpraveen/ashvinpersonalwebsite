"use client";

import { cn } from "@/lib/utils";
import type { RomanNumeral, TransportState } from "./types";

type BeatMeterProps = {
  transport: TransportState;
  chord?: RomanNumeral;
};

export default function BeatMeter({ transport, chord }: BeatMeterProps) {
  const beats = [1, 2, 3, 4] as const;
  const activeChord = chord ?? transport.chord;

  return (
    <div
      className="rounded-2xl bg-background/70 px-4 py-3"
      aria-live="polite"
      aria-label={
        transport.playing
          ? `Beat ${transport.beat}, chord ${activeChord}`
          : "Transport stopped"
      }
    >
      <div className="flex items-center justify-between gap-3">
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
          Beat
        </p>
        <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
          {transport.playing ? `Bar ${transport.barIndex + 1} · ${activeChord}` : "Ready"}
        </p>
      </div>
      <div className="mt-3 flex items-end justify-between gap-2">
        {beats.map((beat) => {
          const isActive = transport.playing && transport.beat === beat;
          const isOne = beat === 1;
          return (
            <div
              key={beat}
              className={cn(
                "h-2.5 w-full max-w-12 rounded-full transition-all duration-75",
                isActive
                  ? isOne
                    ? "scale-y-125 bg-link shadow-[0_0_14px_hsl(var(--link)/0.35)]"
                    : "scale-y-110 bg-foreground/80"
                  : "bg-foreground/15",
              )}
            />
          );
        })}
      </div>
    </div>
  );
}
