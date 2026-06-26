"use client";

import { type RefObject, useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { pageShellClassName } from "@/lib/layout";
import { heading } from "@/lib/styles";
import { cuttingMatGridDark, cuttingMatGridLight, grainSvg } from "@/lib/visuals";

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

const createGearPath = (cx: number, cy: number, pitchRadius: number, toothDepth: number, teeth: number) => {
  const points = Array.from({ length: teeth * 2 }, (_, index) => {
    const radius = pitchRadius + (index % 2 === 0 ? toothDepth / 2 : -toothDepth / 2);
    const angle = -Math.PI / 2 + (index * Math.PI) / teeth;

    return [cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius];
  });

  return `${points.map(([x, y], index) => `${index === 0 ? "M" : "L"} ${x.toFixed(3)} ${y.toFixed(3)}`).join(" ")} Z`;
};

const bigGearPath = createGearPath(480, 320, 320, 10, 72);
const ringGearPath = createGearPath(480, 320, 400, -10, 90);
type PlanetGearId = `planet-${0 | 1 | 2}`;
type PlanetGear = {
  id: PlanetGearId;
  x: number;
  y: number;
  path: string;
};
const planetGears: readonly PlanetGear[] = [
  { id: "planet-0", x: 660, y: 631.769, path: createGearPath(660, 631.769, 40, 10, 9) },
  { id: "planet-1", x: 120, y: 320, path: createGearPath(120, 320, 40, 10, 9) },
  { id: "planet-2", x: 660, y: 8.231, path: createGearPath(660, 8.231, 40, 10, 9) },
] as const;
const planetGearPhase = 70;
const gearOrbitDuration = "22s";
const carrierRotationDegrees = 360;
const sunRotationDegrees = 810;
const planetRotationRelativeToCarrierDegrees = -3600;
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
  token: string;
};

const planetLesson = {
  eyebrow: "planet gears: load sharers",
  title: "These translate fast motor spin into stronger useful motion.",
  body: "Their centers orbit with the carrier while each little gear spins backward against the sun.",
  detail: "The planets share tooth contact, so the gearbox handles more torque without becoming much wider.",
};

const gearLessons: Record<Exclude<ActiveGear, null>, GearLesson> = {
  ring: {
    eyebrow: "fixed ring: the reaction",
    title: "Hold one part still, and the gearbox has something to push against.",
    body: "In a real planetary gearbox this outer ring is bolted to the case. Without it, the gears mostly chase each other.",
    detail: "This ring has 90 teeth. It is the stationary housing that lets speed become torque.",
  },
  sun: {
    eyebrow: "input: fast motor gear",
    title: "Start here: the motor usually spins this center gear.",
    body: "The problem is that motors like spinning fast, but drills and wheels need slower, stronger rotation.",
    detail: "Here the sun turns 2.25 times for every one turn of the carrier output.",
  },
  carrier: {
    eyebrow: "output: slower stronger shaft",
    title: "This arm is the useful output.",
    body: "As the planets roll, their centers orbit. The carrier collects those orbiting centers into one smooth rotation.",
    detail: "Power path: motor spins the sun, planets walk around it, carrier becomes the slower output.",
  },
  "planet-0": planetLesson,
  "planet-1": planetLesson,
  "planet-2": planetLesson,
};

const gearAccents: Record<Exclude<ActiveGear, null>, GearAccent> = {
  ring: { color: "hsl(var(--gear-ring))", glow: "hsl(var(--gear-ring) / 0.2)", token: "--gear-ring" },
  sun: { color: "hsl(var(--gear-sun))", glow: "hsl(var(--gear-sun) / 0.2)", token: "--gear-sun" },
  carrier: { color: "hsl(var(--gear-carrier))", glow: "hsl(var(--gear-carrier) / 0.18)", token: "--gear-carrier" },
  "planet-0": { color: "hsl(var(--gear-planet))", glow: "hsl(var(--gear-planet) / 0.18)", token: "--gear-planet" },
  "planet-1": { color: "hsl(var(--gear-planet))", glow: "hsl(var(--gear-planet) / 0.18)", token: "--gear-planet" },
  "planet-2": { color: "hsl(var(--gear-planet))", glow: "hsl(var(--gear-planet) / 0.18)", token: "--gear-planet" },
};

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: 0.2 + i * 0.08, duration: 0.6, ease: [0.22, 1, 0.36, 1] as const },
  }),
};

