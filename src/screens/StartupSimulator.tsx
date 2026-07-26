"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type MouseEvent, type WheelEvent } from "react";

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
  day: number;
  cash: number;
  leads: number;
  leadPatience: number[];
  customers: number;
  issues: number;
  lostUsers: number;
  attention: number;
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
  contentCreators: number;
  blogWriters: number;
  helpDocs: boolean;
  player: { x: number; y: number };
  team: Record<TeamRole, number>;
  activity: Activity | null;
  lastEvent: string;
  recentArrivals: number;
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

const stations: Station[] = [
  {
    id: "investors",
    emoji: "🏦",
    label: "Investors",
    subtitle: "Cash for ownership",
    x: 14,
    y: 23,
    color: "border-amber-300/80 bg-amber-50/90",
  },
  {
    id: "product",
    emoji: "💻",
    label: "Product",
    subtitle: "Quality and retention",
    x: 50,
    y: 20,
    color: "border-sky-300/80 bg-sky-50/90",
    teamRole: "product",
  },
  {
    id: "marketing",
    emoji: "📣",
    label: "Marketing",
    subtitle: "Bring people in",
    x: 86,
    y: 23,
    color: "border-fuchsia-300/80 bg-fuchsia-50/90",
    queue: (game) => game.leads,
    teamRole: "marketing",
  },
  {
    id: "service",
    emoji: "🧾",
    label: "Client work",
    subtitle: "Reliable early cash",
    x: 14,
    y: 76,
    color: "border-emerald-300/80 bg-emerald-50/90",
  },
  {
    id: "sales",
    emoji: "🤝",
    label: "Sales",
    subtitle: "Turn interest into users",
    x: 50,
    y: 80,
    color: "border-orange-300/80 bg-orange-50/90",
    queue: (game) => game.leads,
    teamRole: "sales",
  },
  {
    id: "support",
    emoji: "🛟",
    label: "Support",
    subtitle: "Keep users happy",
    x: 86,
    y: 76,
    color: "border-rose-300/80 bg-rose-50/90",
    queue: (game) => game.issues,
    teamRole: "support",
  },
];

const initialGame: GameState = {
  day: 1,
  cash: 0,
  leads: 0,
  leadPatience: [],
  customers: 0,
  issues: 0,
  lostUsers: 0,
  attention: 0,
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
  contentCreators: 0,
  blogWriters: 0,
  helpDocs: false,
  player: { x: 50, y: 50 },
  team: { product: 0, marketing: 0, sales: 0, support: 0 },
  activity: null,
  lastEvent: "One founder, an empty field, and as long as the runway lasts.",
  recentArrivals: 0,
  recentDepartures: 0,
  bankrupt: false,
};

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

