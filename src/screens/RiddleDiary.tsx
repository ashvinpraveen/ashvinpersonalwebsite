"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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

const AUTO_SUBMIT_DELAY_MS = 3000;
const REPLY_PAGE_CHAR_LIMIT = 270;

type AskDiary = (entry: string, history: DiaryMessage[]) => Promise<string>;

type ReplyPage = {
  text: string;
  start: number;
  end: number;
};

function splitDiaryPages(text: string) {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (!normalized) return [{ text: "", start: 0, end: 0 }];

  const pages: ReplyPage[] = [];
  let pageStart = 0;
  let pageEnd = 0;
  let hasPageText = false;

  for (const match of normalized.matchAll(/\S+/g)) {
    const word = match[0];
    const wordStart = match.index;
    const wordEnd = wordStart + word.length;

    if (!hasPageText) {
      pageStart = wordStart;
      pageEnd = wordEnd;
      hasPageText = true;
      continue;
    }

    const nextText = normalized.slice(pageStart, wordEnd);
    if (nextText.length > REPLY_PAGE_CHAR_LIMIT) {
      pages.push({
        text: normalized.slice(pageStart, pageEnd),
        start: pageStart,
        end: pageEnd,
      });
      pageStart = wordStart;
      pageEnd = wordEnd;
    } else {
      pageEnd = wordEnd;
    }
  }

  if (hasPageText) {
    pages.push({
      text: normalized.slice(pageStart, pageEnd),
      start: pageStart,
      end: pageEnd,
    });
  }

  return pages;
}

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
  const [replyPage, setReplyPage] = useState(0);
  const [isNameRevealed, setIsNameRevealed] = useState(false);
  const [hasWritten, setHasWritten] = useState(false);
  const historyRef = useRef<DiaryMessage[]>([]);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const timeoutsRef = useRef<number[]>([]);
  const displayReply = useMemo(() => reply.replace(/\s+/g, " ").trim(), [reply]);
  const replyPages = useMemo(() => splitDiaryPages(displayReply), [displayReply]);

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

  const toggleCoverName = () => {
    setIsNameRevealed((isRevealed) => !isRevealed);
  };

  const submit = useCallback(() => {
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
        setReplyPage(0);
        setPhase("writing");
      });
    });
  }, [after, askDiary, draft, phase]);

  useEffect(() => {
    if (phase !== "idle" || !draft.trim()) return;
    const autoSubmitTimeout = window.setTimeout(submit, AUTO_SUBMIT_DELAY_MS);
    return () => window.clearTimeout(autoSubmitTimeout);
  }, [draft, phase, submit]);

  useEffect(() => {
    if (phase !== "writing") return;
    if (revealed >= displayReply.length) {
      const doneTimeout = window.setTimeout(() => setPhase("fading-reply"), 4500);
      return () => window.clearTimeout(doneTimeout);
    }
    const currentPage = replyPages[replyPage];
    if (currentPage && revealed >= currentPage.end && replyPage < replyPages.length - 1) {
      const flipTimeout = window.setTimeout(() => setReplyPage((page) => page + 1), 820);
      return () => window.clearTimeout(flipTimeout);
    }
    const previous = displayReply[revealed - 1] ?? "";
    let delay = 30 + Math.random() * 55;
    if (".!?…".includes(previous)) delay += 340;
    else if (",;:—".includes(previous)) delay += 150;
    const charTimeout = window.setTimeout(() => setRevealed((count) => count + 1), delay);
    return () => window.clearTimeout(charTimeout);
  }, [phase, revealed, displayReply, replyPage, replyPages]);

  useEffect(() => {
    if (phase !== "fading-reply") return;
    const resetTimeout = window.setTimeout(() => {
      setReply("");
      setRevealed(0);
      setReplyPage(0);
      setPhase("idle");
      inputRef.current?.focus();
    }, 1800);
    return () => window.clearTimeout(resetTimeout);
  }, [phase]);

  const isOpen = phase !== "closed";
  const currentReplyPage = replyPages[replyPage] ?? { text: "", start: 0, end: 0 };
  const currentReplyRevealed = Math.max(0, revealed - currentReplyPage.start);

  return (
    <div className="rd-root">
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Caveat:wght@500&family=Cormorant+SC:wght@600;700&family=Tangerine:wght@700&display=swap"
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
                {draft.length > 0 &&
                  draft.split("").map((char, index) => (
                    <span className="rd-char" key={`${index}-${char}`}>
                      {char}
                    </span>
                  ))}
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
              {replyPage > 0 && <span className="rd-turn" key={`turn-${replyPage}`} />}
              <div className="rd-page-flip" key={replyPage}>
                <div className="rd-line">
                  {currentReplyPage.text.split("").map((char, index) => (
                    <span
                      className="rd-rchar"
                      key={index}
                      style={{ opacity: index < currentReplyRevealed ? 1 : 0 }}
                    >
                      {char}
                    </span>
                  ))}
                </div>
              </div>
              {replyPages.length > 1 && (
                <span className="rd-page-count">
                  {replyPage + 1}/{replyPages.length}
                </span>
              )}
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
            <span
              className={`rd-cover-name${isNameRevealed ? " rd-name-revealed" : ""}`}
              role="button"
              tabIndex={isOpen ? -1 : 0}
              aria-label="Reveal the diary name"
              onClick={(event) => {
                event.stopPropagation();
                toggleCoverName();
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  event.stopPropagation();
                  toggleCoverName();
                }
              }}
            >
              {isNameRevealed ? "I AM LORD VOLDEMORT" : "TOM MARVOLO RIDDLE"}
            </span>
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
            radial-gradient(70% 68% at 50% 46%, rgba(15, 10, 7, 0.08) 0%, rgba(7, 5, 4, 0.58) 72%, rgba(3, 3, 2, 0.86) 100%),
            linear-gradient(180deg, rgba(6, 4, 3, 0.1) 0%, rgba(6, 4, 3, 0.38) 100%),
            url("/diary-background.png") center / cover no-repeat;
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
            inset -10px 0 16px -18px rgba(82, 55, 22, 0.7),
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
          padding: 13% 11% 12%;
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
          font-size: clamp(1.3rem, 4.8vw, 1.65rem);
          line-height: 1.5;
          color: #262b42;
          text-shadow: 0 0 1px rgba(38, 43, 66, 0.35);
        }
        .rd-char {
          animation: rd-ink-in 0.5s ease both;
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
          font-size: clamp(1.55rem, 5.4vw, 2.15rem);
          line-height: 1.28;
          color: #2e1c12;
          text-shadow: 0 0 1px rgba(46, 28, 18, 0.4);
        }
        .rd-page-flip {
          max-width: 100%;
          max-height: 100%;
          transform-origin: right center;
          animation: rd-page-arrive 0.7s ease both;
        }
        .rd-rchar {
          transition: opacity 0.45s ease;
        }
        .rd-turn {
          position: absolute;
          inset: 0;
          z-index: 1;
          border-radius: inherit;
          pointer-events: none;
          transform-origin: right center;
          background:
            linear-gradient(270deg, rgba(80, 52, 20, 0.28), rgba(236, 223, 189, 0.8) 36%, rgba(255, 248, 226, 0.7));
          box-shadow:
            inset -16px 0 22px -20px rgba(0, 0, 0, 0.65),
            -12px 0 22px rgba(83, 54, 21, 0.18);
          animation: rd-page-turn 0.82s cubic-bezier(0.65, 0, 0.25, 1) both;
        }
        .rd-page-count {
          position: absolute;
          right: 9%;
          bottom: 5.5%;
          font-family: "Caveat", cursive;
          font-size: 0.9rem;
          color: rgba(46, 28, 18, 0.45);
          letter-spacing: 0;
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
          transform-origin: right center;
          transition: transform 1.6s cubic-bezier(0.7, 0, 0.3, 1), opacity 0.6s ease 1.05s;
          cursor: pointer;
        }
        .rd-open .rd-cover {
          transform: rotateY(180deg);
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
          left: 50%;
          bottom: 13%;
          width: 64%;
          min-height: 42px;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 8px 10px 7px;
          border: 1px solid rgba(154, 125, 64, 0.42);
          border-radius: 2px;
          background:
            linear-gradient(180deg, rgba(14, 13, 11, 0.9), rgba(7, 6, 5, 0.86)),
            ${PAPER_NOISE};
          background-blend-mode: normal, overlay;
          box-shadow:
            inset 0 1px 1px rgba(214, 184, 108, 0.14),
            inset 0 -2px 5px rgba(0, 0, 0, 0.65),
            0 1px 0 rgba(0, 0, 0, 0.65),
            0 0 0 1px rgba(0, 0, 0, 0.35);
          transform: translateX(-50%) rotate(-1deg) translateZ(2px) scaleX(0.78);
          transform-origin: center;
          text-align: center;
          font-family: "Cormorant SC", "Times New Roman", serif;
          font-weight: 700;
          font-size: clamp(0.96rem, 3vw, 1.2rem);
          line-height: 0.92;
          letter-spacing: 0.035em;
          color: rgba(187, 156, 86, 0.78);
          text-shadow:
            0 -1px 0 rgba(0, 0, 0, 0.9),
            0 1px 0 rgba(251, 220, 136, 0.16),
            0 0 1px rgba(229, 190, 100, 0.22);
          cursor: pointer;
          user-select: none;
          backface-visibility: hidden;
          -webkit-backface-visibility: hidden;
          transition:
            opacity 0.18s ease,
            color 0.35s ease,
            border-color 0.35s ease,
            box-shadow 0.35s ease,
            transform 0.35s ease;
        }
        .rd-open .rd-cover-name {
          opacity: 0;
          pointer-events: none;
        }
        .rd-cover-name:hover,
        .rd-cover-name:focus-visible {
          color: rgba(214, 181, 96, 0.9);
          border-color: rgba(179, 145, 74, 0.58);
          outline: none;
          transform: translateX(-50%) rotate(-1deg) translateY(-1px) translateZ(2px) scaleX(0.78);
        }
        .rd-name-revealed {
          width: 72%;
          color: rgba(210, 173, 89, 0.88);
          letter-spacing: 0.025em;
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
        @keyframes rd-page-turn {
          0% {
            opacity: 0.95;
            transform: rotateY(0deg) skewY(0deg);
          }
          55% {
            opacity: 0.78;
          }
          100% {
            opacity: 0;
            transform: rotateY(178deg) skewY(2deg);
          }
        }
        @keyframes rd-page-arrive {
          from {
            opacity: 0;
            filter: blur(2px);
            transform: translateX(-8px) rotateY(-8deg);
          }
          to {
            opacity: 1;
            filter: blur(0);
            transform: translateX(0) rotateY(0deg);
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
