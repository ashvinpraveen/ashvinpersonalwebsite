import Link from "next/link";
import ThemeToggle from "@/components/ThemeToggle";
import { pageShellClassName } from "@/lib/layout";

const SiteNav = () => {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 backdrop-blur-sm">
      <div className={`${pageShellClassName} flex items-center justify-between h-12`}>
        <Link href="/" className="font-mono text-base font-bold tracking-widest text-white/90 hover:text-white transition-colors">
          AP
        </Link>
        <div className="flex items-center gap-5 font-mono text-xs">
          <Link href="/postcards" className="text-white/70 hover:text-white transition-colors">
            Postcards
          </Link>
          <Link href="/blog" className="text-white/70 hover:text-white transition-colors">
            Writing
          </Link>
          <ThemeToggle />
        </div>
      </div>
    </nav>
  );
};

export default SiteNav;
