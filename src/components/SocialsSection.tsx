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
    href: "https://x.com/ashvinpraveen",
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
];

const SocialsSection = () => {
  return (
    <section className="py-16 md:py-20 border-t border-border">
      <div className="flex items-center gap-3 mb-8">
        <span className="h-px w-6 bg-primary shrink-0" />
        <p className="font-mono text-xs text-muted-foreground uppercase tracking-widest">Find Me On</p>
      </div>
      <div className="flex flex-wrap gap-3">
        {socials.map((social) => (
          <a
            key={social.label}
            href={social.href}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-center gap-2.5 px-4 py-2.5 rounded-xl border border-border bg-muted/40 hover:border-primary/40 hover:bg-muted/60 transition-all"
          >
            <img
              src={social.icon}
              alt={social.label}
              className={`w-4 h-4 object-contain${social.iconDark ? " dark:hidden" : ""}`}
            />
            {social.iconDark && (
              <img
                src={social.iconDark}
                alt={social.label}
                className="w-4 h-4 object-contain hidden dark:block"
              />
            )}
            <span className="text-sm font-medium text-foreground/80 group-hover:text-foreground transition-colors">
              {social.label}
            </span>
          </a>
        ))}
      </div>
    </section>
  );
};

export default SocialsSection;
