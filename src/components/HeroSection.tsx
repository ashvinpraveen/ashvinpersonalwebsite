"use client";

import { useRef, useState } from "react";
import { motion } from "motion/react";
import { pageShellClassName } from "@/lib/layout";
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

const cuttingMatGridLight = [
  "repeating-linear-gradient(to right, rgba(0,0,0,0.032) 0 1px, transparent 1px 8px)",
  "repeating-linear-gradient(to bottom, rgba(0,0,0,0.032) 0 1px, transparent 1px 8px)",
  "repeating-linear-gradient(to right, rgba(0,0,0,0.05) 0 1.25px, transparent 1.25px 80px)",
  "repeating-linear-gradient(to bottom, rgba(0,0,0,0.05) 0 1.25px, transparent 1.25px 80px)",
].join(", ");
const cuttingMatGridDark = [
  "repeating-linear-gradient(to right, rgba(255,255,255,0.032) 0 1px, transparent 1px 8px)",
  "repeating-linear-gradient(to bottom, rgba(255,255,255,0.032) 0 1px, transparent 1px 8px)",
  "repeating-linear-gradient(to right, rgba(255,255,255,0.055) 0 1.25px, transparent 1.25px 80px)",
  "repeating-linear-gradient(to bottom, rgba(255,255,255,0.055) 0 1.25px, transparent 1.25px 80px)",
].join(", ");
const grainSvg = `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`;

const createGearPath = (cx: number, cy: number, pitchRadius: number, toothDepth: number, teeth: number) => {
  const points = Array.from({ length: teeth * 2 }, (_, index) => {
    const radius = pitchRadius + (index % 2 === 0 ? toothDepth / 2 : -toothDepth / 2);
    const angle = -Math.PI / 2 + (index * Math.PI) / teeth;

    return [cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius];
  });

  return `${points.map(([x, y], index) => `${index === 0 ? "M" : "L"} ${x.toFixed(3)} ${y.toFixed(3)}`).join(" ")} Z`;
};

const bigGearPath = createGearPath(480, 320, 320, 10, 72);
const smallGearCenters = [
  { x: 660, y: 631.769 },
  { x: 120, y: 320 },
  { x: 660, y: 8.231 },
] as const;
const planetGearPhase = 70;
type PlanetGearId = `planet-${0 | 1 | 2}`;
type ActiveGear = "ring" | "sun" | "carrier" | PlanetGearId | null;
type GearLesson = {
  title: string;
  eyebrow: string;
  body: string;
  detail: string;
};
type GearAccent = {
  color: string;
  glow: string;
};

const planetLesson = {
  eyebrow: "planet gears: load sharers",
  title: "These translate fast motor spin into stronger useful motion.",
  body: "They roll between the fast sun and the fixed outer ring, forcing the carrier to turn more slowly.",
  detail: "Three planets share tooth contact, so the gearbox handles more torque without becoming much wider.",
};

const gearLessons: Record<Exclude<ActiveGear, null>, GearLesson> = {
  ring: {
    eyebrow: "fixed ring: the reaction",
    title: "Hold one part still, and the gearbox has something to push against.",
    body: "In a real planetary gearbox this outer ring is bolted to the case. Without it, the gears mostly chase each other.",
    detail: "Drill example: motor spins the sun, the case holds the ring, the carrier drives the chuck.",
  },
  sun: {
    eyebrow: "input: fast motor gear",
    title: "Start here: the motor usually spins this center gear.",
    body: "The problem is that motors like spinning fast, but drills and wheels need slower, stronger rotation.",
    detail: "Power path: input sun -> planets -> output carrier, while the outer ring is held still.",
  },
  carrier: {
    eyebrow: "output: slower stronger shaft",
    title: "This arm is the useful output.",
    body: "As the planets roll, their centers orbit. The carrier collects those orbiting centers into one smooth rotation.",
    detail: "In a drill it drives the chuck. In cars or e-bikes it can drive the axle or the next gear stage.",
  },
  "planet-0": planetLesson,
  "planet-1": planetLesson,
  "planet-2": planetLesson,
};