type GearLayerProps = {
  svgRef: RefObject<SVGSVGElement | null>;
  activeGear: ActiveGear;
  activeAccent: GearAccent | null;
  activateGear: (gear: Exclude<ActiveGear, null>) => void;
  clearGear: () => void;
  className?: string;
  animationState?: "running" | "paused";
  viewBox?: string;
};

type GearInteractionProps = Pick<GearLayerProps, "activeGear" | "activateGear" | "clearGear">;

const useGearAnimationControl = (
  svgRef: RefObject<SVGSVGElement | null>,
  isInteractionPaused: boolean,
  enabled = true,
) => {
  const [isNearViewport, setIsNearViewport] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const svg = svgRef.current;
    if (!enabled || !svg) return;

    svg.pauseAnimations();

    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const syncMotionPreference = () => setPrefersReducedMotion(motionQuery.matches);
    syncMotionPreference();

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsNearViewport(entry.isIntersecting);
      },
      { rootMargin: "200px" },
    );

    observer.observe(svg);
    motionQuery.addEventListener("change", syncMotionPreference);

    return () => {
      observer.disconnect();
      motionQuery.removeEventListener("change", syncMotionPreference);
    };
  }, [enabled, svgRef]);

  const shouldAnimate = enabled && isNearViewport && !prefersReducedMotion && !isInteractionPaused;

  useEffect(() => {
    const svg = svgRef.current;
    if (!enabled || !svg) return;

    if (shouldAnimate) {
      svg.unpauseAnimations();
    } else {
      svg.pauseAnimations();
    }
  }, [enabled, shouldAnimate, svgRef]);

  return shouldAnimate ? "running" : "paused";
};

const gearEvents = (gear: Exclude<ActiveGear, null>, activateGear: GearLayerProps["activateGear"], clearGear: GearLayerProps["clearGear"]) => ({
  onPointerEnter: () => activateGear(gear),
  onPointerLeave: clearGear,
  onMouseEnter: () => activateGear(gear),
  onMouseLeave: clearGear,
});

const GearRotation = ({
  from,
  to,
  cx = 480,
  cy = 320,
  additive,
}: {
  from: number;
  to: number;
  cx?: number;
  cy?: number;
  additive?: "sum";
}) => (
  <animateTransform
    attributeName="transform"
    type="rotate"
    from={`${from} ${cx} ${cy}`}
    to={`${to} ${cx} ${cy}`}
    dur={gearOrbitDuration}
    repeatCount="indefinite"
    additive={additive}
  />
);

const GearHoverCircle = ({
  cx,
  cy,
  r,
  strokeWidth,
  gear,
  activateGear,
  clearGear,
  pointerEvents = "stroke",
}: {
  cx: number;
  cy: number;
  r: number;
  strokeWidth?: number;
  gear: Exclude<ActiveGear, null>;
  activateGear: GearLayerProps["activateGear"];
  clearGear: GearLayerProps["clearGear"];
  pointerEvents?: "all" | "stroke";
}) => (
  <circle
    className="pointer-events-none md:pointer-events-auto"
    cx={cx}
    cy={cy}
    r={r}
    stroke="transparent"
    strokeWidth={strokeWidth}
    fill="transparent"
    pointerEvents={pointerEvents}
    onPointerEnter={() => activateGear(gear)}
    onPointerMove={() => activateGear(gear)}
    onPointerLeave={clearGear}
    onMouseEnter={() => activateGear(gear)}
    onMouseMove={() => activateGear(gear)}
    onMouseLeave={clearGear}
  />
);

