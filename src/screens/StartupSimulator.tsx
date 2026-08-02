"use client";

import AshvinPet from "@/features/chat-widget/AshvinPet";
import {
  isCapitalRaiseAction,
  resolveCapitalRaiseBeforeBankruptcy,
} from "@/features/startup/capitalRaise";
import posthog from "posthog-js";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent,
  type PointerEvent,
  type WheelEvent,
} from "react";
import { isPostHogEnabled } from "@/lib/features";

type StationId =
  | "service"
  | "investors"
  | "bank"
  | "privateEquity"
  | "ma"
  | "investmentBank"
  | "product"
  | "marketing"
  | "sales"
  | "support";
type TeamRole = "product" | "marketing" | "sdr" | "sales" | "support";
type StaffRole =
  | "engineer"
  | "marketer"
  | "creator"
  | "writer"
  | "sdr"
  | "sales"
  | "support";

type MonthlyMetric = {
  month: number;
  day: number;
  revenue: number;
  cashBurn: number;
  netBurn: number;
  cash: number;
  subscribers: number;
  payroll: number;
  paidMedia: number;
};
type ActionId =
  | "clientWork"
  | "pitchPreseed"
  | "pitchSeed"
  | "pitchSeriesA"
  | "pitchSeriesB"
  | "pitchSeriesC"
  | "takeBusinessLoan"
  | "takePeInvestment"
  | "acquireCompany"
  | "acceptAcquisition"
  | "goPublic"
  | "buildMvp"
  | "improveProduct"
  | "expandCapacity"
  | "fixBugs"
  | "hireEngineer"
  | "fireEngineer"
  | "postContent"
  | "buildLandingPage"
  | "improveLandingPage"
  | "createEvergreenContent"
  | "writeSeoArticle"
  | "launchCampaign"
  | "increasePaidMediaBudget"
  | "optimizePaidMedia"
  | "hireMarketer"
  | "fireMarketer"
  | "hireContentCreator"
  | "fireContentCreator"
  | "hireBlogWriter"
  | "fireBlogWriter"
  | "doOutreach"
  | "hireSdr"
  | "fireSdr"
  | "closeLeads"
  | "improveSales"
  | "buildSelfServeCheckout"
  | "improveSelfServeCheckout"
  | "hireSalesperson"
  | "fireSalesperson"
  | "answerUsers"
  | "writeHelpDocs"
  | "improveSupport"
  | "hireSupport"
  | "fireSupport";

type SelectedNodeId =
  | "social"
  | "video"
  | "seo"
  | "referrals"
  | "landing"
  | "paid"
  | "sales"
  | "outreach"
  | "selfserve";

const nodeActionIds: Partial<Record<SelectedNodeId, ActionId[]>> = {
  social: ["postContent"],
  video: [
    "createEvergreenContent",
    "hireContentCreator",
    "fireContentCreator",
  ],
  seo: ["writeSeoArticle", "hireBlogWriter", "fireBlogWriter"],
  referrals: [],
  landing: ["buildLandingPage", "improveLandingPage"],
  paid: [
    "launchCampaign",
    "increasePaidMediaBudget",
    "optimizePaidMedia",
    "hireMarketer",
    "fireMarketer",
  ],
  sales: ["closeLeads", "improveSales", "hireSalesperson", "fireSalesperson"],
  outreach: ["doOutreach", "hireSdr", "fireSdr"],
  selfserve: ["buildSelfServeCheckout", "improveSelfServeCheckout"],
};

const nodeLabels: Record<SelectedNodeId, string> = {
  social: "Social",
  video: "Video",
  seo: "Search",
  referrals: "Referrals",
  landing: "Landing",
  paid: "Paid media",
  sales: "Sales",
  outreach: "Outreach",
  selfserve: "Self-serve",
};

type Activity = {
  actionId: ActionId;
  stationId: StationId;
  label: string;
  totalDays: number;
  elapsedDays: number;
};

type GameState = {
  started: boolean;
  day: number;
  cash: number;
  uncollectedCash: number;
  leads: number;
  leadPatience: number[];
  customers: number;
  issues: number;
  lostUsers: number;
  attention: number;
  socialMomentum: number;
  lastSocialPostDay: number | null;
  product: number;
  reputation: number;
  ownership: number;
  valuation: number;
  fundingStage: number;
  debt: number;
  debtPaymentPerDay: number;
  bankLoans: number;
  peDealDone: boolean;
  acquisitions: number;
  outcome: "acquired" | "public" | null;
  exitValue: number;
  salesProcess: number;
  outreachStarted: boolean;
  selfServeCheckout: boolean;
  selfServeLevel: number;
  selfServeConversionProgress: number;
  landingPage: boolean;
  landingPageLevel: number;
  landingConversionProgress: number;
  evergreenContent: number;
  seoArticles: number;
  campaignsRun: number;
  paidMediaBudget: number;
  paidMediaStartDay: number | null;
  paidMediaOptimization: number;
  paidMediaOptimizationProgress: number;
  contentCreators: number;
  blogWriters: number;
  staffHiredDays: Record<StaffRole, number[]>;
  monthlyMetrics: MonthlyMetric[];
  helpDocs: boolean;
  supportProcess: number;
  player: { x: number; y: number };
  team: Record<TeamRole, number>;
  activity: Activity | null;
  lastEvent: string;
  recentLeads: number;
  recentOutreachLeads: number;
  recentArrivals: number;
  recentSelfServeArrivals: number;
  recentIssues: number;
  recentResolved: number;
  recentDepartures: number;
  bankrupt: boolean;
};

type ActionConfig = {
  id: ActionId;
  title: string;
  titleFor?: (game: GameState) => string;
  description: string;
  emoji: string;
  days: number;
  cost: number;
  costFor?: (game: GameState) => number;
  monthlyCost?: number;
  disabled?: (game: GameState) => boolean;
  disabledReason?: (game: GameState) => string;
};

type Station = {
  id: StationId;
  emoji: string;
  label: string;
  subtitle: string;
  x: number;
  y: number;
  color: string;
  queue?: (game: GameState) => number;
  teamRole?: TeamRole;
};

type GameToast = {
  id: number;
  icon: string;
  title: string;
  message: string;
};

type ExitIntent = "website" | "history";

type WorldWalker = {
  id: number;
  emoji: string;
  startX: number;
  startY: number;
  walkX: number;
  walkY: number;
  quarterX: number;
  quarterY: number;
  midX: number;
  midY: number;
  threeQuarterX: number;
  threeQuarterY: number;
  durationMs: number;
  delayMs: number;
};

const STARTUP_SAVE_KEY = "ashvin-startup-game-v1";
const STARTUP_SAVE_VERSION = 1;
const STARTUP_HELP_SEEN_KEY = "ashvin-startup-help-seen-v1";
const NARROW_VIEWPORT_PX = 640;
const MOBILE_WORLD_ZOOM = 0.82;
/** Wider world on phones so %-based plot gaps stay readable. */
const DESKTOP_WORLD_SPAN = 1.2;
const MOBILE_WORLD_SPAN = 1.55;
/** Fixed-px plot tiles still need a downscale on phone widths. */
const MOBILE_PLOT_SCALE = 0.5;

const plotPixelSize = (baseSize: number, isNarrow: boolean) =>
  Math.max(46, Math.round(baseSize * (isNarrow ? MOBILE_PLOT_SCALE : 1)));

type StartupSave = {
  version: number;
  savedAt: number;
  game: GameState;
};

const captureStartupEvent = (
  event: string,
  properties: Record<string, string | number | boolean | null> = {},
) => {
  if (!isPostHogEnabled) return;
  posthog.capture(event, {
    game: "startup_simulator",
    save_version: STARTUP_SAVE_VERSION,
    ...properties,
  });
};

const stations: Station[] = [
  {
    id: "investors",
    emoji: "🏦",
    label: "Investors",
    subtitle: "Cash for ownership",
    x: 62,
    y: 90,
    color: "border-amber-300/80 bg-amber-50/90",
  },
  {
    id: "bank",
    emoji: "🏛️",
    label: "Business bank",
    subtitle: "Borrow without giving up equity",
    x: 62,
    y: 100,
    color: "border-blue-300/80 bg-blue-50/90",
  },
  {
    id: "privateEquity",
    emoji: "💼",
    label: "Private equity",
    subtitle: "Large capital for meaningful ownership",
    x: 74,
    y: 100,
    color: "border-violet-300/80 bg-violet-50/90",
  },
  {
    id: "ma",
    emoji: "🤝",
    label: "M&A",
    subtitle: "Buy a company—or sell yours",
    x: 86,
    y: 90,
    color: "border-orange-300/80 bg-orange-50/90",
  },
  {
    id: "investmentBank",
    emoji: "🏙️",
    label: "Investment bank",
    subtitle: "Prepare the company for public markets",
    x: 86,
    y: 100,
    color: "border-slate-300/80 bg-slate-50/90",
  },
  {
    id: "product",
    emoji: "💻",
    label: "Product",
    subtitle: "Quality and retention",
    x: 68,
    y: 58,
    color: "border-sky-300/80 bg-sky-50/90",
    teamRole: "product",
  },
  {
    id: "marketing",
    emoji: "📣",
    label: "Marketing",
    subtitle: "Bring people in",
    x: 34,
    y: 58,
    color: "border-fuchsia-300/80 bg-fuchsia-50/90",
    teamRole: "marketing",
  },
  {
    id: "service",
    emoji: "🧾",
    label: "Client work",
    subtitle: "Reliable early cash",
    x: 74,
    y: 90,
    color: "border-emerald-300/80 bg-emerald-50/90",
  },
  {
    id: "sales",
    emoji: "🤝",
    label: "Sales",
    subtitle: "Turn interest into users",
    x: 54,
    y: 58,
    color: "border-orange-300/80 bg-orange-50/90",
    queue: (game) => game.leads,
    teamRole: "sales",
  },
  {
    id: "support",
    emoji: "🛟",
    label: "Support",
    subtitle: "Keep users happy",
    x: 83,
    y: 58,
    color: "border-rose-300/80 bg-rose-50/90",
    queue: (game) => game.issues,
    teamRole: "support",
  },
];

const capitalStationIds: StationId[] = [
  "investors",
  "service",
  "bank",
  "privateEquity",
  "ma",
  "investmentBank",
];

const initialGame: GameState = {
  started: false,
  day: 1,
  cash: 0,
  uncollectedCash: 0,
  leads: 0,
  leadPatience: [],
  customers: 0,
  issues: 0,
  lostUsers: 0,
  attention: 0,
  socialMomentum: 0,
  lastSocialPostDay: null,
  product: 0,
  reputation: 72,
  ownership: 100,
  valuation: 0,
  fundingStage: 0,
  debt: 0,
  debtPaymentPerDay: 0,
  bankLoans: 0,
  peDealDone: false,
  acquisitions: 0,
  outcome: null,
  exitValue: 0,
  salesProcess: 0,
  outreachStarted: false,
  selfServeCheckout: false,
  selfServeLevel: 0,
  selfServeConversionProgress: 0,
  landingPage: false,
  landingPageLevel: 0,
  landingConversionProgress: 0,
  evergreenContent: 0,
  seoArticles: 0,
  campaignsRun: 0,
  paidMediaBudget: 0,
  paidMediaStartDay: null,
  paidMediaOptimization: 0,
  paidMediaOptimizationProgress: 0,
  contentCreators: 0,
  blogWriters: 0,
  staffHiredDays: {
    engineer: [],
    marketer: [],
    creator: [],
    writer: [],
    sdr: [],
    sales: [],
    support: [],
  },
  monthlyMetrics: [],
  helpDocs: false,
  supportProcess: 0,
  player: { x: 50, y: 50 },
  team: { product: 0, marketing: 0, sdr: 0, sales: 0, support: 0 },
  activity: null,
  lastEvent: "One founder, an empty field, and as long as the runway lasts.",
  recentLeads: 0,
  recentOutreachLeads: 0,
  recentArrivals: 0,
  recentSelfServeArrivals: 0,
  recentIssues: 0,
  recentResolved: 0,
  recentDepartures: 0,
  bankrupt: false,
};

const finiteNumber = (value: unknown, fallback: number) =>
  typeof value === "number" && Number.isFinite(value) ? value : fallback;

const normalizedStaffHiredDays = (
  value: unknown,
  count: number,
  currentDay: number,
) => {
  const existing = Array.isArray(value)
    ? value
        .map((day) => finiteNumber(day, Math.max(1, currentDay - 30)))
        .slice(0, count)
    : [];
  return existing.concat(
    Array.from(
      { length: Math.max(0, count - existing.length) },
      () => Math.max(1, currentDay - 30),
    ),
  );
};

const normalizeGameState = (game: GameState): GameState => {
  const currentDay = finiteNumber(game.day, initialGame.day);
  const contentCreators = finiteNumber(
    game.contentCreators,
    initialGame.contentCreators,
  );
  const blogWriters = finiteNumber(
    game.blogWriters,
    initialGame.blogWriters,
  );
  const team = {
    product: finiteNumber(game.team?.product, initialGame.team.product),
    marketing: finiteNumber(game.team?.marketing, initialGame.team.marketing),
    sdr: finiteNumber(game.team?.sdr, initialGame.team.sdr),
    sales: finiteNumber(game.team?.sales, initialGame.team.sales),
    support: finiteNumber(game.team?.support, initialGame.team.support),
  };
  const performanceMarketers = Math.max(
    0,
    team.marketing - contentCreators - blogWriters,
  );

  return {
  ...initialGame,
  ...game,
  day: currentDay,
  cash: finiteNumber(game.cash, initialGame.cash),
  uncollectedCash: finiteNumber(
    game.uncollectedCash,
    initialGame.uncollectedCash,
  ),
  leads: finiteNumber(game.leads, initialGame.leads),
  leadPatience: Array.isArray(game.leadPatience)
    ? game.leadPatience.map((patience) => finiteNumber(patience, 20))
    : [],
  customers: finiteNumber(game.customers, initialGame.customers),
  issues: finiteNumber(game.issues, initialGame.issues),
  lostUsers: finiteNumber(game.lostUsers, initialGame.lostUsers),
  attention: finiteNumber(game.attention, initialGame.attention),
  socialMomentum: finiteNumber(
    game.socialMomentum,
    initialGame.socialMomentum,
  ),
  lastSocialPostDay:
    game.lastSocialPostDay === null
      ? null
      : finiteNumber(game.lastSocialPostDay, initialGame.day),
  product: finiteNumber(game.product, initialGame.product),
  reputation: finiteNumber(game.reputation, initialGame.reputation),
  ownership: finiteNumber(game.ownership, initialGame.ownership),
  valuation: finiteNumber(game.valuation, initialGame.valuation),
  fundingStage: finiteNumber(game.fundingStage, initialGame.fundingStage),
  debt: finiteNumber(game.debt, initialGame.debt),
  debtPaymentPerDay: finiteNumber(
    game.debtPaymentPerDay,
    initialGame.debtPaymentPerDay,
  ),
  bankLoans: finiteNumber(game.bankLoans, initialGame.bankLoans),
  acquisitions: finiteNumber(game.acquisitions, initialGame.acquisitions),
  exitValue: finiteNumber(game.exitValue, initialGame.exitValue),
  salesProcess: finiteNumber(game.salesProcess, initialGame.salesProcess),
  selfServeLevel: finiteNumber(
    game.selfServeLevel,
    game.selfServeCheckout ? 1 : initialGame.selfServeLevel,
  ),
  selfServeConversionProgress: finiteNumber(
    game.selfServeConversionProgress,
    initialGame.selfServeConversionProgress,
  ),
  landingPageLevel: finiteNumber(
    game.landingPageLevel,
    game.landingPage ? 1 : initialGame.landingPageLevel,
  ),
  landingConversionProgress: finiteNumber(
    game.landingConversionProgress,
    initialGame.landingConversionProgress,
  ),
  evergreenContent: finiteNumber(
    game.evergreenContent,
    initialGame.evergreenContent,
  ),
  seoArticles: finiteNumber(game.seoArticles, initialGame.seoArticles),
  campaignsRun: finiteNumber(game.campaignsRun, initialGame.campaignsRun),
  paidMediaBudget: finiteNumber(
    game.paidMediaBudget,
    finiteNumber(game.campaignsRun, 0) * 1000,
  ),
  paidMediaStartDay:
    game.paidMediaStartDay === null
      ? null
      : finiteNumber(game.paidMediaStartDay, finiteNumber(game.day, 1)),
  paidMediaOptimization: finiteNumber(game.paidMediaOptimization, 0),
  paidMediaOptimizationProgress: finiteNumber(
    game.paidMediaOptimizationProgress,
    0,
  ),
  contentCreators,
  blogWriters,
  staffHiredDays: {
    engineer: normalizedStaffHiredDays(
      game.staffHiredDays?.engineer,
      team.product,
      currentDay,
    ),
    marketer: normalizedStaffHiredDays(
      game.staffHiredDays?.marketer,
      performanceMarketers,
      currentDay,
    ),
    creator: normalizedStaffHiredDays(
      game.staffHiredDays?.creator,
      contentCreators,
      currentDay,
    ),
    writer: normalizedStaffHiredDays(
      game.staffHiredDays?.writer,
      blogWriters,
      currentDay,
    ),
    sdr: normalizedStaffHiredDays(
      game.staffHiredDays?.sdr,
      team.sdr,
      currentDay,
    ),
    sales: normalizedStaffHiredDays(
      game.staffHiredDays?.sales,
      team.sales,
      currentDay,
    ),
    support: normalizedStaffHiredDays(
      game.staffHiredDays?.support,
      team.support,
      currentDay,
    ),
  },
  monthlyMetrics: Array.isArray(game.monthlyMetrics)
    ? game.monthlyMetrics
        .map((metric) => ({
          month: Math.max(1, finiteNumber(metric?.month, 1)),
          day: Math.max(1, finiteNumber(metric?.day, currentDay)),
          revenue: Math.max(0, finiteNumber(metric?.revenue, 0)),
          cashBurn: Math.max(0, finiteNumber(metric?.cashBurn, 0)),
          netBurn: Math.max(0, finiteNumber(metric?.netBurn, 0)),
          cash: Math.max(0, finiteNumber(metric?.cash, 0)),
          subscribers: Math.max(0, finiteNumber(metric?.subscribers, 0)),
          payroll: Math.max(0, finiteNumber(metric?.payroll, 0)),
          paidMedia: Math.max(0, finiteNumber(metric?.paidMedia, 0)),
        }))
        .slice(-24)
    : [],
  supportProcess: finiteNumber(
    game.supportProcess,
    initialGame.supportProcess,
  ),
  player: {
    x: finiteNumber(game.player?.x, initialGame.player.x),
    y: finiteNumber(game.player?.y, initialGame.player.y),
  },
  team,
  activity: game.activity
    ? {
        ...game.activity,
        totalDays: Math.max(1, finiteNumber(game.activity.totalDays, 1)),
        elapsedDays: Math.max(
          0,
          finiteNumber(game.activity.elapsedDays, 0),
        ),
      }
    : null,
  recentLeads: finiteNumber(game.recentLeads, initialGame.recentLeads),
  recentOutreachLeads: finiteNumber(
    game.recentOutreachLeads,
    initialGame.recentOutreachLeads,
  ),
  recentArrivals: finiteNumber(
    game.recentArrivals,
    initialGame.recentArrivals,
  ),
  recentSelfServeArrivals: finiteNumber(
    game.recentSelfServeArrivals,
    initialGame.recentSelfServeArrivals,
  ),
  recentIssues: finiteNumber(game.recentIssues, initialGame.recentIssues),
  recentResolved: finiteNumber(
    game.recentResolved,
    initialGame.recentResolved,
  ),
  recentDepartures: finiteNumber(
    game.recentDepartures,
    initialGame.recentDepartures,
  ),
  };
};

const readSavedStartupGame = (): StartupSave | null => {
  try {
    const raw = window.localStorage.getItem(STARTUP_SAVE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as Partial<StartupSave>;
    if (
      parsed.version !== STARTUP_SAVE_VERSION ||
      !parsed.game ||
      typeof parsed.game !== "object"
    ) {
      return null;
    }

    return {
      version: STARTUP_SAVE_VERSION,
      savedAt: finiteNumber(parsed.savedAt, Date.now()),
      game: normalizeGameState(parsed.game as GameState),
    };
  } catch {
    return null;
  }
};

const saveStartupGame = (game: GameState) => {
  if (!game.started) return;

  try {
    window.localStorage.setItem(
      STARTUP_SAVE_KEY,
      JSON.stringify({
        version: STARTUP_SAVE_VERSION,
        savedAt: Date.now(),
        game,
      } satisfies StartupSave),
    );
  } catch {
    // Private browsing or storage limits should not interrupt the game.
  }
};

const clearSavedStartupGame = () => {
  try {
    window.localStorage.removeItem(STARTUP_SAVE_KEY);
  } catch {
    // Private browsing or storage limits should not interrupt the game.
  }
};

const hasSeenStartupHelp = () => {
  try {
    return window.localStorage.getItem(STARTUP_HELP_SEEN_KEY) === "1";
  } catch {
    return false;
  }
};

const markStartupHelpSeen = () => {
  try {
    window.localStorage.setItem(STARTUP_HELP_SEEN_KEY, "1");
  } catch {
    // Private browsing or storage limits should not interrupt the game.
  }
};

const eventToastsEnabled = false;
const cashPilePosition = { x: 75, y: 66 };

const wages: Record<TeamRole, number> = {
  product: 150,
  marketing: 100,
  sdr: 100,
  sales: 120,
  support: 100,
};

const severanceCostFor = (role: TeamRole) => wages[role] * 30 * 3;

const staffRoles: StaffRole[] = [
  "engineer",
  "marketer",
  "creator",
  "writer",
  "sdr",
  "sales",
  "support",
];

const staffTeamRole: Record<StaffRole, TeamRole> = {
  engineer: "product",
  marketer: "marketing",
  creator: "marketing",
  writer: "marketing",
  sdr: "sdr",
  sales: "sales",
  support: "support",
};

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

const formatMoney = (amount: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(finiteNumber(amount, 0));

const formatCompactMoney = (amount: number) => {
  const safeAmount = finiteNumber(amount, 0);
  const absoluteAmount = Math.abs(safeAmount);
  const sign = safeAmount < 0 ? "-" : "";
  if (absoluteAmount < 1000) return `${sign}$${Math.round(absoluteAmount)}`;

  const [divisor, suffix] =
    absoluteAmount >= 1_000_000_000
      ? [1_000_000_000, "B"]
      : absoluteAmount >= 1_000_000
        ? [1_000_000, "M"]
        : [1000, "K"];
  const compactValue = absoluteAmount / divisor;
  const formattedValue =
    compactValue >= 100
      ? Math.round(compactValue).toString()
      : compactValue.toFixed(1).replace(/\.0$/, "");

  return `${sign}$${formattedValue}${suffix}`;
};

type GameSound = "coin" | "cash" | "success" | "start" | "alert" | "fail";

const playGameSound = (audioContext: AudioContext | null, sound: GameSound) => {
  if (!audioContext) return;
  if (audioContext.state === "suspended") {
    void audioContext.resume();
  }

  const now = audioContext.currentTime;
  const playTone = ({
    frequency,
    endFrequency = frequency,
    start,
    duration,
    type,
    volume,
  }: {
    frequency: number;
    endFrequency?: number;
    start: number;
    duration: number;
    type: OscillatorType;
    volume: number;
  }) => {
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    const toneStart = now + start;
    const toneEnd = toneStart + duration;

    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, toneStart);
    if (endFrequency !== frequency) {
      oscillator.frequency.exponentialRampToValueAtTime(endFrequency, toneEnd);
    }
    gain.gain.setValueAtTime(0.0001, toneStart);
    gain.gain.exponentialRampToValueAtTime(volume, toneStart + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, toneEnd);
    oscillator.connect(gain);
    gain.connect(audioContext.destination);
    oscillator.start(toneStart);
    oscillator.stop(toneEnd + 0.02);
  };

  switch (sound) {
    case "coin":
      playTone({ frequency: 1175, start: 0, duration: 0.1, type: "square", volume: 0.035 });
      playTone({ frequency: 1760, start: 0.08, duration: 0.22, type: "triangle", volume: 0.045 });
      break;
    case "cash":
      playTone({ frequency: 220, endFrequency: 330, start: 0, duration: 0.18, type: "triangle", volume: 0.035 });
      playTone({ frequency: 440, start: 0.12, duration: 0.18, type: "sine", volume: 0.03 });
      break;
    case "success":
      playTone({ frequency: 523, start: 0, duration: 0.11, type: "sine", volume: 0.035 });
      playTone({ frequency: 659, start: 0.08, duration: 0.16, type: "sine", volume: 0.04 });
      break;
    case "start":
      playTone({ frequency: 330, endFrequency: 440, start: 0, duration: 0.12, type: "sine", volume: 0.025 });
      break;
    case "alert":
      playTone({ frequency: 260, start: 0, duration: 0.13, type: "sawtooth", volume: 0.025 });
      playTone({ frequency: 220, start: 0.14, duration: 0.16, type: "sawtooth", volume: 0.025 });
      break;
    case "fail":
      playTone({ frequency: 330, endFrequency: 180, start: 0, duration: 0.3, type: "triangle", volume: 0.035 });
      break;
  }
};

const scheduleAmbientTone = (
  audioContext: AudioContext,
  frequency: number,
  start: number,
  duration: number,
  volume: number,
  type: OscillatorType,
  endFrequency = frequency,
  baseTime = audioContext.currentTime + 0.05,
) => {
  const oscillator = audioContext.createOscillator();
  const gain = audioContext.createGain();
  const toneStart = baseTime + start;
  const toneEnd = toneStart + duration;

  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, toneStart);
  if (endFrequency !== frequency) {
    oscillator.frequency.exponentialRampToValueAtTime(endFrequency, toneEnd);
  }
  gain.gain.setValueAtTime(0.0001, toneStart);
  gain.gain.exponentialRampToValueAtTime(volume, toneStart + 0.12);
  gain.gain.exponentialRampToValueAtTime(0.0001, toneEnd);
  oscillator.connect(gain);
  gain.connect(audioContext.destination);
  oscillator.start(toneStart);
  oscillator.stop(toneEnd + 0.02);

  return oscillator;
};

