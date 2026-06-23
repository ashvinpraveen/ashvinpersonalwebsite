export type Resource = {
  label: string;
  href: string;
  description: string;
  category: "Startups" | "AI and building" | "Writing and thinking" | "Malaysia";
  format: "Essay archive" | "Newsletter" | "Community" | "Course" | "Analysis" | "Book" | "Program";
};

export const resources: Resource[] = [
  {
    label: "Paul Graham's essays",
    href: "http://paulgraham.com/essays.html",
    description: "Still the clearest thinking on building, ambition, and startups.",
    category: "Writing and thinking",
    format: "Essay archive",
  },
  {
    label: "Lenny's Newsletter",
    href: "https://www.lennysnewsletter.com",
    description: "Product and growth, practically written.",
    category: "Startups",
    format: "Newsletter",
  },
  {
    label: "Malaysian.ai",
    href: "https://www.malaysian.ai/",
    description: "The home of AI builders in Malaysia. If you're building here, start here.",
    category: "Malaysia",
    format: "Community",
  },
  {
    label: "How to Start a Startup",
    href: "https://www.youtube.com/playlist?list=PL5q_lef6zVkaTY_cT1k7qFNF2TidHCe-1",
    description: "Stanford lectures from YC partners. Free MBA in 20 hours.",
    category: "Startups",
    format: "Course",
  },
  {
    label: "Stratechery",
    href: "https://stratechery.com",
    description: "Ben Thompson on tech strategy. Deep and consistent.",
    category: "AI and building",
    format: "Analysis",
  },
  {
    label: "Antler",
    href: "https://www.antler.co",
    description: "The VC that backed Cleve. Great for day-zero founders.",
    category: "Startups",
    format: "Program",
  },
  {
    label: "The Almanack of Naval Ravikant",
    href: "https://www.navalmanack.com",
    description: "Wealth, leverage, and clear thinking. Free to read.",
    category: "Writing and thinking",
    format: "Book",
  },
];

export const resourceCategories = [
  "Startups",
  "AI and building",
  "Writing and thinking",
  "Malaysia",
] as const;
