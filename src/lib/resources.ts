export type Resource = {
  label: string;
  href?: string;
  description: string;
  category: "Startups" | "AI and building" | "Writing and thinking" | "Malaysia" | "What's in my laptop" | "What's in my bag";
  format:
    | "Essay archive"
    | "Newsletter"
    | "Community"
    | "Course"
    | "Analysis"
    | "Book"
    | "Program"
    | "Browser"
    | "Coding agent"
    | "Website builder"
    | "AI tools"
    | "Workspace"
    | "Video editor"
    | "Design"
    | "Notebook"
    | "Camera"
    | "Audio"
    | "Stationery"
    | "Headphones"
    | "Adapter"
    | "Storage"
    | "Everyday carry"
    | "Laptop";
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
  {
    label: "Dia",
    description: "A really nice browser I use to replace Chrome. Amazing delight and product design.",
    category: "What's in my laptop",
    format: "Browser",
  },
  {
    label: "Codex",
    description: "My main coding agent. Comes with a ChatGPT subscription, and can generate images too.",
    category: "What's in my laptop",
    format: "Coding agent",
  },
  {
    label: "Claude Code",
    description: "My secondary coding agent. Comes with a Claude subscription.",
    category: "What's in my laptop",
    format: "Coding agent",
  },
  {
    label: "Antigravity",
    description: "My last resort agent if I run out of tokens, but it has a great free tier and is what I recommend if you're starting out and do not want to pay yet.",
    category: "What's in my laptop",
    format: "Coding agent",
  },
  {
    label: "Lovable",
    description: "What I recommend to people starting out with building their first website.",
    category: "What's in my laptop",
    format: "Website builder",
  },
  {
    label: "Google AI Studio",
    description: "Like Lovable. Not as polished, but the free tier is amazing.",
    category: "What's in my laptop",
    format: "AI tools",
  },
  {
    label: "Google API",
    description: "Free AI API. Use this for AI projects when you're experimenting.",
    category: "What's in my laptop",
    format: "AI tools",
  },
  {
    label: "Cleve",
    description: "My daily note-taker, writing space, project management, and documentation system. Where all my knowledge work happens.",
    category: "What's in my laptop",
    format: "Workspace",
  },
  {
    label: "Granola",
    description: "Great product design. I love the details.",
    category: "What's in my laptop",
    format: "Workspace",
  },
  {
    label: "DaVinci Resolve",
    description: "Still my favourite video editor. CapCut is what I recommend to beginners though.",
    category: "What's in my laptop",
    format: "Video editor",
  },
  {
    label: "Figma",
    description: "For design.",
    category: "What's in my laptop",
    format: "Design",
  },
  {
    label: "Muji paper notebook",
    description: "A paper notebook to draw out ideas.",
    category: "What's in my bag",
    format: "Notebook",
  },
  {
    label: "ZV-E10 II with kit lens",
    description: "Camera.",
    category: "What's in my bag",
    format: "Camera",
  },
  {
    label: "DJI Mic Mini",
    description: "Loveee the mic. I got the set with the charging case, and the case is worth it.",
    category: "What's in my bag",
    format: "Audio",
  },
  {
    label: "Pencil case",
    description: "Filled with a bunch of pens. Pilot G2 is my favourite.",
    category: "What's in my bag",
    format: "Stationery",
  },
  {
    label: "Sony wired headphones",
    description: "I hate charging.",
    category: "What's in my bag",
    format: "Headphones",
  },
  {
    label: "USB-C to HDMI adapter",
    description: "Simple, useful, always ends up mattering.",
    category: "What's in my bag",
    format: "Adapter",
  },
  {
    label: "SanDisk 1TB SSD",
    description: "For video projects that I'm actively working on.",
    category: "What's in my bag",
    format: "Storage",
  },
  {
    label: "WD 4TB HDD",
    description: "Archive drive. I'll transfer my SanDisk stuff over once in a while.",
    category: "What's in my bag",
    format: "Storage",
  },
  {
    label: "Bottle of water",
    description: "I use a protein shaker from Decathlon.",
    category: "What's in my bag",
    format: "Everyday carry",
  },
  {
    label: "MacBook Air M1",
    description: "Honestly wild that it's so good. Love how light it is, and I can carry it around and vibe code on the trains.",
    category: "What's in my bag",
    format: "Laptop",
  },
];

export const resourceCategories = [
  "Startups",
  "AI and building",
  "Writing and thinking",
  "Malaysia",
  "What's in my laptop",
  "What's in my bag",
] as const;