const GearHoverLine = ({
  x1,
  y1,
  x2,
  y2,
  gear,
  activateGear,
  clearGear,
}: {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  gear: Exclude<ActiveGear, null>;
  activateGear: GearLayerProps["activateGear"];
  clearGear: GearLayerProps["clearGear"];
}) => (
  <line
    className="pointer-events-none md:pointer-events-auto"
    x1={x1}
    y1={y1}
    x2={x2}
    y2={y2}
    stroke="transparent"
    strokeWidth="20"
    pointerEvents="stroke"
    onPointerEnter={() => activateGear(gear)}
    onPointerMove={() => activateGear(gear)}
    onPointerLeave={clearGear}
    onMouseEnter={() => activateGear(gear)}
    onMouseMove={() => activateGear(gear)}
    onMouseLeave={clearGear}
  />
);

const SunSpeedMarker = ({ active = false }: { active?: boolean }) => (
  <g strokeWidth={active ? 2.2 : 1.8}>
    <GearRotation from={0} to={sunRotationDegrees} />
    <circle cx="480" cy="70" r="16" fill="none" opacity={active ? 1 : 0.82} />
    <circle cx="480" cy="70" r="4" fill="none" opacity={active ? 0.95 : 0.72} />
  </g>
);

const FixedRingGear = ({ activeGear, activateGear, clearGear }: GearInteractionProps) => (
  <g className="transition-colors" style={{ color: activeGear === "ring" ? gearAccents.ring.color : undefined }} {...gearEvents("ring", activateGear, clearGear)}>
    <path d={ringGearPath} opacity="0.36" />
    <circle cx="480" cy="320" r="400" strokeDasharray="4 11" strokeWidth="1.2" opacity="0.32" />
    <GearHoverCircle cx={480} cy={320} r={400} strokeWidth={42} gear="ring" activateGear={activateGear} clearGear={clearGear} />
  </g>
);

const RotatingSunGear = ({ activeGear, activateGear, clearGear }: GearInteractionProps) => (
  <g className="transition-colors" style={{ color: activeGear === "sun" ? gearAccents.sun.color : undefined }} {...gearEvents("sun", activateGear, clearGear)}>
    <path d={bigGearPath}>
      <GearRotation from={0} to={sunRotationDegrees} />
    </path>
    <SunSpeedMarker />
    <circle cx="480" cy="320" r="320" strokeDasharray="6 8" />
    <GearHoverCircle cx={480} cy={320} r={320} strokeWidth={64} gear="sun" activateGear={activateGear} clearGear={clearGear} />
  </g>
);

const PlanetGearShape = ({ gear }: { gear: PlanetGear }) => (
  <>
    <circle cx={gear.x} cy={gear.y} r="40" strokeDasharray="6 8" />
    <path d={gear.path}>
      <GearRotation from={planetGearPhase} to={planetGearPhase + planetRotationRelativeToCarrierDegrees} cx={gear.x} cy={gear.y} additive="sum" />
    </path>
  </>
);

