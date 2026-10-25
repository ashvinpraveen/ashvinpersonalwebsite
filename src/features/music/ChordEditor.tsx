"use client";

import { ArrowLeft, ArrowRight, Copy, Trash2 } from "lucide-react";
import { useState } from "react";
import {
  CHORD_QUALITIES,
  QUALITY_IDS,
  chordName,
  chordToken,
  diatonicChords,
  mod12,
  romanNumeral,
  rootName,
  type Chord,
  type ChordQuality,
  type Mode,
} from "../../../convex/lib/musicTheory";
import type { JamState } from "./jam";
import { Chip, Label, Sheet } from "./ui";
import { cn } from "@/lib/utils";

/** Borrowed and secondary chords that sound great in each mode. */
const SPICE: Record<Mode, Chord[]> = {
  major: [
    { offset: 10, quality: "maj" },
    { offset: 5, quality: "min" },
    { offset: 8, quality: "maj" },
    { offset: 2, quality: "7" },
    { offset: 4, quality: "7" },
    { offset: 9, quality: "7" },
  ],
  minor: [
    { offset: 7, quality: "7" },
    { offset: 5, quality: "7" },
    { offset: 1, quality: "maj" },
    { offset: 11, quality: "dim7" },
    { offset: 0, quality: "sus4" },
    { offset: 8, quality: "maj7" },
  ],
};

type ChordEditorProps = {
  jam: JamState;
  index: number | null;
  onClose: () => void;
  onChange: (chords: Chord[], focus?: number | null) => void;
  onAudition: (chord: Chord) => void;
};

export default function ChordEditor({ jam, index, onClose, onChange, onAudition }: ChordEditorProps) {
  const [sevenths, setSevenths] = useState(false);
  const open = index != null && index < jam.chords.length;
  const current = open ? jam.chords[index]! : null;

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
      title={current ? `Bar ${index! + 1} · ${chordName(current, jam.tonic, jam.mode)}` : "Bar"}
      description="Tap a chord to hear it and drop it into this bar."
    >
      {open && current ? (
        <EditorBody
          key={index}
          jam={jam}
          index={index}
          current={current}
          sevenths={sevenths}
          onSevenths={setSevenths}
          onChange={onChange}
          onAudition={onAudition}
          onClose={onClose}
        />
      ) : null}
    </Sheet>
  );
}

function EditorBody({
  jam,
  index,
  current,
  sevenths,
  onSevenths,
  onChange,
  onAudition,
  onClose,
}: {
  jam: JamState;
  index: number;
  current: Chord;
  sevenths: boolean;
  onSevenths: (value: boolean) => void;
  onChange: (chords: Chord[], focus?: number | null) => void;
  onAudition: (chord: Chord) => void;
  onClose: () => void;
}) {
  const [root, setRoot] = useState(mod12(current.offset));

  function choose(chord: Chord) {
    onAudition(chord);
    setRoot(mod12(chord.offset));
    onChange(jam.chords.map((ch, i) => (i === index ? chord : ch)));
  }

  function move(delta: number) {
    const target = index + delta;
    if (target < 0 || target >= jam.chords.length) return;
    const next = [...jam.chords];
    [next[index], next[target]] = [next[target]!, next[index]!];
    onChange(next, target);
  }

  const chordButton = (chord: Chord) => {
    const selected = chordToken(chord) === chordToken(current);
    return (
      <button
        key={chordToken(chord)}
        type="button"
        onClick={() => choose(chord)}
        aria-pressed={selected}
        className={cn(
          "flex flex-col items-start rounded-2xl px-3 py-2.5 text-left transition-[background-color,transform] active:scale-95",
          selected ? "bg-foreground text-background" : "bg-muted/70 hover:bg-accent",
        )}
      >
        <span className="font-display text-xl leading-tight tracking-tight">
          {chordName(chord, jam.tonic, jam.mode)}
        </span>
        <span
          className={cn(
            "font-mono text-[10px]",
            selected ? "text-background/60" : "text-muted-foreground",
          )}
        >
          {romanNumeral(chord, jam.mode)}
        </span>
      </button>
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center justify-between gap-3">
          <Label>In the key</Label>
          <div className="flex gap-1 rounded-full bg-muted/70 p-1 text-xs">
            {[false, true].map((value) => (
              <button
                key={String(value)}
                type="button"
                onClick={() => onSevenths(value)}
                aria-pressed={sevenths === value}
                className={cn(
                  "rounded-full px-3 py-1.5 font-medium transition-colors",
                  sevenths === value ? "bg-background shadow-sm" : "text-muted-foreground",
                )}
              >
                {value ? "7ths" : "Triads"}
              </button>
            ))}
          </div>
        </div>
        <div className="mt-3 grid grid-cols-4 gap-2 sm:grid-cols-7">
          {diatonicChords(jam.mode, sevenths).map(chordButton)}
        </div>
      </div>

      <div>
        <Label>A little spice</Label>
        <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-6">
          {SPICE[jam.mode].map(chordButton)}
        </div>
      </div>

      <div>
        <Label>Build any chord</Label>
        <div className="jam-scroll -mx-5 mt-3 flex gap-1.5 overflow-x-auto px-5 pb-1">
          {Array.from({ length: 12 }, (_, offset) => (
            <Chip
              key={offset}
              active={root === offset}
              onClick={() => setRoot(offset)}
              className="shrink-0"
            >
              {rootName(offset, jam.tonic, jam.mode)}
            </Chip>
          ))}
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {QUALITY_IDS.map((quality: ChordQuality) => {
            const chord = { offset: root, quality };
            const selected = chordToken(chord) === chordToken(current);
            return (
              <Chip
                key={quality}
                active={selected}
                onClick={() => choose(chord)}
                label={`${chordName(chord, jam.tonic, jam.mode)} (${CHORD_QUALITIES[quality].label})`}
              >
                {chordName(chord, jam.tonic, jam.mode)}
              </Chip>
            );
          })}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 border-t border-border pt-4">
        <Chip onClick={() => move(-1)} label="Move bar left" className={cn(index === 0 && "opacity-40")}>
          <ArrowLeft size={15} />
        </Chip>
        <Chip
          onClick={() => move(1)}
          label="Move bar right"
          className={cn(index === jam.chords.length - 1 && "opacity-40")}
        >
          <ArrowRight size={15} />
        </Chip>
        <Chip
          onClick={() => {
            const next = [...jam.chords];
            next.splice(index + 1, 0, { ...current });
            onChange(next, index + 1);
          }}
        >
          <Copy size={15} /> Duplicate
        </Chip>
        <Chip
          onClick={() => {
            if (jam.chords.length <= 1) return;
            onChange(
              jam.chords.filter((_, i) => i !== index),
              null,
            );
          }}
          className={cn(
            "text-destructive",
            jam.chords.length <= 1 && "pointer-events-none opacity-40",
          )}
        >
          <Trash2 size={15} /> Delete
        </Chip>
        <button
          type="button"
          onClick={onClose}
          className="ml-auto h-10 rounded-full bg-foreground px-5 text-sm font-medium text-background"
        >
          Done
        </button>
      </div>
    </div>
  );
}
