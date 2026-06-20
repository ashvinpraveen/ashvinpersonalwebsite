import { contentColumnClassName } from "@/lib/layout";

const Footer = () => {
  const year = new Date().getFullYear();

  return (
    <footer className={`${contentColumnClassName} mt-28 md:mt-36`}>
      <div className="relative py-16 md:py-24">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />

        <p className="text-center text-[clamp(2rem,8vw,5rem)] font-bold tracking-tight leading-none text-foreground/[0.04] select-none pointer-events-none"
           aria-hidden="true"
        >
          keep building
        </p>

        <div className="relative -mt-6 md:-mt-10 flex flex-col items-center gap-6 text-center">
          <div className="flex items-center gap-3 font-mono text-xs text-muted-foreground">
            <a
              href="https://github.com/ashvinpraveen/ashvinpersonalwebsite"
              target="_blank"
              rel="noreferrer"
              className="text-foreground/60 hover:text-primary transition-colors"
            >
              Source
            </a>
            <span className="text-border">·</span>
            <a
              href="https://github.com/ashvinpraveen/ashvinpersonalwebsite/fork"
              target="_blank"
              rel="noreferrer"
              className="text-foreground/60 hover:text-primary transition-colors"
            >
              Fork this site
            </a>
            <span className="text-border">·</span>
            <a
              href="https://cleve.ai"
              target="_blank"
              rel="noreferrer"
              className="text-foreground/60 hover:text-primary transition-colors"
            >
              Built with Cleve
            </a>
          </div>

          <p className="font-mono text-[10px] text-muted-foreground/60">
            © {year} Ashvin Praveen
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
