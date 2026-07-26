"use client";

import Link from "next/link";
import AshvinPet from "@/features/chat-widget/AshvinPet";
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

type StationId = "service" | "investors" | "product" | "marketing" | "sales" | "support";
type TeamRole = "product" | "marketing" | "sales" | "support";
type ActionId =
  | "clientWork"
  | "pitchPreseed"
  | "pitchSeed"
  | "buildMvp"
  | "improveProduct"
  | "expandCapacity"
  | "fixBugs"
  | "hireEngineer"
  | "postContent"
  | "buildLandingPage"
  | "improveLandingPage"
  | "createEvergreenContent"
  | "writeSeoArticle"
  | "launchCampaign"
  | "hireMarketer"
  | "hireContentCreator"
  | "hireBlogWriter"
  | "closeLeads"
  | "improveSales"
  | "buildSelfServeCheckout"
  | "hireSalesperson"
  | "answerUsers"
  | "writeHelpDocs"
  | "hireSupport";

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
  salesProcess: number;
  selfServeCheckout: boolean;
  landingPage: boolean;
  landingPageLevel: number;
  evergreenContent: number;
  seoArticles: number;
  campaignsRun: number;
  contentCreators: number;
  blogWriters: number;
  helpDocs: boolean;
  player: { x: number; y: number };
  team: Record<TeamRole, number>;
  activity: Activity | null;
  lastEvent: string;
  recentLeads: number;
  recentArrivals: number;
  recentIssues: number;
  recentResolved: number;
  recentDepartures: number;
  bankrupt: boolean;
};

