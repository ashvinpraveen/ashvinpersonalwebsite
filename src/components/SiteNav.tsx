"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";

type SiteNavProps = {
  variant?: "light" | "dark";
};

const navLinks = [
  { href: "/postcards", label: "Postcards" },
  { href: "/resources", label: "Resources" },
  { href: "/blog", label: "Writing" },
];

const SiteNav = ({ variant = "dark" }: SiteNavProps) => {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const onHero = variant === "light" && !scrolled;
  const mobileMenuOpen = menuOpen;

  const logoClass = onHero
    ? "text-foreground hover:text-foreground/70 dark:text-white/90 dark:hover:text-white"
    : "text-foreground hover:text-foreground/70";
  const linkClass = onHero
    ? "text-muted-foreground hover:text-foreground dark:text-white/70 dark:hover:text-white"
    : "text-muted-foreground hover:text-foreground";
  const navBg = scrolled
    ? "bg-background/80 backdrop-blur-md"
    : "";
  const mobilePanelClass = onHero
    ? "bg-[hsl(35,30%,90%)]/95 text-foreground dark:bg-[hsl(30,15%,12%)]/95 dark:text-white"
    : "bg-background/95 text-foreground";

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${navBg}`}>
      <div className="flex h-12 w-full items-center justify-between px-3 md:px-4 lg:px-6">
        <Link href="/" className={`text-sm font-semibold tracking-tight transition-colors sm:text-base ${logoClass}`}>
          Ashvin Praveen
        </Link>
        <div className="hidden items-center gap-5 font-mono text-xs md:flex">
          {navLinks.map((link) => (
            <Link key={link.href} href={link.href} className={`transition-colors ${linkClass}`}>
              {link.label}
            </Link>
          ))}
          <ThemeToggle className={`transition-colors ${linkClass}`} />
        </div>
        <button
          type="button"
          className={`flex h-9 w-9 items-center justify-center rounded-full transition-colors md:hidden ${linkClass}`}
          aria-label={mobileMenuOpen ? "Close navigation menu" : "Open navigation menu"}
          aria-expanded={mobileMenuOpen}
          aria-controls="mobile-navigation"
          onClick={() => setMenuOpen((open) => !open)}
        >
          {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>
      {mobileMenuOpen && (
        <div
          id="mobile-navigation"
          className={`mx-3 rounded-lg border border-border/50 px-4 py-4 shadow-lg backdrop-blur-md md:hidden ${mobilePanelClass}`}
        >
          <div className="flex flex-col gap-4 font-mono text-sm">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-muted-foreground transition-colors hover:text-foreground dark:text-white/70 dark:hover:text-white"
                onClick={() => setMenuOpen(false)}
              >
                {link.label}
              </Link>
            ))}
            <div className="flex items-center justify-between border-t border-border/50 pt-4 text-muted-foreground dark:text-white/70">
              <span>Theme</span>
              <ThemeToggle className="text-muted-foreground hover:text-foreground dark:text-white/70 dark:hover:text-white" />
            </div>
          </div>
        </div>
      )}
    </nav>
  );
};

export default SiteNav;
