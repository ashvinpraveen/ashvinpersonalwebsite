import { useState, useMemo, useEffect, useRef } from "react";
import { useTimer } from "@/hooks/useTimer";

interface ThresholdTrainingProps {
  onComplete: (result: { text: string; wordCount: number; targetWords: number; targetMinutes: number; backspaceCount: number }) => void;
}

function countWords(text: string) {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

const PRESETS = [
  { words: 200, minutes: 10, label: "Warm-up" },
  { words: 500, minutes: 15, label: "Standard" },
  { words: 800, minutes: 20, label: "Endurance" },
];

const ThresholdTraining = ({ onComplete }: ThresholdTrainingProps) => {
  const [preset, setPreset] = useState<number | null>(null);
  const [text, setText] = useState("");
  const [started, setStarted] = useState(false);
  const [finished, setFinished] = useState(false);
  const [backspaceCount, setBackspaceCount] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const selected = preset !== null ? PRESETS[preset] : null;
  const wordCount = useMemo(() => countWords(text), [text]);

  const timer = useTimer({
    duration: selected ? selected.minutes * 60 : 0,
    onComplete: () => {
      setFinished(true);
      if (selected) {
        onComplete({ text, wordCount, targetWords: selected.words, targetMinutes: selected.minutes, backspaceCount });
      }
    },
  });

  const handleStart = () => {
    setStarted(true);
    timer.start();
    setTimeout(() => textareaRef.current?.focus(), 50);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Backspace" || e.key === "Delete") {
      setBackspaceCount((c) => c + 1);
    }
  };

  const handleSubmitEarly = () => {
    timer.reset();
    setFinished(true);
    if (selected) {
      onComplete({ text, wordCount, targetWords: selected.words, targetMinutes: selected.minutes, backspaceCount });
    }
  };

  const minutes = Math.floor(timer.timeLeft / 60);
  const seconds = timer.timeLeft % 60;
  const pace = selected && started ? Math.round((wordCount / ((selected.minutes * 60 - timer.timeLeft) || 1)) * 60) : 0;

  return (
    <div className="space-y-6">
      {!started ? (
        <>
          <p className="font-mono text-xs text-muted-foreground uppercase tracking-widest mb-4">
            Choose your training block
          </p>
          <div className="grid grid-cols-3 gap-3">
            {PRESETS.map((p, i) => (
              <button
                key={i}
                onClick={() => setPreset(i)}
                className={`border rounded-sm p-4 text-left transition-colors ${
                  preset === i
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-muted-foreground/30"
                }`}
              >
                <p className="font-mono text-xs text-muted-foreground mb-1">{p.label}</p>
                <p className="text-sm font-medium">{p.words} words</p>
                <p className="font-mono text-xs text-muted-foreground">{p.minutes} min</p>
              </button>
            ))}
          </div>
          {preset !== null && (
            <button
              onClick={handleStart}
              className="font-mono text-sm text-primary hover:underline underline-offset-4 transition-colors"
            >
              Begin →
            </button>
          )}
        </>
      ) : (
        <>
          <div className="flex items-center justify-between font-mono text-xs text-muted-foreground">
            <div className="flex gap-4">
              <span>{wordCount}/{selected?.words} words</span>
              <span>Pace: {pace} wpm</span>
              {backspaceCount > 0 && (
                <span className="text-destructive">⌫ {backspaceCount}</span>
              )}
            </div>
            <span className={timer.timeLeft <= 60 ? "text-destructive" : ""}>
              {minutes}:{String(seconds).padStart(2, "0")}
            </span>
          </div>

          {selected && (
            <div className="w-full h-1 bg-secondary rounded-full overflow-hidden">
              <div
                className="h-full bg-primary/60 transition-all duration-300"
                style={{ width: `${Math.min((wordCount / selected.words) * 100, 100)}%` }}
              />
            </div>
          )}

          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => !finished && setText(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={finished}
            placeholder="Just write. Don't stop. Don't edit."
            className="w-full h-64 bg-secondary/50 border border-border rounded-sm p-4 text-sm leading-relaxed resize-none focus:outline-none focus:ring-1 focus:ring-primary/30 placeholder:text-muted-foreground/40 disabled:opacity-60"
          />

          {!finished && (
            <button
              onClick={handleSubmitEarly}
              disabled={wordCount === 0}
              className="font-mono text-sm text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40"
            >
              Finish early →
            </button>
          )}
        </>
      )}
    </div>
  );
};

export default ThresholdTraining;
