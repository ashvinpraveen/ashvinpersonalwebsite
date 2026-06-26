import { linkSubtle } from "@/lib/styles";
import { pageShellClassName } from "@/lib/layout";

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
      <div className={`${pageShellClassName} relative py-16 md:py-24`}>
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
      </div>
    </footer>
  );
};

export default Footer;
