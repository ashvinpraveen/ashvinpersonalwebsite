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

const cuttingMatSvg = `url("data:image/svg+xml,%3Csvg width='120' height='120' xmlns='http://www.w3.org/2000/svg'%3E%3Crect width='120' height='120' fill='none'/%3E%3Cpath d='M120 0L0 120M120 120L0 0' stroke='rgba(255,255,255,0.04)' stroke-width='0.5'/%3E%3Crect x='0' y='0' width='120' height='120' fill='none' stroke='rgba(255,255,255,0.06)' stroke-width='0.5'/%3E%3Cline x1='60' y1='0' x2='60' y2='120' stroke='rgba(255,255,255,0.03)' stroke-width='0.5'/%3E%3Cline x1='0' y1='60' x2='120' y2='60' stroke='rgba(255,255,255,0.03)' stroke-width='0.5'/%3E%3C/svg%3E")`;

const grainSvg = `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`;

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: 0.15 + i * 0.1, duration: 0.5, ease: [0.25, 0.1, 0.25, 1] as const },
  }),
};

const HeroSection = () => {
  return (
    <section
      id="hero"
      className="relative -mx-6 md:-mx-12 lg:-mx-16 -mt-12 px-6 md:px-12 lg:px-16 min-h-screen flex items-end pb-16 md:pb-20 rounded-b-3xl overflow-hidden text-white"
      style={{ backgroundColor: "hsl(30, 15%, 12%)" }}
    >
      {/* Cutting mat grid */}
      <div
        className="pointer-events-none absolute inset-0"
        aria-hidden="true"
        style={{ backgroundImage: cuttingMatSvg, backgroundRepeat: "repeat", backgroundSize: "120px 120px" }}
      />
      {/* Grain overlay */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.5] mix-blend-overlay"
        aria-hidden="true"
        style={{ backgroundImage: grainSvg, backgroundRepeat: "repeat", backgroundSize: "128px 128px" }}
      />

      <div className="relative w-full grid gap-10 md:grid-cols-[minmax(0,1fr)_16rem] md:items-end">
        <div className="md:hidden">
          <motion.img
            src="/ashvin-profile.png"
            alt="Ashvin Praveen"
            className="w-24 h-24 rounded-full object-cover object-top"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
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
            <span className="text-white/50">·</span>
            <a
              href="https://cleve.ai"
              target="_blank"
              rel="noopener noreferrer"
              className="text-white/70 hover:text-white transition-colors"
            >
              Cleve.ai
            </a>
          </motion.p>
          <motion.p
            className="text-base text-white/80 leading-relaxed"
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            custom={2}
          >
            Experimenting with AI's applications, building and sharing what I've found helpful.
          </motion.p>
          <motion.div
            className="mt-6 flex flex-wrap gap-3"
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            custom={3}
          >
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
          </motion.div>
          <motion.div
            className="mt-6 flex flex-wrap gap-2.5"
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
          </motion.div>
        </div>
        <div className="hidden md:flex flex-col gap-4">
          <motion.img
            src="/ashvin-profile.png"
            alt="Ashvin Praveen"
            className="w-full h-auto aspect-square rounded-2xl object-cover object-top shrink-0"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          />
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
