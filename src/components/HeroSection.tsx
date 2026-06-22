"use client";

import { useRef, useState, useCallback } from "react";
import { motion, useMotionValue, useTransform, animate } from "motion/react";
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

const expandedText = [
  "I grew up in Sarawak, Malaysia, where I saw firsthand how education and technology can change the trajectory of a family and a community.",
  "Now I'm building Cleve — an AI workspace for writing and thinking — with 40,000+ users and backed by Antler. I also co-organised the National AI Competition, Malaysia's largest student AI challenge.",
  "I care about learning how to learn, building tools that create leverage, and making knowledge more accessible in Southeast Asia.",
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

const EXPANDED_HEIGHT = 180;
const SNAP_THRESHOLD = 40;

const HeroSection = () => {
  const [expanded, setExpanded] = useState(false);
  const dragging = useRef(false);
  const startY = useRef(0);
  const startHeight = useRef(0);
  const revealHeight = useMotionValue(0);
  const expandedRef = useRef<HTMLDivElement>(null);

  const textOpacity = useTransform(revealHeight, [0, 60], [0, 1]);
  const handleRotation = useTransform(revealHeight, [0, EXPANDED_HEIGHT], [0, 180]);

  const snapTo = useCallback((target: number) => {
    animate(revealHeight, target, {
      type: "spring",
      stiffness: 300,
      damping: 30,
    });
    setExpanded(target > 0);
  }, [revealHeight]);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    dragging.current = true;
    startY.current = e.clientY;
    startHeight.current = revealHeight.get();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, [revealHeight]);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragging.current) return;
    const delta = e.clientY - startY.current;
    const maxH = expandedRef.current?.scrollHeight ?? EXPANDED_HEIGHT;
    const next = Math.max(0, Math.min(startHeight.current + delta, maxH));
    revealHeight.set(next);
  }, [revealHeight]);

  const onPointerUp = useCallback(() => {
    if (!dragging.current) return;
    dragging.current = false;
    const current = revealHeight.get();
    const maxH = expandedRef.current?.scrollHeight ?? EXPANDED_HEIGHT;
    if (expanded) {
      snapTo(current < maxH - SNAP_THRESHOLD ? 0 : maxH);
    } else {
      snapTo(current > SNAP_THRESHOLD ? maxH : 0);
    }
  }, [revealHeight, expanded, snapTo]);

  const toggleExpand = useCallback(() => {
    const maxH = expandedRef.current?.scrollHeight ?? EXPANDED_HEIGHT;
    snapTo(expanded ? 0 : maxH);
  }, [expanded, snapTo]);

  return (
    <section
      id="hero"
      className="relative w-full flex items-center justify-center overflow-hidden rounded-2xl bg-[hsl(35,30%,90%)] dark:bg-[hsl(30,15%,12%)] text-foreground dark:text-white px-6 md:px-10 pt-20 pb-12 md:pt-24 md:pb-16"
      style={{ minHeight: "85dvh" }}
    >
      {/* Fine grid — light mode */}
      <div
        className="pointer-events-none absolute inset-0 dark:hidden"
        aria-hidden="true"
        style={{ backgroundImage: gridLightSvg, backgroundRepeat: "repeat", backgroundSize: "60px 60px" }}
      />
      {/* Fine grid — dark mode */}
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
      {/* Bottom fade — light */}
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-32 dark:hidden"
        aria-hidden="true"
        style={{ background: "linear-gradient(to top, hsl(35, 30%, 90%), transparent)" }}
      />
      {/* Bottom fade — dark */}
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-32 hidden dark:block"
        aria-hidden="true"
        style={{ background: "linear-gradient(to top, hsl(30, 15%, 12%), transparent)" }}
      />

      <div className="relative w-full grid gap-10 md:grid-cols-[1fr_16rem] lg:grid-cols-[1fr_18rem] md:items-center">
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

          {/* Expandable text */}
          <motion.div
            className="overflow-hidden"
            style={{ height: revealHeight }}
          >
            <motion.div
              ref={expandedRef}
              className="pt-4 space-y-3"
              style={{ opacity: textOpacity }}
            >
              {expandedText.map((text, i) => (
                <p
                  key={i}
                  className="text-sm text-foreground/60 dark:text-white/60 leading-relaxed"
                >
                  {text}
                </p>
              ))}
            </motion.div>
          </motion.div>

          {/* Drag handle */}
          <motion.div
            className="mt-3 flex flex-col items-start gap-1 select-none touch-none"
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            custom={2.5}
          >
            <div
              className="group flex items-center gap-2 cursor-grab active:cursor-grabbing py-2 pr-4"
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerUp}
              onClick={toggleExpand}
              role="button"
              tabIndex={0}
              aria-expanded={expanded}
              aria-label={expanded ? "Collapse bio" : "Expand bio"}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  toggleExpand();
                }
              }}
            >
              <motion.svg
                width="12"
                height="12"
                viewBox="0 0 12 12"
                className="text-foreground/30 dark:text-white/30 group-hover:text-foreground/50 dark:group-hover:text-white/50 transition-colors"
                style={{ rotate: handleRotation }}
              >
                <path
                  d="M2 4.5L6 8.5L10 4.5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </motion.svg>
              <span className="font-mono text-[11px] text-foreground/30 dark:text-white/30 group-hover:text-foreground/50 dark:group-hover:text-white/50 transition-colors">
                {expanded ? "less" : "more"}
              </span>
            </div>
          </motion.div>

          <motion.div
            className="mt-5 flex flex-wrap gap-3"
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
