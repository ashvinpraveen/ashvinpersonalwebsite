"use client";

import { useState } from "react";
import SiteNav from "@/components/SiteNav";
import Footer from "@/components/Footer";
import { pageShellClassName, contentColumnClassName } from "@/lib/layout";
import { heading } from "@/lib/styles";

const WA_NUMBER = "60109847954";

const options = ["drumming", "running", "planting", "cooking"];
const correctAnswer = "all";

const TextMe = () => {
  const [message, setMessage] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [wrongGuess, setWrongGuess] = useState(false);
  const [verified, setVerified] = useState(false);

  const handleSelect = (answer: string) => {
    if (verified) return;
    setSelected(answer);

    if (answer === correctAnswer) {
      setWrongGuess(false);
      setVerified(true);
    } else {
      setWrongGuess(true);
    }
  };

  const waUrl = `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(message.trim())}`;

  return (
    <>
      <SiteNav />
      <main className={`${pageShellClassName} pb-20 pt-24`}>
        <div className={`${contentColumnClassName} max-w-lg`}>
          <h1
            className={`text-3xl font-semibold tracking-tight text-foreground md:text-4xl mb-2 ${heading}`}
          >
            text me
          </h1>
          <p className="text-base leading-relaxed text-muted-foreground mb-10">
            type your message below, then answer a quick question to prove you know me (or at least read my site).
          </p>

          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="what's on your mind?"
            rows={4}
            className="w-full resize-none rounded-2xl bg-muted/50 border border-border px-5 py-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-foreground/20 transition-shadow"
          />

          <div className="mt-10">
            <p className="font-mono text-xs text-muted-foreground mb-1">quick check</p>
            <p className="text-sm font-medium text-foreground mb-4">
              which of these is <span className="italic">not</span> one of ashvin's side quests?
            </p>

            <div className="grid grid-cols-2 gap-2">
              {options.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => handleSelect(option)}
                  disabled={verified}
                  className={`rounded-xl px-4 py-3 text-sm font-medium text-left transition-all ${
                    verified
                      ? "bg-muted/50 text-muted-foreground"
                      : selected === option && wrongGuess
                        ? "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 ring-1 ring-red-300 dark:ring-red-800"
                        : "bg-muted/50 text-foreground hover:bg-muted/80"
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => handleSelect(correctAnswer)}
              disabled={verified}
              className={`mt-2 w-full rounded-xl px-4 py-3 text-sm font-medium text-left transition-all ${
                verified
                  ? "bg-foreground dark:bg-white text-background dark:text-neutral-900"
                  : "bg-muted/50 text-foreground hover:bg-muted/80"
              }`}
            >
              trick question — they're all side quests
            </button>

            {wrongGuess && !verified && (
              <p className="mt-3 font-mono text-xs text-muted-foreground">
                nope, try again.
              </p>
            )}

            {verified && (
              <div className="mt-6 flex flex-col items-center gap-4">
                <p className="font-mono text-xs text-muted-foreground">
                  correct — you're in
                </p>
                <a
                  href={message.trim() ? waUrl : `https://wa.me/${WA_NUMBER}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-foreground dark:bg-white text-background dark:text-neutral-900 text-sm font-medium hover:opacity-90 transition-opacity"
                >
                  open whatsapp →
                </a>
              </div>
            )}
          </div>
        </div>
        <Footer />
      </main>
    </>
  );
};

export default TextMe;
