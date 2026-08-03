"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, Copy, QrCode, X } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { copyText } from "./browser";
import { cn } from "@/lib/utils";

const INVITE_PATH = "/run";

type InviteQrButtonProps = {
  /** `nav` sits in the top bar; `floating` is the old map overlay style. */
  variant?: "nav" | "floating";
};

export default function InviteQrButton({ variant = "nav" }: InviteQrButtonProps) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [origin, setOrigin] = useState("");

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  const inviteUrl = useMemo(
    () => (origin ? `${origin}${INVITE_PATH}` : INVITE_PATH),
    [origin],
  );

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  async function handleCopy() {
    await copyText(inviteUrl);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          "inline-flex items-center justify-center text-[color:var(--run-ink)] transition",
          variant === "nav"
            ? "h-11 w-11 rounded-full hover:bg-white/50"
            : "fixed right-3 top-[calc(var(--run-club-nav-h,3rem)+0.5rem)] z-[58] h-11 w-11 rounded-full border border-[color:var(--run-line)] bg-[color:var(--run-panel)] shadow-[0_10px_30px_rgba(12,40,28,0.18)] backdrop-blur-md hover:bg-white md:right-5",
        )}
        aria-label="Show invite QR code"
      >
        <QrCode size={20} strokeWidth={2.2} />
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-[70] flex items-end justify-center bg-[#0d281c]/45 px-4 pb-[max(1rem,env(safe-area-inset-bottom,0px))] pt-20 backdrop-blur-[2px] sm:items-center sm:pb-6"
          role="dialog"
          aria-modal="true"
          aria-labelledby="run-invite-qr-title"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-sm rounded-[28px] border border-white/50 bg-[color:var(--run-panel)] p-5 shadow-[0_24px_80px_rgba(12,40,28,0.3)]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h2
                  id="run-invite-qr-title"
                  className="font-[family-name:var(--run-display)] text-2xl tracking-tight text-[color:var(--run-ink)]"
                >
                  Invite
                </h2>
                <p className="mt-1 text-sm text-[color:var(--run-muted)]">
                  Scan to open jalan.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-full p-2 text-[color:var(--run-muted)] hover:bg-white/60 hover:text-[color:var(--run-ink)]"
                aria-label="Close invite QR"
              >
                <X size={18} />
              </button>
            </div>

            <div className="mx-auto grid place-items-center rounded-[22px] bg-white p-4">
              {origin ? (
                <QRCodeSVG
                  value={inviteUrl}
                  size={220}
                  level="M"
                  marginSize={2}
                  bgColor="#ffffff"
                  fgColor="#123526"
                />
              ) : (
                <div className="grid h-[220px] w-[220px] place-items-center text-sm text-[color:var(--run-muted)]">
                  Loading…
                </div>
              )}
            </div>

            <p className="mt-3 break-all text-center font-mono text-[11px] text-[color:var(--run-muted)]">
              {inviteUrl}
            </p>

            <button
              type="button"
              onClick={() => void handleCopy()}
              className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-full bg-[color:var(--run-ink)] px-4 py-3 text-sm font-semibold text-[color:var(--run-accent)]"
            >
              {copied ? <Check size={16} /> : <Copy size={16} />}
              {copied ? "Copied" : "Copy link"}
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}