const CarrierAssembly = ({ activeGear, activateGear, clearGear }: GearInteractionProps) => (
  <g>
    <GearRotation from={0} to={carrierRotationDegrees} />
    <g
      className="transition-colors"
      style={{ color: activeGear === "carrier" ? gearAccents.carrier.color : undefined }}
      opacity="0.34"
      strokeWidth="1.1"
      {...gearEvents("carrier", activateGear, clearGear)}
    >
      {planetGears.map((gear) => (
        <g key={`carrier-${gear.id}`}>
          <line x1="480" y1="320" x2={gear.x} y2={gear.y} />
          <GearHoverLine x1={480} y1={320} x2={gear.x} y2={gear.y} gear="carrier" activateGear={activateGear} clearGear={clearGear} />
        </g>
      ))}
      <circle cx="480" cy="320" r="20" />
      <GearHoverCircle cx={480} cy={320} r={28} gear="carrier" activateGear={activateGear} clearGear={clearGear} pointerEvents="all" />
      {planetGears.map((gear) => (
        <circle key={`hub-${gear.id}`} cx={gear.x} cy={gear.y} r="7" />
      ))}
    </g>
    {planetGears.map((gear) => (
      <g
        key={gear.id}
        className="transition-colors"
        style={{ color: activeGear === gear.id ? gearAccents[gear.id].color : undefined }}
        {...gearEvents(gear.id, activateGear, clearGear)}
      >
        <PlanetGearShape gear={gear} />
        <GearHoverCircle cx={gear.x} cy={gear.y} r={56} gear={gear.id} activateGear={activateGear} clearGear={clearGear} pointerEvents="all" />
      </g>
    ))}
  </g>
);

const ActiveGearOverlay = ({ activeGear, activeAccent }: Pick<GearLayerProps, "activeGear" | "activeAccent">) => {
  if (!activeGear || !activeAccent) return null;

  return (
    <g
      className="pointer-events-none"
      stroke={activeAccent.color}
      strokeLinecap="round"
      strokeLinejoin="round"
      vectorEffect="non-scaling-stroke"
      filter="url(#gear-accent-glow)"
      style={{ color: activeAccent.color, filter: `drop-shadow(0 0 9px ${activeAccent.glow})` }}
    >
      {activeGear === "ring" && (
        <g>
          <path d={ringGearPath} strokeWidth="2.3" fill="none" />
          <circle cx="480" cy="320" r="400" strokeDasharray="4 11" strokeWidth="2.6" fill="none" />
        </g>
      )}
      {activeGear === "sun" && (
        <g>
          <path d={bigGearPath} strokeWidth="2.3" fill="none">
            <GearRotation from={0} to={sunRotationDegrees} />
          </path>
          <SunSpeedMarker active />
          <circle cx="480" cy="320" r="320" strokeDasharray="6 8" strokeWidth="1.9" fill="none" />
        </g>
      )}
      {activeGear === "carrier" && (
        <g fill="none">
          <GearRotation from={0} to={carrierRotationDegrees} />
          {planetGears.map((gear) => (
            <line key={`active-carrier-${gear.id}`} x1="480" y1="320" x2={gear.x} y2={gear.y} strokeWidth="2.5" />
          ))}
          <circle cx="480" cy="320" r="20" strokeWidth="2.2" />
          {planetGears.map((gear) => (
            <circle key={`active-hub-${gear.id}`} cx={gear.x} cy={gear.y} r="7" strokeWidth="2.2" />
          ))}
        </g>
      )}
      {planetGears.map((gear) =>
        activeGear === gear.id ? (
          <g key={`active-${gear.id}`} fill="none">
            <GearRotation from={0} to={carrierRotationDegrees} />
            <circle cx={gear.x} cy={gear.y} r="40" strokeDasharray="6 8" strokeWidth="2" />
            <path d={gear.path} strokeWidth="2.4">
              <GearRotation from={planetGearPhase} to={planetGearPhase + planetRotationRelativeToCarrierDegrees} cx={gear.x} cy={gear.y} additive="sum" />
            </path>
          </g>
        ) : null,
      )}
    </g>
  );
};

