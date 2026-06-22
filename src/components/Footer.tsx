import { linkSubtle } from "@/lib/styles";

const gridLightSvg = `url("data:image/svg+xml,%3Csvg width='60' height='60' xmlns='http://www.w3.org/2000/svg'%3E%3Crect width='60' height='60' fill='none' stroke='rgba(0,0,0,0.06)' stroke-width='0.5'/%3E%3C/svg%3E")`;
const gridDarkSvg = `url("data:image/svg+xml,%3Csvg width='60' height='60' xmlns='http://www.w3.org/2000/svg'%3E%3Crect width='60' height='60' fill='none' stroke='rgba(255,255,255,0.06)' stroke-width='0.5'/%3E%3C/svg%3E")`;
const grainSvg = `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`;

const Footer = () => {
  const year = new Date().getFullYear();

  return (
    <footer className="relative left-1/2 -ml-[50vw] w-[100vw] mt-28 md:mt-36 overflow-hidden bg-[hsl(35,30%,90%)] dark:bg-[hsl(30,15%,12%)]">
      {/* Grid — light */}
      <div
        className="pointer-events-none absolute inset-0 dark:hidden"
        aria-hidden="true"
        style={{ backgroundImage: gridLightSvg, backgroundRepeat: "repeat", backgroundSize: "60px 60px" }}
      />
      {/* Grid — dark */}
      <div
        className="pointer-events-none absolute inset-0 hidden dark:block"
        aria-hidden="true"
        style={{ backgroundImage: gridDarkSvg, backgroundRepeat: "repeat", backgroundSize: "60px 60px" }}
      />
      {/* Grain */}
      <div
        className="pointer-events-none absolute inset-0 opacity-30 dark:opacity-50 mix-blend-overlay"
        aria-hidden="true"
        style={{ backgroundImage: grainSvg, backgroundRepeat: "repeat", backgroundSize: "128px 128px" }}
      />
      {/* Top fade — light */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-24 dark:hidden"
        aria-hidden="true"
        style={{ background: "linear-gradient(to bottom, hsl(35, 30%, 90%), transparent)" }}
      />
      {/* Top fade — dark */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-24 hidden dark:block"
        aria-hidden="true"
        style={{ background: "linear-gradient(to bottom, hsl(30, 15%, 12%), transparent)" }}
      />

      <div className="relative py-16 md:py-24 flex flex-col items-center gap-6 text-center px-6">
        <div className="flex items-center gap-3 font-mono text-xs text-muted-foreground">
          <a
            href="https://github.com/ashvinpraveen/ashvinpersonalwebsite"
            target="_blank"
            rel="noreferrer"
            className={linkSubtle}
          >
            source
          </a>
          <span className="text-border">·</span>
          <a
            href="https://github.com/ashvinpraveen/ashvinpersonalwebsite/fork"
            target="_blank"
            rel="noreferrer"
            className={linkSubtle}
          >
            fork this site
          </a>
          <span className="text-border">·</span>
          <a
            href="https://cleve.ai"
            target="_blank"
            rel="noreferrer"
            className={linkSubtle}
          >
            built with cleve
          </a>
        </div>

        <p className="font-mono text-[10px] text-muted-foreground/60">
          © {year} ashvin praveen
        </p>
      </div>
    </footer>
  );
};

export default Footer;
