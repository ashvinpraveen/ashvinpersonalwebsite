import { linkSubtle } from "@/lib/styles";
import { pageShellClassName } from "@/lib/layout";
import { PlanetaryGearSystem } from "@/components/HeroSection";
import { cuttingMatGridDark, cuttingMatGridLight, grainSvg } from "@/lib/visuals";

const Footer = () => {
  const year = new Date().getFullYear();

  return (
    <footer className="relative left-1/2 -ml-[50vw] w-[100vw] mt-28 md:mt-36 overflow-hidden bg-[hsl(35,30%,90%)] dark:bg-[hsl(30,15%,12%)]">
      {/* Grid — light */}
      <div
        className="pointer-events-none absolute inset-0 dark:hidden"
        aria-hidden="true"
        style={{ backgroundImage: cuttingMatGridLight, backgroundPosition: "right top" }}
      />
      {/* Grid — dark */}
      <div
        className="pointer-events-none absolute inset-0 hidden dark:block"
        aria-hidden="true"
        style={{ backgroundImage: cuttingMatGridDark, backgroundPosition: "right top" }}
      />
      {/* Grain */}
      <div
        className="pointer-events-none absolute inset-0 opacity-30 dark:opacity-50 mix-blend-overlay"
        aria-hidden="true"
        style={{ backgroundImage: grainSvg, backgroundRepeat: "repeat", backgroundSize: "128px 128px" }}
      />
      <div className={`${pageShellClassName} relative pt-16 md:pt-24`}>
        <div className="grid gap-8 text-sm sm:grid-cols-2 md:grid-cols-4">
          <div className="space-y-3">
            <p className="font-semibold tracking-tight">Site</p>
            <div className="flex flex-col gap-2 text-muted-foreground">
              <a href="/" className={linkSubtle}>Home</a>
              <a href="/blog" className={linkSubtle}>Writing</a>
              <a href="/resources" className={linkSubtle}>Resources</a>
              <a href="/postcards" className={linkSubtle}>Postcards</a>
            </div>
          </div>
          <div className="space-y-3">
            <p className="font-semibold tracking-tight">Projects</p>
            <div className="flex flex-col gap-2 text-muted-foreground">
              <a href="https://cleve.ai" target="_blank" rel="noreferrer" className={linkSubtle}>Cleve.ai</a>
              <a href="https://www.malaysian.ai/" target="_blank" rel="noreferrer" className={linkSubtle}>Malaysian.ai</a>
              <a href="https://rakantutor.org/naic" target="_blank" rel="noreferrer" className={linkSubtle}>NAIC</a>
              <a href="https://buildforpublic.com" target="_blank" rel="noreferrer" className={linkSubtle}>Build for Public</a>
            </div>
          </div>
          <div className="space-y-3">
            <p className="font-semibold tracking-tight">Contact</p>
            <div className="flex flex-col gap-2 text-muted-foreground">
              <a href="https://cal.com/ashvinpraveen" target="_blank" rel="noreferrer" className={linkSubtle}>Book a call</a>
              <a href="https://linkedin.com/in/ashvinpraveen" target="_blank" rel="noreferrer" className={linkSubtle}>LinkedIn</a>
              <a href="/text" className={linkSubtle}>Text me</a>
            </div>
          </div>
          <div className="space-y-3">
            <p className="font-semibold tracking-tight">Colophon</p>
            <div className="flex flex-col gap-2 text-muted-foreground">
              <a
                href="https://github.com/ashvinpraveen/ashvinpersonalwebsite"
                target="_blank"
                rel="noreferrer"
                className={linkSubtle}
              >
                Source
              </a>
              <a
                href="https://github.com/ashvinpraveen/ashvinpersonalwebsite/fork"
                target="_blank"
                rel="noreferrer"
                className={linkSubtle}
              >
                Fork this site
              </a>
              <span>© {year} Ashvin Praveen</span>
            </div>
          </div>
        </div>
        <div className="relative left-1/2 mt-16 w-screen -translate-x-1/2 px-6 pb-16 md:mt-24 md:px-12 md:pb-24 lg:px-16">
          <div className="mx-auto max-w-6xl">
            <div className="mb-8 flex flex-col gap-4 border-t border-border/35 pt-6 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-foreground/20 dark:text-white/20">
                  Planetary gear train
                </p>
              </div>
              <div className="flex flex-wrap gap-x-6 gap-y-1 font-mono text-[10px] uppercase tracking-[0.14em] text-foreground/20 dark:text-white/20 md:justify-end">
                <span>AP-03</span>
                <span>Animated section</span>
              </div>
            </div>
            <PlanetaryGearSystem
              infoPlacement="side"
              className="pointer-events-none h-full w-full overflow-visible text-foreground/18 dark:text-white/20 md:pointer-events-auto"
            />
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
