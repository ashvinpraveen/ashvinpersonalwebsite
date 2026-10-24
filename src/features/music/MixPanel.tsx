"use client";

import { Download, Loader2, Volume2, VolumeX } from "lucide-react";
import type { ReactNode } from "react";
import { CHANNELS, type Channel, type Mix } from "./jam";
import { Label, Range } from "./ui";
import { cn } from "@/lib/utils";

const CHANNEL_INFO: Record<Channel, { label: string; color: string }> = {
  drums: { label: "Drums", color: "hsl(var(--jam-drums))" },
  bass: { label: "Bass", color: "hsl(var(--jam-bass))" },
  keys: { label: "Keys", color: "hsl(var(--jam-keys))" },
  click: { label: "Click", color: "hsl(var(--jam-click))" },
};

export type ExportChoice = { id: string; label: string; loops: number };

type MixPanelProps = {
  mix: Mix;
  onMix: (mix: Mix) => void;
  exportChoices: ExportChoice[];
  exporting: string | null;
  onExport: (choice: ExportChoice) => void;
  studio: ReactNode;
};

export default function MixPanel({
  mix,
  onMix,
  exportChoices,
  exporting,
  onExport,
  studio,
}: MixPanelProps) {
  return (
    <div className="space-y-6">
      <div>
        <Label>Mixer</Label>
        <div className="mt-3 space-y-1.5">
          {CHANNELS.map((channel) => {
            const info = CHANNEL_INFO[channel];
            const state = mix[channel];
            return (
              <div
                key={channel}
                className={cn(
                  "flex items-center gap-3 rounded-2xl bg-background/60 py-1.5 pl-3 pr-2 transition-opacity",
                  state.muted && "opacity-60",
                )}
              >
                <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: info.color }} />
                <span className="w-12 shrink-0 text-sm font-medium">{info.label}</span>
                <Range
                  value={Math.round(state.level * 100)}
                  min={0}
                  max={100}
                  onChange={(value) => onMix({ ...mix, [channel]: { ...state, level: value / 100 } })}
                  label={`${info.label} volume`}
                  color={info.color}
                />
                <button
                  type="button"
                  onClick={() => onMix({ ...mix, [channel]: { ...state, muted: !state.muted } })}
                  aria-pressed={state.muted}
                  aria-label={state.muted ? `Unmute ${info.label}` : `Mute ${info.label}`}
                  className={cn(
                    "grid h-10 w-10 shrink-0 place-items-center rounded-full transition-colors",
                    state.muted
                      ? "bg-foreground text-background"
                      : "text-muted-foreground hover:bg-foreground/[0.08] hover:text-foreground",
                  )}
                >
                  {state.muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
                </button>
              </div>
            );
          })}
          <div className="flex items-center gap-3 rounded-2xl bg-background/60 py-1.5 pl-3 pr-4">
            <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-foreground/40" />
            <span className="w-12 shrink-0 text-sm font-medium">Room</span>
            <Range
              value={Math.round(mix.space * 100)}
              min={0}
              max={100}
              onChange={(value) => onMix({ ...mix, space: value / 100 })}
              label="Reverb amount"
              color="hsl(var(--foreground) / 0.55)"
            />
            <span className="w-8 text-right text-xs tabular-nums text-muted-foreground">
              {Math.round(mix.space * 100)}
            </span>
          </div>
        </div>
        <p className="mt-2 text-[11px] text-muted-foreground">
          Tip: mute the part you&apos;re practising — drop the bass and play the bass line yourself.
        </p>
      </div>

      <div>
        <Label>Take it with you</Label>
        <p className="mt-1 text-sm text-muted-foreground">
          A seamless WAV loop of this mix (no click) for your DAW, looper, or phone.
        </p>
        <div className="mt-3 grid grid-cols-3 gap-2">
          {exportChoices.map((choice) => (
            <button
              key={choice.id}
              type="button"
              onClick={() => onExport(choice)}
              disabled={exporting != null}
              className="flex flex-col items-center gap-1 rounded-2xl bg-background/70 px-2 py-3 text-sm font-medium transition-colors hover:bg-background disabled:opacity-60"
            >
              {exporting === choice.id ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Download size={16} />
              )}
              {choice.label}
            </button>
          ))}
        </div>
      </div>

      {studio}
    </div>
  );
}