const playAmbientMusicLoop = (audioContext: AudioContext) => {
  const beat = 60 / 92;
  const bar = beat * 4;
  const loopStart = audioContext.currentTime + 0.05;
  const progression = [
    { root: 65.41, chord: [261.63, 329.63, 392, 493.88] },
    { root: 55, chord: [220, 261.63, 329.63, 392] },
    { root: 43.65, chord: [174.61, 220, 261.63, 329.63] },
    { root: 49, chord: [196, 246.94, 293.66, 329.63] },
    { root: 65.41, chord: [261.63, 329.63, 392, 493.88] },
    { root: 55, chord: [220, 261.63, 329.63, 392] },
    { root: 43.65, chord: [174.61, 220, 261.63, 329.63] },
    { root: 49, chord: [196, 246.94, 293.66, 329.63] },
    { root: 55, chord: [220, 261.63, 329.63, 392] },
    { root: 43.65, chord: [174.61, 220, 261.63, 329.63] },
    { root: 41.2, chord: [164.81, 261.63, 329.63, 392] },
    { root: 49, chord: [196, 246.94, 293.66, 329.63] },
    { root: 43.65, chord: [174.61, 220, 261.63, 329.63] },
    { root: 49, chord: [196, 246.94, 293.66, 329.63] },
    { root: 55, chord: [220, 261.63, 329.63, 392] },
    { root: 49, chord: [196, 246.94, 293.66, 329.63] },
  ];
  const arpPatterns = [
    [0, 1, 2, 3, 2, 1, 2, 3],
    [0, 2, 1, 3, 2, 1, 3, 2],
    [0, 1, 3, 2, 1, 2, 3, 1],
    [0, 2, 3, 1, 2, 3, 1, 2],
  ];
  const nodes: OscillatorNode[] = [];

  progression.forEach(({ root, chord }, barIndex) => {
    const barStart = barIndex * bar;

    chord.forEach((frequency) => {
      nodes.push(
        scheduleAmbientTone(
          audioContext,
          frequency,
          barStart,
          bar * 0.94,
          0.0038,
          "triangle",
          frequency,
          loopStart,
        ),
      );
    });

    nodes.push(
      scheduleAmbientTone(
        audioContext,
        root,
        barStart,
        beat * 1.45,
        0.014,
        "sine",
        root * 0.72,
        loopStart,
      ),
      scheduleAmbientTone(
        audioContext,
        root,
        barStart + beat * 2,
        beat * 0.85,
        0.008,
        "sine",
        root * 0.82,
        loopStart,
      ),
    );

    const arp = arpPatterns[barIndex % arpPatterns.length];
    arp.forEach((noteIndex, step) => {
      const frequency = chord[noteIndex] * (step === 7 ? 2 : 1);
      nodes.push(
        scheduleAmbientTone(
          audioContext,
          frequency,
          barStart + step * (beat / 2),
          beat * 0.32,
          0.008,
          "sine",
          frequency,
          loopStart,
        ),
      );
    });

    [0, 2.5].forEach((beatOffset) => {
      nodes.push(
        scheduleAmbientTone(
          audioContext,
          112,
          barStart + beat * beatOffset,
          0.18,
          0.006,
          "sine",
          52,
          loopStart,
        ),
      );
    });

    [1, 3].forEach((beatOffset) => {
      nodes.push(
        scheduleAmbientTone(
          audioContext,
          880,
          barStart + beat * beatOffset,
          0.06,
          0.0018,
          "triangle",
          660,
          loopStart,
        ),
      );
    });
  });

  return nodes;
};

const ambientMusicLoopDurationMs = 16 * 4 * (60 / 92) * 1000;

const getStation = (id: StationId) =>
  stations.find((station) => station.id === id) ?? stations[0];

const payrollPerDay = (unsafeGame: GameState) => {
  const game = normalizeGameState(unsafeGame);
  return (Object.keys(game.team) as TeamRole[]).reduce(
    (total, role) => total + game.team[role] * wages[role],
    0,
  );
};

const dayOfMonth = (day: number) => ((Math.max(1, day) - 1) % 30) + 1;
const isSalaryPayday = (day: number) => dayOfMonth(day) === 25;
const salaryPaymentDueOn = (unsafeGame: GameState, payday: number) => {
  if (!isSalaryPayday(payday)) return 0;
  const game = normalizeGameState(unsafeGame);
  const previousPayday = payday - 30;

  return staffRoles.reduce((total, role) => {
    const wage = wages[staffTeamRole[role]];
    const hiredDays = game.staffHiredDays[role].slice(
      0,
      staffCountOf(game, role),
    );
    return (
      total +
      hiredDays.reduce((roleTotal, hiredDay) => {
        const billableDays = clamp(
          payday - Math.max(hiredDay, previousPayday),
          0,
          30,
        );
        return roleTotal + wage * billableDays;
      }, 0)
    );
  }, 0);
};

const revenuePerDay = (game: GameState) =>
  finiteNumber(game.customers, 0) * (20 / 30);
const annualRecurringRevenue = (game: GameState) =>
  finiteNumber(game.customers, 0) * 20 * 12;

const monthlyMetricOf = (unsafeGame: GameState): MonthlyMetric => {
  const game = normalizeGameState(unsafeGame);
  const revenue = revenuePerDay(game) * 30;
  const payroll = payrollPerDay(game) * 30;
  const debtPayments =
    Math.min(game.debt, game.debtPaymentPerDay * 30);
  const paidMedia = finiteNumber(game.paidMediaBudget, 0);
  const cashBurn = payroll + debtPayments + paidMedia;

  return {
    month: Math.max(1, Math.ceil(game.day / 30)),
    day: game.day,
    revenue,
    cashBurn,
    netBurn: Math.max(0, cashBurn - revenue),
    cash: Math.max(0, game.cash),
    subscribers: Math.max(0, game.customers),
    payroll,
    paidMedia,
  };
};

const fundingOffer = (
  unsafeGame: GameState,
  stage: "preseed" | "seed" | "seriesA" | "seriesB" | "seriesC",
) => {
  normalizeGameState(unsafeGame);
  const offers = {
    preseed: {
      valuation: 1_000_000,
      amount: 100_000,
      dilution: 10,
    },
    seed: {
      valuation: 10_000_000,
      amount: 1_000_000,
      dilution: 10,
    },
    seriesA: {
      valuation: 100_000_000,
      amount: 10_000_000,
      dilution: 10,
    },
    seriesB: {
      valuation: 1_000_000_000,
      amount: 100_000_000,
      dilution: 10,
    },
    seriesC: {
      valuation: 5_000_000_000,
      amount: 250_000_000,
      dilution: 5,
    },
  };

  return offers[stage];
};

const companyValueOf = (unsafeGame: GameState) => {
  const game = normalizeGameState(unsafeGame);
  return Math.max(
    game.valuation,
    Math.max(0, game.cash) +
      game.customers * 1200 +
      game.product * 100 +
      game.acquisitions * 5_000_000 -
      game.debt,
  );
};

const businessLoanOffer = (game: GameState) =>
  Math.max(
    10_000,
    Math.min(
      50_000_000,
      Math.round(
        Math.max(companyValueOf(game) * 0.08, annualRecurringRevenue(game)),
      ),
    ),
  );

const peOffer = (game: GameState) => {
  const valuation = Math.max(10_000_000, companyValueOf(game) * 1.15);
  return {
    valuation,
    amount: Math.round(valuation * 0.2),
    dilution: 20,
  };
};

const acquisitionOffer = (game: GameState) =>
  Math.round(companyValueOf(game) * 1.25);

const acquisitionCost = (game: GameState) =>
  Math.round(Math.max(1_000_000, companyValueOf(game) * 0.08));

const landingPageLevelOf = (game: GameState) =>
  finiteNumber(game.landingPageLevel, game.landingPage ? 1 : 0);

const landingConversionRateOf = (game: GameState) => {
  const level = landingPageLevelOf(game);
  if (level === 0) return 8;
  if (level === 1) return 15;
  if (level === 2) return 23;
  if (level === 3) return 30;
  return clamp(30 + level - 3, 0, 95);
};

const salesConversionRateOf = (game: GameState) => {
  const level = finiteNumber(game.salesProcess, 0);
  if (level === 0) return 20;
  if (level === 1) return 25;
  if (level === 2) return 30;
  return clamp(30 + level - 2, 0, 90);
};

const selfServeLevelOf = (game: GameState) =>
  finiteNumber(game.selfServeLevel, game.selfServeCheckout ? 1 : 0);

const selfServeConversionRateOf = (game: GameState) => {
  const level = selfServeLevelOf(game);
  if (level === 0) return 0;
  if (level === 1) return 12;
  if (level === 2) return 21;
  if (level === 3) return 30;
  return clamp(30 + level - 3, 0, 90);
};

const supportResolutionRateOf = (game: GameState) => {
  const level = finiteNumber(game.supportProcess, 0);
  const docsBonus = game.helpDocs ? 8 : 0;
  const rate =
    level === 0
      ? 35
      : level === 1
        ? 52
        : level === 2
          ? 68
          : 68 + (level - 2) * 2;
  return clamp(rate + docsBonus, 0, 95);
};

const paidMediaEfficiencyMultiplierOf = (game: GameState) => {
  const level = Math.max(0, finiteNumber(game.paidMediaOptimization, 0));
  return clamp(
    1 + Math.min(level, 5) * 0.2 + Math.max(0, level - 5) * 0.05,
    1,
    5,
  );
};

const campaignLeadsPerMonthOf = (game: GameState) => {
  const budget = finiteNumber(game.paidMediaBudget, 0);
  if (budget <= 0) return 0;
  const startDay =
    game.paidMediaStartDay === null
      ? finiteNumber(game.day, 1)
      : finiteNumber(game.paidMediaStartDay, finiteNumber(game.day, 1));
  const elapsedDays = Math.max(
    0,
    finiteNumber(game.day, 1) - startDay,
  );
  const monthsRunning = Math.max(
    0,
    Math.ceil(elapsedDays / 30) - 1,
  );
  const learningMultiplier =
    monthsRunning >= 3
      ? 1
      : monthsRunning === 2
        ? 0.5
        : monthsRunning === 1
          ? 0.25
          : 0.1;
  return Math.max(
    1,
    Math.round(
      (budget / 1000) *
        30 *
        learningMultiplier *
        paidMediaEfficiencyMultiplierOf(game),
    ),
  );
};

const paidMediaLearningMonthOf = (game: GameState) => {
  if (finiteNumber(game.paidMediaBudget, 0) <= 0) return 0;
  const startDay =
    game.paidMediaStartDay === null
      ? finiteNumber(game.day, 1)
      : finiteNumber(game.paidMediaStartDay, finiteNumber(game.day, 1));
  const elapsedDays = Math.max(
    0,
    finiteNumber(game.day, 1) - startDay,
  );
  return clamp(
    Math.floor(Math.max(0, elapsedDays - 1) / 30) + 1,
    1,
    4,
  );
};

const landingUpgradeCost = (game: GameState) => {
  const level = landingPageLevelOf(game);
  return level < 3 ? 200 + Math.max(0, level - 1) * 150 : 550 + (level - 3) * 250;
};

const salesUpgradeCost = (game: GameState) =>
  finiteNumber(game.salesProcess, 0) < 2
    ? 250 + finiteNumber(game.salesProcess, 0) * 200
    : 650 + (finiteNumber(game.salesProcess, 0) - 2) * 300;

const selfServeUpgradeCost = (game: GameState) => {
  const level = selfServeLevelOf(game);
  return level < 3 ? 350 + Math.max(0, level - 1) * 250 : 900 + (level - 3) * 350;
};

const supportUpgradeCost = (game: GameState) =>
  finiteNumber(game.supportProcess, 0) < 2
    ? 200 + finiteNumber(game.supportProcess, 0) * 175
    : 550 + (finiteNumber(game.supportProcess, 0) - 2) * 250;

const monthlyChurnRateOf = (game: GameState) =>
  finiteNumber(game.product, 0) === 0
    ? 100
    : clamp(
        Math.round(125 - finiteNumber(game.product, 0) * 1.25),
        5,
        90,
      );

const REFERRAL_QUALITY_THRESHOLD = 70;
const referralRateOf = (game: GameState) =>
  finiteNumber(game.product, 0) < REFERRAL_QUALITY_THRESHOLD
    ? 0
    : clamp(
        Math.round((finiteNumber(game.product, 0) - 60) * 0.75),
        8,
        30,
      );

const contentCreatorCountOf = (game: GameState) =>
  finiteNumber(game.contentCreators, 0);
const blogWriterCountOf = (game: GameState) =>
  finiteNumber(game.blogWriters, 0);
const performanceMarketerCountOf = (game: GameState) =>
  Math.max(
    0,
    finiteNumber(game.team?.marketing, 0) -
      contentCreatorCountOf(game) -
      blogWriterCountOf(game),
  );

const staffCountOf = (game: GameState, role: StaffRole) => {
  if (role === "engineer") return game.team.product;
  if (role === "marketer") return performanceMarketerCountOf(game);
  if (role === "creator") return contentCreatorCountOf(game);
  if (role === "writer") return blogWriterCountOf(game);
  return game.team[role];
};

const rampMultiplierForAge = (ageInDays: number) => {
  if (ageInDays < 10) return 0.5;
  if (ageInDays < 20) return 0.75;
  return 1;
};

const effectiveStaffOf = (game: GameState, role: StaffRole) => {
  const count = staffCountOf(game, role);
  const fallbackHireDay = Math.max(1, game.day - 30);
  const hiredDays = game.staffHiredDays?.[role] ?? [];

  return Array.from({ length: count }, (_, index) => {
    const hiredDay = finiteNumber(hiredDays[index], fallbackHireDay);
    const ramp = rampMultiplierForAge(Math.max(0, game.day - hiredDay));
    const diminishingReturn = 0.85 ** index;
    return ramp * diminishingReturn;
  }).reduce((total, capacity) => total + capacity, 0);
};

const staffRampPercentOf = (game: GameState, role: StaffRole) => {
  const count = staffCountOf(game, role);
  if (count === 0) return 0;
  const fullCapacity = Array.from(
    { length: count },
    (_, index) => 0.85 ** index,
  ).reduce((total, capacity) => total + capacity, 0);
  return Math.round((effectiveStaffOf(game, role) / fullCapacity) * 100);
};

const staffPayrollPerMonth = (game: GameState, role: StaffRole) =>
  staffCountOf(game, role) * wages[staffTeamRole[role]] * 30;

const hireStaff = (game: GameState, role: StaffRole) => {
  game.staffHiredDays = {
    ...game.staffHiredDays,
    [role]: [...(game.staffHiredDays?.[role] ?? []), game.day],
  };
};

const fireStaff = (game: GameState, role: StaffRole) => {
  game.staffHiredDays = {
    ...game.staffHiredDays,
    [role]: (game.staffHiredDays?.[role] ?? []).slice(0, -1),
  };
};

const hasMarketingInvestment = (game: GameState) =>
  game.attention > 0 ||
  game.landingPage ||
  (game.evergreenContent ?? 0) > 0 ||
  (game.seoArticles ?? 0) > 0 ||
  finiteNumber(game.paidMediaBudget, 0) > 0 ||
  game.team.marketing > 0 ||
  game.leads > 0 ||
  game.customers > 0;

const isStationVisible = (game: GameState, stationId: StationId) => {
  if (stationId === "sales") return hasMarketingInvestment(game);
  if (stationId === "bank") return game.day > 365;
  if (stationId === "privateEquity") {
    return companyValueOf(game) >= 10_000_000;
  }
  if (stationId === "ma") return companyValueOf(game) >= 50_000_000;
  if (stationId === "investmentBank") {
    return companyValueOf(game) >= 500_000_000;
  }
  if (stationId === "support") {
    return (
      game.customers > 0 ||
      game.issues > 0 ||
      game.helpDocs ||
      game.team.support > 0
    );
  }
  return true;
};

const visibleMarketingPlotPositions = (game: GameState) =>
  [
    { x: 24, y: 58, visible: true },
    {
      x: 15,
      y: 38,
      visible:
        (game.evergreenContent ?? 0) > 0 || contentCreatorCountOf(game) > 0,
    },
    {
      x: 15,
      y: 78,
      visible: (game.seoArticles ?? 0) > 0 || blogWriterCountOf(game) > 0,
    },
    { x: 33, y: 38, visible: referralRateOf(game) > 0 },
    { x: 42, y: 58, visible: game.landingPage },
    { x: 30, y: 78, visible: finiteNumber(game.paidMediaBudget, 0) > 0 },
  ].filter((plot) => plot.visible);

const visibleSalesPlotPositions = (game: GameState) =>
  [
    { x: 54, y: 58, visible: true },
    {
      x: 45,
      y: 76,
      visible: game.outreachStarted || game.team.sdr > 0,
    },
    { x: 57, y: 40, visible: game.selfServeCheckout },
  ].filter((plot) => plot.visible);