const formatCompactMoney = (amount: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(amount);

const getStation = (id: StationId) =>
  stations.find((station) => station.id === id) ?? stations[0];

const payrollPerDay = (game: GameState) =>
  (Object.keys(game.team) as TeamRole[]).reduce(
    (total, role) => total + game.team[role] * wages[role],
    0,
  );

const revenuePerDay = (game: GameState) => game.customers * 8;

const landingPageLevelOf = (game: GameState) =>
  game.landingPageLevel ?? (game.landingPage ? 1 : 0);

const contentCreatorCountOf = (game: GameState) => game.contentCreators ?? 0;
const blogWriterCountOf = (game: GameState) => game.blogWriters ?? 0;
const demandMarketerCountOf = (game: GameState) =>
  Math.max(
    0,
    game.team.marketing -
      contentCreatorCountOf(game) -
      blogWriterCountOf(game),
  );

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
      description: "Create attention. A landing page captures more of it.",
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
      title: "Create YouTube / SEO content",
      description: "Build an evergreen asset that keeps bringing new people over time.",
      emoji: "🎥",
      days: 10,
      cost: 100,
      disabled: (game) => (game.evergreenContent ?? 0) >= 12,
      disabledReason: () => "Evergreen library is full for now",
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
      next = addLeads(next, newLeads);
      next.lastEvent = `${newLeads} curious people arrived from your post. Someone still needs to sell to them.`;
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
    case "launchCampaign": {
      const newLeads = next.landingPage ? 15 : 9;
      next.attention = clamp(next.attention + 22, 0, 100);
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
      next.reputation = clamp(next.reputation + helped * 2, 0, 100);
      next.lastEvent = `${helped} ${helped === 1 ? "user is" : "users are"} happy again.`;
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
  if (current.bankrupt) return current;

  const day = current.day + 1;
  const payroll = payrollPerDay(current);
  const revenue = revenuePerDay(current);
  let next: GameState = {
    ...current,
    day,
    cash: current.cash + revenue - payroll,
    recentArrivals: 0,
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

  const demandMarketers = demandMarketerCountOf(next);
  if (demandMarketers > 0 && day % 5 === 0) {
    const generated = demandMarketers * (next.landingPage ? 3 : 2);
    next = addLeads(next, generated);
    next.attention = clamp(next.attention + demandMarketers * 2, 0, 100);
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
    next.lastEvent = `${newIssues} ${newIssues === 1 ? "user needs" : "users need"} help.`;
  }

  if (next.team.support > 0 && next.issues > 0) {
    const resolved = Math.min(next.issues, next.team.support);
    next.issues -= resolved;
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

  return next;
};

const leadPositions = [
  { left: 42, top: 84 },
  { left: 47, top: 85 },
  { left: 53, top: 85 },
  { left: 58, top: 84 },
  { left: 39, top: 79 },
  { left: 61, top: 79 },
  { left: 44, top: 89 },
  { left: 56, top: 89 },
];

const issuePositions = [
  { left: 77, top: 65 },
  { left: 82, top: 62 },
  { left: 88, top: 64 },
  { left: 80, top: 57 },
  { left: 87, top: 56 },
  { left: 92, top: 61 },
];

const StartupSimulator = () => {
  const [game, setGame] = useState<GameState>(initialGame);
  const [selectedStationId, setSelectedStationId] = useState<StationId | null>(null);
  const [highlightedActionIndex, setHighlightedActionIndex] = useState(0);
  const [actionNavigationActive, setActionNavigationActive] = useState(false);
  const [dismissedStationId, setDismissedStationId] = useState<StationId | null>(null);
  const [retiredActionIds, setRetiredActionIds] = useState<ActionId[]>([]);
  const [showStats, setShowStats] = useState(false);
  const [paused, setPaused] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [toasts, setToasts] = useState<GameToast[]>([]);
  const previousGameRef = useRef(initialGame);
  const audioContextRef = useRef<AudioContext | null>(null);
  const toastIdRef = useRef(0);
  const toastTimersRef = useRef<number[]>([]);

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
    Math.abs(game.player.x - selectedStation.x) < 10 &&
    Math.abs(game.player.y - selectedStation.y) < 10;

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
  const productStageEmoji = productStage === 3 ? "🏬" : productStage === 2 ? "🏢" : "🏠";
  const productStageLabel = productStage === 3 ? "loved product" : productStage === 2 ? "growing product" : "MVP";
  const churnRisk = game.product >= 70 ? "low" : game.product >= 45 ? "medium" : "high";
  const productRooms = Array.from(
    { length: Math.min(9, Math.max(3, Math.ceil(Math.max(game.customers, 1) / 2))) },
    (_, index) => index,
  );
  const settledCustomers = Math.max(0, game.customers - game.recentArrivals);
  const recentWalkingPeople = Array.from(
    { length: Math.min(game.recentArrivals, 5) },
    (_, index) => index,
  );
  const visibleLeads = useMemo(
    () =>
      (
        game.leadPatience ??
        Array.from({ length: game.leads }, () => 20)
      )
        .slice(0, leadPositions.length)
        .map((patience, index) => ({ index, patience })),
    [game.leadPatience, game.leads],
  );
  const visibleIssues = useMemo(
    () => Array.from({ length: Math.min(game.issues, issuePositions.length) }, (_, index) => index),
    [game.issues],
  );

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
    },
    [],
  );

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

    const id = ++toastIdRef.current;
    setToasts((current) => [...current.slice(-2), { id, icon, title, message }]);

    const timer = window.setTimeout(() => {
      setToasts((current) => current.filter((toast) => toast.id !== id));
      toastTimersRef.current = toastTimersRef.current.filter(
        (activeTimer) => activeTimer !== timer,
      );
    }, 3800);
    toastTimersRef.current.push(timer);

    if (cashGain >= 100 && soundEnabled && audioContextRef.current) {
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
    if (paused || game.bankrupt) return;

    const timer = window.setInterval(() => {
      setGame((current) => advanceGame(current));
    }, 1500);

    return () => window.clearInterval(timer);
  }, [paused, game.bankrupt]);

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
    const nearbyStation = stations.find(
      (station) =>
        Math.abs(game.player.x - station.x) < 10 &&
        Math.abs(game.player.y - station.y) < 10,
    );

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
  }, [dismissedStationId, game.player.x, game.player.y, selectedStationId]);

  const handleWorldClick = (event: MouseEvent<HTMLDivElement>) => {
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

  const handleWorldWheel = (event: WheelEvent<HTMLDivElement>) => {
    if (event.ctrlKey) return;
    event.preventDefault();
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

  const selectStation = (stationId: StationId, event?: MouseEvent) => {
    event?.stopPropagation();
    const station = getStation(stationId);
    setDismissedStationId(null);
    setSelectedStationId(stationId);
    setHighlightedActionIndex(0);
    setActionNavigationActive(false);
    setGame((current) => ({
      ...current,
      player: { x: station.x, y: station.y + (station.y < 50 ? 9 : -9) },
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
    setSelectedStationId(null);
    setHighlightedActionIndex(0);
    setActionNavigationActive(false);
    setDismissedStationId(null);
    setRetiredActionIds([]);
    setShowStats(false);
    setPaused(false);
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
        @keyframes startup-build {
          0% { transform: translate(-50%, -50%) scale(.25); opacity: 0; }
          70% { transform: translate(-50%, -50%) scale(1.06); opacity: 1; }
          100% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
        }
        @keyframes startup-walk-product {
          0% { transform: translateY(0) scale(.9); opacity: 1; }
          78% { transform: translateY(-16vh) scale(1); opacity: 1; }
          100% { transform: translateY(-18vh) scale(.75); opacity: 0; }
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
      `}</style>

      <section
        className="relative h-full w-full overflow-hidden bg-[#a9d477]"
        aria-label="Open startup grassland. Click anywhere to walk."
        onClick={handleWorldClick}
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
          className="absolute h-[120vh] w-[120vw] transition-[left,top] duration-150 ease-out"
          style={{
            left: `calc(-10vw + ${(50 - game.player.x) * 1.2}vw)`,
            top: `calc(-10vh + ${(50 - game.player.y) * 1.2}vh)`,
          }}
          aria-label="Moving startup world"
        >
        <div className="pointer-events-none absolute left-[7%] top-[45%] text-2xl opacity-70">🪨 🌿</div>
        <div className="pointer-events-none absolute left-[27%] top-[91%] text-xl opacity-65">🌱 🌼</div>
        <div className="pointer-events-none absolute left-[70%] top-[46%] text-2xl opacity-70">🌼 🌿</div>
        <div className="pointer-events-none absolute left-[92%] top-[37%] text-2xl opacity-65">🌳</div>
        <div className="pointer-events-none absolute left-[34%] top-[12%] text-xl opacity-60">🪨</div>
        <div className="pointer-events-none absolute left-[66%] top-[90%] text-xl opacity-65">🌱 🪨</div>
        {stations.map((station) => {
          const selected = station.id === selectedStationId;
          const queue = station.queue?.(game) ?? 0;
          const operatorCount = station.teamRole ? game.team[station.teamRole] : 0;
          const salesAutomated = station.id === "sales" && game.selfServeCheckout;
          const marketingAutomated =
            station.id === "marketing" &&
            ((game.evergreenContent ?? 0) > 0 ||
              (game.seoArticles ?? 0) > 0 ||
              game.team.marketing > 0);
          const automated = salesAutomated || marketingAutomated;

          return (
            <button
              key={station.id}
              type="button"
              onClick={(event) => selectStation(station.id, event)}
              className="group absolute z-10 w-28 -translate-x-1/2 -translate-y-1/2 text-center transition hover:-translate-y-[calc(50%+4px)]"
              style={{ left: `${station.x}%`, top: `${station.y}%` }}
              aria-label={`Walk to ${station.label}`}
              title={station.subtitle}
            >
              <div className={`relative mx-auto flex h-[74px] w-[74px] items-center justify-center rounded-[24px] border-2 text-4xl shadow-lg transition group-hover:shadow-xl ${station.color} ${selected ? "ring-4 ring-white/90 ring-offset-2 ring-offset-[#a9d477]" : ""}`}>
                <span aria-hidden="true">{station.emoji}</span>
                {queue > 0 ? (
                  <span className="absolute -right-2 -top-2 min-w-6 rounded-full border-2 border-white bg-[#24352b] px-1.5 py-0.5 text-[10px] font-semibold text-white shadow-sm">
                    {queue}
                  </span>
                ) : null}
                {operatorCount > 0 || automated ? (
                  <span
                    className="absolute -bottom-2 -right-2 rounded-full border-2 border-white bg-[#fffdf7] px-1.5 py-0.5 text-xs shadow-sm"
                    title={automated ? "Automated growth running" : "Team member working"}
                  >
                    {operatorCount > 0 ? `👤${operatorCount > 1 ? operatorCount : ""}` : ""}{salesAutomated ? "⚡" : ""}{marketingAutomated ? "♻️" : ""}
                  </span>
                ) : null}
              </div>
              <p className="mx-auto mt-2 w-fit rounded-full border border-white/80 bg-[#fffdf7]/90 px-3 py-1 text-[10px] font-semibold shadow-sm backdrop-blur-sm">
                {station.label}
              </p>
            </button>
          );
        })}

        {game.product > 0 ? (
          <div
            key={`product-stage-${productStage}`}
            className={`pointer-events-none absolute left-1/2 top-1/2 z-[8] h-[32vh] min-h-[190px] max-h-[250px] w-[32vw] min-w-[220px] max-w-[310px] overflow-hidden rounded-[28px] border-4 shadow-xl ${
              productStage === 3
                ? "border-violet-300 bg-violet-50/90"
                : productStage === 2
                  ? "border-sky-300 bg-sky-50/90"
                  : "border-amber-300 bg-amber-50/90"
            }`}
            style={{ animation: "startup-build .7s ease-out both" }}
            aria-label={`${productStageLabel}: ${game.customers} subscribers inside, ${churnRisk} churn risk`}
          >
            <div className="absolute inset-x-0 top-0 flex items-center justify-between border-b border-[#24352b]/10 bg-white/55 px-4 py-2 backdrop-blur-sm">
              <div className="flex items-center gap-2">
                <span className="text-2xl" aria-hidden="true">{productStageEmoji}</span>
                <div>
                  <p className="font-mono text-[8px] uppercase tracking-[0.16em] text-[#66816f]">your product</p>
                  <p className="text-xs font-semibold">{productStageLabel}</p>
                </div>
              </div>
              <span className="rounded-full bg-white/80 px-2 py-1 font-mono text-[9px] font-semibold">
                {game.product}%
              </span>
            </div>

            <div className="absolute inset-x-4 bottom-12 top-14 grid grid-cols-3 gap-2" aria-hidden="true">
              {productRooms.map((room) => {
                const occupants = Math.min(2, Math.max(0, settledCustomers - room * 2));
                return (
                  <div
                    key={room}
                    className={`flex items-center justify-center rounded-xl border border-[#24352b]/15 text-sm transition-colors ${
                      occupants > 0 ? "bg-emerald-50/90" : "bg-white/55"
                    }`}
                  >
                    {occupants > 0
                      ? Array.from(
                          { length: occupants },
                          (_, personIndex) => (room + personIndex) % 2 === 0 ? "🧑" : "👩",
                        ).join("")
                      : "🪟"}
                  </div>
                );
              })}
            </div>

            <div className="absolute inset-x-3 bottom-3 flex items-center justify-between rounded-full bg-[#24352b]/85 px-3 py-1.5 text-[9px] font-semibold text-white shadow-sm">
              <span>🧑‍🤝‍🧑 {game.customers} subscribed</span>
              <span>+{formatMoney(revenue)}/day</span>
              <span>churn {churnRisk}</span>
            </div>
          </div>
        ) : (
          <div
            className="pointer-events-none absolute left-1/2 top-1/2 z-[7] flex h-[25vh] min-h-[160px] max-h-[210px] w-[27vw] min-w-[190px] max-w-[260px] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-[28px] border-2 border-dashed border-[#6d9d5d]/60 bg-[#d9eaae]/25 text-center"
            aria-label="Empty product plot"
          >
            <div>
              <div className="text-3xl opacity-70" aria-hidden="true">🏗️</div>
              <p className="mt-2 font-mono text-[9px] uppercase tracking-[0.16em] text-[#5d775f]">empty product plot</p>
              <p className="mt-1 text-[10px] text-[#66816f]">build the MVP to open</p>
            </div>
          </div>
        )}

        <div
          className="fixed left-1/2 top-1/2 z-20 -translate-x-1/2 -translate-y-1/2"
          aria-label="Founder"
        >
          <div className="relative flex h-12 w-12 items-center justify-center rounded-full border-4 border-white bg-[#fff7d6] text-2xl shadow-lg sm:h-14 sm:w-14 sm:text-3xl">
            🧑‍💻
            {game.activity ? (
              <span className="absolute -right-2 -top-2 rounded-full border-2 border-white bg-[#24352b] px-1.5 py-0.5 text-[9px] font-semibold text-white">
                {progressPercent}%
              </span>
            ) : null}
          </div>
        </div>

        <div
          className="pointer-events-none absolute inset-0 z-[14]"
          aria-label={`${game.recentArrivals} people walking into the product`}
        >
          {recentWalkingPeople.map((person, index) => (
            <span
              key={`walking-${game.day}-${person}`}
              className="absolute text-xl drop-shadow-sm sm:text-2xl"
              style={{
                left: `${47 + index * 2.5}%`,
                top: `${78 + (index % 2) * 2}%`,
                animation: `startup-walk-product 1.3s ease-in ${index * 0.08}s both`,
              }}
              aria-hidden="true"
            >
              {index % 2 === 0 ? "🧑" : "👩"}
            </span>
          ))}
        </div>

        <div className="pointer-events-none absolute inset-0 z-[11]" aria-label={`${game.leads} people waiting for sales`}>
          {visibleLeads.map((lead, index) => {
            const position = leadPositions[index];
            const patiencePercent = clamp((lead.patience / 28) * 100, 0, 100);
            return (
              <div
                key={`lead-${lead.index}`}
                className="absolute flex w-8 flex-col items-center text-lg opacity-95 drop-shadow-sm sm:text-xl"
                style={{
                  left: `${position.left}%`,
                  top: `${position.top}%`,
                  animation: `startup-bob 2s ease-in-out ${index * 0.2}s infinite`,
                }}
                aria-hidden="true"
              >
                {index % 2 === 0 ? "🧑" : "👩"}
                <span className="mt-0.5 h-1 w-7 overflow-hidden rounded-full bg-white/80 shadow-sm">
                  <span
                    className={`block h-full rounded-full ${
                      patiencePercent > 50
                        ? "bg-emerald-500"
                        : patiencePercent > 25
                          ? "bg-amber-500"
                          : "bg-rose-500"
                    }`}
                    style={{ width: `${patiencePercent}%` }}
                  />
                </span>
              </div>
            );
          })}
          {game.leads > visibleLeads.length ? (
            <span className="absolute left-[63%] top-[88%] rounded-full bg-white/75 px-2 py-1 text-[10px] font-semibold shadow-sm">
              +{game.leads - visibleLeads.length}
            </span>
          ) : null}
        </div>

        <div className="pointer-events-none absolute inset-0 z-[13]" aria-label={`${game.issues} users need help`}>
          {visibleIssues.map((issue, index) => {
            const position = issuePositions[index];
            return (
              <span
                key={`issue-${issue}`}
                className="absolute text-xl drop-shadow-sm sm:text-2xl"
                style={{
                  left: `${position.left}%`,
                  top: `${position.top}%`,
                  animation: `startup-bob 1.3s ease-in-out ${index * 0.12}s infinite`,
                }}
                aria-hidden="true"
              >
                🙋
              </span>
            );
          })}
        </div>

        {game.recentDepartures > 0 ? (
          <div
            key={`departures-${game.day}`}
            className="pointer-events-none absolute right-[8%] top-[49%] z-20 text-2xl"
            style={{ animation: "startup-leave .8s ease-in forwards" }}
            aria-label={`${game.recentDepartures} users left`}
          >
            😤{game.recentDepartures > 1 ? ` ×${game.recentDepartures}` : ""}
          </div>
        ) : null}
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
                  {selectedStation.emoji} {selectedStation.label}
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