const GearLayer = ({ svgRef, activeGear, activeAccent, activateGear, clearGear, className, animationState, viewBox = "0 0 800 880" }: GearLayerProps) => (
  <motion.svg
    ref={svgRef}
    className={className ?? "pointer-events-none absolute right-[-160px] top-0 z-0 h-[55rem] w-[50rem] overflow-visible text-foreground/15 dark:text-white/18 md:pointer-events-auto"}
    data-animation-state={animationState}
    viewBox={viewBox}
    fill="none"
    aria-hidden="true"
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] as const }}
    onMouseLeave={clearGear}
    onPointerLeave={clearGear}
  >
    <defs>
      <filter id="gear-accent-glow" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="0" stdDeviation="5" floodColor={activeAccent?.color ?? "#ffffff"} floodOpacity="0.42" />
      </filter>
    </defs>
    <g stroke="currentColor" strokeWidth="1.5" vectorEffect="non-scaling-stroke">
      <FixedRingGear activeGear={activeGear} activateGear={activateGear} clearGear={clearGear} />
      <RotatingSunGear activeGear={activeGear} activateGear={activateGear} clearGear={clearGear} />
      <CarrierAssembly activeGear={activeGear} activateGear={activateGear} clearGear={clearGear} />
    </g>
    <ActiveGearOverlay activeGear={activeGear} activeAccent={activeAccent} />
  </motion.svg>
);

export const PlanetaryGearSystem = ({
  className,
  infoPlacement = "overlay",
  showTooltip = true,
}: {
  className?: string;
  infoPlacement?: "overlay" | "side";
  showTooltip?: boolean;
}) => {
  const gearSvgRef = useRef<SVGSVGElement>(null);
  const [activeGear, setActiveGear] = useState<ActiveGear>(null);
  const activeLesson = activeGear ? gearLessons[activeGear] : null;
  const activeAccent = activeGear ? gearAccents[activeGear] : null;

  const animationState = useGearAnimationControl(gearSvgRef, activeGear !== null);

  const activateGear = (gear: Exclude<ActiveGear, null>) => {
    setActiveGear((current) => (current === gear ? current : gear));
    gearSvgRef.current?.pauseAnimations();
  };

  const clearGear = () => {
    setActiveGear(null);
  };

  const gearLayer = (
    <GearLayer
      svgRef={gearSvgRef}
      activeGear={activeGear}
      activeAccent={activeAccent}
      activateGear={activateGear}
      clearGear={clearGear}
      className={className ?? "pointer-events-none h-full w-full overflow-visible text-foreground/15 dark:text-white/18 md:pointer-events-auto"}
      animationState={animationState}
      viewBox="60 -100 840 840"
    />
  );

  if (infoPlacement === "side") {
    return (
      <div className="grid w-full gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,0.48fr)] lg:items-center">
        <div className="relative mx-auto h-[18rem] w-[min(100%,34rem)] md:h-[25rem] md:w-[42rem]">
          {gearLayer}
        </div>
        {showTooltip ? (
          <GearInfoPanel activeLesson={activeLesson} activeAccent={activeAccent} />
        ) : null}
      </div>
    );
  }

  return (
    <div className="relative h-full w-full">
      {gearLayer}
      {showTooltip ? (
        <GearTooltip
          activeLesson={activeLesson}
          activeAccent={activeAccent}
          className="left-1/2 top-4 -translate-x-1/2"
        />
      ) : null}
    </div>
  );
};

const GearInfoPanel = ({
  activeLesson,
  activeAccent,
}: {
  activeLesson: GearLesson | null;
  activeAccent: GearAccent | null;
}) => {
  const accentColor = activeAccent?.color ?? "hsl(var(--foreground) / 0.46)";

  return (
    <div
      className="min-h-[15rem] border-l border-border/70 pl-5 text-foreground dark:text-white"
      style={{ borderColor: activeAccent ? `hsl(var(${activeAccent.token}) / 0.38)` : undefined }}
    >
      <p className="font-mono text-[10px] uppercase tracking-[0.18em]" style={{ color: accentColor }}>
        {activeLesson?.eyebrow ?? "Power train annotation"}
      </p>
      <p className="mt-3 text-lg font-semibold leading-snug">
        {activeLesson?.title ?? "Planetary reduction stage with fixed ring geometry."}
      </p>
      <p className="mt-4 text-sm leading-relaxed text-foreground/70 dark:text-white/70">
        {activeLesson?.body ?? "The sun, carrier, ring, and planets share one compact axis so fast input motion can become slower, stronger output motion."}
      </p>
      <p className="mt-4 font-mono text-xs leading-relaxed text-foreground/55 dark:text-white/60">
        {activeLesson?.detail ?? "Reference: 90-tooth fixed ring, 72-tooth sun path, three 9-tooth planet gears, 2.25:1 visualized carrier ratio."}
      </p>
    </div>
  );
};