const actionConfigs: Record<StationId, ActionConfig[]> = {
  service: [
    {
      id: "clientWork",
      title: "Do a client sprint",
      description: "Earn reliable cash. Your startup waits while you deliver it.",
      emoji: "🧑‍🔧",
      days: 8,
      cost: 0,
    },
  ],
  investors: [
    {
      id: "pitchPreseed",
      title: "Pitch a pre-seed",
      titleFor: (game) => {
        const offer = fundingOffer(game, "preseed");
        return `Close pre-seed · ${formatCompactMoney(offer.amount)} for ${offer.dilution}% at ${formatCompactMoney(offer.valuation)}`;
      },
      description:
        "Close your first institutional round at a $1M valuation. Once unlocked, this raise always closes.",
      emoji: "🗣️",
      days: 5,
      cost: 0,
      disabled: (game) => game.fundingStage !== 0,
      disabledReason: () => "You already raised the pre-seed",
    },
    {
      id: "pitchSeed",
      title: "Pitch a seed round",
      titleFor: (game) => {
        const offer = fundingOffer(game, "seed");
        return `Close seed · ${formatCompactMoney(offer.amount)} for ${offer.dilution}% at ${formatCompactMoney(offer.valuation)}`;
      },
      description:
        "Close the seed round once you have traction. Eligible raises always close—no coin flip.",
      emoji: "📈",
      days: 7,
      cost: 0,
      disabled: (game) => game.customers < 10 || game.fundingStage !== 1,
      disabledReason: (game) => {
        if (game.fundingStage < 1) return "Raise the pre-seed first";
        if (game.fundingStage > 1) return "Seed already raised";
        return `Need ${10 - game.customers} more subscribers`;
      },
    },
    {
      id: "pitchSeriesA",
      title: "Pitch Series A",
      titleFor: (game) => {
        const offer = fundingOffer(game, "seriesA");
        return `Close Series A · ${formatCompactMoney(offer.amount)} for ${offer.dilution}% at ${formatCompactMoney(offer.valuation)}`;
      },
      description:
        "Close Series A against real traction. Waiting can mean a better valuation, but the close itself is guaranteed.",
      emoji: "🏙️",
      days: 10,
      cost: 0,
      disabled: (game) =>
        game.fundingStage !== 2 || game.customers < 100 || game.product < 70,
      disabledReason: (game) => {
        if (game.fundingStage < 2) return "Raise the seed round first";
        if (game.fundingStage > 2) return "Series A already raised";
        if (game.customers < 100) return `Need ${100 - game.customers} more subscribers`;
        return "Reach 70% product quality first";
      },
    },
    {
      id: "pitchSeriesB",
      title: "Pitch Series B",
      titleFor: (game) => {
        const offer = fundingOffer(game, "seriesB");
        return `Close Series B · ${formatCompactMoney(offer.amount)} for ${offer.dilution}% at ${formatCompactMoney(offer.valuation)}`;
      },
      description:
        "Close a growth round once ARR and product quality clear the bar. Eligible raises always close.",
      emoji: "🌆",
      days: 12,
      cost: 0,
      disabled: (game) =>
        game.fundingStage !== 3 || game.customers < 1000 || game.product < 85,
      disabledReason: (game) => {
        if (game.fundingStage < 3) return "Raise Series A first";
        if (game.fundingStage > 3) return "Series B already raised";
        if (game.customers < 1000) return `Need ${1000 - game.customers} more subscribers`;
        return "Reach 85% product quality first";
      },
    },
    {
      id: "pitchSeriesC",
      title: "Pitch Series C",
      titleFor: (game) => {
        const offer = fundingOffer(game, "seriesC");
        return `Close Series C · ${formatCompactMoney(offer.amount)} for ${offer.dilution}% at ${formatCompactMoney(offer.valuation)}`;
      },
      description:
        "Close a late-stage growth round at global scale. If you qualify, the round closes—no random pass.",
      emoji: "🌍",
      days: 14,
      cost: 0,
      disabled: (game) =>
        game.fundingStage !== 4 || game.customers < 10_000 || game.product < 90,
      disabledReason: (game) => {
        if (game.fundingStage < 4) return "Raise Series B first";
        if (game.fundingStage > 4) return "Series C already raised";
        if (game.customers < 10_000) {
          return `Need ${(10_000 - game.customers).toLocaleString()} more subscribers`;
        }
        return "Reach 90% product quality first";
      },
    },
  ],
  bank: [
    {
      id: "takeBusinessLoan",
      title: "Take a business loan",
      titleFor: (game) =>
        `Borrow ${formatCompactMoney(businessLoanOffer(game))}`,
      description: "Get non-dilutive cash, then repay principal and interest over one year.",
      emoji: "🏦",
      days: 7,
      cost: 0,
      disabled: (game) => game.bankLoans >= 3,
      disabledReason: () => "The bank will not extend more credit yet",
    },
  ],
  privateEquity: [
    {
      id: "takePeInvestment",
      title: "Take private equity investment",
      titleFor: (game) => {
        const offer = peOffer(game);
        return `PE growth deal · ${formatCompactMoney(offer.amount)} at ${formatCompactMoney(offer.valuation)}`;
      },
      description: "Trade a meaningful ownership stake for a large pool of growth capital.",
      emoji: "💼",
      days: 30,
      cost: 0,
      disabled: (game) => game.peDealDone,
      disabledReason: () => "Private equity deal already completed",
    },
  ],
  ma: [
    {
      id: "acquireCompany",
      title: "Acquire a smaller company",
      titleFor: (game) =>
        `Acquire a competitor · ${formatCompactMoney(acquisitionCost(game))}`,
      description: "Buy customers, a team and technology—but spend a lot of cash.",
      emoji: "🏢",
      days: 45,
      cost: 0,
      costFor: acquisitionCost,
      disabled: (game) => game.acquisitions >= 5,
      disabledReason: () => "Integration capacity is full for now",
    },
    {
      id: "acceptAcquisition",
      title: "Sell to a bigger company",
      titleFor: (game) =>
        `Accept acquisition · ${formatCompactMoney(acquisitionOffer(game))}`,
      description: "Take the exit and end this startup journey as an acquired company.",
      emoji: "🤝",
      days: 60,
      cost: 0,
      disabled: (game) => companyValueOf(game) < 100_000_000,
      disabledReason: (game) =>
        `Need ${formatCompactMoney(100_000_000 - companyValueOf(game))} more valuation`,
    },
  ],
  investmentBank: [
    {
      id: "goPublic",
      title: "Go public",
      titleFor: (game) =>
        `Launch IPO · ${formatCompactMoney(companyValueOf(game) * 1.1)}`,
      description: "List the company on public markets and complete the ultimate scale milestone.",
      emoji: "🔔",
      days: 90,
      cost: 0,
      disabled: (game) => game.product < 90 || game.customers < 10_000,
      disabledReason: (game) =>
        game.product < 90
          ? "Reach 90% product quality first"
          : `Need ${10_000 - game.customers} more subscribers`,
    },
  ],
  product: [
    {
      id: "buildMvp",
      title: "Build the MVP",
      description: "Create the first usable product and start serving customers.",
      emoji: "🛠️",
      days: 16,
      cost: 0,
      disabled: (game) => game.product > 0,
      disabledReason: () => "The MVP already exists",
    },
    {
      id: "improveProduct",
      title: "Improve the product",
      description: "Better quality means fewer support problems and happier users.",
      emoji: "✨",
      days: 12,
      cost: 250,
      disabled: (game) => game.product === 0 || game.product >= 100,
      disabledReason: (game) => (game.product === 0 ? "Build the MVP first" : "Product is fully polished"),
    },
    {
      id: "expandCapacity",
      title: "Strengthen infrastructure",
      description: "Make the product more reliable as the customer base grows.",
      emoji: "🧱",
      days: 7,
      cost: 400,
      disabled: (game) => game.product === 0,
      disabledReason: () => "Build the MVP first",
    },
    {
      id: "fixBugs",
      title: "Fix urgent bugs",
      description: "Clear product problems before frustrated users leave.",
      emoji: "🧹",
      days: 4,
      cost: 0,
      disabled: (game) => game.issues === 0,
      disabledReason: () => "No urgent problems right now",
    },
    {
      id: "hireEngineer",
      title: "Hire an engineer",
      description: "They steadily improve quality and prevent issues while you work elsewhere.",
      emoji: "🧑‍💻",
      days: 6,
      cost: 0,
      monthlyCost: wages.product * 30,
      disabled: (game) => game.team.product >= 8,
      disabledReason: () => "Engineering team is full for now",
    },
    {
      id: "fireEngineer",
      title: "Fire an engineer",
      description: "Remove one engineer, pay three months of severance and stop their recurring payroll.",
      emoji: "👋",
      days: 1,
      cost: 0,
      costFor: () => severanceCostFor("product"),
      disabled: (game) => game.team.product <= 0,
      disabledReason: () => "No engineers to fire",
    },
  ],
  marketing: [
    {
      id: "postContent",
      title: "Post something useful",
      description: "Spike social reach and traffic. Momentum fades if you stop posting.",
      emoji: "✍️",
      days: 3,
      cost: 0,
    },
    {
      id: "buildLandingPage",
      title: "Build a landing page",
      description: "Turn future attention into a stronger queue of interested people.",
      emoji: "🪧",
      days: 7,
      cost: 150,
      disabled: (game) => game.landingPage,
      disabledReason: () => "Landing page is already live",
    },
    {
      id: "improveLandingPage",
      title: "Improve landing page",
      description: "Try to capture more visitors. The result is revealed after the work is complete.",
      emoji: "📈",
      days: 5,
      cost: 200,
      costFor: landingUpgradeCost,
      disabled: (game) => !game.landingPage,
      disabledReason: () => "Build the landing page first",
    },
    {
      id: "createEvergreenContent",
      title: "Create an evergreen video",
      description: "Open a video plot that keeps bringing new people over time.",
      emoji: "🎥",
      days: 10,
      cost: 100,
      disabled: (game) => (game.evergreenContent ?? 0) >= 120,
      disabledReason: () => "Evergreen library is full for now",
    },
    {
      id: "writeSeoArticle",
      title: "Invest in SEO",
      description: "Open a search plot that compounds into a steady customer stream.",
      emoji: "🔎",
      days: 9,
      cost: 100,
      disabled: (game) => (game.seoArticles ?? 0) >= 18,
      disabledReason: () => "SEO library is full for now",
    },
    {
      id: "launchCampaign",
      title: "Start paid media",
      titleFor: () => "Start paid media · 3-month learning phase",
      description: "Spend $1,000/month. Returns ramp slowly before reaching full efficiency.",
      emoji: "📬",
      days: 5,
      cost: 0,
      monthlyCost: 1000,
      disabled: (game) => finiteNumber(game.paidMediaBudget, 0) > 0,
      disabledReason: () => "Paid media is already running",
    },
    {
      id: "increasePaidMediaBudget",
      title: "Increase paid media budget",
      titleFor: (game) =>
        `Increase budget · ${formatMoney(finiteNumber(game.paidMediaBudget, 0) + 1000)}/month total`,
      description: "Add another $1,000/month without restarting the channel's learning.",
      emoji: "📈",
      days: 3,
      cost: 0,
      monthlyCost: 1000,
      disabled: (game) => finiteNumber(game.paidMediaBudget, 0) <= 0,
      disabledReason: () => "Start paid media first",
    },
    {
      id: "optimizePaidMedia",
      title: "Optimize paid campaigns",
      description: "Test audiences, creative and targeting to generate more leads from the same budget.",
      emoji: "🎯",
      days: 5,
      cost: 0,
      disabled: (game) => finiteNumber(game.paidMediaBudget, 0) <= 0,
      disabledReason: () => "Start paid media first",
    },
    {
      id: "hireMarketer",
      title: "Hire a performance marketer",
      description: "They repeatedly optimize paid campaigns while you focus elsewhere.",
      emoji: "🧑‍🎨",
      days: 5,
      cost: 0,
      monthlyCost: wages.marketing * 30,
      disabled: (game) =>
        performanceMarketerCountOf(game) >= 8 ||
        finiteNumber(game.paidMediaBudget, 0) <= 0,
      disabledReason: (game) =>
        finiteNumber(game.paidMediaBudget, 0) <= 0
          ? "Start paid media first"
          : "The performance team is full for now",
    },
    {
      id: "fireMarketer",
      title: "Fire a performance marketer",
      description: "Remove one performance marketer, pay three months of severance and stop their recurring payroll.",
      emoji: "👋",
      days: 1,
      cost: 0,
      costFor: () => severanceCostFor("marketing"),
      disabled: (game) => performanceMarketerCountOf(game) <= 0,
      disabledReason: () => "No performance marketers to fire",
    },
    {
      id: "hireContentCreator",
      title: "Hire a content creator",
      description: "They publish evergreen videos that build a compounding audience over time.",
      emoji: "🧑‍🎬",
      days: 7,
      cost: 0,
      monthlyCost: wages.marketing * 30,
      disabled: (game) => contentCreatorCountOf(game) >= 8,
      disabledReason: () => "The creator team is full for now",
    },
    {
      id: "fireContentCreator",
      title: "Fire a content creator",
      description: "Remove one creator, pay three months of severance and stop their recurring payroll.",
      emoji: "👋",
      days: 1,
      cost: 0,
      costFor: () => severanceCostFor("marketing"),
      disabled: (game) => contentCreatorCountOf(game) <= 0,
      disabledReason: () => "No content creators to fire",
    },
    {
      id: "hireBlogWriter",
      title: "Hire a blog writer",
      description: "They steadily grow an SEO library that brings in people long after publishing.",
      emoji: "🧑‍💻",
      days: 7,
      cost: 0,
      monthlyCost: wages.marketing * 30,
      disabled: (game) => blogWriterCountOf(game) >= 8,
      disabledReason: () => "The writing team is full for now",
    },
    {
      id: "fireBlogWriter",
      title: "Fire a blog writer",
      description: "Remove one writer, pay three months of severance and stop their recurring payroll.",
      emoji: "👋",
      days: 1,
      cost: 0,
      costFor: () => severanceCostFor("marketing"),
      disabled: (game) => blogWriterCountOf(game) <= 0,
      disabledReason: () => "No blog writers to fire",
    },
  ],
  sales: [
    {
      id: "closeLeads",
      title: "Talk to the queue",
      description: "Convert interested people into paying subscribers.",
      emoji: "💬",
      days: 4,
      cost: 0,
      disabled: (game) => game.leads === 0 || game.product === 0,
      disabledReason: (game) => {
        if (game.leads === 0) return "Nobody is waiting yet";
        return "There is no product to sell yet";
      },
    },
    {
      id: "doOutreach",
      title: "Do founder outreach",
      description: "Personally find a few promising leads for free.",
      emoji: "📨",
      days: 3,
      cost: 0,
      disabled: (game) => game.product === 0,
      disabledReason: () => "Build the product first",
    },
    {
      id: "hireSdr",
      title: "Hire an SDR",
      description: "They continuously prospect and feed new people into the sales queue.",
      emoji: "🧑‍💻",
      days: 5,
      cost: 0,
      monthlyCost: wages.sdr * 30,
      disabled: (game) => game.team.sdr >= 8,
      disabledReason: () => "SDR team is full for now",
    },
    {
      id: "fireSdr",
      title: "Fire an SDR",
      description: "Remove one SDR, pay three months of severance and stop their recurring payroll.",
      emoji: "👋",
      days: 1,
      cost: 0,
      costFor: () => severanceCostFor("sdr"),
      disabled: (game) => game.team.sdr <= 0,
      disabledReason: () => "No SDRs to fire",
    },
    {
      id: "improveSales",
      title: "Improve the sales playbook",
      description: "Try to close more conversations. The result is revealed after the work is complete.",
      emoji: "📋",
      days: 7,
      cost: 250,
      costFor: salesUpgradeCost,
    },
    {
      id: "buildSelfServeCheckout",
      title: "Build self-serve checkout",
      description: "Let inbound visitors subscribe directly without entering Sales.",
      emoji: "🛒",
      days: 8,
      cost: 500,
      disabled: (game) =>
        game.selfServeCheckout || !game.landingPage || game.product < 45,
      disabledReason: (game) => {
        if (game.selfServeCheckout) return "Self-serve checkout is already live";
        if (!game.landingPage) return "Build a landing page first";
        return "Improve the product to at least 45% first";
      },
    },
    {
      id: "improveSelfServeCheckout",
      title: "Improve self-serve checkout",
      description: "Try to convert more visitors directly. The result is revealed after completion.",
      emoji: "🛒",
      days: 6,
      cost: 350,
      costFor: selfServeUpgradeCost,
      disabled: (game) => !game.selfServeCheckout,
      disabledReason: () => "Build self-serve checkout first",
    },
    {
      id: "hireSalesperson",
      title: "Hire a salesperson",
      description: "They work through the lead queue automatically every few days.",
      emoji: "🧑‍💼",
      days: 5,
      cost: 0,
      monthlyCost: wages.sales * 30,
      disabled: (game) => game.team.sales >= 8,
      disabledReason: () => "Sales team is full for now",
    },
    {
      id: "fireSalesperson",
      title: "Fire a salesperson",
      description: "Remove one salesperson, pay three months of severance and stop their recurring payroll.",
      emoji: "👋",
      days: 1,
      cost: 0,
      costFor: () => severanceCostFor("sales"),
      disabled: (game) => game.team.sales <= 0,
      disabledReason: () => "No salespeople to fire",
    },
  ],
  support: [
    {
      id: "answerUsers",
      title: "Help waiting users",
      description: "Clear problems quickly and protect your reputation.",
      emoji: "🙋",
      days: 3,
      cost: 0,
      disabled: (game) => game.issues === 0,
      disabledReason: () => "Nobody needs help right now",
    },
    {
      id: "writeHelpDocs",
      title: "Write help docs",
      description: "Prevent some future questions instead of answering each one.",
      emoji: "📚",
      days: 6,
      cost: 200,
      disabled: (game) => game.helpDocs,
      disabledReason: () => "Help docs are already published",
    },
    {
      id: "improveSupport",
      title: "Improve support workflow",
      description: "Try a better workflow. Its impact is revealed after the work is complete.",
      emoji: "🧰",
      days: 5,
      cost: 200,
      costFor: supportUpgradeCost,
    },
    {
      id: "hireSupport",
      title: "Hire customer support",
      description: "They continuously clear user problems before they become churn.",
      emoji: "🧑‍🚒",
      days: 5,
      cost: 0,
      monthlyCost: wages.support * 30,
      disabled: (game) => game.team.support >= 8,
      disabledReason: () => "Support team is full for now",
    },
    {
      id: "fireSupport",
      title: "Fire a support person",
      description: "Remove one support person, pay three months of severance and stop their recurring payroll.",
      emoji: "👋",
      days: 1,
      cost: 0,
      costFor: () => severanceCostFor("support"),
      disabled: (game) => game.team.support <= 0,
      disabledReason: () => "No support people to fire",
    },
  ],
};

const actionTitle = (action: ActionConfig, game: GameState) =>
  action.titleFor?.(game) ?? action.title;

const actionCost = (action: ActionConfig, game: GameState) =>
  finiteNumber(action.costFor?.(game) ?? action.cost, 0);

const beginAction = (
  unsafeGame: GameState,
  stationId: StationId,
  action: ActionConfig,
): GameState => {
  const game = normalizeGameState(unsafeGame);
  const cost = actionCost(action, game);
  const monthlyCost = action.monthlyCost ?? 0;
  if (
    game.activity ||
    game.bankrupt ||
    game.outcome ||
    cost > game.cash ||
    monthlyCost > game.cash ||
    action.disabled?.(game)
  ) {
    return game;
  }

  return {
    ...game,
    started: true,
    cash: game.cash - cost,
    activity: {
      actionId: action.id,
      stationId,
      label: actionTitle(action, game),
      totalDays: action.days,
      elapsedDays: 0,
    },
    lastEvent: `${actionTitle(action, game)} started. You are now the operator here.`,
  };
};

const addLeads = (game: GameState, count: number): GameState => {
  const existingPatience =
    game.leadPatience ??
    Array.from({ length: game.leads }, () => 20);
  const newPatience = Array.from(
    { length: count },
    (_, index) => 20 + ((game.day + index * 3) % 9),
  );

  return {
    ...game,
    leads: game.leads + count,
    leadPatience: [...existingPatience, ...newPatience],
    recentLeads: (game.recentLeads ?? 0) + count,
  };
};

const routeCapturedLeads = (game: GameState, captured: number): GameState => {
  if (!game.selfServeCheckout) return addLeads(game, captured);
  const progress =
    (game.selfServeConversionProgress ?? 0) +
    captured * (selfServeConversionRateOf(game) / 100);
  const converted = Math.min(captured, Math.floor(progress));

  return {
    ...game,
    selfServeConversionProgress: progress - converted,
    customers: game.customers + converted,
    recentArrivals: game.recentArrivals + converted,
    recentSelfServeArrivals: game.recentSelfServeArrivals + converted,
  };
};

const addInboundTraffic = (game: GameState, visitors: number): GameState => {
  const landingProgress =
    (game.landingConversionProgress ?? 0) +
    visitors * (landingConversionRateOf(game) / 100);
  const captured = Math.min(visitors, Math.floor(landingProgress));
  return routeCapturedLeads(
    {
      ...game,
      landingConversionProgress: landingProgress - captured,
    },
    captured,
  );
};

const convertLeads = (game: GameState, requested: number) => {
  const converted = Math.min(game.leads, requested);

  return {
    ...game,
    leads: game.leads - converted,
    leadPatience: (
      game.leadPatience ??
      Array.from({ length: game.leads }, () => 20)
    ).slice(converted),
    customers: game.customers + converted,
    recentArrivals: game.recentArrivals + converted,
  };
};

const convertSalesLeads = (game: GameState, capacity: number) => {
  const peopleSpokenTo = Math.min(game.leads, capacity);
  const converted =
    peopleSpokenTo > 0
      ? Math.max(
          1,
          Math.round(
            peopleSpokenTo * (salesConversionRateOf(game) / 100),
          ),
        )
      : 0;
  return convertLeads(game, converted);
};

const applyCompletedAction = (
  unsafeGame: GameState,
  actionId: ActionId,
): GameState => {
  let next: GameState = {
    ...normalizeGameState(unsafeGame),
    activity: null,
  };

  switch (actionId) {
    case "clientWork":
      next.cash += 1000;
      next.lastEvent = "Client sprint delivered: +$1,000. The startup made no progress while you were away.";
      break;
    case "pitchPreseed": {
      const offer = fundingOffer(next, "preseed");
      next.cash += offer.amount;
      next.ownership *= 1 - offer.dilution / 100;
      next.valuation = offer.valuation;
      next.fundingStage = 1;
      next.lastEvent = `Pre-seed raised: +${formatCompactMoney(offer.amount)} at a ${formatCompactMoney(offer.valuation)} valuation.`;
      break;
    }
    case "pitchSeed": {
      const offer = fundingOffer(next, "seed");
      next.cash += offer.amount;
      next.ownership *= 1 - offer.dilution / 100;
      next.valuation = offer.valuation;
      next.fundingStage = 2;
      next.lastEvent = `Seed raised: +${formatCompactMoney(offer.amount)} at a ${formatCompactMoney(offer.valuation)} valuation.`;
      break;
    }
    case "pitchSeriesA": {
      const offer = fundingOffer(next, "seriesA");
      next.cash += offer.amount;
      next.ownership *= 1 - offer.dilution / 100;
      next.valuation = offer.valuation;
      next.fundingStage = 3;
      next.lastEvent = `Series A closed: +${formatCompactMoney(offer.amount)} at a ${formatCompactMoney(offer.valuation)} valuation.`;
      break;
    }
    case "pitchSeriesB": {
      const offer = fundingOffer(next, "seriesB");
      next.cash += offer.amount;
      next.ownership *= 1 - offer.dilution / 100;
      next.valuation = offer.valuation;
      next.fundingStage = 4;
      next.lastEvent = `Series B closed: +${formatCompactMoney(offer.amount)} at a ${formatCompactMoney(offer.valuation)} valuation.`;
      break;
    }
    case "pitchSeriesC": {
      const offer = fundingOffer(next, "seriesC");
      next.cash += offer.amount;
      next.ownership *= 1 - offer.dilution / 100;
      next.valuation = offer.valuation;
      next.fundingStage = 5;
      next.lastEvent = `Series C closed: +${formatCompactMoney(offer.amount)} at a ${formatCompactMoney(offer.valuation)} valuation.`;
      break;
    }
    case "takeBusinessLoan": {
      const amount = businessLoanOffer(next);
      const repayment = amount * 1.12;
      next.cash += amount;
      next.debt += repayment;
      next.debtPaymentPerDay += repayment / 365;
      next.bankLoans += 1;
      next.lastEvent = `${formatCompactMoney(amount)} borrowed. Daily repayments have begun, with no equity dilution.`;
      break;
    }
    case "takePeInvestment": {
      const offer = peOffer(next);
      next.cash += offer.amount;
      next.ownership *= 1 - offer.dilution / 100;
      next.valuation = offer.valuation;
      next.peDealDone = true;
      next.lastEvent = `Private equity invested ${formatCompactMoney(offer.amount)} at a ${formatCompactMoney(offer.valuation)} valuation.`;
      break;
    }
    case "acquireCompany": {
      const newCustomers = Math.max(500, Math.round(next.customers * 0.2));
      next.customers += newCustomers;
      next.product = clamp(next.product + 3, 0, 100);
      next.team = {
        ...next.team,
        product: Math.min(8, next.team.product + 1),
        sales: Math.min(8, next.team.sales + 1),
      };
      next.acquisitions += 1;
      next.valuation = Math.max(
        next.valuation,
        companyValueOf(next) * 1.08,
      );
      next.lastEvent = `Acquisition complete: ${newCustomers.toLocaleString()} customers and a small team joined the company.`;
      break;
    }
    case "acceptAcquisition":
      next.outcome = "acquired";
      next.exitValue = acquisitionOffer(next);
      next.lastEvent = `The company was acquired for ${formatCompactMoney(next.exitValue)}.`;
      break;
    case "goPublic":
      next.outcome = "public";
      next.exitValue = Math.round(companyValueOf(next) * 1.1);
      next.valuation = next.exitValue;
      next.lastEvent = `The IPO rang the bell at ${formatCompactMoney(next.exitValue)}.`;
      break;
    case "buildMvp":
      next.product = 28;
      next.lastEvent = "The product house opened. Customers can now come inside and subscribe.";
      break;
    case "improveProduct":
      next.product = clamp(next.product + 18, 0, 100);
      next.reputation = clamp(next.reputation + 2, 0, 100);
      next.lastEvent = "The product house improved. Subscribers are now less likely to churn.";
      break;
    case "expandCapacity":
      next.product = clamp(next.product + 10, 0, 100);
      next.issues = Math.max(0, next.issues - 2);
      next.reputation = clamp(next.reputation + 2, 0, 100);
      next.lastEvent = "Infrastructure strengthened. The product can grow with fewer reliability problems.";
      break;
    case "fixBugs": {
      const fixed = Math.min(next.issues, 5);
      next.issues -= fixed;
      next.reputation = clamp(next.reputation + fixed, 0, 100);
      next.lastEvent = `${fixed} urgent ${fixed === 1 ? "bug" : "bugs"} cleared. The user queue is calmer.`;
      break;
    }
    case "hireEngineer":
      next.team = { ...next.team, product: next.team.product + 1 };
      hireStaff(next, "engineer");
      next.lastEvent = `${next.team.product} ${next.team.product === 1 ? "engineer is" : "engineers are"} now improving the product.`;
      break;
    case "fireEngineer":
      next.team = {
        ...next.team,
        product: Math.max(0, next.team.product - 1),
      };
      fireStaff(next, "engineer");
      next.lastEvent = `One engineer left. Payroll fell by ${formatMoney(wages.product * 30)}/month.`;
      break;
    case "postContent": {
      const visitors = 30;
      const customersBefore = next.customers;
      const leadsBefore = next.leads;
      next.attention = clamp(next.attention + 12, 0, 100);
      next.socialMomentum = clamp(next.socialMomentum + 34, 0, 100);
      next.lastSocialPostDay = next.day;
      next = addInboundTraffic(next, visitors);
      const converted = next.customers - customersBefore;
      const captured = next.leads - leadsBefore;
      next.lastEvent = next.selfServeCheckout
        ? `${visitors} people visited from your post and ${converted} subscribed through self-serve. Reach will fade if you stop posting.`
        : `${visitors} people visited and ${captured} joined Sales at ${landingConversionRateOf(next)}% landing conversion. Reach will fade without another post.`;
      break;
    }
    case "buildLandingPage":
      next.landingPage = true;
      next.landingPageLevel = 1;
      next.attention = clamp(next.attention + 8, 0, 100);
      next.lastEvent = "Landing page live. Future marketing will capture more interested people.";
      break;
    case "improveLandingPage":
      next.landingPageLevel = landingPageLevelOf(next) + 1;
      next.lastEvent = `Landing page improved to ${landingConversionRateOf(next)}% visitor conversion.`;
      break;
    case "createEvergreenContent":
      next.evergreenContent = Math.min(120, (next.evergreenContent ?? 0) + 1);
      next.attention = clamp(next.attention + 6, 0, 100);
      next.lastEvent = `Evergreen asset ${next.evergreenContent} published. It will keep attracting people automatically.`;
      break;
    case "writeSeoArticle":
      next.seoArticles = Math.min(18, (next.seoArticles ?? 0) + 1);
      next.attention = clamp(next.attention + 4, 0, 100);
      next.lastEvent = `SEO plot planted with ${next.seoArticles} searchable ${next.seoArticles === 1 ? "article" : "articles"}. It will compound into traffic.`;
      break;
    case "launchCampaign":
      next.campaignsRun = 1;
      next.paidMediaBudget = 1000;
      next.paidMediaStartDay = next.day;
      next.attention = clamp(next.attention + 5, 0, 100);
      next.lastEvent = "Paid media started at $1,000/month. The channel now needs three months to learn.";
      break;
    case "increasePaidMediaBudget":
      next.campaignsRun = Math.max(1, next.campaignsRun + 1);
      next.paidMediaBudget += 1000;
      next.lastEvent = `Paid media budget increased to ${formatMoney(next.paidMediaBudget)}/month without resetting its learning.`;
      break;
    case "optimizePaidMedia":
      next.paidMediaOptimization += 1;
      next.lastEvent = `Paid campaigns optimized to level ${next.paidMediaOptimization}. They now generate about ${campaignLeadsPerMonthOf(next)} leads per month.`;
      break;
    case "hireMarketer":
      next.team = { ...next.team, marketing: next.team.marketing + 1 };
      hireStaff(next, "marketer");
      next.lastEvent = `${performanceMarketerCountOf(next)} ${performanceMarketerCountOf(next) === 1 ? "performance marketer is" : "performance marketers are"} now optimizing paid campaigns.`;
      break;
    case "fireMarketer":
      next.team = {
        ...next.team,
        marketing: Math.max(0, next.team.marketing - 1),
      };
      fireStaff(next, "marketer");
      next.lastEvent = `One performance marketer left. Payroll fell by ${formatMoney(wages.marketing * 30)}/month.`;
      break;
    case "hireContentCreator":
      next.contentCreators = contentCreatorCountOf(next) + 1;
      next.team = { ...next.team, marketing: next.team.marketing + 1 };
      hireStaff(next, "creator");
      next.lastEvent = "Content creator hired. Your evergreen audience will now compound in the background.";
      break;
    case "fireContentCreator":
      next.contentCreators = Math.max(0, contentCreatorCountOf(next) - 1);
      next.team = {
        ...next.team,
        marketing: Math.max(0, next.team.marketing - 1),
      };
      fireStaff(next, "creator");
      next.lastEvent = `One content creator left. Payroll fell by ${formatMoney(wages.marketing * 30)}/month.`;
      break;
    case "hireBlogWriter":
      next.blogWriters = blogWriterCountOf(next) + 1;
      next.team = { ...next.team, marketing: next.team.marketing + 1 };
      hireStaff(next, "writer");
      next.lastEvent = "Blog writer hired. Your searchable content library will now grow automatically.";
      break;
    case "fireBlogWriter":
      next.blogWriters = Math.max(0, blogWriterCountOf(next) - 1);
      next.team = {
        ...next.team,
        marketing: Math.max(0, next.team.marketing - 1),
      };
      fireStaff(next, "writer");
      next.lastEvent = `One blog writer left. Payroll fell by ${formatMoney(wages.marketing * 30)}/month.`;
      break;
    case "doOutreach": {
      next.outreachStarted = true;
      const generated = 4;
      next = addLeads(next, generated);
      next.recentOutreachLeads += generated;
      next.lastEvent = `${generated} promising people replied to your outreach.`;
      break;
    }
    case "hireSdr":
      next.outreachStarted = true;
      next.team = { ...next.team, sdr: next.team.sdr + 1 };
      hireStaff(next, "sdr");
      next.lastEvent = `${next.team.sdr} ${next.team.sdr === 1 ? "SDR is" : "SDRs are"} now prospecting continuously.`;
      break;
    case "fireSdr":
      next.team = {
        ...next.team,
        sdr: Math.max(0, next.team.sdr - 1),
      };
      fireStaff(next, "sdr");
      next.lastEvent = `One SDR left. Payroll fell by ${formatMoney(wages.sdr * 30)}/month.`;
      break;
    case "closeLeads": {
      const before = next.customers;
      next = convertSalesLeads(next, 10);
      const converted = next.customers - before;
      next.lastEvent =
        converted > 0
          ? `${converted} ${converted === 1 ? "person became a user" : "people became users"} at ${salesConversionRateOf(next)}% assisted conversion.`
          : "Nobody was ready to subscribe yet.";
      break;
    }
    case "improveSales": {
      next.salesProcess += 1;
      next.lastEvent = `The sales playbook now converts ${salesConversionRateOf(next)}% of conversations.`;
      break;
    }
    case "buildSelfServeCheckout":
      next.selfServeCheckout = true;
      next.selfServeLevel = 1;
      next.lastEvent = `Self-serve checkout is live at ${selfServeConversionRateOf(next)}% conversion. Inbound visitors now bypass Sales.`;
      break;
    case "improveSelfServeCheckout":
      next.selfServeLevel = selfServeLevelOf(next) + 1;
      next.lastEvent = `Self-serve checkout now converts ${selfServeConversionRateOf(next)}% of inbound visitors.`;
      break;
    case "hireSalesperson":
      next.team = { ...next.team, sales: next.team.sales + 1 };
      hireStaff(next, "sales");
      next.lastEvent = `${next.team.sales} ${next.team.sales === 1 ? "salesperson is" : "salespeople are"} working through the queue.`;
      break;
    case "fireSalesperson":
      next.team = {
        ...next.team,
        sales: Math.max(0, next.team.sales - 1),
      };
      fireStaff(next, "sales");
      next.lastEvent = `One salesperson left. Payroll fell by ${formatMoney(wages.sales * 30)}/month.`;
      break;
    case "answerUsers": {
      const attempted = Math.min(next.issues, 10);
      const helped =
        attempted > 0
          ? Math.max(
              1,
              Math.round(
                attempted * (supportResolutionRateOf(next) / 100),
              ),
            )
          : 0;
      next.issues -= helped;
      next.recentResolved += helped;
      next.reputation = clamp(next.reputation + helped * 2, 0, 100);
      next.lastEvent = `${helped} ${helped === 1 ? "user is" : "users are"} happy and returning to the product at ${supportResolutionRateOf(next)}% resolution.`;
      break;
    }
    case "writeHelpDocs":
      next.helpDocs = true;
      next.lastEvent = `Help docs published. Support now resolves ${supportResolutionRateOf(next)}% of attempted issues.`;
      break;
    case "improveSupport":
      next.supportProcess = (next.supportProcess ?? 0) + 1;
      next.lastEvent = `The support workflow now resolves ${supportResolutionRateOf(next)}% of attempted issues.`;
      break;
    case "hireSupport":
      next.team = { ...next.team, support: next.team.support + 1 };
      hireStaff(next, "support");
      next.lastEvent = `${next.team.support} support ${next.team.support === 1 ? "person is" : "people are"} protecting retention.`;
      break;
    case "fireSupport":
      next.team = {
        ...next.team,
        support: Math.max(0, next.team.support - 1),
      };
      fireStaff(next, "support");
      next.lastEvent = `One support person left. Payroll fell by ${formatMoney(wages.support * 30)}/month.`;
      break;
  }

  return next;
};

