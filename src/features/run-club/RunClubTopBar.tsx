"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import InviteQrButton from "./InviteQrButton";

export const RUN_CLUB_NAV_HEIGHT = "3rem";

export default function RunClubTopBar() {
  return (
    <header
      className="fixed inset-x-0 top-0 z-[60] border-b border-[color:var(--run-line)]/70 bg-[rgba(232,246,216,0.96)] backdrop-blur-md"
      style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}
    >
      <div
        className="mx-auto grid max-w-3xl grid-cols-[2.75rem_1fr_2.75rem] items-center px-2"
        style={{ height: RUN_CLUB_NAV_HEIGHT }}
      >
        <Link
          href="/"
          className="inline-flex h-11 w-11 items-center justify-center rounded-full text-[color:var(--run-ink)] transition hover:bg-white/50"
          aria-label="Back to site"
        >
          <ArrowLeft size={20} strokeWidth={2.2} />
        </Link>

        <Link
          href="/run"
          className="justify-self-center font-[family-name:var(--run-display)] text-[1.65rem] leading-none tracking-tight text-[color:var(--run-ink)]"
          aria-label="jalan home"
        >
          jalan
        </Link>

        <div className="justify-self-end">
          <InviteQrButton variant="nav" />
        </div>
      </div>
    </header>
  );
}
