"use client";

import { noteName, prefersFlats, type Mode } from "../../../convex/lib/musicTheory";
import { useTuner } from "./useTuner";
import { Label, Sheet, Switch } from "./ui";
import { cn } from "@/lib/utils";

type TunerSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tonic: number;
  mode: Mode;
  droneOn: boolean;
  onDrone: (on: boolean) => void;
};

const TICKS = [-50, -40, -30, -20, -10, 0, 10, 20, 30, 40, 50];

export default function TunerSheet({ open, onOpenChange, tonic, mode, droneOn, onDrone }: TunerSheetProps) {
  const reading = useTuner(open);
  const hasPitch = reading.hz != null;
  const cents = hasPitch ? reading.cents : 0;
  const inTune = hasPitch && Math.abs(cents) <= 5;
  const angle = Math.max(-50, Math.min(50, cents)) * 1.1;
  const tonicName = noteName(tonic, prefersFlats(tonic, mode));

  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title="Tuner"
      description="Play or sing one note near your mic."
    >
      {reading.error ? (
        <p className="rounded-2xl bg-destructive/10 px-4 py-3 text-sm text-destructive">{reading.error}</p>
      ) : (
        <div className="flex flex-col items-center">
          <div className="relative w-full max-w-[19rem]">
            <svg viewBox="0 0 240 140" className="w-full" aria-hidden="true">
              <path
                d="M 20 120 A 100 100 0 0 1 220 120"
                fill="none"
                className="stroke-foreground/10"
                strokeWidth="14"
                strokeLinecap="round"
              />
              <path
                d="M 109 21 A 100 100 0 0 1 131 21"
                fill="none"
                className="stroke-[hsl(var(--gear-carrier))]"
                strokeWidth="14"
              />
              {TICKS.map((tick) => {
                const a = ((tick * 1.1 - 90) * Math.PI) / 180;
                const r1 = tick % 50 === 0 || tick === 0 ? 78 : 84;
                return (
                  <line
                    key={tick}
                    x1={120 + r1 * Math.cos(a)}
                    y1={120 + r1 * Math.sin(a)}
                    x2={120 + 90 * Math.cos(a)}
                    y2={120 + 90 * Math.sin(a)}
                    className="stroke-foreground/30"
                    strokeWidth={tick === 0 ? 2 : 1}
                  />
                );
              })}
              <g
                style={{
                  transform: `rotate(${angle}deg)`,
                  transformOrigin: "120px 120px",
                  transition: "transform 120ms ease-out",
                }}
              >
                <line
                  x1="120"
                  y1="120"
                  x2="120"
                  y2="30"
                  strokeWidth="3"
                  strokeLinecap="round"
                  className={cn(
                    inTune ? "stroke-[hsl(var(--gear-carrier))]" : "stroke-foreground",
                    !hasPitch && "opacity-25",
                  )}
                />
              </g>
              <circle cx="120" cy="120" r="7" className="fill-foreground" />
            </svg>
          </div>
          <p
            className={cn(
              "-mt-2 font-display text-7xl leading-none tracking-tight transition-colors",
              inTune && "text-[hsl(var(--gear-carrier))]",
              !hasPitch && "opacity-30",
            )}
          >
            {reading.note}
            {reading.octave != null ? (
              <span className="align-top font-sans text-xl text-muted-foreground">{reading.octave}</span>
            ) : null}
          </p>
          <p className="mt-2 h-5 font-mono text-xs text-muted-foreground" aria-live="polite">
            {hasPitch
              ? inTune
                ? "In tune ✓"
                : `${cents > 0 ? "+" : ""}${cents}¢ · ${cents > 0 ? "a bit sharp" : "a bit flat"}`
              : reading.listening
                ? "Listening…"
                : "Starting mic…"}
          </p>
          {hasPitch ? (
            <p className="font-mono text-[11px] text-muted-foreground/70">{reading.hz!.toFixed(1)} Hz</p>
          ) : null}
        </div>
      )}

      <div className="mt-6 space-y-2">
        <Label>Reference</Label>
        <Switch
          checked={droneOn}
          onChange={onDrone}
          label={`${tonicName} drone`}
          detail="A steady root note to sing or tune against"
        />
      </div>
    </Sheet>
  );
}
