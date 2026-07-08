"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useAction } from "convex/react";
import { api } from "../../convex/_generated/api";
import { isConvexConfigured } from "@/lib/features";

type Phase =
  | "closed"
  | "opening"
  | "idle"
  | "fading-entry"
  | "thinking"
  | "writing"
  | "fading-reply";

type DiaryMessage = {
  author: "visitor" | "diary";
  body: string;
};

const FALLBACK_REPLY = "The ink refuses to settle. Write to me again.";

const PAPER_NOISE =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='240' height='240'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='240' height='240' filter='url(%23n)' opacity='0.6'/%3E%3C/svg%3E\")";

type AskDiary = (entry: string, history: DiaryMessage[]) => Promise<string>;

export default function RiddleDiary() {
  if (!isConvexConfigured) {
    return <DiaryView askDiary={async () => FALLBACK_REPLY} />;
  }
  return <ConvexDiary />;
}

function ConvexDiary() {
  const respond = useAction(api.diary.respond);
  const askDiary = useCallback<AskDiary>(
    async (entry, history) => {
      const result = await respond({ entry, history });
      return result.reply || FALLBACK_REPLY;
    },
    [respond],
  );
  return <DiaryView askDiary={askDiary} />;
}

function DiaryView({ askDiary }: { askDiary: AskDiary }) {
  const [phase, setPhase] = useState<Phase>("closed");
  const [draft, setDraft] = useState("");
  const [reply, setReply] = useState("");
  const [revealed, setRevealed] = useState(0);
  const [hasWritten, setHasWritten] = useState(false);
  const historyRef = useRef<DiaryMessage[]>([]);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const timeoutsRef = useRef<number[]>([]);

  const after = useCallback((ms: number, fn: () => void) => {
    timeoutsRef.current.push(window.setTimeout(fn, ms));
  }, []);

  useEffect(() => {
    const timeouts = timeoutsRef.current;
    return () => timeouts.forEach((id) => window.clearTimeout(id));
  }, []);

  const openBook = () => {
    if (phase !== "closed") return;
    setPhase("opening");
    after(1500, () => {
      setPhase("idle");
      inputRef.current?.focus();
    });
  };

  const submit = () => {
    const entry = draft.trim();
    if (!entry || phase !== "idle") return;
    setHasWritten(true);
    setPhase("fading-entry");

    const replyPromise = askDiary(entry, historyRef.current.slice(-8)).catch(
      () => FALLBACK_REPLY,
    );

    after(1600, () => {
      setDraft("");
      setPhase("thinking");
      void replyPromise.then((replyText) => {
        const updatedHistory: DiaryMessage[] = [
          ...historyRef.current,
          { author: "visitor", body: entry },
          { author: "diary", body: replyText },
        ];
        historyRef.current = updatedHistory.slice(-12);
        setReply(replyText);
        setRevealed(0);
        setPhase("writing");
      });
    });
  };

  useEffect(() => {
    if (phase !== "writing") return;
    if (revealed >= reply.length) {
      const doneTimeout = window.setTimeout(() => setPhase("fading-reply"), 4500);
      return () => window.clearTimeout(doneTimeout);
    }
    const previous = reply[revealed - 1] ?? "";
    let delay = 30 + Math.random() * 55;
    if (".!?…".includes(previous)) delay += 340;
    else if (",;:—".includes(previous)) delay += 150;
    const charTimeout = window.setTimeout(() => setRevealed((count) => count + 1), delay);
    return () => window.clearTimeout(charTimeout);
  }, [phase, revealed, reply]);

  useEffect(() => {
    if (phase !== "fading-reply") return;
    const resetTimeout = window.setTimeout(() => {
      setReply("");
      setRevealed(0);
      setPhase("idle");
      inputRef.current?.focus();
    }, 1800);
    return () => window.clearTimeout(resetTimeout);
  }, [phase]);

  const isOpen = phase !== "closed";

  return (
    <div className="rd-root">
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Caveat:wght@500&family=Tangerine:wght@700&display=swap"
      />
      <a className="rd-back" href="/" aria-label="Leave the diary">
        ←
      </a>

      <div className={`rd-book${isOpen ? " rd-open" : ""}`}>
        <div className="rd-page">
          <div className="rd-grain" aria-hidden="true" />

          {(phase === "idle" || phase === "fading-entry") && (
            <div className={`rd-text rd-entry${phase === "fading-entry" ? " rd-fade" : ""}`}>
              <div className="rd-line">
                {draft.length === 0 && !hasWritten ? (
                  <span className="rd-hint">write…</span>
                ) : (
                  draft.split("").map((char, index) => (
                    <span className="rd-char" key={`${index}-${char}`}>
                      {char}
                    </span>
                  ))
                )}
                {phase === "idle" && <span className="rd-caret" aria-hidden="true" />}
              </div>
            </div>
          )}

          {phase === "thinking" && <span className="rd-blot" aria-hidden="true" />}

          {(phase === "writing" || phase === "fading-reply") && (
            <div
              className={`rd-text rd-reply${phase === "fading-reply" ? " rd-fade" : ""}`}
              aria-live="polite"
            >
              <div className="rd-line">
                {reply.split("").map((char, index) => (
                  <span
                    className="rd-rchar"
                    key={index}
                    style={{ opacity: index < revealed ? 1 : 0 }}
                  >
                    {char}
                  </span>
                ))}
              </div>
            </div>
          )}

          <textarea
            ref={inputRef}
            className="rd-input"
            value={draft}
            maxLength={280}
            enterKeyHint="send"
            autoCapitalize="sentences"
            autoComplete="off"
            aria-label="Write in the diary"
            disabled={!isOpen}
            onChange={(event) => {
              if (phase === "idle") setDraft(event.target.value.replace(/\n/g, " "));
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                submit();
              }
            }}
          />
        </div>

        <div
          className="rd-cover"
          role="button"
          tabIndex={isOpen ? -1 : 0}
          aria-label="Open the diary"
          onClick={openBook}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              openBook();
            }
          }}
        >
          <div className="rd-cover-front">
            <div className="rd-cover-frame" />
            <span className="rd-cover-name">T. M. Riddle</span>
          </div>
          <div className="rd-cover-back" />
        </div>
      </div>

      <style>{`
        .rd-root {
          position: fixed;
          inset: 0;
          z-index: 40;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          background:
            radial-gradient(120% 90% at 50% 15%, #201813 0%, #0d0a08 55%, #050403 100%);
        }

        .rd-back {
          position: absolute;
          top: max(14px, env(safe-area-inset-top));
          left: 18px;
          z-index: 10;
          color: rgba(226, 212, 184, 0.35);
          font-size: 22px;
          line-height: 1;
          text-decoration: none;
          padding: 8px;
          transition: color 0.3s ease;
        }
        .rd-back:hover,
        .rd-back:focus-visible {
          color: rgba(226, 212, 184, 0.8);
        }

        .rd-book {
          position: relative;
          width: min(88vw, 60dvh, 430px);
          aspect-ratio: 5 / 7;
          perspective: 1800px;
          filter: drop-shadow(0 30px 50px rgba(0, 0, 0, 0.65));
        }

        /* ---- page ---- */
        .rd-page {
          position: absolute;
          inset: 0;
          border-radius: 4px 8px 8px 4px;
          background:
            radial-gradient(115% 90% at 50% 40%, rgba(255, 249, 228, 0.5) 0%, rgba(255, 249, 228, 0) 60%),
            radial-gradient(140% 120% at 50% 50%, #ecdfbd 0%, #e2d1a6 55%, #c8b184 100%);
          box-shadow:
            inset 0 0 70px rgba(92, 62, 24, 0.35),
            inset 0 0 8px rgba(92, 62, 24, 0.25),
            -1px 0 0 #b9a274,
            -3px 2px 0 #cdb98d,
            -5px 4px 0 #b9a274;
          filter: brightness(0.55);
          transform: scale(0.985);
          transition: filter 1.4s ease 0.35s, transform 1.4s ease 0.35s;
          cursor: text;
        }
        .rd-open .rd-page {
          filter: brightness(1);
          transform: scale(1);
        }

        .rd-grain {
          position: absolute;
          inset: 0;
          border-radius: inherit;
          background-image: ${PAPER_NOISE};
          mix-blend-mode: multiply;
          opacity: 0.28;
          pointer-events: none;
        }

        /* ---- writing ---- */
        .rd-text {
          position: absolute;
          inset: 0;
          padding: 14% 11%;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          pointer-events: none;
          transition: opacity 1.5s ease, filter 1.5s ease;
        }
        .rd-line {
          max-width: 100%;
          max-height: 100%;
          text-align: center;
          white-space: pre-wrap;
          overflow-wrap: break-word;
        }
        .rd-fade {
          opacity: 0;
          filter: blur(4px);
        }

        .rd-entry {
          font-family: "Caveat", cursive;
          font-size: clamp(1.45rem, 5.5vw, 1.9rem);
          line-height: 1.5;
          color: #262b42;
          text-shadow: 0 0 1px rgba(38, 43, 66, 0.35);
        }
        .rd-char {
          animation: rd-ink-in 0.5s ease both;
        }
        .rd-hint {
          opacity: 0.32;
          animation: rd-ink-in 1.2s ease both;
        }
        .rd-caret {
          display: inline-block;
          width: 2px;
          height: 1em;
          margin-left: 3px;
          vertical-align: -0.15em;
          background: rgba(38, 43, 66, 0.75);
          animation: rd-blink 1.15s step-end infinite;
        }

        .rd-reply {
          font-family: "Tangerine", cursive;
          font-weight: 700;
          font-size: clamp(2.1rem, 8vw, 3.1rem);
          line-height: 1.25;
          color: #2e1c12;
          text-shadow: 0 0 1px rgba(46, 28, 18, 0.4);
        }
        .rd-rchar {
          transition: opacity 0.45s ease;
        }

        .rd-blot {
          position: absolute;
          top: 50%;
          left: 50%;
          width: 7px;
          height: 7px;
          margin: -4px 0 0 -4px;
          border-radius: 50%;
          background: rgba(40, 32, 58, 0.55);
          opacity: 0;
          animation: rd-blot 1.8s ease-in-out 0.5s infinite;
        }

        .rd-input {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          opacity: 0;
          border: none;
          resize: none;
          background: transparent;
          color: transparent;
          caret-color: transparent;
          font-size: 16px;
          cursor: text;
        }
        .rd-input:focus {
          outline: none;
        }

        /* ---- cover ---- */
        .rd-cover {
          position: absolute;
          inset: 0;
          z-index: 3;
          transform-style: preserve-3d;
          transform-origin: left center;
          transition: transform 1.6s cubic-bezier(0.7, 0, 0.3, 1), opacity 0.6s ease 1.05s;
          cursor: pointer;
        }
        .rd-open .rd-cover {
          transform: rotateY(-180deg);
          opacity: 0;
          pointer-events: none;
        }

        .rd-cover-front,
        .rd-cover-back {
          position: absolute;
          inset: 0;
          border-radius: 4px 10px 10px 4px;
          backface-visibility: hidden;
          -webkit-backface-visibility: hidden;
        }
        .rd-cover-front {
          background:
            ${PAPER_NOISE},
            radial-gradient(circle at 30% 18%, rgba(255, 255, 255, 0.07), transparent 55%),
            linear-gradient(135deg, #221713 0%, #140d0a 60%, #0c0705 100%);
          background-blend-mode: overlay, normal, normal;
          border: 1px solid rgba(255, 255, 255, 0.05);
          box-shadow:
            inset 12px 0 18px -12px rgba(0, 0, 0, 0.9),
            inset 0 0 40px rgba(0, 0, 0, 0.5);
        }
        .rd-cover-back {
          transform: rotateY(180deg);
          background: linear-gradient(45deg, #16100c 0%, #0d0806 100%);
        }

        .rd-cover-frame {
          position: absolute;
          inset: 7%;
          border: 1px solid rgba(0, 0, 0, 0.75);
          border-radius: 3px;
          box-shadow:
            0 1px 0 rgba(255, 255, 255, 0.035),
            inset 0 1px 0 rgba(255, 255, 255, 0.035);
        }
        .rd-cover-name {
          position: absolute;
          left: 0;
          right: 0;
          bottom: 14%;
          text-align: center;
          font-family: "Tangerine", cursive;
          font-weight: 700;
          font-size: clamp(1.5rem, 5vw, 2rem);
          letter-spacing: 0.08em;
          color: rgba(158, 130, 72, 0.42);
          text-shadow: 0 -1px 1px rgba(0, 0, 0, 0.8);
        }

        @keyframes rd-ink-in {
          from {
            opacity: 0;
            filter: blur(2px);
          }
          to {
            opacity: 1;
            filter: blur(0);
          }
        }
        @keyframes rd-blink {
          50% {
            opacity: 0;
          }
        }
        @keyframes rd-blot {
          0%, 100% {
            opacity: 0;
            transform: scale(0.7);
          }
          50% {
            opacity: 0.6;
            transform: scale(1);
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .rd-root * {
            animation-duration: 0.01s !important;
            transition-duration: 0.25s !important;
          }
        }
      `}</style>
    </div>
  );
}
