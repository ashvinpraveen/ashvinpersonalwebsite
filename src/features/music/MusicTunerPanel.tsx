"use client";

import { AnimatePresence, motion } from "motion/react";
import { X } from "lucide-react";
import { useTuner } from "./useTuner";
import { cn } from "@/lib/utils";

type MusicTunerPanelProps = {
  open: boolean;
  onClose: () => void;
};

export default function MusicTunerPanel({ open, onClose }: MusicTunerPanelProps) {
  const { hz, note, cents, error } = useTuner(open);
  const needle = Math.max(-45, Math.min(45, cents * 0.9));
  const inTune = Math.abs(cents) < 8;

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          initial={{ opacity: 0, y: -8, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -8, scale: 0.98 }}
          transition={{ duration: 0.18 }}
          className="absolute right-0 top-12 z-40 w-[min(18rem,calc(100vw-2rem))] rounded-2xl border border-[rgba(212,160,23,0.5)] bg-[#141c18] p-4 shadow-[0_18px_48px_rgba(0,0,0,0.65),0_0_0_1px_rgba(212,160,23,0.18)]"
          role="dialog"
          aria-label="Tuner"
        >
          <div className="flex items-center justify-between gap-2">
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--music-accent)]">
              Tuner
            </p>
            <button
              type="button"
              onClick={onClose}
              className="rounded-full p-1 text-[rgba(232,239,230,0.75)] transition hover:bg-[var(--music-accent-soft)] hover:text-[var(--music-ink)]"
              aria-label="Close tuner"
            >
              <X size={16} />
            </button>
          </div>

          {error ? (
            <p className="mt-4 text-sm text-[#e08a7a]">{error}</p>
          ) : (
            <>
              <p
                className={cn(
                  "mt-3 text-center font-[family-name:var(--font-music-display)] text-4xl tabular-nums text-[var(--music-ink)]",
                  !hz && "opacity-55",
                )}
              >
                {note}
              </p>
              <p className="mt-1 text-center font-mono text-xs text-[rgba(232,239,230,0.78)]">
                {hz ? `${hz.toFixed(1)} Hz` : "Play a note"}
              </p>
              <div className="relative mt-4 h-10 rounded-xl bg-[rgba(8,12,10,0.95)] px-1">
                <div className="absolute inset-x-3 top-1/2 h-px -translate-y-1/2 bg-[rgba(232,239,230,0.28)]" />
                <div className="absolute left-1/2 top-1.5 h-7 w-px -translate-x-1/2 bg-[var(--music-accent)]" />
                <div
                  className={cn(
                    "absolute left-1/2 top-2 h-6 w-6 -translate-x-1/2 rounded-full border-2 transition-[transform,background-color,border-color,box-shadow] duration-75",
                    hz
                      ? inTune
                        ? "border-[var(--music-accent)] bg-[var(--music-accent)] shadow-[0_0_14px_rgba(212,160,23,0.55)]"
                        : "border-[var(--music-ink)] bg-[rgba(232,239,230,0.9)]"
                      : "border-[rgba(212,160,23,0.75)] bg-[var(--music-accent-soft)]",
                  )}
                  style={{ transform: `translateX(calc(-50% + ${needle}px))` }}
                />
              </div>
              <p className="mt-2 text-center font-mono text-[11px] text-[rgba(232,239,230,0.72)]">
                {hz
                  ? `${cents > 0 ? "+" : ""}${cents} cents`
                  : "Hold a steady pitch near the mic"}
              </p>
            </>
          )}
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
