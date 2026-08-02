"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import {
  CalendarDays,
  CircleUserRound,
  Footprints,
  Radio,
  Users,
} from "lucide-react";
import SiteNav from "@/components/SiteNav";
import { cn } from "@/lib/utils";

const tabs = [
  { href: "/run-club", label: "Record", icon: Radio, match: (path: string) => path === "/run-club" },
  { href: "/run-club/feed", label: "Feed", icon: Footprints, match: (path: string) => path.startsWith("/run-club/feed") || path.startsWith("/run-club/a/") },
  { href: "/run-club/events", label: "Events", icon: CalendarDays, match: (path: string) => path.startsWith("/run-club/events") },
  { href: "/run-club/club", label: "Club", icon: Users, match: (path: string) => path.startsWith("/run-club/club") },
  { href: "/run-club/you", label: "You", icon: CircleUserRound, match: (path: string) => path.startsWith("/run-club/you") },
] as const;

type RunClubShellProps = {
  children: ReactNode;
  /** Hide bottom tabs during live recording immersion */
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
  const pathname = usePathname() ?? "/run-club";

  return (
    <div className="run-club-shell min-h-dvh text-[color:var(--run-ink)]">
      <SiteNav variant="light" />
      <div
        className={cn(
          "mx-auto w-full",
          fullBleed ? "" : "max-w-3xl px-4 pt-16",
          hideTabs ? "pb-4" : "pb-[calc(5.5rem+env(safe-area-inset-bottom))]",
        )}
      >
        {!fullBleed && title ? (
          <header className="mb-5 pt-2">
            <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-[color:var(--run-accent-deep)]">
              AI Run Club
            </p>
            <h1 className="mt-1 font-[family-name:var(--run-display)] text-3xl tracking-tight md:text-4xl">
              {title}
            </h1>
            {subtitle ? (
              <p className="mt-1 text-sm text-[color:var(--run-muted)]">{subtitle}</p>
            ) : null}
          </header>
        ) : null}
        {children}
      </div>

      {!hideTabs ? (
        <nav
          className="fixed inset-x-0 bottom-0 z-[55] border-t border-[color:var(--run-line)] bg-[rgba(232,246,216,0.92)] px-2 pb-[env(safe-area-inset-bottom)] pt-2 backdrop-blur-md"
          aria-label="Run club sections"
        >
          <div className="mx-auto grid max-w-3xl grid-cols-5 gap-1">
            {tabs.map((tab) => {
              const active = tab.match(pathname);
              const Icon = tab.icon;
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  className={cn(
                    "flex flex-col items-center gap-1 rounded-2xl px-2 py-2 text-[11px] font-medium transition",
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
