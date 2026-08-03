"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { CSSProperties, ReactNode } from "react";
import {
  CalendarDays,
  CircleUserRound,
  Footprints,
  Radio,
  Users,
} from "lucide-react";
import RunClubTopBar, { RUN_CLUB_NAV_HEIGHT } from "./RunClubTopBar";
import { cn } from "@/lib/utils";

const tabs = [
  { href: "/run", label: "Record", icon: Radio, match: (path: string) => path === "/run" },
  { href: "/run/feed", label: "Feed", icon: Footprints, match: (path: string) => path.startsWith("/run/feed") || path.startsWith("/run/a/") },
  { href: "/run/events", label: "Events", icon: CalendarDays, match: (path: string) => path.startsWith("/run/events") },
  { href: "/run/club", label: "Club", icon: Users, match: (path: string) => path.startsWith("/run/club") },
  { href: "/run/you", label: "You", icon: CircleUserRound, match: (path: string) => path.startsWith("/run/you") },
] as const;

/** Tab bar content height (excluding safe-area). Keep in sync with nav padding/py. */
export const RUN_CLUB_TAB_HEIGHT = "4.25rem";

type RunClubShellProps = {
  children: ReactNode;
  /** Hide bottom tabs during join / live recording immersion */
  hideTabs?: boolean;
  title?: string;
  subtitle?: string;
  fullBleed?: boolean;
};

export default function RunClubShell({
  children,
  hideTabs = false,
  title,
  subtitle,
  fullBleed = false,
}: RunClubShellProps) {
  const pathname = usePathname() ?? "/run";
  const tabsVisible = !hideTabs;

  return (
    <div
      className="run-club-shell text-[color:var(--run-ink)]"
      style={
        {
          "--run-club-tab-h": tabsVisible ? RUN_CLUB_TAB_HEIGHT : "0px",
          "--run-club-nav-h": `calc(${RUN_CLUB_NAV_HEIGHT} + env(safe-area-inset-top, 0px))`,
          minHeight: "100dvh",
        } as CSSProperties
      }
    >
      <RunClubTopBar />
      <div
        className={cn(
          "mx-auto w-full",
          fullBleed
            ? "min-h-dvh"
            : "max-w-3xl px-4 pt-[calc(var(--run-club-nav-h)+0.5rem)] pb-[calc(var(--run-club-tab-h)+env(safe-area-inset-bottom,0px)+1rem)]",
        )}
      >
        {!fullBleed && title ? (
          <header className="mb-5 pt-2">
            <h1 className="font-[family-name:var(--run-display)] text-3xl tracking-tight md:text-4xl">
              {title}
            </h1>
            {subtitle ? (
              <p className="mt-1 text-sm text-[color:var(--run-muted)]">{subtitle}</p>
            ) : null}
          </header>
        ) : null}
        {children}
      </div>

      {tabsVisible ? (
        <nav
          className="fixed inset-x-0 bottom-0 z-[55] border-t border-[color:var(--run-line)] bg-[rgba(232,246,216,0.96)] px-2 pt-1.5 backdrop-blur-md"
          style={{ paddingBottom: "max(0.5rem, env(safe-area-inset-bottom, 0px))" }}
          aria-label="jalan sections"
        >
          <div className="mx-auto grid h-[3.75rem] max-w-3xl grid-cols-5 gap-1">
            {tabs.map((tab) => {
              const active = tab.match(pathname);
              const Icon = tab.icon;
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  className={cn(
                    "flex flex-col items-center justify-center gap-0.5 rounded-2xl px-1 text-[10px] font-medium transition sm:text-[11px]",
                    active
                      ? "bg-[color:var(--run-ink)] text-[color:var(--run-accent)]"
                      : "text-[color:var(--run-muted)] hover:bg-white/50 hover:text-[color:var(--run-ink)]",
                  )}
                >
                  <Icon size={18} strokeWidth={active ? 2.4 : 2} />
                  {tab.label}
                </Link>
              );
            })}
          </div>
        </nav>
      ) : null}
    </div>
  );
}