const advanceGame = (unsafeCurrent: GameState): GameState => {
  const current = normalizeGameState(unsafeCurrent);
  if (!current.started || current.bankrupt || current.outcome) return current;

  const day = current.day + 1;
  const payroll = payrollPerDay(current);
  const payrollCharge = salaryPaymentDueOn(current, day);
  const revenue = revenuePerDay(current);
  const debtPayment = Math.min(current.debt, current.debtPaymentPerDay);
  const paidMediaSpend = current.paidMediaBudget / 30;
  const remainingDebt = Math.max(0, current.debt - debtPayment);
  let next: GameState = {
    ...current,
    day,
    cash: current.cash - payrollCharge - debtPayment - paidMediaSpend,
    debt: remainingDebt,
    debtPaymentPerDay:
      remainingDebt > 0 ? current.debtPaymentPerDay : 0,
    uncollectedCash: current.uncollectedCash + revenue,
    recentLeads: 0,
    recentOutreachLeads: 0,
    recentArrivals: 0,
    recentSelfServeArrivals: 0,
    recentIssues: 0,
    recentResolved: 0,
    recentDepartures: 0,
  };

  if (next.cash < 0) {
    const rescued = resolveCapitalRaiseBeforeBankruptcy(next, (game, actionId) =>
      applyCompletedAction(game, actionId),
    );
    if (rescued) {
      next = {
        ...rescued,
        lastEvent: `${rescued.lastEvent} Investors wired early and kept the company alive.`,
      };
    } else {
      return {
        ...next,
        cash: 0,
        activity: null,
        bankrupt: true,
        lastEvent:
          payrollCharge > 0
            ? `Salary day arrived, but the company could not cover its ${formatMoney(payrollCharge)} payroll.`
            : "Runway hit zero before the next payday.",
      };
    }
  }

  if (next.leads > 0) {
    const patienceLoss = next.leads > 8 ? 2 : 1;
    const patience = (
      next.leadPatience ??
      Array.from({ length: next.leads }, () => 20)
    ).map((value) => value - patienceLoss);
    const remainingPatience = patience.filter((value) => value > 0);
    const abandoned = patience.length - remainingPatience.length;
    next.leadPatience = remainingPatience;
    next.leads = remainingPatience.length;

    if (abandoned > 0) {
      next.lostUsers += abandoned;
      next.recentDepartures += abandoned;
      next.reputation = clamp(next.reputation - abandoned, 0, 100);
      next.lastEvent = `${abandoned} impatient ${abandoned === 1 ? "person left" : "people left"} the sales queue.`;
    }
  }

  const engineerCapacity = effectiveStaffOf(next, "engineer");
  if (engineerCapacity > 0 && day % 7 === 0) {
    next.product = clamp(
      next.product + Math.max(1, Math.round(engineerCapacity * 6)),
      0,
      100,
    );
  }

  const daysSinceSocialPost =
    next.lastSocialPostDay === null
      ? Number.POSITIVE_INFINITY
      : day - next.lastSocialPostDay;
  if (next.socialMomentum > 0) {
    const momentumDecay = daysSinceSocialPost > 3 ? 3 : 1;
    next.socialMomentum = clamp(
      next.socialMomentum - momentumDecay,
      0,
      100,
    );

    if (day % 3 === 0 && next.socialMomentum > 0) {
      const visitors = Math.max(5, Math.ceil(next.socialMomentum / 4));
      const customersBefore = next.customers;
      const leadsBefore = next.leads;
      next = addInboundTraffic(next, visitors);
      const converted = next.customers - customersBefore;
      const captured = next.leads - leadsBefore;
      next.lastEvent = next.selfServeCheckout
        ? `${visitors} people visited from recent social posts; ${converted} subscribed directly. Reach is now ${next.socialMomentum}%.`
        : `${visitors} people visited from recent social posts; ${captured} entered Sales. Reach is now ${next.socialMomentum}%.`;
    }
  }

  const performanceMarketers = performanceMarketerCountOf(next);
  if (performanceMarketers > 0 && next.paidMediaBudget > 0) {
    const optimizationProgress =
      next.paidMediaOptimizationProgress +
      effectiveStaffOf(next, "marketer") / 10;
    const completedOptimizations = Math.floor(optimizationProgress);
    next.paidMediaOptimizationProgress =
      optimizationProgress - completedOptimizations;

    if (completedOptimizations > 0) {
      next.paidMediaOptimization += completedOptimizations;
      next.lastEvent = `${performanceMarketers} ${performanceMarketers === 1 ? "performance marketer improved" : "performance marketers improved"} paid campaigns to level ${next.paidMediaOptimization}, now producing about ${campaignLeadsPerMonthOf(next)} leads per month.`;
    }
  }

  const contentCreators = contentCreatorCountOf(next);
  if (contentCreators > 0 && day % 10 === 0) {
    const creatorCapacity = effectiveStaffOf(next, "creator");
    const published = Math.min(
      Math.max(1, Math.round(creatorCapacity * 2)),
      Math.max(0, 120 - (next.evergreenContent ?? 0)),
    );
    next.evergreenContent = Math.min(
      120,
      (next.evergreenContent ?? 0) + published,
    );
    next.attention = clamp(next.attention + published * 3, 0, 100);
    if (published > 0) {
      next.lastEvent = `${published} new evergreen ${published === 1 ? "video was" : "videos were"} published. The audience engine is getting stronger.`;
    }
  }

  const blogWriters = blogWriterCountOf(next);
  if (blogWriters > 0 && day % 12 === 0) {
    const published = Math.max(
      1,
      Math.round(effectiveStaffOf(next, "writer") * 2),
    );
    next.seoArticles = (next.seoArticles ?? 0) + published;
    next.attention = clamp(next.attention + published * 2, 0, 100);
    next.lastEvent = `${published} new SEO ${published === 1 ? "article was" : "articles were"} published. Search traffic will keep building.`;
  }

  const evergreenAssets = next.evergreenContent ?? 0;
  if (evergreenAssets > 0 && day % 6 === 0) {
    const visitors = Math.max(4, evergreenAssets * 4);
    next = addInboundTraffic(next, visitors);
    next.lastEvent = `${visitors} people found you through ${evergreenAssets} evergreen ${evergreenAssets === 1 ? "asset" : "assets"}.`;
  }

  const seoArticles = next.seoArticles ?? 0;
  if (seoArticles > 0 && day % 8 === 0) {
    const visitors = Math.max(3, seoArticles * 3);
    next = addInboundTraffic(next, visitors);
    next.lastEvent = `${visitors} people arrived from your growing SEO library.`;
  }

  const referralRate = referralRateOf(next);
  if (referralRate > 0 && next.customers > 0 && day % 10 === 0) {
    const generated = Math.max(
      1,
      Math.ceil((next.customers * referralRate) / 300),
    );
    next = routeCapturedLeads(next, generated);
    next.lastEvent = `${generated} warm ${generated === 1 ? "lead arrived" : "leads arrived"} through customer referrals—for free.`;
  }

  if (next.team.sdr > 0 && day % 5 === 0) {
    const generated = Math.max(
      1,
      Math.round(effectiveStaffOf(next, "sdr") * 25),
    );
    next = addLeads(next, generated);
    next.recentOutreachLeads += generated;
    next.outreachStarted = true;
    next.lastEvent = `${next.team.sdr} ${next.team.sdr === 1 ? "SDR added" : "SDRs added"} ${generated} outbound leads to the sales queue.`;
  }

  if (
    next.team.sales > 0 &&
    day % 3 === 0 &&
    next.product > 0 &&
    next.leads > 0
  ) {
    const before = next.customers;
    next = convertSalesLeads(
      next,
      Math.max(1, Math.round(effectiveStaffOf(next, "sales") * 30)),
    );
    const converted = next.customers - before;
    if (converted > 0) {
      next.lastEvent = `Sales onboarded ${converted} new ${converted === 1 ? "user" : "users"} at ${salesConversionRateOf(next)}% conversion.`;
    }
  }

  const campaignLeadsPerMonth = campaignLeadsPerMonthOf(next);
  const paidMediaStartDay =
    next.paidMediaStartDay === null ? day : next.paidMediaStartDay;
  if (
    campaignLeadsPerMonth > 0 &&
    day > paidMediaStartDay &&
    (day - paidMediaStartDay) % 30 === 0
  ) {
    const customersBefore = next.customers;
    next = routeCapturedLeads(next, campaignLeadsPerMonth);
    const converted = next.customers - customersBefore;
    next.lastEvent = next.selfServeCheckout
      ? `Paid campaigns delivered ${campaignLeadsPerMonth} leads this month; ${converted} subscribed through self-serve.`
      : `Paid campaigns delivered ${campaignLeadsPerMonth} leads to Sales this month.`;
  }

  const issueInterval = next.helpDocs ? 12 : 8;
  if (next.customers > 0 && day % issueInterval === 0) {
    const qualityRisk = Math.max(0.15, (100 - next.product) / 100);
    const prevention = clamp(engineerCapacity * 0.12, 0, 0.7);
    const newIssues = Math.max(
      1,
      Math.floor(next.customers * qualityRisk * 0.2 * (1 - prevention)),
    );
    next.issues += newIssues;
    next.recentIssues += newIssues;
    next.lastEvent = `${newIssues} ${newIssues === 1 ? "user needs" : "users need"} help.`;
  }

  if (next.team.support > 0 && next.issues > 0) {
    const capacity = Math.max(
      1,
      Math.round(effectiveStaffOf(next, "support") * 12),
    );
    const resolved = Math.min(
      next.issues,
      Math.max(
        1,
        Math.round(
          capacity * (supportResolutionRateOf(next) / 100),
        ),
      ),
    );
    next.issues -= resolved;
    next.recentResolved += resolved;
    if (day % 4 === 0) {
      next.reputation = clamp(next.reputation + 1, 0, 100);
    }
  }

  const issuePressure = next.customers > 0 ? next.issues / next.customers : 0;
  if (issuePressure >= 0.75 && day % 10 === 0) {
    const churned = Math.min(next.customers, 1);
    next.customers -= churned;
    next.issues = Math.max(0, next.issues - churned);
    next.lostUsers += churned;
    next.recentDepartures += churned;
    next.reputation = clamp(next.reputation - churned * 2, 0, 100);
    next.lastEvent = `${churned} frustrated ${churned === 1 ? "user churned" : "users churned"}. Support became the bottleneck.`;
  }

  if (next.cash < 0 && day % 7 === 0) {
    next.reputation = clamp(next.reputation - 2, 0, 100);
    next.lastEvent = "The bank balance is negative. Payroll is now putting the company at risk.";
  }

  if (next.activity) {
    const elapsedDays = next.activity.elapsedDays + 1;
    if (elapsedDays >= next.activity.totalDays) {
      next = applyCompletedAction(next, next.activity.actionId);
    } else {
      next.activity = { ...next.activity, elapsedDays };
    }
  }

  if (referralRateOf(current) === 0 && referralRateOf(next) > 0) {
    next.lastEvent = `Referrals unlocked. Customers now recommend the product at a ${referralRateOf(next)}% rate.`;
  }

  if (
    payrollCharge > 0 &&
    next.lastEvent === current.lastEvent
  ) {
    next.lastEvent = `${formatMoney(payrollCharge)} payroll paid on the 25th.`;
  }

  if (day % 30 === 0) {
    const metric = monthlyMetricOf(next);
    const previousMetrics = next.monthlyMetrics.filter(
      (existingMetric) => existingMetric.month !== metric.month,
    );
    next.monthlyMetrics = [...previousMetrics, metric].slice(-24);
  }

  return next;
};

