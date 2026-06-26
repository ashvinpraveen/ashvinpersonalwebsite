import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/components/theme-context";

type ThemeToggleProps = {
  className?: string;
};

const ThemeToggle = ({ className }: ThemeToggleProps) => {
  const [mounted, setMounted] = useState(false);
  const { resolvedTheme, setTheme } = useTheme();

  useEffect(() => {
    setMounted(true);
  }, []);

  const isDark = mounted && resolvedTheme === "dark";

  return (
    <button
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className={`transition-colors font-mono text-xs ${className ?? "text-muted-foreground hover:text-foreground"}`}
      aria-label="Toggle theme"
    >
      {isDark ? <Moon size={15} /> : <Sun size={15} />}
    </button>
  );
};

export default ThemeToggle;
