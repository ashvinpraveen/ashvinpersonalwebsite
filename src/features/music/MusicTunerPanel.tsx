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
          className="absolute right-0 top-12 z-40 w-[min(18rem,calc(100vw-2rem))] rounded-2xl border border-border bg-background p-4 shadow-lg"
          role="dialog"
          aria-label="Tuner"
        >
          <div className="flex items-center justify-between gap-2">
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-link">
              Tuner
            </p>
            <button
              type="button"
              onClick={onClose}
              className="rounded-full p-1 text-muted-foreground transition hover:bg-muted hover:text-foreground"
              aria-label="Close tuner"
            >
              <X size={16} />
            </button>
          </div>

          {error ? (
            <p className="mt-4 text-sm text-destructive">{error}</p>
          ) : (
            <>
              <p
                className={cn(
                  "mt-3 text-center text-4xl font-bold tabular-nums tracking-tight text-foreground",
                  !hz && "opacity-45",
                )}
              >
                {note}
              </p>
              <p className="mt-1 text-center font-mono text-xs text-muted-foreground">
                {hz ? `${hz.toFixed(1)} Hz` : "Play a note"}
              </p>
              <div className="relative mt-4 h-10 rounded-xl bg-muted/60 px-1">
                <div className="absolute inset-x-3 top-1/2 h-px -translate-y-1/2 bg-foreground/20" />
                <div className="absolute left-1/2 top-1.5 h-7 w-px -translate-x-1/2 bg-link" />
                <div
                  className={cn(
                    "absolute left-1/2 top-2 h-6 w-6 -translate-x-1/2 rounded-full border-2 transition-[transform,background-color,border-color,box-shadow] duration-75",
                    hz
                      ? inTune
                        ? "border-link bg-link shadow-[0_0_14px_hsl(var(--link)/0.4)]"
                        : "border-foreground bg-foreground/90"
                      : "border-link/70 bg-[hsl(var(--selection)/0.35)]",
                  )}
                  style={{ transform: `translateX(calc(-50% + ${needle}px))` }}
                />
              </div>
              <p className="mt-2 text-center font-mono text-[11px] text-muted-foreground">
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
