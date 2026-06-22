"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import SiteNav from "@/components/SiteNav";
import Footer from "@/components/Footer";
import { pageShellClassName, contentColumnClassName } from "@/lib/layout";
import { heading } from "@/lib/styles";

const HOLD_DURATION = 10_000;
const WA_NUMBER = "60109847954";

const TextMe = () => {
  const [message, setMessage] = useState("");
  const [progress, setProgress] = useState(0);
  const [holding, setHolding] = useState(false);
  const [verified, setVerified] = useState(false);
  const startRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);

  const tick = useCallback(() => {
    if (!startRef.current) return;
    const elapsed = Date.now() - startRef.current;
    const pct = Math.min(elapsed / HOLD_DURATION, 1);
    setProgress(pct);

    if (pct >= 1) {
      setHolding(false);
      setVerified(true);
      startRef.current = null;
      return;
    }
    rafRef.current = requestAnimationFrame(tick);
  }, []);

  const startHold = useCallback(() => {
    if (verified || !message.trim()) return;
    setHolding(true);
    startRef.current = Date.now();
    rafRef.current = requestAnimationFrame(tick);
  }, [verified, message, tick]);

  const stopHold = useCallback(() => {
    if (verified) return;
    setHolding(false);
    startRef.current = null;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    setProgress(0);
  }, [verified]);

  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const waUrl = `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(message.trim())}`;

  const radius = 28;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - progress);

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
            type your message below, then hold the button for 10 seconds to prove you're a real person.
          </p>

          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="what's on your mind?"
            rows={4}
            className="w-full resize-none rounded-2xl bg-muted/50 border border-border px-5 py-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-foreground/20 transition-shadow"
          />

          <div className="mt-8 flex flex-col items-center gap-6">
            {!verified ? (
              <>
                <div className="relative flex items-center justify-center">
                  <svg
                    width="72"
                    height="72"
                    viewBox="0 0 72 72"
                    className="-rotate-90"
                  >
                    <circle
                      cx="36"
                      cy="36"
                      r={radius}
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3"
                      className="text-muted"
                    />
                    <circle
                      cx="36"
                      cy="36"
                      r={radius}
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeDasharray={circumference}
                      strokeDashoffset={strokeDashoffset}
                      className="text-foreground dark:text-white transition-[stroke-dashoffset] duration-75"
                    />
                  </svg>
                  <button
                    type="button"
                    onMouseDown={startHold}
                    onMouseUp={stopHold}
                    onMouseLeave={stopHold}
                    onTouchStart={startHold}
                    onTouchEnd={stopHold}
                    onTouchCancel={stopHold}
                    disabled={!message.trim()}
                    className={`absolute w-12 h-12 rounded-full flex items-center justify-center transition-all select-none ${
                      !message.trim()
                        ? "bg-muted text-muted-foreground cursor-not-allowed"
                        : holding
                          ? "bg-foreground dark:bg-white text-background dark:text-neutral-900 scale-95"
                          : "bg-foreground/10 dark:bg-white/10 text-foreground dark:text-white hover:bg-foreground/20 dark:hover:bg-white/20"
                    }`}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="m22 2-7 20-4-9-9-4z" />
                      <path d="M22 2 11 13" />
                    </svg>
                  </button>
                </div>
                <p className="font-mono text-xs text-muted-foreground text-center">
                  {!message.trim()
                    ? "type a message first"
                    : holding
                      ? `hold… ${Math.ceil((HOLD_DURATION - progress * HOLD_DURATION) / 1000)}s`
                      : "hold the button for 10s to send"}
                </p>
              </>
            ) : (
              <div className="flex flex-col items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-foreground dark:bg-white flex items-center justify-center">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="text-background dark:text-neutral-900"
                  >
                    <path d="M20 6 9 17l-5-5" />
                  </svg>
                </div>
                <p className="font-mono text-xs text-muted-foreground">
                  verified — you're human
                </p>
                <a
                  href={waUrl}
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