type ActionConfig = {
  id: ActionId;
  title: string;
  description: string;
  emoji: string;
  days: number;
  cost: number;
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

const stations: Station[] = [
  {
    id: "investors",
    emoji: "🏦",
    label: "Investors",
    subtitle: "Cash for ownership",
    x: 90,
    y: 76,
    color: "border-amber-300/80 bg-amber-50/90",
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
    x: 90,
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
  salesProcess: 0,
  selfServeCheckout: false,
  landingPage: false,
  landingPageLevel: 0,
  evergreenContent: 0,
  seoArticles: 0,
  campaignsRun: 0,
  contentCreators: 0,
  blogWriters: 0,
  helpDocs: false,
  player: { x: 50, y: 50 },
  team: { product: 0, marketing: 0, sales: 0, support: 0 },
  activity: null,
  lastEvent: "One founder, an empty field, and as long as the runway lasts.",
  recentLeads: 0,
  recentArrivals: 0,
  recentIssues: 0,
  recentResolved: 0,
  recentDepartures: 0,
  bankrupt: false,
};

const eventToastsEnabled = false;
const cashPilePosition = { x: 75, y: 66 };

const wages: Record<TeamRole, number> = {
  product: 12,
  marketing: 8,
  sales: 9,
  support: 7,
};

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

const formatMoney = (amount: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(amount);

const formatCompactMoney = (amount: number) => {
  const absoluteAmount = Math.abs(amount);
  const sign = amount < 0 ? "-" : "";
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

const getStation = (id: StationId) =>
  stations.find((station) => station.id === id) ?? stations[0];

const payrollPerDay = (game: GameState) =>
  (Object.keys(game.team) as TeamRole[]).reduce(
    (total, role) => total + game.team[role] * wages[role],
    0,
  );

const revenuePerDay = (game: GameState) => game.customers * (20 / 30);

const landingPageLevelOf = (game: GameState) =>
  game.landingPageLevel ?? (game.landingPage ? 1 : 0);

const monthlyChurnRateOf = (game: GameState) =>
  game.product === 0
    ? 100
    : clamp(Math.round(125 - game.product * 1.25), 5, 90);

const REFERRAL_QUALITY_THRESHOLD = 70;
const referralRateOf = (game: GameState) =>
  game.product < REFERRAL_QUALITY_THRESHOLD
    ? 0
    : clamp(Math.round((game.product - 60) * 0.75), 8, 30);

const contentCreatorCountOf = (game: GameState) => game.contentCreators ?? 0;
const blogWriterCountOf = (game: GameState) => game.blogWriters ?? 0;
const demandMarketerCountOf = (game: GameState) =>
  Math.max(
    0,
    game.team.marketing -
      contentCreatorCountOf(game) -
      blogWriterCountOf(game),
  );

const hasMarketingInvestment = (game: GameState) =>
  game.attention > 0 ||
  game.landingPage ||
  (game.evergreenContent ?? 0) > 0 ||
  (game.seoArticles ?? 0) > 0 ||
  (game.campaignsRun ?? 0) > 0 ||
  game.team.marketing > 0 ||
  game.leads > 0 ||
  game.customers > 0;

const isStationVisible = (game: GameState, stationId: StationId) => {
  if (stationId === "sales") return hasMarketingInvestment(game);
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
    { x: 30, y: 78, visible: (game.campaignsRun ?? 0) > 0 },
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
      description: "Raise enough to hire, but give away part of the company.",
      emoji: "🗣️",
      days: 12,
      cost: 0,
      disabled: (game) => game.ownership < 100,
      disabledReason: () => "You already raised the pre-seed",
    },
    {
      id: "pitchSeed",
      title: "Pitch a seed round",
      description: "Traction unlocks a larger round—and a larger tradeoff.",
      emoji: "📈",
      days: 16,
      cost: 0,
      disabled: (game) => game.customers < 10 || game.ownership < 90,
      disabledReason: (game) =>
        game.customers < 10 ? `Need ${10 - game.customers} more active users` : "Seed already raised",
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
      cost: 1100,
      disabled: (game) => game.team.product > 0,
      disabledReason: () => "Engineer already hired",
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
      description: "Increase the percentage of interested visitors who subscribe.",
      emoji: "📈",
      days: 5,
      cost: 200,
      disabled: (game) =>
        !game.landingPage || landingPageLevelOf(game) >= 3,
      disabledReason: (game) =>
        !game.landingPage
          ? "Build the landing page first"
          : "Landing page is fully optimized",
    },
    {
      id: "createEvergreenContent",
      title: "Create an evergreen video",
      description: "Open a video plot that keeps bringing new people over time.",
      emoji: "🎥",
      days: 10,
      cost: 100,
      disabled: (game) => (game.evergreenContent ?? 0) >= 12,
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
      title: "Run a small campaign",
      description: "Buy a burst of demand. It is wasted if nobody can serve it.",
      emoji: "📬",
      days: 5,
      cost: 300,
    },
    {
      id: "hireMarketer",
      title: "Hire a marketer",
      description: "They continuously bring in leads while you focus elsewhere.",
      emoji: "🧑‍🎨",
      days: 5,
      cost: 750,
      disabled: (game) => demandMarketerCountOf(game) >= 4,
      disabledReason: () => "The demand team is full for now",
    },
    {
      id: "hireContentCreator",
      title: "Hire a content creator",
      description: "They publish evergreen videos that build a compounding audience over time.",
      emoji: "🧑‍🎬",
      days: 7,
      cost: 650,
      disabled: (game) => contentCreatorCountOf(game) >= 3,
      disabledReason: () => "The creator team is full for now",
    },
    {
      id: "hireBlogWriter",
      title: "Hire a blog writer",
      description: "They steadily grow an SEO library that brings in people long after publishing.",
      emoji: "🧑‍💻",
      days: 7,
      cost: 600,
      disabled: (game) => blogWriterCountOf(game) >= 3,
      disabledReason: () => "The writing team is full for now",
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
      id: "improveSales",
      title: "Improve the sales playbook",
      description: "Close one more person every time you or your salesperson sells.",
      emoji: "📋",
      days: 7,
      cost: 250,
      disabled: (game) => game.salesProcess >= 3,
      disabledReason: () => "Sales playbook is fully upgraded",
    },
    {
      id: "buildSelfServeCheckout",
      title: "Build self-serve checkout",
      description: "Automatically converts some leads without adding payroll.",
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
      id: "hireSalesperson",
      title: "Hire a salesperson",
      description: "They work through the lead queue automatically every few days.",
      emoji: "🧑‍💼",
      days: 5,
      cost: 700,
      disabled: (game) => game.team.sales > 0,
      disabledReason: () => "Salesperson already hired",
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
      id: "hireSupport",
      title: "Hire customer support",
      description: "They continuously clear user problems before they become churn.",
      emoji: "🧑‍🚒",
      days: 5,
      cost: 550,
      disabled: (game) => game.team.support > 0,
      disabledReason: () => "Support person already hired",
    },
  ],
};

const actionLabel = (action: ActionConfig) =>
  action.cost > 0 ? `${action.title} · ${formatMoney(action.cost)}` : action.title;

const beginAction = (game: GameState, stationId: StationId, action: ActionConfig): GameState => {
  if (game.activity || action.cost > game.cash || action.disabled?.(game)) return game;

  return {
    ...game,
    started: true,
    cash: game.cash - action.cost,
    activity: {
      actionId: action.id,
      stationId,
      label: action.title,
      totalDays: action.days,
      elapsedDays: 0,
    },
    lastEvent: `${action.title} started. You are now the operator here.`,
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

const applyCompletedAction = (game: GameState, actionId: ActionId): GameState => {
  let next: GameState = { ...game, activity: null };

  switch (actionId) {
    case "clientWork":
      next.cash += 1000;
      next.lastEvent = "Client sprint delivered: +$1,000. The startup made no progress while you were away.";
      break;
    case "pitchPreseed":
      next.cash += 5000;
      next.ownership = 90;
      next.valuation = 50000;
      next.lastEvent = "Pre-seed raised: +$5,000, -10% ownership. You can now hire or accelerate.";
      break;
    case "pitchSeed":
      next.cash += 15000;
      next.ownership = 75;
      next.valuation = 100000;
      next.lastEvent = "Seed round raised: +$15,000. Investors now own a quarter of the company.";
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
      next.team = { ...next.team, product: 1 };
      next.lastEvent = "Engineer hired. Product quality will now improve in the background.";
      break;
    case "postContent": {
      const newLeads = next.landingPage ? 6 : 3;
      next.attention = clamp(next.attention + 12, 0, 100);
      next.socialMomentum = clamp(next.socialMomentum + 34, 0, 100);
      next.lastSocialPostDay = next.day;
      next = addLeads(next, newLeads);
      next.lastEvent = `${newLeads} curious people arrived. Social reach jumped to ${next.socialMomentum}%, but it will fade without another post.`;
      break;
    }
    case "buildLandingPage":
      next.landingPage = true;
      next.landingPageLevel = 1;
      next.attention = clamp(next.attention + 8, 0, 100);
      next.lastEvent = "Landing page live. Future marketing will capture more interested people.";
      break;
    case "improveLandingPage":
      next.landingPageLevel = Math.min(3, landingPageLevelOf(next) + 1);
      next.lastEvent = `Landing page improved to level ${next.landingPageLevel}. Sales channels will now convert more visitors.`;
      break;
    case "createEvergreenContent":
      next.evergreenContent = Math.min(12, (next.evergreenContent ?? 0) + 1);
      next.attention = clamp(next.attention + 6, 0, 100);
      next.lastEvent = `Evergreen asset ${next.evergreenContent}/12 published. It will keep attracting people automatically.`;
      break;
    case "writeSeoArticle":
      next.seoArticles = Math.min(18, (next.seoArticles ?? 0) + 1);
      next.attention = clamp(next.attention + 4, 0, 100);
      next.lastEvent = `SEO plot planted with ${next.seoArticles} searchable ${next.seoArticles === 1 ? "article" : "articles"}. It will compound into traffic.`;
      break;
    case "launchCampaign": {
      const newLeads = next.landingPage ? 15 : 9;
      next.attention = clamp(next.attention + 22, 0, 100);
      next.campaignsRun = (next.campaignsRun ?? 0) + 1;
      next = addLeads(next, newLeads);
      next.lastEvent = `${newLeads} people joined the queue. Can sales and product keep up?`;
      break;
    }
    case "hireMarketer":
      next.team = { ...next.team, marketing: next.team.marketing + 1 };
      next.lastEvent = `${demandMarketerCountOf(next)} ${demandMarketerCountOf(next) === 1 ? "marketer is" : "marketers are"} now bringing in leads automatically.`;
      break;
    case "hireContentCreator":
      next.contentCreators = contentCreatorCountOf(next) + 1;
      next.team = { ...next.team, marketing: next.team.marketing + 1 };
      next.lastEvent = "Content creator hired. Your evergreen audience will now compound in the background.";
      break;
    case "hireBlogWriter":
      next.blogWriters = blogWriterCountOf(next) + 1;
      next.team = { ...next.team, marketing: next.team.marketing + 1 };
      next.lastEvent = "Blog writer hired. Your searchable content library will now grow automatically.";
      break;
    case "closeLeads": {
      const before = next.customers;
      const landingPageBonus = Math.max(0, landingPageLevelOf(next) - 1);
      next = convertLeads(next, 3 + next.salesProcess + landingPageBonus);
      const converted = next.customers - before;
      next.lastEvent =
        converted > 0
          ? `${converted} ${converted === 1 ? "person became a user" : "people became users"}. They now expect the product to work.`
          : "Nobody was ready to subscribe yet.";
      break;
    }
    case "improveSales":
      next.salesProcess += 1;
      next.lastEvent = "The sales playbook improved. Each sales cycle can now close one more person.";
      break;
    case "buildSelfServeCheckout":
      next.selfServeCheckout = true;
      next.lastEvent = "Self-serve checkout is live. Some leads can now subscribe without speaking to anyone.";
      break;
    case "hireSalesperson":
      next.team = { ...next.team, sales: 1 };
      next.lastEvent = "Salesperson hired. They will keep working through the lead queue.";
      break;
    case "answerUsers": {
      const helped = Math.min(next.issues, 5);
      next.issues -= helped;
      next.recentResolved += helped;
      next.reputation = clamp(next.reputation + helped * 2, 0, 100);
      next.lastEvent = `${helped} ${helped === 1 ? "user is" : "users are"} happy and returning to the product.`;
      break;
    }
    case "writeHelpDocs":
      next.helpDocs = true;
      next.lastEvent = "Help docs published. Some future support problems will solve themselves.";
      break;
    case "hireSupport":
      next.team = { ...next.team, support: 1 };
      next.lastEvent = "Support hired. User problems will now be cleared continuously.";
      break;
  }

  return next;
};

const advanceGame = (current: GameState): GameState => {
  if (!current.started || current.bankrupt) return current;

  const day = current.day + 1;
  const payroll = payrollPerDay(current);
  const revenue = revenuePerDay(current);
  let next: GameState = {
    ...current,
    day,
    cash: current.cash - payroll,
    uncollectedCash: current.uncollectedCash + revenue,
    recentLeads: 0,
    recentArrivals: 0,
    recentIssues: 0,
    recentResolved: 0,
    recentDepartures: 0,
  };

  if (next.cash < 0) {
    return {
      ...next,
      cash: 0,
      activity: null,
      bankrupt: true,
      lastEvent: "Runway hit zero. The company could not make payroll.",
    };
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

  if (next.team.product > 0 && day % 7 === 0) {
    next.product = clamp(next.product + 2, 0, 100);
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
      const landingMultiplier = next.landingPage ? 1.35 : 1;
      const generated = Math.max(
        1,
        Math.ceil((next.socialMomentum / 32) * landingMultiplier),
      );
      next = addLeads(next, generated);
      next.lastEvent = `${generated} ${generated === 1 ? "person arrived" : "people arrived"} from your recent social posts. Reach is now ${next.socialMomentum}%.`;
    }
  }

  const demandMarketers = demandMarketerCountOf(next);
  if (demandMarketers > 0 && day % 5 === 0) {
    const generated = demandMarketers * (next.landingPage ? 3 : 2);
    next = addLeads(next, generated);
    next.attention = clamp(next.attention + demandMarketers * 2, 0, 100);
    next.socialMomentum = clamp(
      next.socialMomentum + demandMarketers * 14,
      0,
      100,
    );
    next.lastSocialPostDay = day;
    next.lastEvent = `${demandMarketers} ${demandMarketers === 1 ? "marketer brought" : "marketers brought"} ${generated} more people into the queue.`;
  }

  const contentCreators = contentCreatorCountOf(next);
  if (contentCreators > 0 && day % 10 === 0) {
    const published = Math.min(
      contentCreators,
      Math.max(0, 12 - (next.evergreenContent ?? 0)),
    );
    next.evergreenContent = Math.min(
      12,
      (next.evergreenContent ?? 0) + published,
    );
    next.attention = clamp(next.attention + published * 3, 0, 100);
    if (published > 0) {
      next.lastEvent = `${published} new evergreen ${published === 1 ? "video was" : "videos were"} published. The audience engine is getting stronger.`;
    }
  }

  const blogWriters = blogWriterCountOf(next);
  if (blogWriters > 0 && day % 12 === 0) {
    next.seoArticles = (next.seoArticles ?? 0) + blogWriters;
    next.attention = clamp(next.attention + blogWriters * 2, 0, 100);
    next.lastEvent = `${blogWriters} new SEO ${blogWriters === 1 ? "article was" : "articles were"} published. Search traffic will keep building.`;
  }

  const evergreenAssets = next.evergreenContent ?? 0;
  if (evergreenAssets > 0 && day % 6 === 0) {
    const generated = Math.max(1, Math.ceil(evergreenAssets * 0.6));
    next = addLeads(next, generated);
    next.lastEvent = `${generated} ${generated === 1 ? "person found" : "people found"} you through ${evergreenAssets} evergreen ${evergreenAssets === 1 ? "asset" : "assets"}.`;
  }

  const seoArticles = next.seoArticles ?? 0;
  if (seoArticles > 0 && day % 8 === 0) {
    const captureMultiplier = next.landingPage ? 1.25 : 1;
    const generated = Math.max(
      1,
      Math.ceil(seoArticles * 0.45 * captureMultiplier),
    );
    next = addLeads(next, generated);
    next.lastEvent = `${generated} ${generated === 1 ? "person arrived" : "people arrived"} from your growing SEO library.`;
  }

  const referralRate = referralRateOf(next);
  if (referralRate > 0 && next.customers > 0 && day % 10 === 0) {
    const generated = Math.max(
      1,
      Math.ceil((next.customers * referralRate) / 300),
    );
    next = addLeads(next, generated);
    next.lastEvent = `${generated} warm ${generated === 1 ? "lead arrived" : "leads arrived"} through customer referrals—for free.`;
  }

  if (
    next.team.sales > 0 &&
    day % 3 === 0 &&
    next.product > 0 &&
    next.leads > 0
  ) {
    const before = next.customers;
    const landingPageBonus = Math.max(0, landingPageLevelOf(next) - 1);
    next = convertLeads(next, 1 + next.salesProcess + landingPageBonus);
    const converted = next.customers - before;
    if (converted > 0) {
      next.lastEvent = `Sales onboarded ${converted} new ${converted === 1 ? "user" : "users"} automatically.`;
    }
  }

  const selfServeInterval = Math.max(2, 5 - landingPageLevelOf(next));
  if (
    next.selfServeCheckout &&
    day % selfServeInterval === 0 &&
    next.product >= 45 &&
    next.leads > 0
  ) {
    const before = next.customers;
    next = convertLeads(next, 1);
    const converted = next.customers - before;
    if (converted > 0) {
      next.lastEvent = "A customer subscribed through self-serve checkout.";
    }
  }

  const issueInterval = next.helpDocs ? 12 : 8;
  if (next.customers > 0 && day % issueInterval === 0) {
    const qualityRisk = Math.max(0.15, (100 - next.product) / 100);
    const newIssues = Math.max(1, Math.floor(next.customers * qualityRisk * 0.2));
    next.issues += newIssues;
    next.recentIssues += newIssues;
    next.lastEvent = `${newIssues} ${newIssues === 1 ? "user needs" : "users need"} help.`;
  }

  if (next.team.support > 0 && next.issues > 0) {
    const resolved = Math.min(next.issues, next.team.support);
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

  return next;
};

const StartupSimulator = () => {
  const [game, setGame] = useState<GameState>(initialGame);
  const [selectedStationId, setSelectedStationId] = useState<StationId | null>(null);
  const [highlightedActionIndex, setHighlightedActionIndex] = useState(0);
  const [actionNavigationActive, setActionNavigationActive] = useState(false);
  const [dismissedStationId, setDismissedStationId] = useState<StationId | null>(null);
  const [retiredActionIds, setRetiredActionIds] = useState<ActionId[]>([]);
  const [showStats, setShowStats] = useState(false);
  const [paused, setPaused] = useState(false);
  const [worldZoom, setWorldZoom] = useState(1);
  const [isDraggingWorld, setIsDraggingWorld] = useState(false);
  const [isFounderMoving, setIsFounderMoving] = useState(false);
  const [founderFacing, setFounderFacing] = useState<1 | -1>(1);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [toasts, setToasts] = useState<GameToast[]>([]);
  const [worldWalkers, setWorldWalkers] = useState<WorldWalker[]>([]);
  const previousGameRef = useRef(initialGame);
  const audioContextRef = useRef<AudioContext | null>(null);
  const toastIdRef = useRef(0);
  const walkerIdRef = useRef(0);
  const toastTimersRef = useRef<number[]>([]);
  const walkerTimersRef = useRef<number[]>([]);
  const founderMoveTimerRef = useRef<number | null>(null);
  const previousPlayerRef = useRef(initialGame.player);
  const worldDragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    playerX: number;
    playerY: number;
    moved: boolean;
  } | null>(null);
  const suppressWorldClickRef = useRef(false);

  const selectedStation = selectedStationId ? getStation(selectedStationId) : null;
  const selectedActions = useMemo(
    () =>
      selectedStationId
        ? actionConfigs[selectedStationId].filter(
            (action) => !retiredActionIds.includes(action.id),
          )
        : [],
    [retiredActionIds, selectedStationId],
  );
  const isAtSelectedStation =
    selectedStation !== null &&
    (selectedStation.id === "marketing"
      ? visibleMarketingPlotPositions(game).some(
          (plot) =>
            Math.abs(game.player.x - plot.x) < 15 &&
            Math.abs(game.player.y - plot.y) < 15,
        )
      : Math.abs(game.player.x - selectedStation.x) < 15 &&
        Math.abs(game.player.y - selectedStation.y) < 15);

  const progressPercent = game.activity
    ? Math.round((game.activity.elapsedDays / game.activity.totalDays) * 100)
    : 0;
  const payroll = payrollPerDay(game);
  const revenue = revenuePerDay(game);
  const dailyBurn = Math.max(0, payroll - revenue);
  const runwayDays = dailyBurn > 0 ? Math.floor(Math.max(0, game.cash) / dailyBurn) : null;
  const runwayDial = runwayDays === null ? 100 : clamp((runwayDays / 90) * 100, 0, 100);
  const runwayLabel = runwayDays === null ? "∞" : `${runwayDays}d`;
  const companyValue = Math.max(
    game.valuation,
    Math.max(0, game.cash) + game.customers * 1200 + game.product * 100,
  );
  const equityValue = companyValue * (game.ownership / 100);
  const startupYear = Math.floor((game.day - 1) / 365) + 1;
  const dayOfYear = ((game.day - 1) % 365) + 1;
  const teamSize = Object.values(game.team).reduce((sum, count) => sum + count, 0);
  const productStage = game.product >= 70 ? 3 : game.product >= 45 ? 2 : 1;
  const productStageLabel = productStage === 3 ? "loved product" : productStage === 2 ? "growing product" : "MVP";
  const churnRisk = game.product >= 70 ? "low" : game.product >= 45 ? "medium" : "high";
  const monthlyChurnRate = monthlyChurnRateOf(game);
  const referralRate = referralRateOf(game);
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
        demandMarketerCountOf(game) > 0 ||
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
      detail: `${game.evergreenContent ?? 0} evergreen`,
    },
    {
      id: "seo",
      emoji: "🔎",
      label: "Search",
      x: 15,
      y: 78,
      unlocked: (game.seoArticles ?? 0) > 0 || blogWriterCountOf(game) > 0,
      strength: (game.seoArticles ?? 0) + blogWriterCountOf(game),
      detail: `${game.seoArticles ?? 0} articles`,
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
      detail: `level ${landingPageLevelOf(game)}`,
    },
    {
      id: "paid",
      emoji: "📮",
      label: "Campaigns",
      x: 30,
      y: 78,
      unlocked: (game.campaignsRun ?? 0) > 0,
      strength: game.campaignsRun ?? 0,
      detail: `${game.campaignsRun ?? 0} launched`,
    },
  ];
  const activeMarketingSources = marketingChannels.filter(
    (channel) => channel.unlocked && channel.id !== "landing",
  );
  const visibleMarketingChannels = marketingChannels.filter(
    (channel) => channel.id === "social" || channel.unlocked,
  );
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

  useEffect(() => {
    const unlockAudio = () => {
      if (!audioContextRef.current) {
        audioContextRef.current = new AudioContext();
      }
      if (audioContextRef.current.state === "suspended") {
        void audioContextRef.current.resume();
      }
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
      if (founderMoveTimerRef.current !== null) {
        window.clearTimeout(founderMoveTimerRef.current);
      }
    },
    [],
  );

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
    const cashGain = game.cash - previous.cash;
    const meaningfulChange =
      game.lastEvent !== previous.lastEvent ||
      game.customers !== previous.customers ||
      game.leads !== previous.leads ||
      game.issues !== previous.issues ||
      teamSize !== previousTeamSize ||
      Math.abs(cashGain) >= 100;

    previousGameRef.current = game;
    if (!meaningfulChange) return;

    const message = game.lastEvent;
    const normalizedMessage = message.toLowerCase();
    let icon = "✨";
    let title = "Something happened";

    if (cashGain >= 100) {
      icon = "🪙";
      title = `+${formatMoney(cashGain)}`;
    } else if (game.customers > previous.customers) {
      icon = "🎉";
      title =
        game.customers - previous.customers === 1
          ? "New subscriber!"
          : `${game.customers - previous.customers} new subscribers!`;
    } else if (teamSize > previousTeamSize || normalizedMessage.includes("hired")) {
      icon = "👋";
      title = "The team grew";
    } else if (
      game.customers < previous.customers ||
      normalizedMessage.includes("churned") ||
      normalizedMessage.includes("left")
    ) {
      icon = "💨";
      title = "Someone left";
    } else if (game.leads > previous.leads) {
      icon = "🙋";
      title = "New people arrived";
    } else if (game.issues > previous.issues) {
      icon = "🛟";
      title = "Users need help";
    } else if (game.activity && game.activity !== previous.activity) {
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

    if (cashGain > 0 && soundEnabled && audioContextRef.current) {
      const audioContext = audioContextRef.current;
      if (audioContext.state === "suspended") {
        void audioContext.resume();
      }

      const now = audioContext.currentTime;
      const oscillator = audioContext.createOscillator();
      const gain = audioContext.createGain();
      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(880, now);
      oscillator.frequency.exponentialRampToValueAtTime(1320, now + 0.12);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(0.08, now + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.28);
      oscillator.connect(gain);
      gain.connect(audioContext.destination);
      oscillator.start(now);
      oscillator.stop(now + 0.3);
    }
  }, [
    game,
    teamSize,
    soundEnabled,
  ]);

  useEffect(() => {
    if (!game.started || paused || game.bankrupt) return;

    const timer = window.setInterval(() => {
      setGame((current) => advanceGame(current));
    }, 1500);

    return () => window.clearInterval(timer);
  }, [game.started, paused, game.bankrupt]);

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
        walkX: (endX - startX) * 1.2,
        walkY: (endY - startY) * 1.2,
        quarterX: (quarterX - startX) * 1.2,
        quarterY: (quarterY - startY) * 1.2,
        midX: (midX - startX) * 1.2,
        midY: (midY - startY) * 1.2,
        threeQuarterX: (threeQuarterX - startX) * 1.2,
        threeQuarterY: (threeQuarterY - startY) * 1.2,
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
        ...((game.campaignsRun ?? 0) > 0 ? [{ x: 30, y: 78 }] : []),
      ];

      Array.from({ length: Math.min(game.recentLeads, 6) }, (_, index) => {
        const source = sources[(game.day + index) % sources.length];
        const isSocialSource = source.x === 24 && source.y === 58;
        const isCampaignSource = source.x === 30 && source.y === 78;
        const isReferralSource = source.x === 33 && source.y === 38;
        const startX = isCampaignSource
          ? 30
          : isReferralSource
            ? 33
            : source.x + 4.2;
        const startY =
          (isCampaignSource
            ? 73.8
            : isReferralSource
              ? 42.2
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
                : 19.8,
          quarterY: isReferralSource ? 48 : 58,
          midX: isSocialSource
            ? game.landingPage
              ? 42
              : 37
            : isReferralSource
              ? 28.2
              : 24,
          midY: 58,
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

    Array.from({ length: Math.min(game.recentArrivals, 6) }, (_, index) => {
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
    game.campaignsRun,
    game.contentCreators,
    game.day,
    game.evergreenContent,
    game.landingPage,
    game.recentArrivals,
    game.recentIssues,
    game.recentLeads,
    game.recentResolved,
    game.seoArticles,
    referralRate,
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
    const onKeyDown = (event: KeyboardEvent) => {
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
            return;
          }

          const action = selectedActions[highlightedActionIndex];
          if (action) {
            setGame((current) => beginAction(current, selectedStationId, action));
            setActionNavigationActive(false);
          }
          return;
        }

        if (event.key === "Escape") {
          event.preventDefault();
          if (actionNavigationActive) {
            setActionNavigationActive(false);
            return;
          }
          setDismissedStationId(selectedStationId);
          setSelectedStationId(null);
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
    highlightedActionIndex,
    isAtSelectedStation,
    selectedActions,
    selectedStationId,
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
        setActionNavigationActive(false);
      }
      if (dismissedStationId) setDismissedStationId(null);
      return;
    }

    if (dismissedStationId === nearbyStation.id) return;
    if (selectedStationId !== nearbyStation.id) {
      setSelectedStationId(nearbyStation.id);
      setHighlightedActionIndex(0);
      setActionNavigationActive(false);
    }
  }, [dismissedStationId, game, selectedStationId]);

  const handleWorldClick = (event: MouseEvent<HTMLDivElement>) => {
    if (suppressWorldClickRef.current) {
      suppressWorldClickRef.current = false;
      return;
    }

    const bounds = event.currentTarget.getBoundingClientRect();
    const horizontalMove = ((event.clientX - bounds.left - bounds.width / 2) / bounds.width) * (100 / 1.2);
    const verticalMove = ((event.clientY - bounds.top - bounds.height / 2) / bounds.height) * (100 / 1.2);
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
      (event.target as HTMLElement).closest("button, a, aside")
    ) {
      return;
    }

    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
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
    const drag = worldDragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;

    const deltaX = event.clientX - drag.startX;
    const deltaY = event.clientY - drag.startY;
    if (!drag.moved && Math.hypot(deltaX, deltaY) > 4) {
      drag.moved = true;
      setActionNavigationActive(false);
    }
    if (!drag.moved) return;

    const bounds = event.currentTarget.getBoundingClientRect();
    const horizontalMove =
      (deltaX / bounds.width) * (100 / (1.2 * worldZoom));
    const verticalMove =
      (deltaY / bounds.height) * (100 / (1.2 * worldZoom));
    setGame((current) => ({
      ...current,
      player: {
        x: clamp(drag.playerX - horizontalMove, 5, 95),
        y: clamp(drag.playerY - verticalMove, 8, 92),
      },
    }));
  };

  const finishWorldDrag = (event: PointerEvent<HTMLDivElement>) => {
    const drag = worldDragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;

    suppressWorldClickRef.current = drag.moved;
    worldDragRef.current = null;
    setIsDraggingWorld(false);
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
    setActionNavigationActive(false);
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
  ) => {
    event?.stopPropagation();
    const station = getStation(stationId);
    setDismissedStationId(null);
    setSelectedStationId(stationId);
    setHighlightedActionIndex(0);
    setActionNavigationActive(false);
    setGame((current) => ({
      ...current,
      player: position ?? { x: station.x, y: station.y },
    }));
  };

  const startAction = (action: ActionConfig) => {
    if (game.activity || !selectedStationId || !isAtSelectedStation) return;
    setGame((current) => beginAction(current, selectedStationId, action));
    setActionNavigationActive(false);
  };

  const dismissSelectedStation = () => {
    if (selectedStationId) setDismissedStationId(selectedStationId);
    setSelectedStationId(null);
    setActionNavigationActive(false);
  };

  const resetGame = () => {
    setGame(initialGame);
    previousGameRef.current = initialGame;
    setToasts([]);
    setWorldWalkers([]);
    walkerTimersRef.current.forEach((timer) => window.clearTimeout(timer));
    walkerTimersRef.current = [];
    setSelectedStationId(null);
    setHighlightedActionIndex(0);
    setActionNavigationActive(false);
    setDismissedStationId(null);
    setRetiredActionIds([]);
    setShowStats(false);
    setPaused(false);
    setWorldZoom(1);
    setIsFounderMoving(false);
    setFounderFacing(1);
    previousPlayerRef.current = initialGame.player;
    if (founderMoveTimerRef.current !== null) {
      window.clearTimeout(founderMoveTimerRef.current);
      founderMoveTimerRef.current = null;
    }
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

  return (
    <main className="fixed inset-0 z-40 overflow-hidden bg-[#a9d477] text-[#24352b]">
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
      `}</style>

      <section
        className={`relative h-full w-full select-none overflow-hidden bg-[#a9d477] ${
          isDraggingWorld ? "cursor-grabbing" : "cursor-grab"
        }`}
        style={{ touchAction: "none" }}
        aria-label="Open startup grassland. Click anywhere to walk."
        onClick={handleWorldClick}
        onPointerDown={handleWorldPointerDown}
        onPointerMove={handleWorldPointerMove}
        onPointerUp={finishWorldDrag}
        onPointerCancel={finishWorldDrag}
        onWheel={handleWorldWheel}
      >
        <div
          className="pointer-events-none absolute inset-0 opacity-35 transition-[background-position] duration-500 [background-image:radial-gradient(#6da04f_1px,transparent_1px)] [background-size:24px_24px]"
          style={{ backgroundPosition: `${-game.player.x * 4}px ${-game.player.y * 4}px` }}
        />
        <div className="pointer-events-none absolute -left-10 -top-10 h-64 w-64 rounded-full bg-[#d6eea4]/50 blur-3xl" />

        <div className="absolute inset-x-4 top-4 z-30 flex items-start justify-between gap-3 sm:inset-x-6 sm:top-6">
          <div className="pointer-events-auto flex items-center gap-2">
            <Link
              href="/"
              onClick={(event) => event.stopPropagation()}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-white/70 bg-white/70 text-lg shadow-sm backdrop-blur-sm transition hover:bg-white"
              aria-label="Back to Ashvin Praveen"
            >
              ↩
            </Link>
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
              title={runwayDays === null ? "The startup is not currently burning cash" : `${runwayDays} days until the startup runs out of cash`}
            >
              <p className="font-mono text-[8px] uppercase tracking-[0.16em] text-[#789080]">runway</p>
              <div className="mt-0.5 flex items-center gap-1.5">
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: runwayDial > 30 ? "#5e9955" : "#c65f4d" }}
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
                {game.ownership}% <span className="font-normal text-[#789080]">· {formatCompactMoney(equityValue)}</span>
              </p>
            </div>
          </div>

          <div className="pointer-events-auto flex items-center gap-2">
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
              className="flex h-10 w-10 items-center justify-center rounded-full border border-white/70 bg-white/75 text-base shadow-sm backdrop-blur-sm transition hover:bg-white"
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
              className="flex h-10 w-10 items-center justify-center rounded-full border border-white/70 bg-white/75 text-base shadow-sm backdrop-blur-sm transition hover:bg-white"
              aria-label={paused ? "Resume game" : "Pause game"}
            >
              {paused ? "▶" : "Ⅱ"}
            </button>
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                setShowStats((current) => !current);
              }}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-white/70 bg-white/75 text-lg shadow-sm backdrop-blur-sm transition hover:bg-white"
              aria-label={showStats ? "Close startup stats" : "Open startup stats"}
              aria-expanded={showStats}
            >
              {showStats ? "×" : "📊"}
            </button>
          </div>
        </div>

        {eventToastsEnabled ? (
          <div
            className="pointer-events-none absolute left-1/2 top-20 z-50 flex w-[min(420px,calc(100vw-2rem))] -translate-x-1/2 flex-col gap-2 sm:top-24"
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
            className="absolute right-4 top-20 z-40 w-[min(320px,calc(100vw-2rem))] rounded-3xl border border-white/80 bg-[#fffdf7]/95 p-4 shadow-xl backdrop-blur-md sm:right-6 sm:top-24"
            onClick={(event) => event.stopPropagation()}
            onWheel={(event) => event.stopPropagation()}
            aria-label="Startup stats"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#789080]">the machine</p>
                <h1 className="mt-1 text-xl font-semibold">Startup health</h1>
              </div>
              <button
                type="button"
                onClick={resetGame}
                className="font-mono text-[10px] text-[#789080] underline-offset-2 hover:underline"
              >
                reset
              </button>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2">
              {[
                ["💵", "cash", formatMoney(game.cash)],
                ["🚶", "waiting", game.leads.toString()],
                ["🧑‍🤝‍🧑", "subscribed", game.customers.toString()],
                ["🙋", "issues", game.issues.toString()],
                ["✨", "product", `${game.product}%`],
                ["❤️", "reputation", `${game.reputation}%`],
                ["👀", "attention", `${game.attention}%`],
                ["♻️", "content", `${(game.evergreenContent ?? 0) + (game.seoArticles ?? 0)} assets`],
                ["🪙", "equity", `${game.ownership}% · ${formatCompactMoney(equityValue)}`],
                ["👥", "team", teamSize.toString()],
              ].map(([emoji, label, value]) => (
                <div key={label} className="rounded-2xl bg-[#f7f3e8] px-2.5 py-2">
                  <span className="text-sm" aria-hidden="true">{emoji}</span>
                  <p className="mt-1 font-mono text-[8px] uppercase tracking-[0.12em] text-[#789080]">{label}</p>
                  <p className="mt-0.5 truncate text-sm font-semibold">{value}</p>
                </div>
              ))}
            </div>
            <div className="mt-3 flex items-center justify-between rounded-2xl bg-[#edf5e7] px-3 py-2 text-xs">
              <span>+{formatMoney(revenue)}/day</span>
              <span>-{formatMoney(payroll)}/day payroll</span>
            </div>
            <p className="mt-3 border-t border-[#e3e9df] pt-3 text-xs leading-relaxed text-[#52665a]">
              {game.lastEvent}
            </p>
          </div>
        ) : null}

        <div
          className={`absolute h-[120vh] w-[120vw] ${
            isDraggingWorld
              ? ""
              : "transition-[left,top,transform] duration-300 ease-out"
          }`}
          style={{
            left: `${50 - game.player.x * 1.2 * worldZoom}vw`,
            top: `${50 - game.player.y * 1.2 * worldZoom}vh`,
            transform: `scale(${worldZoom})`,
            transformOrigin: "top left",
          }}
          aria-label="Moving startup world"
        >
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

          <div className="pointer-events-none absolute left-[82%] top-[67%] z-[3] h-[31%] w-[16%] rounded-[28px] border-2 border-dashed border-[#6f8e56]/45">
            <span className="absolute left-5 top-0 -translate-y-1/2 bg-[#a9d477] px-2 font-mono text-[9px] uppercase tracking-[0.18em] text-[#54704e]">
              Funding corner
            </span>
          </div>

          <svg
            className="pointer-events-none absolute inset-0 z-[4] h-full w-full overflow-visible"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            {game.landingPage ? (
              <g>
                <path
                  d="M 45.5 58 L 50.2 58"
                  fill="none"
                  stroke="#765337"
                  strokeWidth="9"
                  opacity="0.48"
                  vectorEffect="non-scaling-stroke"
                  strokeLinecap="round"
                />
                <path
                  d="M 45.5 58 L 50.2 58"
                  fill="none"
                  stroke="#d8b978"
                  strokeWidth="6.5"
                  opacity="0.95"
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
                  strokeWidth="9"
                  opacity="0.48"
                  vectorEffect="non-scaling-stroke"
                  strokeLinecap="round"
                />
                <path
                  d="M 58.2 58 L 63.8 58"
                  fill="none"
                  stroke="#d8b978"
                  strokeWidth="6.5"
                  opacity="0.95"
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
                  strokeWidth="9"
                  opacity="0.48"
                  vectorEffect="non-scaling-stroke"
                  strokeLinecap="round"
                />
                <path
                  d="M 72.2 58 L 79.2 58"
                  fill="none"
                  stroke="#d8b978"
                  strokeWidth="6.5"
                  opacity="0.95"
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
                  strokeWidth="7"
                  opacity="0.42"
                  vectorEffect="non-scaling-stroke"
                  strokeLinecap="round"
                />
                <path
                  d={`M 28.2 58 L ${game.landingPage ? 38.5 : 50.2} 58`}
                  fill="none"
                  stroke="#d8b978"
                  strokeWidth="4.8"
                  opacity="0.92"
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
                      strokeWidth="7"
                      opacity="0.42"
                      vectorEffect="non-scaling-stroke"
                      strokeLinecap="round"
                    />
                    <path
                      d={path}
                      fill="none"
                      stroke="#d8b978"
                      strokeWidth="4.8"
                      opacity="0.92"
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
            const plotSize = 80 + plotLevel * 9;
            const isStarterPlot = channel.id === "social" && !channel.unlocked;
            return (
              <button
                key={channel.id}
                type="button"
                onClick={(event) =>
                  selectStation("marketing", event, {
                    x: channel.x,
                    y: channel.y,
                  })
                }
                className="group absolute z-10 -translate-x-1/2 -translate-y-1/2 text-center transition hover:-translate-y-[calc(50%+3px)]"
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
                    ? `${game.customers} ${game.customers === 1 ? "subscriber" : "subscribers"} · ${monthlyChurnRate}% churn after 1 month`
                    : "empty product plot"
                  : station.id === "sales"
                    ? `${game.leads} waiting${game.selfServeCheckout ? " · self-serve" : ""}`
                    : station.id === "support"
                      ? `${game.issues} need help`
                      : station.subtitle;
              const plotLevel =
                station.id === "product"
                  ? Math.ceil(game.product / 20)
                  : station.id === "sales"
                    ? game.salesProcess + game.team.sales + (game.selfServeCheckout ? 1 : 0)
                    : station.id === "support"
                      ? game.team.support + (game.helpDocs ? 1 : 0)
                      : 1;
              const plotSize =
                station.id === "product" && game.product === 0
                  ? 88
                  : Math.min(136, 98 + Math.max(1, plotLevel) * 8);
              const isEmptyProduct =
                station.id === "product" && game.product === 0;

              return (
                <button
                  key={station.id}
                  type="button"
                  onClick={(event) => selectStation(station.id, event)}
                  className="group absolute z-10 -translate-x-1/2 -translate-y-1/2 text-center transition hover:-translate-y-[calc(50%+3px)]"
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
                            }}
                            aria-hidden="true"
                          >
                            {index % 2 === 0 ? "🧑" : "👩"}
                          </span>
                        ))
                      : null}
                    {operatorCount > 0 ? (
                      <span className="absolute right-1.5 top-1.5 z-20 rounded-full border border-[#70472b] bg-[#f8e9c4]/95 px-1.5 py-0.5 text-[9px]">
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
              className="absolute z-[13] h-20 w-24 -translate-x-1/2 -translate-y-1/2 transition hover:scale-105"
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
              <span className="absolute -right-2 -top-2 rounded-full border-2 border-white bg-[#24352b] px-1.5 py-0.5 text-[9px] font-semibold text-white">
                {progressPercent}%
              </span>
            ) : null}
          </div>
        </div>

        {game.activity ? (
          <div className={`pointer-events-none absolute left-4 z-20 hidden rounded-2xl border border-white/80 bg-white/80 px-4 py-3 shadow-sm backdrop-blur-sm sm:block ${selectedStation ? "bottom-36" : "bottom-5"}`}>
            <div className="flex items-center justify-between gap-8">
              <p className="text-xs font-semibold">{game.activity.label}</p>
              <span className="font-mono text-[10px] text-[#66816f]">{progressPercent}%</span>
            </div>
            <div className="mt-2 h-1.5 w-44 overflow-hidden rounded-full bg-[#d4e4cf]">
              <div
                className="h-full rounded-full bg-[#6d9d5d] transition-[width] duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        ) : null}

        {selectedStation ? (
          <aside
            className="absolute bottom-3 left-1/2 z-30 w-[min(820px,calc(100vw-1.5rem))] -translate-x-1/2 rounded-3xl border border-white/80 bg-[#fffdf7]/95 p-3 shadow-xl backdrop-blur-md sm:bottom-4"
            onClick={(event) => event.stopPropagation()}
            onWheel={(event) => event.stopPropagation()}
            aria-label={`${selectedStation.label} actions`}
          >
            <div className="flex items-center gap-3 border-b border-[#e3e9df] pb-2">
              <div className="shrink-0">
                <p className="font-mono text-[8px] uppercase tracking-[0.16em] text-[#789080]">
                  {selectedStation.id === "sales" && game.selfServeCheckout
                    ? "self-serve · running"
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
                  {selectedStation.label}
                </h2>
              </div>
              <p className="min-w-0 flex-1 truncate text-[11px] text-[#6b7d70]">
                {game.lastEvent}
              </p>
              <span className="hidden shrink-0 font-mono text-[9px] text-[#789080] sm:block">
                {actionNavigationActive ? "← → choose · Enter act" : "Enter to choose"}
              </span>
              <button
                type="button"
                onClick={dismissSelectedStation}
                className="ml-auto shrink-0 text-xl leading-none text-[#789080] hover:text-[#24352b]"
                aria-label="Close station actions"
              >
                ×
              </button>
            </div>

            <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
              {selectedActions.map((action, actionIndex) => {
                const blockedByCash = action.cost > game.cash;
                const blockedByRule = action.disabled?.(game) ?? false;
                const disabled = Boolean(game.activity) || !isAtSelectedStation || blockedByCash || blockedByRule;
                const highlighted =
                  actionNavigationActive && actionIndex === highlightedActionIndex;
                const retiring = action.id === "buildMvp" && game.product > 0;
                const reason = blockedByCash
                  ? `Need ${formatMoney(action.cost - game.cash)} more`
                  : blockedByRule
                    ? action.disabledReason?.(game)
                    : `${action.days} days${action.cost > 0 ? ` · pay now` : ""}`;

                return (
                  <div
                    key={action.id}
                    className="w-[220px] min-w-[220px] shrink-0 overflow-hidden"
                    style={{
                      animation: retiring
                        ? "startup-retire-action .65s ease-in-out forwards"
                        : undefined,
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => startAction(action)}
                      onMouseEnter={() => setHighlightedActionIndex(actionIndex)}
                      disabled={disabled}
                      className={`h-full w-full rounded-2xl border bg-white p-2.5 text-left transition hover:border-[#94b28c] hover:bg-[#f7fbf4] disabled:cursor-not-allowed disabled:opacity-45 ${
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
                          <span className="block truncate text-xs font-semibold">{actionLabel(action)}</span>
                          <span className="mt-1 block truncate text-[10px] text-[#6b7d70]">{action.description}</span>
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

        {game.bankrupt ? (
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
              <button
                type="button"
                onClick={resetGame}
                className="mt-5 w-full rounded-2xl bg-[#24352b] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#344c3d]"
              >
                start over
              </button>
            </div>
          </div>
        ) : null}
      </section>
    </main>
  );
};

export default StartupSimulator;
