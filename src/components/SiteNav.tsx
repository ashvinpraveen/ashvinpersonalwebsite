import Link from "next/link";
import ThemeToggle from "@/components/ThemeToggle";
import { pageShellClassName } from "@/lib/layout";

type SiteNavProps = {
  variant?: "light" | "dark";
};

const SiteNav = ({ variant = "dark" }: SiteNavProps) => {
  const logoClass = variant === "light"
    ? "text-white/90 hover:text-white"
    : "text-foreground hover:text-foreground/70";
  const linkClass = variant === "light"
    ? "text-white/70 hover:text-white"
    : "text-muted-foreground hover:text-foreground";
  const navBg = variant === "light"
    ? ""
    : "bg-background/80";

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 backdrop-blur-sm ${navBg}`}>
      <div className={`${pageShellClassName} flex items-center justify-between h-12`}>
        <Link href="/" className={`font-mono text-base font-bold tracking-widest transition-colors ${logoClass}`}>
          AP
        </Link>
        <div className="flex items-center gap-5 font-mono text-xs">
          <Link href="/postcards" className={`transition-colors ${linkClass}`}>
            Postcards
          </Link>
          <Link href="/blog" className={`transition-colors ${linkClass}`}>
            Writing
          </Link>
          <ThemeToggle />
        </div>
      </div>
    </nav>
  );
};

export default SiteNav;
