"use client";

import { motion } from "motion/react";
import { heading } from "@/lib/styles";

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

const gridLightSvg = `url("data:image/svg+xml,%3Csvg width='60' height='60' xmlns='http://www.w3.org/2000/svg'%3E%3Crect width='60' height='60' fill='none' stroke='rgba(0,0,0,0.06)' stroke-width='0.5'/%3E%3C/svg%3E")`;
const gridDarkSvg = `url("data:image/svg+xml,%3Csvg width='60' height='60' xmlns='http://www.w3.org/2000/svg'%3E%3Crect width='60' height='60' fill='none' stroke='rgba(255,255,255,0.06)' stroke-width='0.5'/%3E%3C/svg%3E")`;
const grainSvg = `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`;

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: 0.2 + i * 0.08, duration: 0.6, ease: [0.22, 1, 0.36, 1] as const },
  }),
};

const HeroSection = () => {
  return (
    <section
      id="hero"
      className="relative w-full flex items-center justify-center overflow-hidden bg-[hsl(35,30%,90%)] dark:bg-[hsl(30,15%,12%)] text-foreground dark:text-white px-6 md:px-12 lg:px-16 pt-24 pb-16 md:pt-32 md:pb-20"
      style={{ minHeight: "100dvh" }}
    >
      <div
        className="pointer-events-none absolute inset-0 dark:hidden"
        aria-hidden="true"
        style={{ backgroundImage: gridLightSvg, backgroundRepeat: "repeat", backgroundSize: "60px 60px" }}
      />
      <div
        className="pointer-events-none absolute inset-0 hidden dark:block"
        aria-hidden="true"
        style={{ backgroundImage: gridDarkSvg, backgroundRepeat: "repeat", backgroundSize: "60px 60px" }}
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-30 dark:opacity-50 mix-blend-overlay"
        aria-hidden="true"
        style={{ backgroundImage: grainSvg, backgroundRepeat: "repeat", backgroundSize: "128px 128px" }}
      />
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-32 dark:hidden"
        aria-hidden="true"
        style={{ background: "linear-gradient(to top, hsl(35, 30%, 90%), transparent)" }}
      />
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-32 hidden dark:block"
        aria-hidden="true"
        style={{ background: "linear-gradient(to top, hsl(30, 15%, 12%), transparent)" }}
      />

      <div className="relative w-full max-w-4xl mx-auto grid gap-10 md:grid-cols-[1fr_18rem] lg:grid-cols-[1fr_20rem] md:items-center">
        <div className="md:hidden">
          <motion.img
            src="/ashvin-profile.png"
            alt="Ashvin Praveen"
            className="w-24 h-24 rounded-full object-cover object-top"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] as const }}
          />
        </div>
        <div className="max-w-prose">
          <motion.h1
            className={`text-3xl md:text-4xl font-bold leading-[1.1] mb-3 ${heading}`}
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            custom={0}
          >
            Ashvin Praveen
          </motion.h1>
          <motion.p
            className="font-mono text-sm mb-6 flex items-center gap-2"
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            custom={1}
          >
            <span className="font-semibold">Co-founder & CEO</span>
            <span className="text-foreground/40 dark:text-white/40">·</span>
            <a
              href="https://cleve.ai"
              target="_blank"
              rel="noopener noreferrer"
              className="text-foreground/60 dark:text-white/60 hover:text-foreground dark:hover:text-white transition-colors"
            >
              Cleve.ai
            </a>
          </motion.p>
          <motion.p
            className="text-base text-foreground/70 dark:text-white/70 leading-relaxed"
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            custom={2}
          >
            Experimenting with AI's applications, building and sharing what I've found helpful.
          </motion.p>
          <motion.div
            className="mt-8 flex flex-wrap gap-3"
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            custom={3}
          >
            <a
              href="/blog"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-foreground dark:bg-white text-background dark:text-neutral-900 text-sm font-medium hover:opacity-90 transition-opacity"
            >
              Read my writing
            </a>
            <a
              href="/text"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full backdrop-blur-md bg-foreground/[0.08] dark:bg-white/10 text-sm font-medium text-foreground/80 dark:text-white/80 hover:bg-foreground/[0.12] dark:hover:bg-white/15 hover:text-foreground dark:hover:text-white transition-colors"
            >
              Text me
            </a>
          </motion.div>
          <motion.div
            className="mt-6 flex flex-wrap gap-2"
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            custom={4}
          >
            {socials.map((social) => (
              <a
                key={social.label}
                href={social.href}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-center gap-2 px-3 py-1.5 rounded-full backdrop-blur-md bg-foreground/[0.06] dark:bg-white/[0.07] hover:bg-foreground/[0.1] dark:hover:bg-white/[0.12] transition-colors"
              >
                <img
                  src={social.icon}
                  alt={`${social.label} profile`}
                  className={`w-3.5 h-3.5 object-contain${social.iconDark ? " dark:hidden" : ""}`}
                />
                {social.iconDark && (
                  <img
                    src={social.iconDark}
                    alt=""
                    aria-hidden="true"
                    className="w-3.5 h-3.5 object-contain hidden dark:block"
                  />
                )}
                <span className="text-xs font-medium text-foreground/70 dark:text-white/70 group-hover:text-foreground dark:group-hover:text-white transition-colors">
                  {social.label}
                </span>
              </a>
            ))}
          </motion.div>
        </div>
        <div className="hidden md:flex flex-col gap-4">
          <motion.img
            src="/ashvin-profile.png"
            alt="Ashvin Praveen"
            className="w-full h-auto aspect-square rounded-2xl object-cover object-top shrink-0"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.3, ease: [0.22, 1, 0.36, 1] as const }}
          />
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
