"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";
import { isBlogEnabled, isPostcardsEnabled, isRunClubEnabled } from "@/lib/features";

type SiteNavProps = {
  variant?: "light" | "dark" | "diary";
};

const navLinks = [
  { href: "/run-club", label: "Run club" },
  { href: "/startup", label: "Startup game" },
  { href: "/diary", label: "Diary" },
  { href: "/postcards", label: "Postcards" },
  { href: "/resources", label: "Resources" },
  { href: "/blog", label: "Writing" },
].filter((link) => {
  if (link.href === "/blog") return isBlogEnabled;
  if (link.href === "/postcards") return isPostcardsEnabled;
  if (link.href === "/run-club") return isRunClubEnabled;
  return true;
});

const SiteNav = ({ variant = "dark" }: SiteNavProps) => {
  const navRef = useRef<HTMLElement>(null);
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!menuOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (navRef.current?.contains(event.target as Node)) return;
      setMenuOpen(false);
    };

    window.addEventListener("pointerdown", handlePointerDown);
    return () => window.removeEventListener("pointerdown", handlePointerDown);
  }, [menuOpen]);

  const onHero = variant === "light" && !scrolled;
  const onDiary = variant === "diary" && !scrolled;
  const mobileMenuOpen = menuOpen;

  const logoClass = onDiary
    ? "text-[#e2d4b8]/85 hover:text-[#f5ead0]"
    : onHero
      ? "text-foreground hover:text-foreground/70 dark:text-white/90 dark:hover:text-white"
      : "text-foreground hover:text-foreground/70";
  const linkClass = onDiary
    ? "text-[#e2d4b8]/55 hover:text-[#f5ead0]"
    : onHero
      ? "text-muted-foreground hover:text-foreground dark:text-white/70 dark:hover:text-white"
      : "text-muted-foreground hover:text-foreground";
  const navBg = scrolled
    ? "bg-background/80 backdrop-blur-md"
    : onDiary
      ? "bg-black/10 backdrop-blur-[2px]"
    : "";
  const mobilePanelClass = onDiary
    ? "border-[#e2d4b8]/10 bg-[#120c08]/95 text-[#f5ead0]"
    : onHero
      ? "bg-[hsl(35,30%,90%)]/95 text-foreground dark:bg-[hsl(30,15%,12%)]/95 dark:text-white"
      : "bg-background/95 text-foreground";

  return (
    <nav ref={navRef} className={`site-nav fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${navBg}`}>
      <div className="flex h-12 w-full items-center justify-between px-3 md:px-4 lg:px-6">
        <Link href="/" className={`text-sm tracking-tight transition-colors sm:text-base ${logoClass}`}>
          <span className="font-semibold">Ashvin</span>{" "}
          <span className="font-normal">Praveen</span>
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
                className={`transition-colors ${
                  onDiary
                    ? "text-[#e2d4b8]/65 hover:text-[#f5ead0]"
                    : "text-muted-foreground hover:text-foreground dark:text-white/70 dark:hover:text-white"
                }`}
                onClick={() => setMenuOpen(false)}
              >
                {link.label}
              </Link>
            ))}
            <div
              className={`flex items-center justify-between border-t pt-4 ${
                onDiary
                  ? "border-[#e2d4b8]/10 text-[#e2d4b8]/65"
                  : "border-border/50 text-muted-foreground dark:text-white/70"
              }`}
            >
              <span>Theme</span>
              <ThemeToggle
                className={
                  onDiary
                    ? "text-[#e2d4b8]/65 hover:text-[#f5ead0]"
                    : "text-muted-foreground hover:text-foreground dark:text-white/70 dark:hover:text-white"
                }
              />
            </div>
          </div>
        </div>
      )}
    </nav>
  );
};

export default SiteNav;
