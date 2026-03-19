import { useState, useMemo } from "react";
import { useTimer } from "@/hooks/useTimer";
import { constraintPrompts } from "@/data/drillPrompts";

interface ConstraintDrillProps {
  onComplete: (result: { original: string; rewrite: string; wordCount: number; timeUsed: number }) => void;
}

const WORD_LIMIT = 15;
const TIME_LIMIT = 60;

function countWords(text: string) {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

const ConstraintDrill = ({ onComplete }: ConstraintDrillProps) => {
  const [prompt] = useState(() => constraintPrompts[Math.floor(Math.random() * constraintPrompts.length)]);
  const [text, setText] = useState("");
  const [started, setStarted] = useState(false);
  const [finished, setFinished] = useState(false);

  const wordCount = useMemo(() => countWords(text), [text]);
  const timeUsed = TIME_LIMIT - timer.timeLeft;

  var timer = useTimer({
    duration: TIME_LIMIT,
    onComplete: () => {
      setFinished(true);
      onComplete({ original: prompt.text, rewrite: text, wordCount, timeUsed: TIME_LIMIT });
    },
  });

  // Fix: assign timer before using timeUsed
  const actualTimeUsed = TIME_LIMIT - timer.timeLeft;

  const handleStart = () => {
    setStarted(true);
    timer.start();
  };

  const handleSubmit = () => {
    timer.reset();
    setFinished(true);
    onComplete({ original: prompt.text, rewrite: text, wordCount, timeUsed: actualTimeUsed });
  };

  const isOverLimit = wordCount > WORD_LIMIT;

  return (
    <div className="space-y-6">
      <div>
        <p className="font-mono text-xs text-muted-foreground uppercase tracking-widest mb-3">
          Original — rewrite in exactly {WORD_LIMIT} words
        </p>
        <blockquote className="border-l-2 border-border pl-4 text-foreground/80 text-sm leading-relaxed">
          {prompt.text}
        </blockquote>
      </div>

      {!started ? (
        <button
          onClick={handleStart}
          className="font-mono text-sm text-primary hover:underline underline-offset-4 transition-colors"
        >
          Start drill →
        </button>
      ) : (
        <>
          <div className="flex items-center justify-between font-mono text-xs text-muted-foreground">
            <span className={isOverLimit ? "text-destructive" : ""}>
              {wordCount}/{WORD_LIMIT} words
            </span>
            <span className={timer.timeLeft <= 10 ? "text-destructive" : ""}>
              {timer.timeLeft}s
            </span>
          </div>

          <textarea
            value={text}
            onChange={(e) => !finished && setText(e.target.value)}
            disabled={finished}
            placeholder="Start writing..."
            className="w-full h-32 bg-secondary/50 border border-border rounded-sm p-4 text-sm leading-relaxed resize-none focus:outline-none focus:ring-1 focus:ring-primary/30 placeholder:text-muted-foreground/40 disabled:opacity-60"
            autoFocus
          />

          {!finished && (
            <button
              onClick={handleSubmit}
              disabled={wordCount === 0}
              className="font-mono text-sm text-primary hover:underline underline-offset-4 transition-colors disabled:opacity-40 disabled:no-underline"
            >
              Submit →
            </button>
          )}
        </>
      )}
    </div>
  );
};

export default ConstraintDrill;