const GearTooltip = ({
  activeLesson,
  activeAccent,
  className,
}: {
  activeLesson: GearLesson | null;
  activeAccent: GearAccent | null;
  className?: string;
}) => (
  <div
    className={`pointer-events-none absolute z-40 w-[min(19.5rem,calc(100vw-2rem))] rounded-lg border p-4 text-foreground backdrop-blur-sm transition-opacity dark:text-white ${
      activeLesson ? "opacity-100" : "opacity-0"
    } ${className ?? "bottom-20 right-4 md:bottom-24 md:right-10 lg:bottom-28"}`}
    style={{
      backgroundColor: "hsl(var(--background) / 0.98)",
      borderColor: activeAccent ? `hsl(var(${activeAccent.token}) / 0.28)` : undefined,
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
);

const HeroSection = () => {
  const gearSvgRef = useRef<SVGSVGElement>(null);
  const [showGearLayer, setShowGearLayer] = useState(false);
  const [activeGear, setActiveGear] = useState<ActiveGear>(null);
  const activeLesson = activeGear ? gearLessons[activeGear] : null;
  const activeAccent = activeGear ? gearAccents[activeGear] : null;
  const animationState = useGearAnimationControl(gearSvgRef, activeGear !== null, showGearLayer);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => setShowGearLayer(true), 900);

    return () => window.clearTimeout(timeoutId);
  }, []);

  const activateGear = (gear: Exclude<ActiveGear, null>) => {
    setActiveGear((current) => (current === gear ? current : gear));
    gearSvgRef.current?.pauseAnimations();
  };

  const clearGear = () => {
    setActiveGear(null);
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
      {showGearLayer && (
        <>
          <GearLayer
            svgRef={gearSvgRef}
            activeGear={activeGear}
            activeAccent={activeAccent}
            activateGear={activateGear}
            clearGear={clearGear}
            animationState={animationState}
          />
          <GearTooltip activeLesson={activeLesson} activeAccent={activeAccent} />
        </>
      )}
      <div
        className="pointer-events-none absolute inset-0 opacity-30 dark:opacity-50 mix-blend-overlay"
        aria-hidden="true"
        style={{ backgroundImage: grainSvg, backgroundRepeat: "repeat", backgroundSize: "128px 128px" }}
      />

      <div className={`${pageShellClassName} relative z-30 grid gap-10 md:grid-cols-[1fr_18rem] lg:grid-cols-[1fr_20rem] md:items-center`}>
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
            Designing fun products that augment human capabilities
          </motion.h1>
          <motion.p
            className="text-base text-foreground/70 dark:text-white/70 leading-relaxed"
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            custom={1}
          >
            Hey it's Ash, I'm a product designer, marketer & startup generalist. Currently building{" "}
            <a
              href="https://cleve.ai/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-baseline gap-1 font-bold text-foreground no-underline transition-colors hover:text-link hover:underline hover:decoration-link/70 hover:underline-offset-4"
            >
              <img src="/cleve-logo.png" alt="" className="h-[0.95em] w-[0.95em] self-center rounded-[0.2em]" />
              Cleve
            </a>
            {", an AI second brain. I write about my learnings often."}
          </motion.p>
          <motion.div
            className="mt-8 flex flex-wrap gap-3"
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            custom={2}
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
