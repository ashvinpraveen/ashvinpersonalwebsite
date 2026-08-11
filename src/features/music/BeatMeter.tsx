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
      className="rounded-2xl border border-[var(--music-line)] bg-[var(--music-inset)] px-4 py-3"
      aria-live="polite"
      aria-label={
        transport.playing
          ? `Beat ${transport.beat}, chord ${activeChord}`
          : "Transport stopped"
      }
    >
      <div className="flex items-center justify-between gap-3">
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--music-muted)]">
          Beat
        </p>
        <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--music-muted)]">
          {transport.playing ? `Bar ${transport.barIndex + 1} · ${activeChord}` : "Ready"}
        </p>
      </div>
      <div className="mt-3 flex items-end justify-between gap-2">
        {beats.map((beat) => {
          const isActive = transport.playing && transport.beat === beat;
          const isOne = beat === 1;
          return (
            <div key={beat} className="flex flex-1 flex-col items-center gap-2">
              <div
                className={cn(
                  "h-3 w-full max-w-10 rounded-full transition-all duration-75",
                  isActive
                    ? isOne
                      ? "bg-[var(--music-accent)] shadow-[0_0_18px_rgba(212,160,23,0.45)] scale-y-125"
                      : "bg-[var(--music-ink)]/80 scale-y-110"
                    : "bg-[var(--music-line)]",
                )}
              />
              <span
                className={cn(
                  "font-[family-name:var(--font-music-display)] text-lg tabular-nums leading-none",
                  isActive ? "text-[var(--music-accent)]" : "text-[var(--music-muted)]",
                )}
              >
                {isOne ? "1" : "·"}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
