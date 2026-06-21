const socials = [
  {
    label: "LinkedIn",
    href: "https://linkedin.com/in/ashvinpraveen",
    icon: "/social-icons/LinkedIn_logo.svg",
    iconDark: null,
  },
  {
    label: "Instagram",
    href: "https://instagram.com/ashvinpraveen",
    icon: "/social-icons/Instagram_logo.svg",
    iconDark: null,
  },
  {
    label: "TikTok",
    href: "https://tiktok.com/@ashvinpraveen",
    icon: "/social-icons/TikTok_logo.svg",
    iconDark: null,
  },
  {
    label: "X",
    href: "https://x.com/ashvinpk",
    icon: "/social-icons/X_Twitter_logo.svg",
    iconDark: null,
  },
  {
    label: "YouTube",
    href: "https://youtube.com/@ashvinpraveen",
    icon: "/social-icons/YouTube_logo.svg",
    iconDark: null,
  },
  {
    label: "Threads",
    href: "https://threads.net/@ashvinpraveen",
    icon: "/social-icons/Threads_logo_black.svg",
    iconDark: "/social-icons/Threads_logo_white.svg",
  },
  {
    label: "GitHub",
    href: "https://github.com/ashvinpraveen",
    icon: "/social-icons/GitHub_logo_black.svg",
    iconDark: "/social-icons/GitHub_logo_white.svg",
  },
];

import { heading } from "@/lib/styles";

const HeroSection = () => {
  return (
    <section id="hero" className="relative -mx-6 md:-mx-12 lg:-mx-16 -mt-12 px-6 md:px-12 lg:px-16 pt-28 pb-10 md:pt-36 md:pb-14 rounded-b-3xl overflow-hidden text-white" style={{ backgroundColor: "hsl(150, 20%, 12%)" }}>
      <div className="pointer-events-none absolute inset-0 rounded-b-3xl opacity-[0.35] mix-blend-overlay" aria-hidden="true" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`, backgroundRepeat: "repeat", backgroundSize: "128px 128px" }} />
      <div className="relative grid gap-10 md:grid-cols-[minmax(0,1fr)_16rem] md:items-start">
        <div className="md:hidden">
          <img
            src="/ashvin-profile.png"
            alt="Ashvin Praveen"
            className="w-24 h-24 rounded-full object-cover object-top"
          />
        </div>
        <div className="max-w-prose">
          <h1 className={`text-3xl md:text-4xl font-bold leading-[1.1] mb-3 ${heading}`}>
            Ashvin Praveen
          </h1>
          <p className="font-mono text-sm mb-6 flex items-center gap-2">
            <span className="font-semibold">Co-founder & CEO</span>
            <span className="text-white/50">·</span>
            <a
              href="https://cleve.ai"
              target="_blank"
              rel="noopener noreferrer"
              className="text-white/70 hover:text-white transition-colors"
            >
              Cleve.ai
            </a>
          </p>
          <p className="text-base text-white/80 leading-relaxed">
            Experimenting with AI's applications, building and sharing what I've found helpful.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <a
              href="/blog"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              Read my writing
            </a>
            <a
              href="https://cal.com/ashvinpraveen"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 text-sm font-medium text-white/80 hover:text-white transition-colors"
            >
              Book a call
            </a>
          </div>
          <div className="mt-6 flex flex-wrap gap-2.5">
            {socials.map((social) => (
              <a
                key={social.label}
                href={social.href}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-center gap-2 px-3.5 py-2 rounded-full bg-white/10 transition-colors"
              >
                <img
                  src={social.iconDark || social.icon}
                  alt={`${social.label} profile`}
                  className="w-4 h-4 object-contain"
                />
                <span className="text-sm font-medium text-white/80 group-hover:text-white transition-colors">
                  {social.label}
                </span>
              </a>
            ))}
          </div>
        </div>
        <div className="hidden md:flex flex-col gap-4">
          <img
            src="/ashvin-profile.png"
            alt="Ashvin Praveen"
            className="w-full h-auto aspect-square rounded-2xl object-cover object-top shrink-0"
          />
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
