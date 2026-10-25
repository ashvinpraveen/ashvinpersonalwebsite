"use client";

import { Minus, Plus } from "lucide-react";
import { MAX_TEMPO, MIN_TEMPO, clampTempo } from "../../../convex/lib/musicTheory";
import type { JamState, Trainer } from "./jam";
import { Chip, Label, Range, Switch } from "./ui";

type TempoPanelProps = {
  jam: JamState;
  tapCount: number;
  onTap: () => void;
  onTempo: (bpm: number) => void;
  onCountIn: (value: boolean) => void;
  onClick: (value: boolean) => void;
  onTrainer: (trainer: Trainer) => void;
};

function tempoWord(bpm: number) {
  if (bpm < 66) return "Largo";
  if (bpm < 76) return "Adagio";
  if (bpm < 108) return "Andante";
  if (bpm < 120) return "Moderato";
  if (bpm < 156) return "Allegro";
  if (bpm < 176) return "Vivace";
  return "Presto";
}

export default function TempoPanel({
  jam,
  tapCount,
  onTap,
  onTempo,
  onCountIn,
  onClick,
  onTrainer,
}: TempoPanelProps) {
  const trainer = jam.trainer;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <Label>Tempo · {tempoWord(jam.tempo)}</Label>
          <p className="mt-1 font-display text-6xl leading-none tracking-tight tabular-nums">
            {jam.tempo}
            <span className="ml-2 font-sans text-base text-muted-foreground">BPM</span>
          </p>
        </div>
        <button
          type="button"
          onClick={onTap}
          className="flex h-20 w-20 shrink-0 flex-col items-center justify-center rounded-full bg-foreground text-background transition-transform active:scale-90"
        >
          <span className="text-base font-semibold">Tap</span>
          <span className="font-mono text-[10px] opacity-60">
            {tapCount > 1 ? `${tapCount} taps` : "the beat"}
          </span>
        </button>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => onTempo(jam.tempo - 1)}
          className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-foreground/[0.07] transition-colors hover:bg-foreground/[0.12]"
          aria-label="Slower by 1 BPM"
        >
          <Minus size={16} />
        </button>
        <Range
          value={jam.tempo}
          min={MIN_TEMPO}
          max={MAX_TEMPO}
          onChange={onTempo}
          label="Tempo in BPM"
          color="hsl(var(--jam-hue) 75% 48%)"
        />
        <button
          type="button"
          onClick={() => onTempo(jam.tempo + 1)}
          className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-foreground/[0.07] transition-colors hover:bg-foreground/[0.12]"
          aria-label="Faster by 1 BPM"
        >
          <Plus size={16} />
        </button>
      </div>

      <div className="flex flex-wrap gap-1.5">
        <Chip onClick={() => onTempo(Math.round(jam.tempo / 2))}>½ time</Chip>
        <Chip onClick={() => onTempo(Math.round(jam.tempo * 0.9))}>−10%</Chip>
        <Chip onClick={() => onTempo(Math.round(jam.tempo * 1.1))}>+10%</Chip>
        <Chip onClick={() => onTempo(jam.tempo * 2)}>2× time</Chip>
      </div>

      <div className="space-y-2">
        <Switch
          checked={jam.countIn}
          onChange={onCountIn}
          label="Count me in"
          detail="One bar of clicks before the band starts"
        />
        <Switch
          checked={jam.click}
          onChange={onClick}
          label="Metronome click"
          detail="Keep a click going under the band"
        />
      </div>

      <div className="rounded-2xl bg-background/60 p-3">
        <Switch
          checked={trainer.enabled}
          onChange={(enabled) =>
            onTrainer({
              ...trainer,
              enabled,
              target: enabled && trainer.target <= jam.tempo ? clampTempo(jam.tempo + 20) : trainer.target,
            })
          }
          label="Speed trainer"
          detail="Nudge the tempo up as you nail each pass"
        />
        {trainer.enabled ? (
          <div className="space-y-3 px-1 pb-1 pt-3 text-sm">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="mr-1 text-muted-foreground">Add</span>
              {[2, 4, 5, 10].map((step) => (
                <Chip key={step} active={trainer.step === step} onClick={() => onTrainer({ ...trainer, step })}>
                  +{step}
                </Chip>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="mr-1 text-muted-foreground">every</span>
              {[1, 2, 4].map((every) => (
                <Chip key={every} active={trainer.every === every} onClick={() => onTrainer({ ...trainer, every })}>
                  {every} loop{every > 1 ? "s" : ""}
                </Chip>
              ))}
            </div>
            <div>
              <div className="flex items-center justify-between text-muted-foreground">
                <span>Stop at</span>
                <span className="font-semibold tabular-nums text-foreground">{trainer.target} BPM</span>
              </div>
              <Range
                value={trainer.target}
                min={MIN_TEMPO}
                max={MAX_TEMPO}
                onChange={(target) => onTrainer({ ...trainer, target })}
                label="Speed trainer target BPM"
              />
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