const gearAccents: Record<Exclude<ActiveGear, null>, GearAccent> = {
  ring: { color: "#8b5cf6", glow: "rgba(139, 92, 246, 0.2)" },
  sun: { color: "#f59e0b", glow: "rgba(245, 158, 11, 0.2)" },
  carrier: { color: "#14b8a6", glow: "rgba(20, 184, 166, 0.18)" },
  "planet-0": { color: "#f43f5e", glow: "rgba(244, 63, 94, 0.18)" },
  "planet-1": { color: "#f43f5e", glow: "rgba(244, 63, 94, 0.18)" },
  "planet-2": { color: "#f43f5e", glow: "rgba(244, 63, 94, 0.18)" },
};

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: 0.2 + i * 0.08, duration: 0.6, ease: [0.22, 1, 0.36, 1] as const },
  }),
};

const HeroSection = () => {
  const gearSvgRef = useRef<SVGSVGElement>(null);
  const [activeGear, setActiveGear] = useState<ActiveGear>(null);
  const activeLesson = activeGear ? gearLessons[activeGear] : null;
  const activeAccent = activeGear ? gearAccents[activeGear] : null;

  const activateGear = (gear: Exclude<ActiveGear, null>) => {
    setActiveGear((current) => (current === gear ? current : gear));
    gearSvgRef.current?.pauseAnimations();
  };

  const clearGear = () => {
    setActiveGear(null);
    gearSvgRef.current?.unpauseAnimations();
  };

  return (
    <section
      id="hero"
      className="relative w-full flex items-center justify-center overflow-hidden bg-[hsl(35,30%,90%)] dark:bg-[hsl(30,15%,12%)] text-foreground dark:text-white pt-16 pb-20 md:pt-24 md:pb-28"
      style={{ minHeight: "100dvh" }}
    >
      <div
        className="pointer-events-none absolute inset-0 dark:hidden"
        aria-hidden="true"
        style={{ backgroundImage: cuttingMatGridLight, backgroundPosition: "right top" }}
      />
      <div
        className="pointer-events-none absolute inset-0 hidden dark:block"
        aria-hidden="true"
        style={{ backgroundImage: cuttingMatGridDark, backgroundPosition: "right top" }}
      />
      <svg
        ref={gearSvgRef}
        className={`pointer-events-auto absolute right-[-160px] top-0 h-[55rem] w-[50rem] overflow-visible text-foreground/15 transition-[z-index] dark:text-white/18 ${
          activeGear ? "z-40" : "z-30"
        }`}
        viewBox="0 0 800 880"
        fill="none"
        aria-hidden="true"
        onMouseLeave={clearGear}
        onPointerLeave={clearGear}
      >
        <defs>
          <filter id="gear-accent-glow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="0" stdDeviation="5" floodColor={activeAccent?.color ?? "#ffffff"} floodOpacity="0.42" />
          </filter>
        </defs>
        <g stroke="currentColor" strokeWidth="1.5" vectorEffect="non-scaling-stroke">
          <g
            className="transition-colors"
            style={{ color: activeGear === "ring" ? gearAccents.ring.color : undefined }}
            onPointerEnter={() => activateGear("ring")}
            onPointerLeave={clearGear}
            onMouseEnter={() => activateGear("ring")}
            onMouseLeave={clearGear}
          >
            <circle cx="480" cy="320" r="400" strokeDasharray="4 11" strokeWidth="1.2" opacity="0.32" />
            <circle
              className="pointer-events-auto"
              cx="480"
              cy="320"
              r="400"
              stroke="transparent"
              strokeWidth="42"
              fill="none"
              pointerEvents="stroke"
              onPointerEnter={() => activateGear("ring")}
              onPointerMove={() => activateGear("ring")}
              onPointerLeave={clearGear}
              onMouseEnter={() => activateGear("ring")}
              onMouseMove={() => activateGear("ring")}
              onMouseLeave={clearGear}
            />
          </g>
          <g
            className="transition-colors"
            style={{ color: activeGear === "sun" ? gearAccents.sun.color : undefined }}
            onPointerEnter={() => activateGear("sun")}
            onPointerLeave={clearGear}
            onMouseEnter={() => activateGear("sun")}
            onMouseLeave={clearGear}
          >
            <path d={bigGearPath} />
            <circle cx="480" cy="320" r="320" strokeDasharray="6 8" />
            <circle
              className="pointer-events-auto"
              cx="480"
              cy="320"
              r="320"
              stroke="transparent"
              strokeWidth="64"
              fill="none"
              pointerEvents="stroke"
              onPointerEnter={() => activateGear("sun")}
              onPointerMove={() => activateGear("sun")}
              onPointerLeave={clearGear}
              onMouseEnter={() => activateGear("sun")}
              onMouseMove={() => activateGear("sun")}
              onMouseLeave={clearGear}
            />
          </g>
          <g>
            <animateTransform attributeName="transform" type="rotate" from="0 480 320" to="360 480 320" dur="22s" repeatCount="indefinite" />
            <g
              className="transition-colors"
              style={{ color: activeGear === "carrier" ? gearAccents.carrier.color : undefined }}
              opacity="0.34"
              strokeWidth="1.1"
              onPointerEnter={() => activateGear("carrier")}
              onPointerLeave={clearGear}
              onMouseEnter={() => activateGear("carrier")}
              onMouseLeave={clearGear}
            >
              {smallGearCenters.map((center) => (
                <g key={`carrier-${center.x}-${center.y}`}>
                  <line x1="480" y1="320" x2={center.x} y2={center.y} />
                  <line
                    className="pointer-events-auto"
                    x1="480"
                    y1="320"
                    x2={center.x}
                    y2={center.y}
                    stroke="transparent"
                    strokeWidth="20"
                    pointerEvents="stroke"
                    onPointerEnter={() => activateGear("carrier")}
                    onPointerMove={() => activateGear("carrier")}
                    onPointerLeave={clearGear}
                    onMouseEnter={() => activateGear("carrier")}
                    onMouseMove={() => activateGear("carrier")}
                    onMouseLeave={clearGear}
                  />
                </g>
              ))}
              <circle cx="480" cy="320" r="20" />
              <circle
                className="pointer-events-auto"
                cx="480"
                cy="320"
                r="28"
                stroke="transparent"
                fill="transparent"
                pointerEvents="all"
                onPointerEnter={() => activateGear("carrier")}
                onPointerMove={() => activateGear("carrier")}
                onPointerLeave={clearGear}
                onMouseEnter={() => activateGear("carrier")}
                onMouseMove={() => activateGear("carrier")}
                onMouseLeave={clearGear}
              />
              {smallGearCenters.map((center) => (
                <circle key={`hub-${center.x}-${center.y}`} cx={center.x} cy={center.y} r="7" />
              ))}
            </g>
            {smallGearCenters.map((center, index) => (
              <g
                key={`${center.x}-${center.y}`}
                className="transition-colors"
                style={{ color: activeGear === (`planet-${index}` as PlanetGearId) ? gearAccents[`planet-${index}` as PlanetGearId].color : undefined }}
                onPointerEnter={() => activateGear(`planet-${index}` as PlanetGearId)}
                onPointerLeave={clearGear}
                onMouseEnter={() => activateGear(`planet-${index}` as PlanetGearId)}
                onMouseLeave={clearGear}
              >
                <circle cx={center.x} cy={center.y} r="40" strokeDasharray="6 8" />
                <path d={createGearPath(center.x, center.y, 40, 10, 9)}>
                  <animateTransform
                    attributeName="transform"
                    type="rotate"
                    from={`${planetGearPhase} ${center.x} ${center.y}`}
                    to={`${planetGearPhase + 3240} ${center.x} ${center.y}`}
                    dur="22s"
                    repeatCount="indefinite"
                    additive="sum"
                  />
                </path>
                <circle
                  className="pointer-events-auto"
                  cx={center.x}
                  cy={center.y}
                  r="56"
                  stroke="transparent"
                  fill="transparent"
                  pointerEvents="all"
                  onPointerEnter={() => activateGear(`planet-${index}` as PlanetGearId)}
                  onPointerMove={() => activateGear(`planet-${index}` as PlanetGearId)}
                  onPointerLeave={clearGear}
                  onMouseEnter={() => activateGear(`planet-${index}` as PlanetGearId)}
                  onMouseMove={() => activateGear(`planet-${index}` as PlanetGearId)}
                  onMouseLeave={clearGear}
                />
              </g>
            ))}
          </g>
        </g>
        {activeAccent && (
          <g
            className="pointer-events-none"
            stroke={activeAccent.color}
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
            filter="url(#gear-accent-glow)"
            style={{ filter: `drop-shadow(0 0 9px ${activeAccent.glow})` }}
          >
            {activeGear === "ring" && <circle cx="480" cy="320" r="400" strokeDasharray="4 11" strokeWidth="2.6" fill="none" />}
            {activeGear === "sun" && (
              <g>
                <path d={bigGearPath} strokeWidth="2.3" fill="none" />
                <circle cx="480" cy="320" r="320" strokeDasharray="6 8" strokeWidth="1.9" fill="none" />
              </g>
            )}
            {activeGear === "carrier" && (
              <g fill="none">
                <animateTransform attributeName="transform" type="rotate" from="0 480 320" to="360 480 320" dur="22s" repeatCount="indefinite" />
                {smallGearCenters.map((center) => (
                  <line key={`active-carrier-${center.x}-${center.y}`} x1="480" y1="320" x2={center.x} y2={center.y} strokeWidth="2.5" />
                ))}
                <circle cx="480" cy="320" r="20" strokeWidth="2.2" />
                {smallGearCenters.map((center) => (
                  <circle key={`active-hub-${center.x}-${center.y}`} cx={center.x} cy={center.y} r="7" strokeWidth="2.2" />
                ))}
              </g>
            )}
            {smallGearCenters.map((center, index) => {
              const planetId = `planet-${index}` as PlanetGearId;

              return activeGear === planetId ? (
                <g key={`active-${planetId}`} fill="none">
                  <animateTransform attributeName="transform" type="rotate" from="0 480 320" to="360 480 320" dur="22s" repeatCount="indefinite" />
                  <circle cx={center.x} cy={center.y} r="40" strokeDasharray="6 8" strokeWidth="2" />
                  <path d={createGearPath(center.x, center.y, 40, 10, 9)} strokeWidth="2.4">
                    <animateTransform
                      attributeName="transform"
                      type="rotate"
                      from={`${planetGearPhase} ${center.x} ${center.y}`}
                      to={`${planetGearPhase + 3240} ${center.x} ${center.y}`}
                      dur="22s"
                      repeatCount="indefinite"
                      additive="sum"
                    />
                  </path>
                </g>
              ) : null;
            })}
          </g>
        )}
      </svg>
      <div
        className={`pointer-events-none absolute bottom-20 right-4 z-50 w-[min(19.5rem,calc(100vw-2rem))] rounded-lg border p-4 text-foreground shadow-sm backdrop-blur-sm transition-opacity dark:text-white md:bottom-24 md:right-10 lg:bottom-28 ${
          activeLesson ? "opacity-100" : "opacity-0"
        }`}
        style={{
          backgroundColor: "hsl(var(--background) / 0.98)",
          borderColor: activeAccent?.glow ?? undefined,
          boxShadow: activeAccent ? `0 12px 34px ${activeAccent.glow}` : undefined,
        }}
        aria-hidden="true"
      >
        {activeLesson && (
          <>
            <p className="font-mono text-[10px] uppercase tracking-wider" style={{ color: activeAccent?.color }}>
              {activeLesson.eyebrow}
            </p>
            <p className="mt-1 text-sm font-semibold leading-snug">{activeLesson.title}</p>
            <p className="mt-2 text-xs leading-relaxed text-foreground/70 dark:text-white/70">{activeLesson.body}</p>
            <p className="mt-2 font-mono text-[11px] leading-relaxed text-foreground/55 dark:text-white/60">{activeLesson.detail}</p>
          </>
        )}
      </div>
      <div
        className="pointer-events-none absolute inset-0 opacity-30 dark:opacity-50 mix-blend-overlay"
        aria-hidden="true"
        style={{ backgroundImage: grainSvg, backgroundRepeat: "repeat", backgroundSize: "128px 128px" }}
      />

      <div className={`${pageShellClassName} relative z-20 grid gap-10 md:grid-cols-[1fr_18rem] lg:grid-cols-[1fr_20rem] md:items-center`}>
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
            Designing products that augment human capabilities
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
