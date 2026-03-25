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

const HeroSection = () => {
  return (
    <section id="hero" className="pt-16 pb-16 md:pt-24 md:pb-24">
      <div className="flex flex-col-reverse md:flex-row md:items-start md:justify-between gap-10">
        <div className="max-w-prose">
          <h1 className="text-5xl md:text-6xl font-bold tracking-tight leading-[1.05] mb-4">
            Ashvin Praveen
          </h1>
          <p className="font-mono text-sm mb-6 flex items-center gap-2">
            <span className="text-primary font-semibold">Co-founder & CEO</span>
            <span className="text-muted-foreground">·</span>
            <a
              href="https://cleve.ai"
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-primary transition-colors"
            >
              Cleve.ai
            </a>
          </p>
          <p className="text-lg md:text-xl text-foreground/90 leading-relaxed">
            Experimenting with AI's applications, building and sharing what I've found helpful.
          </p>
          <div className="mt-8 flex flex-wrap gap-2.5">
            {socials.map((social) => (
              <a
                key={social.label}
                href={social.href}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-center gap-2 px-3.5 py-2 rounded-xl border border-border bg-muted/40 hover:border-primary/40 hover:bg-muted/60 transition-all"
              >
                <img
                  src={social.icon}
                  alt={`${social.label} profile`}
                  className={`w-4 h-4 object-contain${social.iconDark ? " dark:hidden" : ""}`}
                />
                {social.iconDark && (
                  <img
                    src={social.iconDark}
                    alt=""
                    aria-hidden="true"
                    className="w-4 h-4 object-contain hidden dark:block"
                  />
                )}
                <span className="text-sm font-medium text-foreground/80 group-hover:text-foreground transition-colors">
                  {social.label}
                </span>
              </a>
            ))}
          </div>
        </div>
        <img
          src="/ashvin-profile.png"
          alt="Ashvin Praveen"
          className="w-32 h-32 md:w-44 md:h-44 rounded-2xl object-cover object-top shrink-0 ring-4 ring-primary/15"
        />
      </div>
    </section>
  );
};

export default HeroSection;