const FinancialModelGraph = ({
  metrics,
  current,
}: {
  metrics: MonthlyMetric[];
  current: MonthlyMetric;
}) => {
  const completed = metrics.filter((metric) => metric.month !== current.month);
  const series = [...completed, current].slice(-12);
  const width = 760;
  const height = 210;
  const padding = { left: 52, right: 18, top: 18, bottom: 34 };
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;
  const maxValue = Math.max(
    100,
    ...series.flatMap((metric) => [metric.revenue, metric.cashBurn]),
  );
  const xFor = (index: number) =>
    padding.left +
    (series.length === 1 ? plotWidth / 2 : (index / (series.length - 1)) * plotWidth);
  const yFor = (value: number) =>
    padding.top + plotHeight - (value / maxValue) * plotHeight;
  const pointsFor = (key: "revenue" | "cashBurn") =>
    series
      .map((metric, index) => `${xFor(index)},${yFor(metric[key])}`)
      .join(" ");

  return (
    <div className="rounded-3xl border border-[#dde6d9] bg-white p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-[#789080]">
            financial model
          </p>
          <h2 className="mt-1 text-lg font-semibold">Revenue vs cash burn</h2>
          <p className="mt-1 text-xs text-[#688071]">
            Month-end snapshots · current month updates live
          </p>
        </div>
        <div className="flex gap-4 text-xs">
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-[#4f9b59]" />
            Revenue {formatCompactMoney(current.revenue)}
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-[#d1874f]" />
            Burn {formatCompactMoney(current.cashBurn)}
          </span>
        </div>
      </div>

      <svg
        className="mt-4 h-auto w-full overflow-visible"
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label="Monthly revenue and cash burn graph"
      >
        {[0, 0.5, 1].map((ratio) => {
          const y = padding.top + plotHeight * ratio;
          const value = maxValue * (1 - ratio);
          return (
            <g key={ratio}>
              <line
                x1={padding.left}
                x2={width - padding.right}
                y1={y}
                y2={y}
                stroke="#dfe7da"
                strokeDasharray="4 5"
              />
              <text
                x={padding.left - 8}
                y={y + 4}
                textAnchor="end"
                className="fill-[#789080] text-[10px]"
              >
                {formatCompactMoney(value)}
              </text>
            </g>
          );
        })}

        <polyline
          points={pointsFor("cashBurn")}
          fill="none"
          stroke="#d1874f"
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <polyline
          points={pointsFor("revenue")}
          fill="none"
          stroke="#4f9b59"
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {series.map((metric, index) => (
          <g key={`${metric.month}-${metric.day}`}>
            <circle
              cx={xFor(index)}
              cy={yFor(metric.cashBurn)}
              r="4"
              fill="#fffdf7"
              stroke="#d1874f"
              strokeWidth="3"
            >
              <title>
                Month {metric.month} burn: {formatMoney(metric.cashBurn)}
              </title>
            </circle>
            <circle
              cx={xFor(index)}
              cy={yFor(metric.revenue)}
              r="4"
              fill="#fffdf7"
              stroke="#4f9b59"
              strokeWidth="3"
            >
              <title>
                Month {metric.month} revenue: {formatMoney(metric.revenue)}
              </title>
            </circle>
            <text
              x={xFor(index)}
              y={height - 10}
              textAnchor="middle"
              className="fill-[#789080] text-[10px]"
            >
              M{metric.month}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
};

const StartupSimulator = () => {
  const [game, setGame] = useState<GameState>(initialGame);
  const [isSaveHydrated, setIsSaveHydrated] = useState(false);
  const [selectedStationId, setSelectedStationId] = useState<StationId | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<SelectedNodeId | null>(
    null,
  );
  const [highlightedActionIndex, setHighlightedActionIndex] = useState(0);
  const [actionNavigationActive, setActionNavigationActive] = useState(false);
  const [actionPanelExpanded, setActionPanelExpanded] = useState(false);
  const [dismissedStationId, setDismissedStationId] = useState<StationId | null>(null);
  const [retiredActionIds, setRetiredActionIds] = useState<ActionId[]>([]);
  const [showStats, setShowStats] = useState(false);
  const [showBankruptcySummary, setShowBankruptcySummary] = useState(true);
  const [paused, setPaused] = useState(false);
  const [worldZoom, setWorldZoom] = useState(1);
  const [isDraggingWorld, setIsDraggingWorld] = useState(false);
  const [isFounderMoving, setIsFounderMoving] = useState(false);
  const [founderFacing, setFounderFacing] = useState<1 | -1>(1);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [audioUnlocked, setAudioUnlocked] = useState(false);
  const [toasts, setToasts] = useState<GameToast[]>([]);
  const [worldWalkers, setWorldWalkers] = useState<WorldWalker[]>([]);
  const [exitIntent, setExitIntent] = useState<ExitIntent | null>(null);
  const [isNarrowViewport, setIsNarrowViewport] = useState(false);
  const [showHowToPlay, setShowHowToPlay] = useState(false);
  const previousGameRef = useRef(initialGame);
  const audioContextRef = useRef<AudioContext | null>(null);
  const ambientMusicTimerRef = useRef<number | null>(null);
  const toastIdRef = useRef(0);
  const walkerIdRef = useRef(0);
  const toastTimersRef = useRef<number[]>([]);
  const walkerTimersRef = useRef<number[]>([]);
  const founderMoveTimerRef = useRef<number | null>(null);
  const actionButtonRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const allowBrowserExitRef = useRef(false);
  const pausedBeforeStatsRef = useRef(false);
  const pausedBeforeHelpRef = useRef(false);
  const latestGameRef = useRef(initialGame);
  const previousPlayerRef = useRef(initialGame.player);
  const worldZoomRef = useRef(1);
  const activePointersRef = useRef<Map<number, { x: number; y: number }>>(
    new Map(),
  );
  const pinchRef = useRef<{
    initialDistance: number;
    initialZoom: number;
  } | null>(null);
  const worldDragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    playerX: number;
    playerY: number;
    moved: boolean;
  } | null>(null);
  const suppressWorldClickRef = useRef(false);

  useEffect(() => {
    const saved = readSavedStartupGame();
    if (saved) {
      latestGameRef.current = saved.game;
      previousGameRef.current = saved.game;
      previousPlayerRef.current = saved.game.player;
      setGame(saved.game);
      captureStartupEvent("startup_game_opened", { has_saved_game: true });
      captureStartupEvent("startup_game_resumed", {
        saved_age_seconds: Math.max(0, Math.round((Date.now() - saved.savedAt) / 1000)),
        day: saved.game.day,
      });
    } else {
      captureStartupEvent("startup_game_opened", { has_saved_game: false });
    }
    setIsSaveHydrated(true);
  }, []);

  useEffect(() => {
    const media = window.matchMedia(`(max-width: ${NARROW_VIEWPORT_PX - 1}px)`);
    const syncViewport = () => {
      const narrow = media.matches;
      setIsNarrowViewport(narrow);
      setWorldZoom((current) => {
        if (narrow && Math.abs(current - 1) < 0.001) return MOBILE_WORLD_ZOOM;
        if (!narrow && Math.abs(current - MOBILE_WORLD_ZOOM) < 0.001) return 1;
        return current;
      });
    };
    syncViewport();
    media.addEventListener("change", syncViewport);
    return () => media.removeEventListener("change", syncViewport);
  }, []);

  useEffect(() => {
    if (!isSaveHydrated || hasSeenStartupHelp()) return;
    pausedBeforeHelpRef.current = false;
    setPaused(true);
    setShowHowToPlay(true);
  }, [isSaveHydrated]);

  useEffect(() => {
    latestGameRef.current = game;
  }, [game]);

  useEffect(() => {
    worldZoomRef.current = worldZoom;
  }, [worldZoom]);

  useEffect(() => {
    if (!isSaveHydrated) return;

    const persist = () => saveStartupGame(latestGameRef.current);
    const interval = window.setInterval(persist, 5000);
    window.addEventListener("pagehide", persist);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener("pagehide", persist);
    };
  }, [isSaveHydrated]);

  useEffect(() => {
    setGame((current) => normalizeGameState(current));
  }, []);

  useEffect(() => {
    const guardState = { ...window.history.state, startupExitGuard: true };
    if (!window.history.state?.startupExitGuard) {
      window.history.pushState(guardState, "", window.location.href);
    }

    const interceptBrowserBack = () => {
      if (allowBrowserExitRef.current) return;
      window.history.pushState(guardState, "", window.location.href);
      setExitIntent("history");
    };

    window.addEventListener("popstate", interceptBrowserBack);
    return () => window.removeEventListener("popstate", interceptBrowserBack);
  }, []);

  const worldSpan = isNarrowViewport ? MOBILE_WORLD_SPAN : DESKTOP_WORLD_SPAN;
  const selectedStation = selectedStationId ? getStation(selectedStationId) : null;
  const selectedActions = useMemo(
    () => {
      if (!selectedStationId) return [];

      const availableActions = actionConfigs[selectedStationId].filter(
        (action) => {
          if (retiredActionIds.includes(action.id)) return false;
          if (action.id === "buildLandingPage") return !game.landingPage;
          if (action.id === "improveLandingPage") return game.landingPage;
          if (
            action.id === "improveProduct" ||
            action.id === "expandCapacity" ||
            action.id === "fixBugs"
          ) {
            return game.product > 0;
          }
          if (action.id === "buildSelfServeCheckout") {
            return !game.selfServeCheckout;
          }
          if (action.id === "improveSelfServeCheckout") {
            return game.selfServeCheckout;
          }
          if (action.id === "launchCampaign") {
            return finiteNumber(game.paidMediaBudget, 0) <= 0;
          }
          if (action.id === "increasePaidMediaBudget") {
            return finiteNumber(game.paidMediaBudget, 0) > 0;
          }
          if (
            action.id === "optimizePaidMedia" ||
            action.id === "hireMarketer"
          ) {
            return finiteNumber(game.paidMediaBudget, 0) > 0;
          }
          return true;
        },
      );
      const focusedActionIds = selectedNodeId
        ? nodeActionIds[selectedNodeId]
        : undefined;
      if (!focusedActionIds?.length) return availableActions;

      return [
        ...focusedActionIds.flatMap((actionId) =>
          availableActions.filter((action) => action.id === actionId),
        ),
        ...availableActions.filter(
          (action) => !focusedActionIds.includes(action.id),
        ),
      ];
    },
    [
      game.landingPage,
      game.paidMediaBudget,
      game.product,
      game.selfServeCheckout,
      retiredActionIds,
      selectedNodeId,
      selectedStationId,
    ],
  );
  const isAtSelectedStation =
    selectedStation !== null &&
    (selectedStation.id === "marketing"
      ? visibleMarketingPlotPositions(game).some(
          (plot) =>
            Math.abs(game.player.x - plot.x) < 15 &&
            Math.abs(game.player.y - plot.y) < 15,
        )
      : selectedStation.id === "sales"
        ? visibleSalesPlotPositions(game).some(
            (plot) =>
              Math.abs(game.player.x - plot.x) < 15 &&
              Math.abs(game.player.y - plot.y) < 15,
          )
      : Math.abs(game.player.x - selectedStation.x) < 15 &&
        Math.abs(game.player.y - selectedStation.y) < 15);

  const progressPercent = game.activity
    ? Math.round((game.activity.elapsedDays / game.activity.totalDays) * 100)
    : 0;
  const safeCash = finiteNumber(game.cash, 0);
  const safeOwnership = finiteNumber(game.ownership, 100);
  const payroll = payrollPerDay(game);
  const revenue = revenuePerDay(game);
  const debtPayment = Math.min(
    finiteNumber(game.debt, 0),
    finiteNumber(game.debtPaymentPerDay, 0),
  );
  const paidMediaSpend = finiteNumber(game.paidMediaBudget, 0) / 30;
  const dailyBurn = Math.max(
    0,
    payroll + debtPayment + paidMediaSpend - revenue,
  );
  const runwayDays = dailyBurn > 0 ? Math.floor(Math.max(0, safeCash) / dailyBurn) : null;
  const runwayIsNotMeaningful = safeCash <= 0 && dailyBurn === 0;
  const runwayDial = runwayIsNotMeaningful
    ? 50
    : runwayDays === null
      ? 100
      : clamp((runwayDays / 90) * 100, 0, 100);
  const runwayLabel = runwayIsNotMeaningful ? "—" : runwayDays === null ? "∞" : `${runwayDays}d`;
  const runwayTooltip = runwayIsNotMeaningful
    ? "Runway starts once the startup has cash or operating costs"
    : runwayDays === null
      ? "The startup is not currently burning cash"
      : `${runwayDays} days until the startup runs out of cash`;
  const companyValue = companyValueOf(game);
  const equityValue = companyValue * (safeOwnership / 100);
  const ownershipPercent = Number(safeOwnership.toFixed(1));
  const safeDay = finiteNumber(game.day, 1);
  const startupYear = Math.floor((safeDay - 1) / 365) + 1;
  const dayOfYear = ((safeDay - 1) % 365) + 1;
  const teamSize = Object.values(game.team).reduce((sum, count) => sum + count, 0);
  const productStage = game.product >= 70 ? 3 : game.product >= 45 ? 2 : 1;
  const productStageLabel = productStage === 3 ? "loved product" : productStage === 2 ? "growing product" : "MVP";
  const churnRisk = game.product >= 70 ? "low" : game.product >= 45 ? "medium" : "high";
  const monthlyChurnRate = monthlyChurnRateOf(game);
  const referralRate = referralRateOf(game);
  const fundingStatus = [
    "pre-seed available",
    "seed unlocks at 10 subscribers",
    "Series A unlocks at 100",
    "Series B unlocks at 1,000",
    "Series C unlocks at 10,000",
    "late-stage funded",
  ][game.fundingStage];
  const settledCustomers = Math.max(
    0,
    game.customers - game.issues - game.recentArrivals,
  );
  const visibleCustomers = Array.from(
    { length: Math.min(settledCustomers, 8) },
    (_, index) => index,
  );
  const visibleCash = Array.from(
    {
      length:
        game.uncollectedCash > 0
          ? Math.min(12, Math.max(1, Math.ceil(game.uncollectedCash / 24)))
          : 0,
    },
    (_, index) => index,
  );
  const visibleLeads = useMemo(
    () =>
      (
        game.leadPatience ??
        Array.from({ length: game.leads }, () => 20)
      )
        .slice(0, 8)
        .map((patience, index) => ({ index, patience })),
    [game.leadPatience, game.leads],
  );
  const visibleIssues = useMemo(
    () => Array.from({ length: Math.min(game.issues, 8) }, (_, index) => index),
    [game.issues],
  );
  const followerCount =
    game.attention * 12 +
    (game.evergreenContent ?? 0) * 40 +
    (game.seoArticles ?? 0) * 25;
  const creatorAssetsPerMonth = Math.round(
    effectiveStaffOf(game, "creator") * 2 * 3,
  );
  const writerArticlesPerMonth = Math.round(
    effectiveStaffOf(game, "writer") * 2 * 2.5,
  );
  const sdrLeadsPerMonth = Math.round(
    effectiveStaffOf(game, "sdr") * 25 * 6,
  );
  const salesCustomersPerMonth = Math.round(
    effectiveStaffOf(game, "sales") *
      30 *
      10 *
      (salesConversionRateOf(game) / 100),
  );
  const supportTicketsPerMonth = Math.round(
    effectiveStaffOf(game, "support") *
      12 *
      30 *
      (supportResolutionRateOf(game) / 100),
  );
  const engineerQualityPerMonth = Math.round(
    effectiveStaffOf(game, "engineer") * 6 * (30 / 7),
  );
  const rampSuffix = (role: StaffRole) => {
    const ramp = staffRampPercentOf(game, role);
    return ramp > 0 && ramp < 100 ? ` · ${ramp}% ramp` : "";
  };
  const marketingChannels = [
    {
      id: "social",
      emoji: "📱",
      label: "Social",
      x: 24,
      y: 58,
      unlocked:
        game.attention > 0 ||
        game.socialMomentum > 0 ||
        game.leads > 0 ||
        game.customers > 0,
      strength: Math.max(
        1,
        Math.ceil((game.attention + game.socialMomentum) / 30),
      ),
      detail: `${followerCount.toLocaleString()} followers · ${game.socialMomentum}% reach`,
    },
    {
      id: "video",
      emoji: "🎥",
      label: "Video",
      x: 15,
      y: 38,
      unlocked:
        (game.evergreenContent ?? 0) > 0 || contentCreatorCountOf(game) > 0,
      strength: (game.evergreenContent ?? 0) + contentCreatorCountOf(game),
      detail:
        contentCreatorCountOf(game) > 0
          ? `${game.evergreenContent ?? 0} assets · ~${creatorAssetsPerMonth}/mo · ${formatCompactMoney(staffPayrollPerMonth(game, "creator"))}/mo${rampSuffix("creator")}`
          : `${game.evergreenContent ?? 0} evergreen`,
    },
    {
      id: "seo",
      emoji: "🔎",
      label: "Search",
      x: 15,
      y: 78,
      unlocked: (game.seoArticles ?? 0) > 0 || blogWriterCountOf(game) > 0,
      strength: (game.seoArticles ?? 0) + blogWriterCountOf(game),
      detail:
        blogWriterCountOf(game) > 0
          ? `${game.seoArticles ?? 0} articles · ~${writerArticlesPerMonth}/mo · ${formatCompactMoney(staffPayrollPerMonth(game, "writer"))}/mo${rampSuffix("writer")}`
          : `${game.seoArticles ?? 0} articles`,
    },
    {
      id: "referrals",
      emoji: "🗣️",
      label: "Referrals",
      x: 33,
      y: 38,
      unlocked: referralRate > 0,
      strength: Math.max(1, Math.ceil(referralRate / 5)),
      detail: `${referralRate}% referral rate`,
    },
    {
      id: "landing",
      emoji: "🪧",
      label: "Landing",
      x: 42,
      y: 58,
      unlocked: game.landingPage,
      strength: landingPageLevelOf(game),
      detail: `${landingConversionRateOf(game)}% visitor → lead`,
    },
    {
      id: "paid",
      emoji: "📮",
      label: "Paid media",
      x: 30,
      y: 78,
      unlocked: finiteNumber(game.paidMediaBudget, 0) > 0,
      strength: Math.max(
        1,
        Math.ceil(finiteNumber(game.paidMediaBudget, 0) / 1000) +
          Math.floor(finiteNumber(game.paidMediaOptimization, 0) / 3) +
          performanceMarketerCountOf(game),
      ),
      detail: `${formatMoney(game.paidMediaBudget)}/mo media · ${campaignLeadsPerMonthOf(game)} leads/mo · opt L${game.paidMediaOptimization}${
        performanceMarketerCountOf(game) > 0
          ? ` · ${performanceMarketerCountOf(game)} perf · ${formatCompactMoney(staffPayrollPerMonth(game, "marketer"))}/mo${rampSuffix("marketer")}`
          : paidMediaLearningMonthOf(game) <= 3
            ? ` · learning ${paidMediaLearningMonthOf(game)}/3`
            : ""
      }`,
    },
  ];
  const activeMarketingSources = marketingChannels.filter(
    (channel) => channel.unlocked && channel.id !== "landing",
  );
  const visibleMarketingChannels = marketingChannels.filter(
    (channel) => channel.id === "social" || channel.unlocked,
  );
  const salesExpansionPlots = [
    {
      id: "outreach",
      label: "Outreach",
      x: 45,
      y: 76,
      visible: game.outreachStarted || game.team.sdr > 0,
      people: game.team.sdr,
      detail:
        game.team.sdr > 0
          ? `~${sdrLeadsPerMonth} leads/mo · ${formatCompactMoney(staffPayrollPerMonth(game, "sdr"))}/mo${rampSuffix("sdr")}`
          : "founder operated",
    },
    {
      id: "selfserve",
      label: "Self-serve",
      x: 57,
      y: 40,
      visible: game.selfServeCheckout,
      people: 0,
      detail: `${selfServeConversionRateOf(game)}% direct conversion`,
    },
  ].filter((plot) => plot.visible);
  const marketingFieldBounds = {
    left: Math.max(
      7,
      Math.min(...visibleMarketingChannels.map((channel) => channel.x)) - 7,
    ),
    top: Math.max(
      12,
      Math.min(...visibleMarketingChannels.map((channel) => channel.y)) - 9,
    ),
    right: Math.min(
      48,
      Math.max(...visibleMarketingChannels.map((channel) => channel.x)) + 7,
    ),
    bottom: Math.min(
      86,
      Math.max(...visibleMarketingChannels.map((channel) => channel.y)) + 9,
    ),
  };
  const visibleCapitalStations = stations.filter(
    (station) =>
      capitalStationIds.includes(station.id) &&
      isStationVisible(game, station.id),
  );
  const capitalDistrictBounds = {
    left: Math.max(
      48,
      Math.min(...visibleCapitalStations.map((station) => station.x)) - 9,
    ),
    top: Math.max(
      65,
      Math.min(...visibleCapitalStations.map((station) => station.y)) - 10,
    ),
    right: Math.min(
      100,
      Math.max(...visibleCapitalStations.map((station) => station.x)) + 9,
    ),
    bottom: Math.min(
      110,
      Math.max(...visibleCapitalStations.map((station) => station.y)) + 10,
    ),
  };

  useEffect(() => {
    const unlockAudio = () => {
      if (!audioContextRef.current) {
        audioContextRef.current = new AudioContext();
      }
      if (audioContextRef.current.state === "suspended") {
        void audioContextRef.current.resume();
      }
      setAudioUnlocked(true);
    };

    window.addEventListener("pointerdown", unlockAudio, { once: true });
    window.addEventListener("keydown", unlockAudio, { once: true });

    return () => {
      window.removeEventListener("pointerdown", unlockAudio);
      window.removeEventListener("keydown", unlockAudio);
    };
  }, []);

  useEffect(
    () => () => {
      toastTimersRef.current.forEach((timer) => window.clearTimeout(timer));
      walkerTimersRef.current.forEach((timer) => window.clearTimeout(timer));
      if (ambientMusicTimerRef.current !== null) {
        window.clearInterval(ambientMusicTimerRef.current);
      }
      if (founderMoveTimerRef.current !== null) {
        window.clearTimeout(founderMoveTimerRef.current);
      }
    },
    [],
  );

  useEffect(() => {
    if (!audioUnlocked || !soundEnabled || !audioContextRef.current) return;

    const audioContext = audioContextRef.current;
    const activeNodes = new Set<OscillatorNode>();
    const playLoop = () => {
      playAmbientMusicLoop(audioContext).forEach((node) => {
        activeNodes.add(node);
        node.addEventListener("ended", () => activeNodes.delete(node), {
          once: true,
        });
      });
    };

    playLoop();
    const timer = window.setInterval(playLoop, ambientMusicLoopDurationMs);
    ambientMusicTimerRef.current = timer;

    return () => {
      window.clearInterval(timer);
      if (ambientMusicTimerRef.current === timer) {
        ambientMusicTimerRef.current = null;
      }
      activeNodes.forEach((node) => {
        try {
          node.stop();
        } catch {
          // The node may already have finished its scheduled note.
        }
      });
      activeNodes.clear();
    };
  }, [audioUnlocked, soundEnabled]);

  useEffect(() => {
    const previous = previousPlayerRef.current;
    if (previous.x === game.player.x && previous.y === game.player.y) return;

    if (game.player.x !== previous.x) {
      setFounderFacing(game.player.x > previous.x ? 1 : -1);
    }
    previousPlayerRef.current = {
      x: game.player.x,
      y: game.player.y,
    };
    setIsFounderMoving(true);

    if (founderMoveTimerRef.current !== null) {
      window.clearTimeout(founderMoveTimerRef.current);
    }
    founderMoveTimerRef.current = window.setTimeout(() => {
      setIsFounderMoving(false);
      founderMoveTimerRef.current = null;
    }, 620);
  }, [game.player.x, game.player.y]);

  useEffect(() => {
    const previous = previousGameRef.current;
    const previousTeamSize = Object.values(previous.team).reduce(
      (sum, count) => sum + count,
      0,
    );
    const message = game.lastEvent;
    const normalizedMessage = message.toLowerCase();
    const cashGain = game.cash - previous.cash;
    const collectedCash = normalizedMessage.includes("collected from the product");
    const gainedCustomers = game.customers > previous.customers;
    const gainedTeamMember = teamSize > previousTeamSize;
    const lostCustomer = game.customers < previous.customers ||
      normalizedMessage.includes("churned") ||
      normalizedMessage.includes("left");
    const gainedIssues = game.issues > previous.issues;
    const startedAction = game.activity !== null && previous.activity === null;
    const completedAction = game.activity === null && previous.activity !== null;
    const meaningfulChange =
      game.lastEvent !== previous.lastEvent ||
      game.customers !== previous.customers ||
      game.leads !== previous.leads ||
      game.issues !== previous.issues ||
      teamSize !== previousTeamSize ||
      Math.abs(cashGain) >= 100;

    if (startedAction && game.activity) {
      captureStartupEvent("startup_game_action_started", {
        action_id: game.activity.actionId,
        station_id: game.activity.stationId,
        day: game.day,
        is_first_action: !previous.started,
      });
      if (!previous.started) {
        captureStartupEvent("startup_game_started", {
          action_id: game.activity.actionId,
          station_id: game.activity.stationId,
        });
      }
    }

    if (completedAction && previous.activity) {
      captureStartupEvent("startup_game_action_completed", {
        action_id: previous.activity.actionId,
        station_id: previous.activity.stationId,
        day: game.day,
      });
    }

    if (game.bankrupt && !previous.bankrupt) {
      setShowBankruptcySummary(true);
      setShowStats(false);
      captureStartupEvent("startup_game_ended", {
        outcome: "bankrupt",
        day: game.day,
        customers: game.customers,
      });
    } else if (game.outcome && !previous.outcome) {
      captureStartupEvent("startup_game_ended", {
        outcome: game.outcome,
        day: game.day,
        customers: game.customers,
      });
    }

    previousGameRef.current = game;
    if (!meaningfulChange) return;

    let icon = "✨";
    let title = "Something happened";

    if (cashGain >= 100) {
      icon = "🪙";
      title = `+${formatMoney(cashGain)}`;
    } else if (gainedCustomers) {
      icon = "🎉";
      title =
        game.customers - previous.customers === 1
          ? "New subscriber!"
          : `${game.customers - previous.customers} new subscribers!`;
    } else if (gainedTeamMember || normalizedMessage.includes("hired")) {
      icon = "👋";
      title = "The team grew";
    } else if (lostCustomer) {
      icon = "💨";
      title = "Someone left";
    } else if (game.leads > previous.leads) {
      icon = "🙋";
      title = "New people arrived";
    } else if (game.issues > previous.issues) {
      icon = "🛟";
      title = "Users need help";
    } else if (startedAction) {
      icon = "⚡";
      title = "Work started";
    }

    if (eventToastsEnabled) {
      const id = ++toastIdRef.current;
      setToasts((current) => [...current.slice(-2), { id, icon, title, message }]);

      const timer = window.setTimeout(() => {
        setToasts((current) => current.filter((toast) => toast.id !== id));
        toastTimersRef.current = toastTimersRef.current.filter(
          (activeTimer) => activeTimer !== timer,
        );
      }, 3800);
      toastTimersRef.current.push(timer);
    }

    if (soundEnabled && audioContextRef.current) {
      const sound = collectedCash
        ? "coin"
        : lostCustomer || game.bankrupt
          ? "fail"
          : gainedIssues
            ? "alert"
            : gainedCustomers || completedAction
              ? "success"
              : startedAction
                ? "start"
                : cashGain > 0
                  ? "cash"
                  : null;
      if (sound) playGameSound(audioContextRef.current, sound);
    }
  }, [
    game,
    teamSize,
    soundEnabled,
  ]);

  useEffect(() => {
    if (!game.started || paused || game.bankrupt || game.outcome) return;

    const timer = window.setInterval(() => {
      setGame((current) => advanceGame(current));
    }, 1500);

    return () => window.clearInterval(timer);
  }, [game.started, paused, game.bankrupt, game.outcome]);

  useEffect(() => {
    if (
      game.uncollectedCash <= 0 ||
      Math.abs(game.player.x - cashPilePosition.x) >= 7 ||
      Math.abs(game.player.y - cashPilePosition.y) >= 7
    ) {
      return;
    }

    setGame((current) => {
      if (current.uncollectedCash <= 0) return current;
      const collected = current.uncollectedCash;
      return {
        ...current,
        cash: current.cash + collected,
        uncollectedCash: 0,
        lastEvent: `${formatMoney(collected)} collected from the product.`,
      };
    });
  }, [game.player.x, game.player.y, game.uncollectedCash]);

  useEffect(() => {
    const walkers: WorldWalker[] = [];
    const addWalker = ({
      emoji,
      startX,
      startY,
      endX,
      endY,
      quarterX,
      quarterY,
      midX,
      midY,
      threeQuarterX,
      threeQuarterY,
      durationMs,
      delayMs,
    }: {
      emoji: string;
      startX: number;
      startY: number;
      endX: number;
      endY: number;
      quarterX: number;
      quarterY: number;
      midX: number;
      midY: number;
      threeQuarterX: number;
      threeQuarterY: number;
      durationMs: number;
      delayMs: number;
    }) => {
      walkers.push({
        id: ++walkerIdRef.current,
        emoji,
        startX,
        startY,
        walkX: (endX - startX) * worldSpan,
        walkY: (endY - startY) * worldSpan,
        quarterX: (quarterX - startX) * worldSpan,
        quarterY: (quarterY - startY) * worldSpan,
        midX: (midX - startX) * worldSpan,
        midY: (midY - startY) * worldSpan,
        threeQuarterX: (threeQuarterX - startX) * worldSpan,
        threeQuarterY: (threeQuarterY - startY) * worldSpan,
        durationMs,
        delayMs,
      });
    };

    if (game.recentLeads > 0) {
      const sources = [
        { x: 24, y: 58 },
        ...((game.evergreenContent ?? 0) > 0 || (game.contentCreators ?? 0) > 0
          ? [{ x: 15, y: 38 }]
          : []),
        ...((game.seoArticles ?? 0) > 0 || (game.blogWriters ?? 0) > 0
          ? [{ x: 15, y: 78 }]
          : []),
        ...(referralRate > 0 ? [{ x: 33, y: 38 }] : []),
        ...(finiteNumber(game.paidMediaBudget, 0) > 0
          ? [{ x: 30, y: 78 }]
          : []),
        ...(game.recentOutreachLeads > 0
          ? [{ x: 45, y: 76 }]
          : []),
      ];

      Array.from({ length: Math.min(game.recentLeads, 6) }, (_, index) => {
        const source = sources[(game.day + index) % sources.length];
        const isSocialSource = source.x === 24 && source.y === 58;
        const isCampaignSource = source.x === 30 && source.y === 78;
        const isReferralSource = source.x === 33 && source.y === 38;
        const isOutreachSource = source.x === 45 && source.y === 76;
        const startX = isCampaignSource
          ? 30
          : isReferralSource
            ? 33
            : isOutreachSource
              ? 45
            : source.x + 4.2;
        const startY =
          (isCampaignSource
            ? 73.8
            : isReferralSource
              ? 42.2
              : isOutreachSource
                ? 71.8
              : source.y) +
          (index % 2) * 1.2;
        addWalker({
          emoji: index % 2 === 0 ? "🧑" : "👩",
          startX,
          startY,
          endX: 50.5,
          endY: 58,
          quarterX: isSocialSource
            ? 33
            : isCampaignSource
              ? 28.2
              : isReferralSource
                ? 31
                : isOutreachSource
                  ? 46
                : 19.8,
          quarterY: isReferralSource ? 48 : isOutreachSource ? 67 : 58,
          midX: isSocialSource
            ? game.landingPage
              ? 42
              : 37
            : isReferralSource
              ? 28.2
              : isOutreachSource
                ? 48
              : 24,
          midY: isOutreachSource ? 63 : 58,
          threeQuarterX: isSocialSource
            ? game.landingPage
              ? 46
              : 44
            : game.landingPage
              ? 42
              : 44,
          threeQuarterY: 58,
          durationMs: game.landingPage ? 4800 : 4100,
          delayMs: index * 180,
        });
      });
    }

    const assistedArrivals = Math.max(
      0,
      game.recentArrivals - game.recentSelfServeArrivals,
    );
    Array.from({ length: Math.min(assistedArrivals, 6) }, (_, index) => {
      addWalker({
        emoji: index % 2 === 0 ? "🧑" : "👩",
        startX: 58.2,
        startY: 58 + (index % 2) * 1.2,
        endX: 64.5,
        endY: 58,
        quarterX: 59.8,
        quarterY: 57.5,
        midX: 61.3,
        midY: 57,
        threeQuarterX: 63,
        threeQuarterY: 57.5,
        durationMs: 3200,
        delayMs: index * 180,
      });
    });

    Array.from(
      { length: Math.min(game.recentSelfServeArrivals, 6) },
      (_, index) => {
        addWalker({
          emoji: index % 2 === 0 ? "🧑" : "👩",
          startX: 60.5,
          startY: 40 + (index % 2) * 1.2,
          endX: 67,
          endY: 53.5,
          quarterX: 63,
          quarterY: 41.5,
          midX: 65,
          midY: 45,
          threeQuarterX: 66.5,
          threeQuarterY: 49,
          durationMs: 3800,
          delayMs: index * 180,
        });
      },
    );

    Array.from({ length: Math.min(game.recentIssues, 6) }, (_, index) => {
      addWalker({
        emoji: "🙋",
        startX: 72.2,
        startY: 58 + (index % 2) * 1.2,
        endX: 79.2,
        endY: 58,
        quarterX: 74,
        quarterY: 57.5,
        midX: 75.7,
        midY: 57,
        threeQuarterX: 77.5,
        threeQuarterY: 57.5,
        durationMs: 3600,
        delayMs: index * 180,
      });
    });

    Array.from({ length: Math.min(game.recentResolved, 6) }, (_, index) => {
      addWalker({
        emoji: index % 2 === 0 ? "🧑" : "👩",
        startX: 79.2,
        startY: 58 + (index % 2) * 1.2,
        endX: 72.2,
        endY: 58,
        quarterX: 77.5,
        quarterY: 57.5,
        midX: 75.7,
        midY: 57,
        threeQuarterX: 74,
        threeQuarterY: 57.5,
        durationMs: 3600,
        delayMs: index * 180,
      });
    });

    if (walkers.length === 0) return;
    setWorldWalkers((current) => [...current.slice(-18), ...walkers]);
    walkers.forEach((walker) => {
      const timer = window.setTimeout(() => {
        setWorldWalkers((current) =>
          current.filter((activeWalker) => activeWalker.id !== walker.id),
        );
        walkerTimersRef.current = walkerTimersRef.current.filter(
          (activeTimer) => activeTimer !== timer,
        );
      }, walker.durationMs + walker.delayMs + 150);
      walkerTimersRef.current.push(timer);
    });
  }, [
    game.blogWriters,
    game.paidMediaBudget,
    game.contentCreators,
    game.day,
    game.evergreenContent,
    game.landingPage,
    game.outreachStarted,
    game.recentArrivals,
    game.recentIssues,
    game.recentLeads,
    game.recentOutreachLeads,
    game.recentResolved,
    game.recentSelfServeArrivals,
    game.seoArticles,
    game.team.sdr,
    referralRate,
    worldSpan,
  ]);

  useEffect(() => {
    if (game.product === 0 || retiredActionIds.includes("buildMvp")) return;

    const timer = window.setTimeout(() => {
      setRetiredActionIds((current) =>
        current.includes("buildMvp") ? current : [...current, "buildMvp"],
      );
      setHighlightedActionIndex(0);
    }, 650);

    return () => window.clearTimeout(timer);
  }, [game.product, retiredActionIds]);

  useEffect(() => {
    if (!actionNavigationActive) return;

    actionButtonRefs.current[highlightedActionIndex]?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
      inline: "center",
    });
  }, [actionNavigationActive, highlightedActionIndex]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (exitIntent) {
        if (event.key === "Escape") {
          event.preventDefault();
          setExitIntent(null);
        }
        return;
      }

      if (showHowToPlay) {
        if (event.key === "Escape") {
          event.preventDefault();
          markStartupHelpSeen();
          setShowHowToPlay(false);
          setPaused(pausedBeforeHelpRef.current);
        }
        return;
      }

      if (showStats) {
        if (event.key === "Escape") {
          event.preventDefault();
          setShowStats(false);
          setPaused(pausedBeforeStatsRef.current);
        }
        return;
      }

      if (selectedStationId && isAtSelectedStation && selectedActions.length > 0) {
        if (
          actionNavigationActive &&
          ["ArrowRight", "ArrowLeft", "ArrowDown", "ArrowUp"].includes(event.key)
        ) {
          event.preventDefault();
          const direction =
            event.key === "ArrowRight" || event.key === "ArrowDown" ? 1 : -1;
          setHighlightedActionIndex((current) =>
            (current + direction + selectedActions.length) % selectedActions.length,
          );
          return;
        }

        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          if (!actionNavigationActive) {
            setHighlightedActionIndex(0);
            setActionNavigationActive(true);
            setActionPanelExpanded(true);
            return;
          }

          const action = selectedActions[highlightedActionIndex];
          if (action) {
            setGame((current) => beginAction(current, selectedStationId, action));
            setActionNavigationActive(false);
            setActionPanelExpanded(false);
          }
          return;
        }

        if (event.key === "Escape") {
          event.preventDefault();
          if (actionPanelExpanded) {
            setActionPanelExpanded(false);
            setActionNavigationActive(false);
            return;
          }
          if (actionNavigationActive) {
            setActionNavigationActive(false);
            return;
          }
          setDismissedStationId(selectedStationId);
          setSelectedStationId(null);
          setSelectedNodeId(null);
          return;
        }
      }

      const directions: Record<string, { x: number; y: number }> = {
        ArrowUp: { x: 0, y: -6 },
        w: { x: 0, y: -6 },
        ArrowDown: { x: 0, y: 6 },
        s: { x: 0, y: 6 },
        ArrowLeft: { x: -6, y: 0 },
        a: { x: -6, y: 0 },
        ArrowRight: { x: 6, y: 0 },
        d: { x: 6, y: 0 },
      };
      const direction = directions[event.key];
      if (!direction) return;
      event.preventDefault();
      setSelectedNodeId(null);
      setGame((current) => ({
        ...current,
        player: {
          x: clamp(current.player.x + direction.x, 5, 95),
          y: clamp(current.player.y + direction.y, 8, 92),
        },
      }));
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [
    actionNavigationActive,
    actionPanelExpanded,
    highlightedActionIndex,
    isAtSelectedStation,
    exitIntent,
    selectedActions,
    selectedStationId,
    showHowToPlay,
    showStats,
  ]);

  useEffect(() => {
    const nearbyStation = [
      ...stations
        .filter(
          (station) =>
            station.id !== "marketing" &&
            isStationVisible(game, station.id),
        )
        .map((station) => ({
          id: station.id,
          x: station.x,
          y: station.y,
        })),
      ...visibleMarketingPlotPositions(game).map((plot) => ({
        id: "marketing" as const,
        x: plot.x,
        y: plot.y,
      })),
    ]
      .filter(
        (station) =>
          Math.abs(game.player.x - station.x) < 15 &&
          Math.abs(game.player.y - station.y) < 15,
      )
      .sort(
        (a, b) =>
          Math.hypot(game.player.x - a.x, game.player.y - a.y) -
          Math.hypot(game.player.x - b.x, game.player.y - b.y),
      )[0];

    if (!nearbyStation) {
      if (selectedStationId) {
        setSelectedStationId(null);
        setSelectedNodeId(null);
        setActionNavigationActive(false);
        setActionPanelExpanded(false);
      }
      if (dismissedStationId) setDismissedStationId(null);
      return;
    }

    if (dismissedStationId === nearbyStation.id) return;
    if (selectedStationId !== nearbyStation.id) {
      setSelectedStationId(nearbyStation.id);
      setHighlightedActionIndex(0);
      setActionNavigationActive(false);
      // Keep the compact strip on approach; expand is opt-in via the panel control.
      setActionPanelExpanded(false);
    }
  }, [dismissedStationId, game, selectedStationId]);

  const handleWorldClick = (event: MouseEvent<HTMLDivElement>) => {
    if (suppressWorldClickRef.current) {
      suppressWorldClickRef.current = false;
      return;
    }

    const bounds = event.currentTarget.getBoundingClientRect();
    const horizontalMove =
      ((event.clientX - bounds.left - bounds.width / 2) / bounds.width) *
      (100 / worldSpan);
    const verticalMove =
      ((event.clientY - bounds.top - bounds.height / 2) / bounds.height) *
      (100 / worldSpan);
    setSelectedNodeId(null);
    setGame((current) => ({
      ...current,
      player: {
        x: clamp(current.player.x + horizontalMove, 5, 95),
        y: clamp(current.player.y + verticalMove, 8, 92),
      },
    }));
  };

  const handleWorldPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (
      event.button !== 0 ||
      (event.target as HTMLElement).closest("button, a, aside, [role='dialog']")
    ) {
      return;
    }

    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    activePointersRef.current.set(event.pointerId, {
      x: event.clientX,
      y: event.clientY,
    });

    if (activePointersRef.current.size >= 2) {
      worldDragRef.current = null;
      setIsDraggingWorld(false);
      const points = [...activePointersRef.current.values()];
      const distance = Math.hypot(
        points[0].x - points[1].x,
        points[0].y - points[1].y,
      );
      pinchRef.current = {
        initialDistance: Math.max(distance, 1),
        initialZoom: worldZoomRef.current,
      };
      return;
    }

    worldDragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      playerX: game.player.x,
      playerY: game.player.y,
      moved: false,
    };
    setIsDraggingWorld(true);
  };

  const handleWorldPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (activePointersRef.current.has(event.pointerId)) {
      activePointersRef.current.set(event.pointerId, {
        x: event.clientX,
        y: event.clientY,
      });
    }

    if (pinchRef.current && activePointersRef.current.size >= 2) {
      const points = [...activePointersRef.current.values()];
      const distance = Math.hypot(
        points[0].x - points[1].x,
        points[0].y - points[1].y,
      );
      const nextZoom = clamp(
        pinchRef.current.initialZoom *
          (distance / pinchRef.current.initialDistance),
        0.6,
        1.45,
      );
      suppressWorldClickRef.current = true;
      setWorldZoom(nextZoom);
      return;
    }

    const drag = worldDragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;

    const deltaX = event.clientX - drag.startX;
    const deltaY = event.clientY - drag.startY;
    if (!drag.moved && Math.hypot(deltaX, deltaY) > 4) {
      drag.moved = true;
      setSelectedNodeId(null);
      setActionNavigationActive(false);
      setActionPanelExpanded(false);
    }
    if (!drag.moved) return;

    const bounds = event.currentTarget.getBoundingClientRect();
    const horizontalMove =
      (deltaX / bounds.width) * (100 / (worldSpan * worldZoom));
    const verticalMove =
      (deltaY / bounds.height) * (100 / (worldSpan * worldZoom));
    setGame((current) => ({
      ...current,
      player: {
        x: clamp(drag.playerX - horizontalMove, 5, 95),
        y: clamp(drag.playerY - verticalMove, 8, 92),
      },
    }));
  };

  const finishWorldDrag = (event: PointerEvent<HTMLDivElement>) => {
    activePointersRef.current.delete(event.pointerId);
    if (activePointersRef.current.size < 2) {
      pinchRef.current = null;
    }

    const drag = worldDragRef.current;
    if (drag && drag.pointerId === event.pointerId) {
      suppressWorldClickRef.current = drag.moved;
      worldDragRef.current = null;
      setIsDraggingWorld(false);
    }

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  const handleWorldWheel = (event: WheelEvent<HTMLDivElement>) => {
    event.preventDefault();
    if (event.ctrlKey) {
      setWorldZoom((current) =>
        clamp(current - event.deltaY * 0.004, 0.6, 1.45),
      );
      return;
    }

    const sensitivity = event.deltaMode === 1 ? 0.8 : event.deltaMode === 2 ? 20 : 0.035;
    setSelectedNodeId(null);
    setActionNavigationActive(false);
    setActionPanelExpanded(false);
    setGame((current) => ({
      ...current,
      player: {
        x: clamp(current.player.x + event.deltaX * sensitivity, 5, 95),
        y: clamp(current.player.y + event.deltaY * sensitivity, 8, 92),
      },
    }));
  };

  const selectStation = (
    stationId: StationId,
    event?: MouseEvent,
    position?: { x: number; y: number },
    nodeId?: SelectedNodeId | null,
  ) => {
    event?.stopPropagation();
    const station = getStation(stationId);
    setDismissedStationId(null);
    setSelectedStationId(stationId);
    setSelectedNodeId(nodeId ?? null);
    setHighlightedActionIndex(0);
    setActionNavigationActive(false);
    setActionPanelExpanded(false);
    setGame((current) => ({
      ...current,
      player: position ?? { x: station.x, y: station.y },
    }));
  };

  const openHowToPlay = () => {
    if (showHowToPlay) return;
    pausedBeforeHelpRef.current = paused;
    setPaused(true);
    setShowHowToPlay(true);
    captureStartupEvent("startup_game_help_opened", {
      viewport: isNarrowViewport ? "narrow" : "wide",
    });
  };

  const closeHowToPlay = () => {
    markStartupHelpSeen();
    setShowHowToPlay(false);
    setPaused(pausedBeforeHelpRef.current);
  };

  const startAction = (action: ActionConfig) => {
    if (game.activity || !selectedStationId || !isAtSelectedStation) return;
    setGame((current) => beginAction(current, selectedStationId, action));
    setActionNavigationActive(false);
    setActionPanelExpanded(false);
  };

  const dismissSelectedStation = () => {
    if (selectedStationId) setDismissedStationId(selectedStationId);
    setSelectedStationId(null);
    setSelectedNodeId(null);
    setActionNavigationActive(false);
    setActionPanelExpanded(false);
  };

  const openStartupHealth = () => {
    pausedBeforeStatsRef.current = paused;
    setPaused(true);
    setShowStats(true);
  };

  const closeStartupHealth = () => {
    setShowStats(false);
    setPaused(pausedBeforeStatsRef.current);
  };

  const resetGame = () => {
    captureStartupEvent("startup_game_reset", {
      day: game.day,
      customers: game.customers,
      outcome: game.bankrupt ? "bankrupt" : game.outcome,
    });
    clearSavedStartupGame();
    latestGameRef.current = initialGame;
    setGame(initialGame);
    previousGameRef.current = initialGame;
    setToasts([]);
    setWorldWalkers([]);
    walkerTimersRef.current.forEach((timer) => window.clearTimeout(timer));
    walkerTimersRef.current = [];
    setSelectedStationId(null);
    setSelectedNodeId(null);
    setHighlightedActionIndex(0);
    setActionNavigationActive(false);
    setActionPanelExpanded(false);
    setDismissedStationId(null);
    setRetiredActionIds([]);
    setShowStats(false);
    setShowBankruptcySummary(true);
    setPaused(false);
    pausedBeforeStatsRef.current = false;
    setWorldZoom(isNarrowViewport ? MOBILE_WORLD_ZOOM : 1);
    setIsFounderMoving(false);
    setFounderFacing(1);
    previousPlayerRef.current = initialGame.player;
    if (founderMoveTimerRef.current !== null) {
      window.clearTimeout(founderMoveTimerRef.current);
      founderMoveTimerRef.current = null;
    }
  };

  const confirmExit = () => {
    const intent = exitIntent;
    saveStartupGame(game);
    captureStartupEvent("startup_game_exited", {
      reason: intent,
      day: game.day,
      customers: game.customers,
    });
    setExitIntent(null);
    allowBrowserExitRef.current = true;

    if (intent === "history") {
      window.history.go(-2);
      window.setTimeout(() => {
        if (window.location.pathname === "/startup") {
          window.location.assign("/");
        }
      }, 500);
      return;
    }

    window.location.assign("/");
  };

  const score = Math.max(
    0,
    Math.round(
      game.cash +
        game.customers * 250 +
        game.product * 35 +
        game.reputation * 15 +
        game.ownership * 10 -
        game.lostUsers * 40,
    ),
  );
  const founderExitValue = game.exitValue * (game.ownership / 100);
  const currentMonthlyMetric = monthlyMetricOf(game);
  const currentMonthDay = dayOfMonth(game.day);
  const daysUntilPayday =
    currentMonthDay < 25
      ? 25 - currentMonthDay
      : 30 - currentMonthDay + 25;
  const dashboardGroups = [
    {
      title: "Finance",
      metrics: [
        ["Bank", formatMoney(game.cash)],
        ["Revenue", `${formatMoney(currentMonthlyMetric.revenue)}/mo`],
        ["Cash burn", `${formatMoney(currentMonthlyMetric.cashBurn)}/mo`],
        ["Net burn", `${formatMoney(currentMonthlyMetric.netBurn)}/mo`],
        ["Payroll", `${formatMoney(currentMonthlyMetric.payroll)}/mo`],
        ["Next payday", `${daysUntilPayday}d · 25th`],
      ],
    },
    {
      title: "Growth",
      metrics: [
        ["Subscribers", game.customers.toLocaleString()],
        ["MRR", formatMoney(game.customers * 20)],
        ["Waiting", game.leads.toLocaleString()],
        ["Attention", `${game.attention}%`],
        [
          "Content",
          `${(game.evergreenContent ?? 0) + (game.seoArticles ?? 0)} assets`,
        ],
        ["Paid media", `${formatMoney(game.paidMediaBudget)}/mo`],
      ],
    },
    {
      title: "Funnel",
      metrics: [
        ["Landing", `${landingConversionRateOf(game)}%`],
        ["Assisted sales", `${salesConversionRateOf(game)}%`],
        [
          "Self-serve",
          game.selfServeCheckout
            ? `${selfServeConversionRateOf(game)}%`
            : "not built",
        ],
        ["Referrals", `${referralRate}%`],
        ["Social reach", `${game.socialMomentum}%`],
        ["Lost leads", game.lostUsers.toLocaleString()],
      ],
    },
    {
      title: "Product & operations",
      metrics: [
        ["Product quality", `${game.product}%`],
        ["Monthly churn", `${monthlyChurnRate}%`],
        ["Support resolution", `${supportResolutionRateOf(game)}%`],
        ["Open issues", game.issues.toLocaleString()],
        ["Reputation", `${game.reputation}%`],
        ["Team", `${teamSize} people`],
      ],
    },
    {
      title: "Capital",
      metrics: [
        ["Company value", formatCompactMoney(companyValue)],
        [
          "Equity owned",
          `${ownershipPercent}% · ${formatCompactMoney(equityValue)}`,
        ],
        ["Debt", formatCompactMoney(game.debt)],
        ["Funding stage", fundingStatus],
        ["Acquisitions", game.acquisitions.toLocaleString()],
        ["Runway", runwayLabel],
      ],
    },
  ];

  return (
    <main className="fixed inset-0 z-40 overflow-hidden overscroll-none bg-[#a9d477] text-[#24352b] [padding:env(safe-area-inset-top)_env(safe-area-inset-right)_env(safe-area-inset-bottom)_env(safe-area-inset-left)]">
      <style>{`
        @keyframes startup-bob {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-4px); }
        }
        @keyframes startup-leave {
          from { transform: translate(0, 0); opacity: 1; }
          to { transform: translate(100px, -20px); opacity: 0; }
        }
        @keyframes startup-city-walk {
          0% { transform: translateY(0) scale(.9); opacity: 1; }
          28% { transform: translate(var(--walk-quarter-x), var(--walk-quarter-y)) scale(1); opacity: 1; }
          56% { transform: translate(var(--walk-mid-x), var(--walk-mid-y)) scale(.94); opacity: 1; }
          78% { transform: translate(var(--walk-three-quarter-x), var(--walk-three-quarter-y)) scale(1); opacity: 1; }
          100% { transform: translate(var(--walk-x), var(--walk-y)) scale(.78); opacity: 0; }
        }
        @keyframes startup-retire-action {
          0% { width: 220px; min-width: 220px; opacity: 1; transform: translateY(0); }
          45% { width: 220px; min-width: 220px; opacity: 0; transform: translateY(8px); }
          100% { width: 0; min-width: 0; opacity: 0; transform: translateY(8px); }
        }
        @keyframes startup-toast-in {
          0% { opacity: 0; transform: translateY(-10px) scale(.96); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes startup-plot-grow {
          0% { opacity: 0; transform: scale(.2) rotate(-2deg); }
          65% { opacity: 1; transform: scale(1.05) rotate(.5deg); }
          100% { opacity: 1; transform: scale(1) rotate(0); }
        }
        @keyframes startup-founder-jog {
          0%, 32% { background-position: 0% 0; }
          33%, 65% { background-position: 50% 0; }
          66%, 100% { background-position: 100% 0; }
        }
        @keyframes startup-road-breathe {
          0%, 100% { opacity: .9; }
          50% { opacity: 1; }
        }
        @keyframes startup-plot-idle {
          0%, 100% { filter: brightness(1); }
          50% { filter: brightness(1.025); }
        }
        @keyframes startup-panel-in {
          from { opacity: 0; transform: translate(-50%, 14px) scale(.985); }
          to { opacity: 1; transform: translate(-50%, 0) scale(1); }
        }
        @keyframes startup-soft-pulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.12); opacity: .78; }
        }
        @keyframes startup-progress-flow {
          0% { background-position: 0 0; }
          100% { background-position: 22px 0; }
        }
        .startup-road-surface {
          animation: startup-road-breathe 4.5s ease-in-out infinite;
        }
        .startup-plot-button {
          animation: startup-plot-idle 5.5s ease-in-out infinite;
        }
        .startup-plot-button:nth-of-type(2n) {
          animation-delay: -2.2s;
        }
        .startup-action-panel {
          animation: startup-panel-in 220ms ease-out both;
          transition:
            width 280ms ease,
            max-height 280ms ease,
            padding 280ms ease,
            border-radius 280ms ease;
        }
        @media (prefers-reduced-motion: reduce) {
          .startup-road-surface,
          .startup-plot-button,
          .startup-action-panel {
            animation: none !important;
          }
        }
      `}</style>

      <section
        className={`relative h-full w-full select-none overflow-hidden bg-[#a9d477] ${
          isSaveHydrated ? "" : "pointer-events-none"
        } ${isDraggingWorld ? "cursor-grabbing" : "cursor-grab"}`}
        style={{ touchAction: "none" }}
        aria-label="Open startup grassland. Tap or click anywhere to walk."
        aria-busy={!isSaveHydrated}
        onClick={handleWorldClick}
        onPointerDown={handleWorldPointerDown}
        onPointerMove={handleWorldPointerMove}
        onPointerUp={finishWorldDrag}
        onPointerCancel={finishWorldDrag}
        onWheel={handleWorldWheel}
      >
        {!isSaveHydrated ? (
          <div className="pointer-events-none absolute inset-0 z-[80] flex items-center justify-center bg-[#a9d477]/80 backdrop-blur-[2px]">
            <p className="rounded-full border border-white/70 bg-white/80 px-4 py-2 font-mono text-[10px] uppercase tracking-[0.16em] text-[#66816f] shadow-sm">
              loading your company
            </p>
          </div>
        ) : null}
        <div className="pointer-events-none absolute -left-10 -top-10 h-64 w-64 rounded-full bg-[#d6eea4]/50 blur-3xl" />

        <div className="absolute inset-x-3 top-3 z-30 flex flex-col gap-2 sm:inset-x-6 sm:top-6 sm:gap-3">
          <div className="flex items-start justify-between gap-2 sm:gap-3">
            <div className="pointer-events-auto flex items-center gap-2">
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  setExitIntent("website");
                }}
                className="flex h-11 items-center justify-center gap-1.5 rounded-full border border-white/70 bg-white/70 px-3 text-sm font-semibold shadow-sm backdrop-blur-sm transition hover:bg-white sm:h-10"
                aria-label="Exit game and visit Ashvin Praveen's website"
              >
                <span aria-hidden="true">↩</span>
                <span className="hidden sm:inline">Exit game</span>
              </button>
              <div className="rounded-2xl border border-white/70 bg-white/80 px-3 py-2 shadow-sm backdrop-blur-sm">
                <p className="font-mono text-[8px] uppercase tracking-[0.16em] text-[#66816f]">year {startupYear}</p>
                <p className="text-xs font-semibold">day {dayOfYear}</p>
              </div>
            </div>

            <div className="pointer-events-auto mx-auto hidden min-w-0 max-w-[660px] flex-1 grid-cols-4 overflow-hidden rounded-[22px] border border-white/80 bg-[#fffdf7]/90 shadow-lg backdrop-blur-md sm:grid">
              <div className="px-3 py-2.5">
                <p className="font-mono text-[8px] uppercase tracking-[0.16em] text-[#789080]">bank</p>
                <p className="mt-0.5 truncate text-sm font-semibold">{formatMoney(game.cash)}</p>
              </div>
              <div className="border-l border-[#dfe7da] px-3 py-2.5">
                <p className="font-mono text-[8px] uppercase tracking-[0.16em] text-[#789080]">subscribers</p>
                <p className="mt-0.5 text-sm font-semibold">{game.customers}</p>
              </div>
              <div
                className="border-l border-[#dfe7da] px-3 py-2.5"
                title={runwayTooltip}
              >
                <p className="font-mono text-[8px] uppercase tracking-[0.16em] text-[#789080]">runway</p>
                <div className="mt-0.5 flex items-center gap-1.5">
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{
                      backgroundColor: runwayIsNotMeaningful
                        ? "#a6aa8f"
                        : runwayDial > 30
                          ? "#5e9955"
                          : "#c65f4d",
                      animation:
                        !runwayIsNotMeaningful && runwayDial <= 30
                          ? "startup-soft-pulse 1.3s ease-in-out infinite"
                          : undefined,
                    }}
                    aria-hidden="true"
                  />
                  <p className="text-sm font-semibold">{runwayLabel}</p>
                </div>
              </div>
              <div
                className="border-l border-[#dfe7da] px-3 py-2.5"
                title={`Estimated company value: ${formatMoney(companyValue)}`}
              >
                <p className="font-mono text-[8px] uppercase tracking-[0.16em] text-[#789080]">equity owned</p>
                <p className="mt-0.5 truncate text-sm font-semibold">
                  {ownershipPercent}% <span className="font-normal text-[#789080]">· {formatCompactMoney(equityValue)}</span>
                </p>
              </div>
            </div>

            <div className="pointer-events-auto flex items-center gap-1.5 sm:gap-2">
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  openHowToPlay();
                }}
                className="flex h-11 w-11 items-center justify-center rounded-full border border-white/70 bg-white/75 text-sm font-bold shadow-sm backdrop-blur-sm transition hover:bg-white sm:h-10 sm:w-10"
                aria-label="How to play"
                aria-expanded={showHowToPlay}
              >
                ?
              </button>
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  if (!audioContextRef.current) {
                    audioContextRef.current = new AudioContext();
                  }
                  if (audioContextRef.current.state === "suspended") {
                    void audioContextRef.current.resume();
                  }
                  setSoundEnabled((current) => !current);
                }}
                className="flex h-11 w-11 items-center justify-center rounded-full border border-white/70 bg-white/75 text-base shadow-sm backdrop-blur-sm transition hover:bg-white sm:h-10 sm:w-10"
                aria-label={soundEnabled ? "Mute game sounds" : "Turn on game sounds"}
                aria-pressed={soundEnabled}
              >
                {soundEnabled ? "🔊" : "🔇"}
              </button>
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  setPaused((current) => !current);
                }}
                className="flex h-11 w-11 items-center justify-center rounded-full border border-white/70 bg-white/75 text-base shadow-sm backdrop-blur-sm transition hover:bg-white sm:h-10 sm:w-10"
                aria-label={paused ? "Resume game" : "Pause game"}
              >
                {paused ? "▶" : "Ⅱ"}
              </button>
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  if (showStats) {
                    closeStartupHealth();
                  } else {
                    openStartupHealth();
                  }
                }}
                className="flex h-11 w-11 items-center justify-center rounded-full border border-white/70 bg-white/75 text-lg shadow-sm backdrop-blur-sm transition hover:bg-white sm:h-10 sm:w-10"
                aria-label={showStats ? "Close startup stats" : "Open startup stats"}
                aria-expanded={showStats}
              >
                {showStats ? "×" : "📊"}
              </button>
            </div>
          </div>

          <div className="pointer-events-auto grid grid-cols-4 overflow-hidden rounded-[18px] border border-white/80 bg-[#fffdf7]/92 shadow-lg backdrop-blur-md sm:hidden">
            <div className="px-2 py-2">
              <p className="font-mono text-[7px] uppercase tracking-[0.14em] text-[#789080]">bank</p>
              <p className="mt-0.5 truncate text-xs font-semibold">{formatCompactMoney(game.cash)}</p>
            </div>
            <div className="border-l border-[#dfe7da] px-2 py-2">
              <p className="font-mono text-[7px] uppercase tracking-[0.14em] text-[#789080]">subs</p>
              <p className="mt-0.5 text-xs font-semibold">{game.customers}</p>
            </div>
            <div className="border-l border-[#dfe7da] px-2 py-2" title={runwayTooltip}>
              <p className="font-mono text-[7px] uppercase tracking-[0.14em] text-[#789080]">runway</p>
              <div className="mt-0.5 flex items-center gap-1">
                <span
                  className="h-1.5 w-1.5 rounded-full"
                  style={{
                    backgroundColor: runwayIsNotMeaningful
                      ? "#a6aa8f"
                      : runwayDial > 30
                        ? "#5e9955"
                        : "#c65f4d",
                    animation:
                      !runwayIsNotMeaningful && runwayDial <= 30
                        ? "startup-soft-pulse 1.3s ease-in-out infinite"
                        : undefined,
                  }}
                  aria-hidden="true"
                />
                <p className="text-xs font-semibold">{runwayLabel}</p>
              </div>
            </div>
            <div
              className="border-l border-[#dfe7da] px-2 py-2"
              title={`Estimated company value: ${formatMoney(companyValue)}`}
            >
              <p className="font-mono text-[7px] uppercase tracking-[0.14em] text-[#789080]">equity</p>
              <p className="mt-0.5 truncate text-xs font-semibold">
                {ownershipPercent}%
              </p>
            </div>
          </div>
        </div>

        {eventToastsEnabled ? (
          <div
            className="pointer-events-none absolute left-1/2 top-[8.75rem] z-50 flex w-[min(420px,calc(100vw-2rem))] -translate-x-1/2 flex-col gap-2 sm:top-24"
            aria-live="polite"
            aria-atomic="false"
          >
            {toasts.map((toast) => (
              <div
                key={toast.id}
                className="pointer-events-auto flex items-center gap-3 rounded-2xl border border-white/85 bg-[#fffdf7]/95 px-3.5 py-3 shadow-xl backdrop-blur-md"
                style={{ animation: "startup-toast-in 240ms ease-out both" }}
              >
                <span
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#eef6e6] text-xl"
                  aria-hidden="true"
                >
                  {toast.icon}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold">{toast.title}</p>
                  <p className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-[#688071]">
                    {toast.message}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    setToasts((current) =>
                      current.filter((currentToast) => currentToast.id !== toast.id),
                    );
                  }}
                  className="self-start px-1 text-[#789080] transition hover:text-[#24352b]"
                  aria-label="Dismiss notification"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        ) : null}

        {showStats ? (
          <div
            className="absolute inset-0 z-[60] flex items-center justify-center bg-[#36533d]/20 p-3 backdrop-blur-[2px] sm:p-6"
            onClick={closeStartupHealth}
          >
            <section
              className="max-h-[calc(100dvh-1.5rem)] w-[min(1080px,calc(100vw-1.5rem))] overflow-y-auto overscroll-contain rounded-[28px] border border-white/85 bg-[#fffdf7] p-4 shadow-2xl sm:max-h-[calc(100dvh-3rem)] sm:rounded-[32px] sm:p-6"
              onClick={(event) => event.stopPropagation()}
              onWheel={(event) => event.stopPropagation()}
              aria-label="Startup health dashboard"
              role="dialog"
              aria-modal="true"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#789080]">
                      the machine
                    </p>
                    <span className="rounded-full bg-[#e8f1e2] px-2 py-0.5 font-mono text-[8px] uppercase tracking-[0.14em] text-[#5e795f]">
                      {game.bankrupt ? "final snapshot" : "paused"}
                    </span>
                  </div>
                  <h1 className="mt-1 text-2xl font-semibold">
                    {game.bankrupt ? "Startup analysis" : "Startup health"}
                  </h1>
                  <p className="mt-1 text-xs text-[#688071]">
                    {game.bankrupt ? "Final state" : `Month ${currentMonthlyMetric.month}`} ·
                    day {currentMonthDay}/30
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={resetGame}
                    className="font-mono text-[10px] text-[#789080] underline-offset-2 hover:underline"
                  >
                    {game.bankrupt ? "start over" : "reset"}
                  </button>
                  <button
                    type="button"
                    onClick={closeStartupHealth}
                    className="flex h-10 w-10 items-center justify-center rounded-full border border-[#dfe7da] bg-white text-lg transition hover:bg-[#f1f6ed]"
                    aria-label="Close startup health"
                  >
                    ×
                  </button>
                </div>
              </div>

              <div className="mt-5">
                <FinancialModelGraph
                  metrics={game.monthlyMetrics}
                  current={currentMonthlyMetric}
                />
              </div>

              {game.bankrupt ? (
                <div className="mt-4 rounded-2xl border border-[#e6c8b5] bg-[#fff4e9] px-4 py-3">
                  <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-[#9a6848]">
                    failure point
                  </p>
                  <p className="mt-1 text-sm font-semibold text-[#553b2d]">
                    {game.lastEvent}
                  </p>
                  <p className="mt-1 text-xs text-[#80624f]">
                    The company ended with {formatMoney(currentMonthlyMetric.revenue)}/mo
                    revenue against {formatMoney(currentMonthlyMetric.cashBurn)}/mo
                    in commitments.
                  </p>
                </div>
              ) : null}

              <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {dashboardGroups.map((group) => (
                  <div
                    key={group.title}
                    className="rounded-3xl border border-[#e1e8dd] bg-[#f8f5eb] p-4"
                  >
                    <h2 className="font-mono text-[9px] uppercase tracking-[0.18em] text-[#688071]">
                      {group.title}
                    </h2>
                    <div className="mt-3 divide-y divide-[#e3e9df]">
                      {group.metrics.map(([label, value]) => (
                        <div
                          key={label}
                          className="flex items-center justify-between gap-3 py-2 text-xs"
                        >
                          <span className="text-[#6e8175]">{label}</span>
                          <span className="min-w-0 truncate text-right font-semibold">
                            {value}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-4 flex flex-col gap-2 rounded-2xl bg-[#edf5e7] px-4 py-3 text-xs sm:flex-row sm:items-center sm:justify-between">
                <span>
                  Current monthly cash flow{" "}
                  <strong>
                    {currentMonthlyMetric.revenue >= currentMonthlyMetric.cashBurn
                      ? "+"
                      : "-"}
                    {formatMoney(
                      Math.abs(
                        currentMonthlyMetric.revenue -
                          currentMonthlyMetric.cashBurn,
                      ),
                    )}
                  </strong>
                </span>
                <span className="text-[#688071]">
                  {game.lastEvent}
                </span>
              </div>
            </section>
          </div>
        ) : null}

        <div
          className={`absolute ${
            isDraggingWorld
              ? ""
              : "transition-[left,top,transform] duration-300 ease-out"
          }`}
          style={{
            width: `${worldSpan * 100}vw`,
            height: `${worldSpan * 100}vh`,
            left: `${50 - game.player.x * worldSpan * worldZoom}vw`,
            top: `${50 - game.player.y * worldSpan * worldZoom}vh`,
            transform: `scale(${worldZoom})`,
            transformOrigin: "top left",
          }}
          aria-label="Moving startup world"
        >
          <div className="pointer-events-none absolute inset-0 opacity-35 [background-image:radial-gradient(#6da04f_1px,transparent_1px)] [background-size:24px_24px]" />
          <div className="pointer-events-none absolute left-[7%] top-[45%] text-2xl opacity-70">🪨 🌿</div>
          <div className="pointer-events-none absolute left-[27%] top-[91%] text-xl opacity-65">🌱 🌼</div>
          <div className="pointer-events-none absolute left-[72%] top-[78%] text-2xl opacity-70">🌼 🌿</div>
          <div className="pointer-events-none absolute left-[94%] top-[28%] text-2xl opacity-65">🌳</div>
          <div className="pointer-events-none absolute left-[34%] top-[12%] text-xl opacity-60">🪨</div>
          <div className="pointer-events-none absolute left-[66%] top-[90%] text-xl opacity-65">🌱 🪨</div>

          <div
            className="pointer-events-none absolute z-[3] rounded-[28px] border-2 border-dashed border-[#6f8e56]/60 transition-[left,top,width,height] duration-500"
            style={{
              left: `${marketingFieldBounds.left}%`,
              top: `${marketingFieldBounds.top}%`,
              width: `${marketingFieldBounds.right - marketingFieldBounds.left}%`,
              height: `${marketingFieldBounds.bottom - marketingFieldBounds.top}%`,
            }}
          >
            <span className="absolute left-5 top-0 -translate-y-1/2 bg-[#a9d477] px-2 font-mono text-[9px] uppercase tracking-[0.18em] text-[#54704e]">
              Marketing field
            </span>
          </div>

          <div
            className="pointer-events-none absolute z-[3] rounded-[28px] border-2 border-dashed border-[#6f8e56]/45 transition-[left,top,width,height] duration-500"
            style={{
              left: `${capitalDistrictBounds.left}%`,
              top: `${capitalDistrictBounds.top}%`,
              width: `${capitalDistrictBounds.right - capitalDistrictBounds.left}%`,
              height: `${capitalDistrictBounds.bottom - capitalDistrictBounds.top}%`,
            }}
          >
            <span className="absolute left-5 top-0 -translate-y-1/2 bg-[#a9d477] px-2 font-mono text-[9px] uppercase tracking-[0.18em] text-[#54704e]">
              Capital district
            </span>
          </div>

          <svg
            className="pointer-events-none absolute inset-0 z-[4] h-full w-full overflow-visible"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            {game.landingPage && !game.selfServeCheckout ? (
              <g>
                <path
                  d="M 45.5 58 L 50.2 58"
                  fill="none"
                  stroke="#765337"
                  strokeWidth="14"
                  opacity="0.48"
                  vectorEffect="non-scaling-stroke"
                  strokeLinecap="round"
                />
                <path
                  d="M 45.5 58 L 50.2 58"
                  fill="none"
                  stroke="#d8b978"
                  strokeWidth="10"
                  opacity="0.95"
                  className="startup-road-surface"
                  vectorEffect="non-scaling-stroke"
                  strokeLinecap="round"
                />
              </g>
            ) : null}

            {game.landingPage && game.selfServeCheckout ? (
              <g>
                <path
                  d="M 45.5 58 C 49 54, 50 43, 53.5 40"
                  fill="none"
                  stroke="#765337"
                  strokeWidth="11"
                  opacity="0.42"
                  vectorEffect="non-scaling-stroke"
                  strokeLinecap="round"
                />
                <path
                  d="M 45.5 58 C 49 54, 50 43, 53.5 40"
                  fill="none"
                  stroke="#d8b978"
                  strokeWidth="7.5"
                  opacity="0.92"
                  className="startup-road-surface"
                  vectorEffect="non-scaling-stroke"
                  strokeLinecap="round"
                />
              </g>
            ) : null}

            {hasMarketingInvestment(game) ? (
              <g>
                <path
                  d="M 58.2 58 L 63.8 58"
                  fill="none"
                  stroke="#765337"
                  strokeWidth="14"
                  opacity="0.48"
                  vectorEffect="non-scaling-stroke"
                  strokeLinecap="round"
                />
                <path
                  d="M 58.2 58 L 63.8 58"
                  fill="none"
                  stroke="#d8b978"
                  strokeWidth="10"
                  opacity="0.95"
                  className="startup-road-surface"
                  vectorEffect="non-scaling-stroke"
                  strokeLinecap="round"
                />
              </g>
            ) : null}

            {isStationVisible(game, "support") ? (
              <g>
                <path
                  d="M 72.2 58 L 79.2 58"
                  fill="none"
                  stroke="#765337"
                  strokeWidth="14"
                  opacity="0.48"
                  vectorEffect="non-scaling-stroke"
                  strokeLinecap="round"
                />
                <path
                  d="M 72.2 58 L 79.2 58"
                  fill="none"
                  stroke="#d8b978"
                  strokeWidth="10"
                  opacity="0.95"
                  className="startup-road-surface"
                  vectorEffect="non-scaling-stroke"
                  strokeLinecap="round"
                />
              </g>
            ) : null}

            {game.outreachStarted || game.team.sdr > 0 ? (
              <g>
                <path
                  d="M 45 71.8 C 45 66, 49 62, 50.2 60"
                  fill="none"
                  stroke="#765337"
                  strokeWidth="11"
                  opacity="0.42"
                  vectorEffect="non-scaling-stroke"
                  strokeLinecap="round"
                />
                <path
                  d="M 45 71.8 C 45 66, 49 62, 50.2 60"
                  fill="none"
                  stroke="#d8b978"
                  strokeWidth="7.5"
                  opacity="0.92"
                  className="startup-road-surface"
                  vectorEffect="non-scaling-stroke"
                  strokeLinecap="round"
                />
              </g>
            ) : null}

            {game.selfServeCheckout ? (
              <g>
                <path
                  d="M 60.5 40 C 65 41, 66.5 48, 67 53.5"
                  fill="none"
                  stroke="#765337"
                  strokeWidth="11"
                  opacity="0.42"
                  vectorEffect="non-scaling-stroke"
                  strokeLinecap="round"
                />
                <path
                  d="M 60.5 40 C 65 41, 66.5 48, 67 53.5"
                  fill="none"
                  stroke="#d8b978"
                  strokeWidth="7.5"
                  opacity="0.92"
                  className="startup-road-surface"
                  vectorEffect="non-scaling-stroke"
                  strokeLinecap="round"
                />
              </g>
            ) : null}

            {activeMarketingSources.length > 0 ? (
              <g>
                <path
                  d={`M 28.2 58 L ${game.landingPage ? 38.5 : 50.2} 58`}
                  fill="none"
                  stroke="#765337"
                  strokeWidth="11"
                  opacity="0.42"
                  vectorEffect="non-scaling-stroke"
                  strokeLinecap="round"
                />
                <path
                  d={`M 28.2 58 L ${game.landingPage ? 38.5 : 50.2} 58`}
                  fill="none"
                  stroke="#d8b978"
                  strokeWidth="7.5"
                  opacity="0.92"
                  className="startup-road-surface"
                  vectorEffect="non-scaling-stroke"
                  strokeLinecap="round"
                />
              </g>
            ) : null}

            {activeMarketingSources
              .filter((channel) => channel.id !== "social")
              .map((channel) => {
                const path =
                  channel.id === "paid"
                    ? "M 30 73.8 C 30 68, 28.2 65, 28.2 62.2"
                    : channel.id === "referrals"
                      ? "M 33 42.2 C 33 49, 28.2 51, 28.2 55.8"
                    : `M 19.2 ${channel.y} C 20.5 ${channel.y}, 19.8 52, 19.8 58`;
                return (
                  <g key={channel.id}>
                    <path
                      d={path}
                      fill="none"
                      stroke="#765337"
                      strokeWidth="11"
                      opacity="0.42"
                      vectorEffect="non-scaling-stroke"
                      strokeLinecap="round"
                    />
                    <path
                      d={path}
                      fill="none"
                      stroke="#d8b978"
                      strokeWidth="7.5"
                      opacity="0.92"
                      className="startup-road-surface"
                      vectorEffect="non-scaling-stroke"
                      strokeLinecap="round"
                    />
                  </g>
                );
              })}

          </svg>

          {visibleMarketingChannels.map((channel) => {
            const crowdSize = channel.unlocked
              ? Math.min(8, Math.max(1, channel.strength))
              : 0;
            const plotLevel = channel.unlocked
              ? Math.min(6, Math.max(1, channel.strength))
              : 1;
            const plotSize = plotPixelSize(80 + plotLevel * 9, isNarrowViewport);
            const isStarterPlot = channel.id === "social" && !channel.unlocked;
            return (
              <button
                key={channel.id}
                type="button"
                onClick={(event) =>
                  selectStation(
                    "marketing",
                    event,
                    {
                      x: channel.x,
                      y: channel.y,
                    },
                    channel.id as SelectedNodeId,
                  )
                }
                className="startup-plot-button group absolute z-10 -translate-x-1/2 -translate-y-1/2 text-center transition duration-200 hover:-translate-y-[calc(50%+3px)] active:scale-[.98]"
                style={{
                  left: `${channel.x}%`,
                  top: `${channel.y}%`,
                  width: `${plotSize}px`,
                }}
                aria-label={`${channel.unlocked ? "Open" : "Invest in"} ${channel.label} marketing`}
              >
                <div
                  className={`relative mx-auto overflow-hidden rounded-[14px] border-2 transition-[width,height] duration-500 ${
                    channel.unlocked
                      ? "border-[#70472b] shadow-[inset_0_0_0_2px_rgba(245,209,142,0.18)]"
                      : "border-dashed border-[#8d6b43]/80"
                  }`}
                  style={{
                    width: `${plotSize}px`,
                    height: `${plotSize}px`,
                    backgroundColor: channel.unlocked ? "#a97343" : "#bd9462",
                    backgroundImage:
                      "repeating-linear-gradient(90deg, transparent 0 12px, rgba(92,55,28,.22) 12px 15px)",
                    animation: channel.unlocked
                      ? "startup-plot-grow .55s ease-out both"
                      : undefined,
                  }}
                >
                  <div className="absolute left-2 top-2 z-10 rounded-md border border-[#70472b] bg-[#f0d596] px-2 py-0.5 text-[8px] font-bold">
                    {isStarterPlot ? "Marketing" : channel.label}
                  </div>
                  {channel.unlocked
                    ? Array.from({ length: crowdSize }, (_, personIndex) => (
                      <span
                        key={personIndex}
                        className="absolute text-sm"
                        style={{
                          left: `${10 + (personIndex % 4) * 23}%`,
                          top: `${52 + Math.floor(personIndex / 4) * 18}%`,
                          animation: `startup-bob ${1.7 + personIndex * 0.12}s ease-in-out ${personIndex * 0.1}s infinite`,
                        }}
                        aria-hidden="true"
                      >
                        {personIndex % 2 === 0 ? "🧑" : "👩"}
                      </span>
                    ))
                    : null}
                  <p className="absolute inset-x-1.5 bottom-1.5 rounded-md bg-[#f8e9c4]/90 px-1 py-0.5 font-mono text-[7px] text-[#5f452e]">
                    {channel.unlocked ? channel.detail : "start your first channel"}
                  </p>
                </div>
              </button>
            );
          })}

          {salesExpansionPlots.map((plot) => {
            const plotSize = plotPixelSize(
              plot.id === "outreach"
                ? Math.min(118, 88 + plot.people * 6)
                : Math.min(132, 84 + selfServeLevelOf(game) * 8),
              isNarrowViewport,
            );
            return (
              <button
                key={plot.id}
                type="button"
                onClick={(event) =>
                  selectStation(
                    "sales",
                    event,
                    { x: plot.x, y: plot.y },
                    plot.id as SelectedNodeId,
                  )
                }
                className="startup-plot-button group absolute z-10 -translate-x-1/2 -translate-y-1/2 text-center transition duration-200 hover:-translate-y-[calc(50%+3px)] active:scale-[.98]"
                style={{
                  left: `${plot.x}%`,
                  top: `${plot.y}%`,
                  width: `${plotSize}px`,
                }}
                aria-label={`Walk to ${plot.label}`}
              >
                <div
                  className="relative mx-auto overflow-hidden rounded-[14px] border-2 border-[#70472b] bg-[#a97343] shadow-[inset_0_0_0_2px_rgba(245,209,142,0.18)]"
                  style={{
                    width: `${plotSize}px`,
                    height: `${plotSize}px`,
                    backgroundImage:
                      "repeating-linear-gradient(90deg, transparent 0 12px, rgba(92,55,28,.22) 12px 15px)",
                    animation: "startup-plot-grow .55s ease-out both",
                  }}
                >
                  <div className="absolute left-2 top-2 z-10 rounded-md border border-[#70472b] bg-[#f0d596] px-2 py-0.5 text-[8px] font-bold">
                    {plot.label}
                  </div>
                  {Array.from(
                    { length: Math.min(8, plot.people) },
                    (_, personIndex) => (
                      <span
                        key={personIndex}
                        className="absolute text-sm"
                        style={{
                          left: `${12 + (personIndex % 4) * 22}%`,
                          top: `${52 + Math.floor(personIndex / 4) * 18}%`,
                          animation: `startup-bob ${1.85 + personIndex * 0.1}s ease-in-out ${personIndex * 0.08}s infinite`,
                        }}
                        aria-hidden="true"
                      >
                        {personIndex % 2 === 0 ? "🧑" : "👩"}
                      </span>
                    ),
                  )}
                  <p className="absolute inset-x-1.5 bottom-1.5 rounded-md bg-[#f8e9c4]/90 px-1 py-0.5 font-mono text-[7px] text-[#5f452e]">
                    {plot.detail}
                  </p>
                </div>
              </button>
            );
          })}

          {stations
            .filter(
              (station) =>
                station.id !== "marketing" &&
                isStationVisible(game, station.id),
            )
            .map((station) => {
              const operatorCount = station.teamRole ? game.team[station.teamRole] : 0;
              const status =
                station.id === "product"
                  ? game.product > 0
                    ? game.team.product > 0
                      ? game.product >= 100
                        ? `${game.customers} subscribers · engineers maintaining · ${formatCompactMoney(staffPayrollPerMonth(game, "engineer"))}/mo`
                        : `${game.customers} subscribers · ~+${engineerQualityPerMonth} quality/mo · ${formatCompactMoney(staffPayrollPerMonth(game, "engineer"))}/mo${rampSuffix("engineer")}`
                      : `${game.customers} ${game.customers === 1 ? "subscriber" : "subscribers"} · ${monthlyChurnRate}% churn after 1 month`
                    : "empty product plot"
                  : station.id === "sales"
                    ? game.team.sales > 0
                      ? game.leads === 0
                        ? `closers idle: no leads · ${formatCompactMoney(staffPayrollPerMonth(game, "sales"))}/mo`
                        : `${game.leads} waiting · ~${salesCustomersPerMonth} subs/mo capacity · ${formatCompactMoney(staffPayrollPerMonth(game, "sales"))}/mo${rampSuffix("sales")}`
                      : `${game.leads} waiting · ${salesConversionRateOf(game)}% conversion`
                    : station.id === "support"
                      ? game.team.support > 0
                        ? game.issues === 0
                          ? `support idle: no tickets · ${formatCompactMoney(staffPayrollPerMonth(game, "support"))}/mo`
                          : `${game.issues} need help · ~${supportTicketsPerMonth} tickets/mo · ${formatCompactMoney(staffPayrollPerMonth(game, "support"))}/mo${rampSuffix("support")}`
                        : `${game.issues} need help · ${supportResolutionRateOf(game)}% resolved`
                      : station.id === "investors"
                        ? fundingStatus
                        : station.id === "bank"
                          ? `${formatCompactMoney(game.debt)} debt · ${formatMoney(debtPayment)}/day`
                          : station.id === "privateEquity"
                            ? game.peDealDone
                              ? "PE backed"
                              : `${formatCompactMoney(peOffer(game).amount)} available`
                            : station.id === "ma"
                              ? `${game.acquisitions} acquisitions`
                              : station.id === "investmentBank"
                                ? "IPO window open"
                                : station.subtitle;
              const plotLevel =
                station.id === "product"
                  ? Math.ceil(game.product / 20)
                  : station.id === "sales"
                    ? game.salesProcess + game.team.sales
                    : station.id === "support"
                      ? game.team.support +
                        (game.helpDocs ? 1 : 0) +
                        (game.supportProcess ?? 0)
                      : 1;
              const plotSize = plotPixelSize(
                station.id === "product" && game.product === 0
                  ? 88
                  : capitalStationIds.includes(station.id)
                    ? 80
                    : Math.min(136, 98 + Math.max(1, plotLevel) * 8),
                isNarrowViewport,
              );
              const isEmptyProduct =
                station.id === "product" && game.product === 0;

              return (
                <button
                  key={station.id}
                  type="button"
                  onClick={(event) =>
                    selectStation(
                      station.id,
                      event,
                      undefined,
                      station.id === "sales" ? "sales" : null,
                    )
                  }
                  className="startup-plot-button group absolute z-10 -translate-x-1/2 -translate-y-1/2 text-center transition duration-200 hover:-translate-y-[calc(50%+3px)] active:scale-[.98]"
                  style={{
                    left: `${station.x}%`,
                    top: `${station.y}%`,
                    width: `${plotSize}px`,
                  }}
                  aria-label={`Walk to ${station.label}`}
                  title={station.subtitle}
                >
                  <div
                    className={`relative mx-auto overflow-hidden rounded-[14px] border-2 transition-[width,height] duration-500 ${
                      isEmptyProduct
                        ? "border-dashed border-[#8d6b43]/80"
                        : "border-[#70472b] shadow-[inset_0_0_0_2px_rgba(245,209,142,0.18)]"
                    }`}
                    style={{
                      width: `${plotSize}px`,
                      height: `${plotSize}px`,
                      backgroundColor: isEmptyProduct ? "#bd9462" : "#a97343",
                      backgroundImage:
                        "repeating-linear-gradient(90deg, transparent 0 13px, rgba(92,55,28,.22) 13px 16px)",
                      animation:
                        station.id === "sales" || station.id === "support"
                          ? "startup-plot-grow .6s ease-out both"
                          : undefined,
                    }}
                  >
                    <div className="absolute left-2 top-2 z-10 rounded-md border border-[#70472b] bg-[#f0d596] px-2 py-0.5 text-[8px] font-bold">
                      {station.label}
                    </div>

                    {station.id === "product" && game.product > 0
                      ? visibleCustomers.map((customer, index) => (
                          <span
                            key={customer}
                            className="absolute text-base"
                            style={{
                              left: `${8 + (index % 4) * 24}%`,
                              top: `${54 + Math.floor(index / 4) * 17}%`,
                              animation: `startup-bob ${1.9 + index * 0.1}s ease-in-out ${index * 0.08}s infinite`,
                            }}
                            aria-hidden="true"
                          >
                            {index % 2 === 0 ? "🧑" : "👩"}
                          </span>
                        ))
                      : null}
                    {operatorCount > 0 ? (
                      <span
                        className="absolute right-1.5 top-1.5 z-20 rounded-full border border-[#70472b] bg-[#f8e9c4]/95 px-1.5 py-0.5 text-[9px]"
                        style={{ animation: "startup-bob 2.4s ease-in-out infinite" }}
                      >
                        🧑‍🔧{operatorCount > 1 ? operatorCount : ""}
                      </span>
                    ) : null}
                    <p className="absolute inset-x-1.5 bottom-1.5 rounded-md bg-[#f8e9c4]/90 px-1 py-0.5 font-mono text-[7px] text-[#5f452e]">
                      {status}
                    </p>
                  </div>
                </button>
              );
            })}

          {visibleLeads.map((lead, index) => (
            <span
              key={`sales-queue-${lead.index}`}
              className="pointer-events-none absolute z-[13] text-lg drop-shadow-sm"
              style={{
                left: `${49.5 - (index % 4) * 1.15}%`,
                top: `${55.4 + Math.floor(index / 4) * 2.2}%`,
                animation: `startup-bob ${1.7 + index * 0.08}s ease-in-out ${index * 0.06}s infinite`,
              }}
              title={`${lead.patience} patience left`}
              aria-hidden="true"
            >
              {index % 2 === 0 ? "🧑" : "👩"}
            </span>
          ))}

          {visibleIssues.map((issue, index) => (
            <span
              key={`support-queue-${issue}`}
              className="pointer-events-none absolute z-[13] text-lg drop-shadow-sm"
              style={{
                left: `${78.7 - (index % 4) * 1.35}%`,
                top: `${55.4 + Math.floor(index / 4) * 2.2}%`,
                animation: `startup-bob ${1.55 + index * 0.08}s ease-in-out ${index * 0.06}s infinite`,
              }}
              aria-hidden="true"
            >
              🙋
            </span>
          ))}

          {game.uncollectedCash > 0 ? (
            <button
              type="button"
              className="absolute z-[13] h-20 w-24 -translate-x-1/2 -translate-y-1/2 transition duration-200 hover:scale-105 active:scale-95"
              style={{
                left: `${cashPilePosition.x}%`,
                top: `${cashPilePosition.y}%`,
              }}
              onClick={(event) => {
                event.stopPropagation();
                setGame((current) => ({
                  ...current,
                  player: { ...cashPilePosition },
                }));
              }}
              aria-label={`Walk over to collect ${formatMoney(game.uncollectedCash)}`}
            >
              {visibleCash.map((cash, index) => (
                <span
                  key={cash}
                  className="absolute text-lg drop-shadow-sm"
                  style={{
                    left: `${8 + (index % 4) * 22}%`,
                    top: `${4 + Math.floor(index / 4) * 20}%`,
                    transform: `rotate(${(index % 3 - 1) * 9}deg)`,
                    animation: `startup-bob ${1.4 + index * 0.08}s ease-in-out ${index * 0.05}s infinite`,
                  }}
                  aria-hidden="true"
                >
                  {index % 3 === 0 ? "💵" : "🪙"}
                </span>
              ))}
              <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full border border-[#8b6a3f] bg-[#f8e9c4]/95 px-2 py-0.5 font-mono text-[8px] text-[#5f452e]">
                collect {formatMoney(game.uncollectedCash)}
              </span>
            </button>
          ) : null}

          <div
            className="pointer-events-none absolute inset-0 z-[14]"
            aria-label={`${worldWalkers.length} people moving through the startup`}
          >
            {worldWalkers.map((walker) => (
              <span
                key={walker.id}
                className="absolute text-xl drop-shadow-sm sm:text-2xl"
                style={
                  {
                    left: `${walker.startX}%`,
                    top: `${walker.startY}%`,
                    "--walk-x": `${walker.walkX}vw`,
                    "--walk-y": `${walker.walkY}vh`,
                    "--walk-quarter-x": `${walker.quarterX}vw`,
                    "--walk-quarter-y": `${walker.quarterY}vh`,
                    "--walk-mid-x": `${walker.midX}vw`,
                    "--walk-mid-y": `${walker.midY}vh`,
                    "--walk-three-quarter-x": `${walker.threeQuarterX}vw`,
                    "--walk-three-quarter-y": `${walker.threeQuarterY}vh`,
                    animation: `startup-city-walk ${walker.durationMs}ms linear ${walker.delayMs}ms both`,
                  } as CSSProperties
                }
                aria-hidden="true"
              >
                {walker.emoji}
              </span>
            ))}
          </div>

        {game.recentDepartures > 0 ? (
          <div
            key={`departures-${game.day}`}
            className="pointer-events-none absolute left-[87%] top-[59%] z-20 text-2xl"
            style={{ animation: "startup-leave .8s ease-in forwards" }}
            aria-label={`${game.recentDepartures} users left`}
          >
            😤{game.recentDepartures > 1 ? ` ×${game.recentDepartures}` : ""}
          </div>
        ) : null}
        </div>

        <div
          className="pointer-events-none absolute left-1/2 top-1/2 z-20 -translate-x-1/2 -translate-y-1/2"
          aria-label="Founder"
        >
          <div className="relative h-16 w-16 drop-shadow-[0_6px_5px_rgba(45,61,35,0.3)] [&_.ashvin-pet]:!w-16">
            {isFounderMoving ? (
              <span
                className="block h-16 w-16 bg-no-repeat [image-rendering:pixelated]"
                style={{
                  backgroundImage:
                    'url("/ai-ashvin-running-spritesheet.png")',
                  backgroundPosition: "0% 0",
                  backgroundSize: "300% 100%",
                  animation:
                    "startup-founder-jog 780ms steps(1, end) infinite",
                  transform: `scale(1.34) scaleX(${founderFacing})`,
                  transformOrigin: "50% 82%",
                }}
                aria-hidden="true"
              />
            ) : (
              <AshvinPet animation={game.activity ? "chat" : "idle"} />
            )}
            {game.activity ? (
              <span
                className="absolute -right-2 -top-2 rounded-full border-2 border-white bg-[#24352b] px-1.5 py-0.5 text-[9px] font-semibold text-white"
                style={{ animation: "startup-soft-pulse 1.4s ease-in-out infinite" }}
              >
                {progressPercent}%
              </span>
            ) : null}
          </div>
        </div>

        {game.activity && !selectedStation ? (
          <div className="pointer-events-none absolute bottom-[max(1.25rem,env(safe-area-inset-bottom))] left-1/2 z-20 w-[min(320px,calc(100vw-2rem))] -translate-x-1/2 rounded-2xl border border-white/80 bg-white/85 px-4 py-3 shadow-sm backdrop-blur-sm">
            <div className="flex items-center justify-between gap-4">
              <p className="truncate text-xs font-semibold">{game.activity.label}</p>
              <span className="shrink-0 font-mono text-[10px] text-[#66816f]">{progressPercent}%</span>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#d4e4cf]">
              <div
                className="h-full rounded-full bg-[#6d9d5d] transition-[width] duration-500"
                style={{
                  width: `${progressPercent}%`,
                  backgroundImage:
                    "linear-gradient(90deg, transparent 0 35%, rgba(255,255,255,.35) 50%, transparent 65%)",
                  backgroundSize: "22px 100%",
                  animation: "startup-progress-flow 1.1s linear infinite",
                }}
              />
            </div>
          </div>
        ) : null}

        {selectedStation && !game.bankrupt && !game.outcome ? (
          <aside
            className={`startup-action-panel absolute bottom-[max(0.75rem,env(safe-area-inset-bottom))] left-1/2 z-30 -translate-x-1/2 overflow-hidden overscroll-contain border border-white/80 bg-[#fffdf7]/95 shadow-xl backdrop-blur-md sm:bottom-4 ${
              actionPanelExpanded
                ? "max-h-[min(36dvh,340px)] w-[min(720px,calc(100vw-1rem))] rounded-[26px] p-3 sm:max-h-[min(76vh,720px)] sm:w-[min(720px,calc(100vw-1.5rem))] sm:rounded-[30px] sm:p-4"
                : "max-h-[min(30dvh,190px)] w-[min(820px,calc(100vw-1rem))] rounded-3xl p-2.5 sm:max-h-[220px] sm:p-3 sm:w-[min(820px,calc(100vw-1.5rem))]"
            }`}
            onClick={(event) => event.stopPropagation()}
            onWheel={(event) => event.stopPropagation()}
            aria-label={`${
              selectedNodeId ? nodeLabels[selectedNodeId] : selectedStation.label
            } actions`}
          >
            {game.activity ? (
              <div className="mb-2 rounded-2xl border border-[#dce6d8] bg-[#f4f8ef] px-3 py-2">
                <div className="flex items-center justify-between gap-4">
                  <p className="truncate text-[11px] font-semibold">
                    {game.activity.label}
                  </p>
                  <span className="shrink-0 font-mono text-[9px] text-[#66816f]">
                    {progressPercent}%
                  </span>
                </div>
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-[#d4e4cf]">
                  <div
                    className="h-full rounded-full bg-[#6d9d5d] transition-[width] duration-500"
                    style={{
                      width: `${progressPercent}%`,
                      backgroundImage:
                        "linear-gradient(90deg, transparent 0 35%, rgba(255,255,255,.35) 50%, transparent 65%)",
                      backgroundSize: "22px 100%",
                      animation: "startup-progress-flow 1.1s linear infinite",
                    }}
                  />
                </div>
              </div>
            ) : null}
            <div className="flex items-center gap-2 border-b border-[#e3e9df] pb-2 sm:gap-3">
              <div className="min-w-0 shrink">
                <p className="font-mono text-[8px] uppercase tracking-[0.16em] text-[#789080]">
                  {selectedStation.id === "sales"
                    ? `${game.team.sdr} SDR · ${game.team.sales} closers · ${salesConversionRateOf(game)}% conversion`
                    : selectedStation.id === "marketing" &&
                        ((game.evergreenContent ?? 0) > 0 ||
                          (game.seoArticles ?? 0) > 0 ||
                          game.team.marketing > 0)
                      ? `growth engine · ${game.team.marketing} people · ${(game.evergreenContent ?? 0) + (game.seoArticles ?? 0)} assets`
                    : selectedStation.teamRole && game.team[selectedStation.teamRole] > 0
                      ? "delegated · running"
                      : "founder operated"}
                </p>
                <h2 className="mt-0.5 text-sm font-semibold">
                  {selectedNodeId
                    ? nodeLabels[selectedNodeId]
                    : selectedStation.label}
                </h2>
              </div>
              <p className="hidden min-w-0 flex-1 truncate text-[11px] text-[#6b7d70] sm:block">
                {game.lastEvent}
              </p>
              <span className="hidden shrink-0 font-mono text-[9px] text-[#789080] sm:block">
                {actionNavigationActive
                  ? "↑ ↓ choose · Enter act"
                  : actionPanelExpanded
                    ? "Choose an action"
                    : "Enter to expand"}
              </span>
              <button
                type="button"
                onClick={() => {
                  setActionPanelExpanded((current) => !current);
                  setActionNavigationActive(false);
                  setHighlightedActionIndex(0);
                }}
                className="ml-auto flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#dce6d8] bg-white text-lg leading-none text-[#789080] transition hover:border-[#94b28c] hover:text-[#24352b] sm:h-8 sm:w-8"
                aria-label={
                  actionPanelExpanded
                    ? "Collapse station actions"
                    : "Expand station actions"
                }
                aria-expanded={actionPanelExpanded}
              >
                <span aria-hidden="true">
                  {actionPanelExpanded ? "⤡" : "⤢"}
                </span>
              </button>
              <button
                type="button"
                onClick={dismissSelectedStation}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#dce6d8] bg-white text-lg leading-none text-[#789080] transition hover:border-[#94b28c] hover:text-[#24352b] sm:hidden"
                aria-label="Close station actions"
              >
                ×
              </button>
            </div>

            <div
              className={`mt-2 flex pb-1 ${
                actionPanelExpanded
                  ? "max-h-[calc(min(36dvh,340px)-80px)] flex-col gap-3 overflow-y-auto overscroll-y-contain pr-1 sm:max-h-[calc(min(76vh,720px)-76px)] sm:gap-2.5"
                  : "gap-3 overflow-x-auto overscroll-x-contain [-webkit-overflow-scrolling:touch] sm:gap-2"
              }`}
              style={
                actionPanelExpanded
                  ? { overscrollBehaviorY: "contain" }
                  : { overscrollBehaviorX: "contain" }
              }
            >
              {selectedActions.map((action, actionIndex) => {
                const cost = actionCost(action, game);
                const monthlyCost = action.monthlyCost ?? 0;
                const requiredCash = Math.max(cost, monthlyCost);
                const blockedByCash = requiredCash > game.cash;
                const blockedByRule = action.disabled?.(game) ?? false;
                const disabled = Boolean(game.activity) || !isAtSelectedStation || blockedByCash || blockedByRule;
                const highlighted =
                  actionNavigationActive && actionIndex === highlightedActionIndex;
                const retiring = action.id === "buildMvp" && game.product > 0;
                const reason = blockedByCash
                  ? monthlyCost > 0
                    ? `Need ${formatMoney(requiredCash - game.cash)} more to cover month one`
                    : `Need ${formatMoney(requiredCash - game.cash)} more`
                  : blockedByRule
                    ? action.disabledReason?.(game)
                    : isCapitalRaiseAction(action.id)
                      ? `Closes · ${action.days} days`
                      : `${action.days} days${
                          monthlyCost > 0
                            ? action.id === "launchCampaign" ||
                              action.id === "increasePaidMediaBudget"
                              ? " · recurring spend"
                              : " · recurring payroll"
                            : cost > 0
                              ? " · pay now"
                              : ""
                        }`;

                return (
                  <div
                    key={action.id}
                    className={
                      actionPanelExpanded
                        ? "w-full min-w-0 shrink-0 overflow-hidden"
                        : "w-[min(240px,72vw)] min-w-[min(240px,72vw)] shrink-0 overflow-hidden sm:w-[220px] sm:min-w-[220px]"
                    }
                    style={{
                      animation: retiring
                        ? "startup-retire-action .65s ease-in-out forwards"
                        : undefined,
                    }}
                  >
                    <button
                      ref={(element) => {
                        actionButtonRefs.current[actionIndex] = element;
                      }}
                      type="button"
                      onClick={() => startAction(action)}
                      onMouseEnter={() => setHighlightedActionIndex(actionIndex)}
                      disabled={disabled}
                      className={`h-full min-h-[4rem] w-full touch-manipulation rounded-2xl border bg-white text-left transition hover:border-[#94b28c] hover:bg-[#f7fbf4] disabled:cursor-not-allowed disabled:opacity-45 sm:min-h-0 ${
                        actionPanelExpanded ? "p-3 sm:p-3.5" : "p-2.5 sm:p-2.5"
                      } ${
                        highlighted
                          ? "border-[#24352b] ring-2 ring-[#24352b]/70 ring-offset-2"
                          : "border-[#dce6d8]"
                      }`}
                      title={action.description}
                      aria-current={highlighted ? "true" : undefined}
                    >
                      <div className="flex items-start gap-2">
                        <span className="text-lg" aria-hidden="true">{action.emoji}</span>
                        <span className="min-w-0 flex-1">
                          <span className="flex items-start gap-1.5 text-xs font-semibold">
                            <span
                              className={`min-w-0 flex-1 leading-snug ${
                                actionPanelExpanded ? "" : "line-clamp-2"
                              }`}
                            >
                              {actionTitle(action, game)}
                            </span>
                            {cost > 0 || monthlyCost > 0 ? (
                              <span className="shrink-0 rounded-md bg-[#f4ead3] px-1.5 py-0.5 font-mono text-[9px] text-[#6d5236]">
                                {monthlyCost > 0
                                  ? `${formatMoney(monthlyCost)}/mo`
                                  : formatMoney(cost)}
                              </span>
                            ) : null}
                          </span>
                          <span
                            className={`mt-1 block text-[10px] text-[#6b7d70] ${
                              actionPanelExpanded ? "leading-relaxed" : "truncate"
                            }`}
                          >
                            {action.description}
                          </span>
                          <span className="mt-1.5 block font-mono text-[9px] text-[#789080]">{reason}</span>
                        </span>
                      </div>
                    </button>
                  </div>
                );
              })}
            </div>
          </aside>
        ) : null}

        {game.outcome ? (
          <div
            className="absolute inset-0 z-50 flex items-center justify-center bg-[#24352b]/35 p-5 backdrop-blur-sm"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="w-full max-w-sm rounded-[32px] border border-white/80 bg-[#fffdf7] p-6 text-center shadow-2xl">
              <div className="text-4xl" aria-hidden="true">
                {game.outcome === "public" ? "🔔" : "🤝"}
              </div>
              <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.2em] text-[#789080]">
                {game.outcome === "public" ? "public company" : "company acquired"} · year {startupYear}
              </p>
              <h2 className="mt-2 text-2xl font-semibold">
                {game.outcome === "public" ? "You rang the bell" : "You made the exit"}
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-[#5c6f60]">
                The company reached {formatCompactMoney(game.exitValue)}. Your remaining {ownershipPercent}% stake is worth about {formatCompactMoney(founderExitValue)}.
              </p>
              <button
                type="button"
                onClick={resetGame}
                className="mt-5 w-full rounded-2xl bg-[#24352b] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#344c3d]"
              >
                build another company
              </button>
            </div>
          </div>
        ) : null}

        {game.bankrupt && showBankruptcySummary ? (
          <div
            className="absolute inset-0 z-50 flex items-center justify-center bg-[#24352b]/35 p-5 backdrop-blur-sm"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="w-full max-w-sm rounded-[32px] border border-white/80 bg-[#fffdf7] p-6 text-center shadow-2xl">
              <div className="text-4xl" aria-hidden="true">💀</div>
              <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.2em] text-[#789080]">
                startup died · year {startupYear}, day {dayOfYear}
              </p>
              <h2 className="mt-2 text-2xl font-semibold">Runway hit zero</h2>
              <p className="mt-2 text-sm leading-relaxed text-[#5c6f60]">
                {teamSize} people were on payroll, but the business earned {formatMoney(revenue)} per day.
              </p>
              <div className="mx-auto mt-4 w-fit rounded-full bg-[#edf5e7] px-4 py-2 font-mono text-sm font-semibold">
                score {score.toLocaleString()}
              </div>
              <div className="mt-5 grid gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowBankruptcySummary(false);
                    openStartupHealth();
                  }}
                  className="w-full rounded-2xl bg-[#24352b] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#344c3d]"
                >
                  view analysis
                </button>
                <button
                  type="button"
                  onClick={resetGame}
                  className="w-full rounded-2xl border border-[#dce6d8] bg-white px-4 py-3 text-sm font-semibold text-[#405247] transition hover:bg-[#f1f6ed]"
                >
                  start over
                </button>
              </div>
            </div>
          </div>
        ) : null}

        {game.bankrupt && !showBankruptcySummary ? (
          <div className="pointer-events-none absolute inset-x-0 bottom-4 z-50 flex justify-center px-4">
            <div className="pointer-events-auto flex items-center gap-2 rounded-2xl border border-white/80 bg-[#fffdf7]/95 p-2 shadow-xl backdrop-blur-md">
              <span className="hidden px-2 text-xs text-[#688071] sm:inline">
                Final company state
              </span>
              <button
                type="button"
                onClick={openStartupHealth}
                className="rounded-xl border border-[#dce6d8] bg-white px-3 py-2 text-xs font-semibold transition hover:bg-[#f1f6ed]"
              >
                view analysis
              </button>
              <button
                type="button"
                onClick={resetGame}
                className="rounded-xl bg-[#24352b] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[#344c3d]"
              >
                start over
              </button>
            </div>
          </div>
        ) : null}

        {showHowToPlay ? (
          <div
            className="absolute inset-0 z-[70] flex items-end justify-center bg-[#24352b]/40 p-3 backdrop-blur-sm sm:items-center sm:p-5"
            onClick={(event) => {
              event.stopPropagation();
              closeHowToPlay();
            }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="startup-help-title"
          >
            <div
              className="w-full max-w-md rounded-[28px] border border-white/80 bg-[#fffdf7] p-5 shadow-2xl sm:rounded-[30px] sm:p-6"
              onClick={(event) => event.stopPropagation()}
            >
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#789080]">
                Startup Simulator
              </p>
              <h2 id="startup-help-title" className="mt-1 text-2xl font-semibold">
                How to play
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-[#5c6f60]">
                Build a company on this grassland. Move your founder, open plots, and keep cash alive.
              </p>
              <ol className="mt-4 space-y-3 text-sm leading-relaxed text-[#405247]">
                <li className="flex gap-3">
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#edf5e7] font-mono text-[11px] font-semibold text-[#54704e]">
                    1
                  </span>
                  <span>
                    <strong className="font-semibold">Tap the grass</strong> to walk.
                    Drag with one finger to look around; pinch to zoom.
                  </span>
                </li>
                <li className="flex gap-3">
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#edf5e7] font-mono text-[11px] font-semibold text-[#54704e]">
                    2
                  </span>
                  <span>
                    <strong className="font-semibold">Tap a brown plot</strong> to open
                    actions for Marketing, Product, Sales, and more.
                  </span>
                </li>
                <li className="flex gap-3">
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#edf5e7] font-mono text-[11px] font-semibold text-[#54704e]">
                    3
                  </span>
                  <span>
                    Start with <strong className="font-semibold">Marketing</strong>, build a
                    product, then close sales. Hire people so the company runs without you.
                  </span>
                </li>
                <li className="flex gap-3">
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#edf5e7] font-mono text-[11px] font-semibold text-[#54704e]">
                    4
                  </span>
                  <span>
                    Watch <strong className="font-semibold">bank</strong> and{" "}
                    <strong className="font-semibold">runway</strong> up top. Cash to zero
                    ends the run.
                  </span>
                </li>
              </ol>
              <p className="mt-4 hidden text-xs text-[#789080] sm:block">
                Desktop tip: WASD or arrow keys also move the founder.
              </p>
              <button
                type="button"
                onClick={closeHowToPlay}
                className="mt-5 w-full rounded-2xl bg-[#24352b] px-4 py-3.5 text-sm font-semibold text-white transition hover:bg-[#344c3d]"
              >
                Got it — let&apos;s build
              </button>
            </div>
          </div>
        ) : null}

        {exitIntent ? (
          <div
            className="absolute inset-0 z-[70] flex items-center justify-center bg-[#24352b]/40 p-5 backdrop-blur-sm"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="startup-exit-title"
          >
            <div className="w-full max-w-sm rounded-[30px] border border-white/80 bg-[#fffdf7] p-6 text-center shadow-2xl">
              <div className="text-4xl" aria-hidden="true">👋</div>
              <h2 id="startup-exit-title" className="mt-3 text-xl font-semibold">
                Leave Startup Sim?
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-[#5c6f60]">
                Your current company is saved on this device and can be resumed later.
                {exitIntent === "website"
                  ? " This button takes you to Ashvin’s website."
                  : ""}
              </p>
              <div className="mt-5 flex gap-2">
                <button
                  type="button"
                  onClick={() => setExitIntent(null)}
                  className="flex-1 rounded-2xl border border-[#cfdcc9] bg-white px-4 py-3 text-sm font-semibold transition hover:bg-[#f3f8ef]"
                >
                  Keep playing
                </button>
                <button
                  type="button"
                  onClick={confirmExit}
                  className="flex-1 rounded-2xl bg-[#24352b] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#344c3d]"
                >
                  {exitIntent === "website" ? "Visit website" : "Leave game"}
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </section>
    </main>
  );
};

export default StartupSimulator;
