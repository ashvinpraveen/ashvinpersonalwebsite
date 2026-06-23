"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import ThemeToggle from "@/components/ThemeToggle";
import { pageShellClassName } from "@/lib/layout";

type SiteNavProps = {
  variant?: "light" | "dark";
};

const SiteNav = ({ variant = "dark" }: SiteNavProps) => {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const onHero = variant === "light" && !scrolled;

  const logoClass = onHero
    ? "text-foreground hover:text-foreground/70 dark:text-white/90 dark:hover:text-white"
    : "text-foreground hover:text-foreground/70";
  const linkClass = onHero
    ? "text-muted-foreground hover:text-foreground dark:text-white/70 dark:hover:text-white"
    : "text-muted-foreground hover:text-foreground";
  const navBg = scrolled
    ? "bg-background/80 backdrop-blur-md"
    : "";

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${navBg}`}>
      <div className={`${pageShellClassName} flex items-center justify-between h-12`}>
        <Link href="/" className={`font-mono text-base font-bold tracking-widest transition-colors ${logoClass}`}>
          AP
        </Link>
        <div className="flex items-center gap-5 font-mono text-xs">
          <Link href="/postcards" className={`transition-colors ${linkClass}`}>
            Postcards
          </Link>
          <Link href="/resources" className={`transition-colors ${linkClass}`}>
            Resources
          </Link>
          <Link href="/blog" className={`transition-colors ${linkClass}`}>
            Writing
          </Link>
          <ThemeToggle className={`transition-colors ${linkClass}`} />
        </div>
      </div>
    </nav>
  );
};

export default SiteNav;
