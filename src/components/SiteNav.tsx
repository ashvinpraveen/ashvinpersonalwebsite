import { Link } from "react-router-dom";
import ThemeToggle from "@/components/ThemeToggle";

const SiteNav = () => {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-sm border-b border-border">
      <div className="max-w-3xl mx-auto px-6 md:px-12 lg:px-20 flex items-center justify-between h-12">
        <Link to="/" className="font-mono text-base font-bold tracking-widest text-foreground hover:text-primary transition-colors">
          AP
        </Link>
        <div className="flex items-center gap-5 font-mono text-xs">
          <Link to="/blog" className="text-muted-foreground hover:text-foreground transition-colors">
            Writing
          </Link>
          <Link to="/reps" className="text-muted-foreground hover:text-foreground transition-colors">
            Reps
          </Link>
          <ThemeToggle />
        </div>
      </div>
    </nav>
  );
};

export default SiteNav;
