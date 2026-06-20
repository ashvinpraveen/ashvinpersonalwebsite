import Link from "next/link";
import ThemeToggle from "@/components/ThemeToggle";
import { pageShellClassName } from "@/lib/layout";
import { navLink } from "@/lib/styles";

const SiteNav = () => {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-sm">
      <div className={`${pageShellClassName} flex items-center justify-between h-12`}>
        <Link href="/" className="font-mono text-base font-bold tracking-widest text-foreground hover:text-primary transition-colors">
          AP
        </Link>
        <div className="flex items-center gap-5 font-mono text-xs">
          <Link href="/postcards" className={navLink}>
            Postcards
          </Link>
          <Link href="/blog" className={navLink}>
            Writing
          </Link>
          <ThemeToggle />
        </div>
      </div>
    </nav>
  );
};

export default SiteNav;
