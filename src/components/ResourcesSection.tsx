import SectionBlock from "@/components/SectionBlock";
import { cardCompact, arrowHover } from "@/lib/styles";

const resources = [
  {
    label: "Cleve.ai",
    href: "https://cleve.ai",
    description: "My AI workspace. Best place to start if you want to write better with AI.",
  },
  {
    label: "Paul Graham's essays",
    href: "http://paulgraham.com/essays.html",
    description: "Still the clearest thinking on building.",
  },
  {
    label: "Lenny's Newsletter",
    href: "https://www.lennysnewsletter.com",
    description: "Product and growth, practically written.",
  },
  {
    label: "Malaysian.ai",
    href: "https://www.malaysian.ai/",
    description: "The home of AI builders in Malaysia. If you're building here, start here.",
  },
  {
    label: "How to Start a Startup (YC)",
    href: "https://www.youtube.com/playlist?list=PL5q_lef6zVkaTY_cT1k7qFNF2TidHCe-1",
    description: "Stanford lectures from YC partners. Free MBA in 20 hours.",
  },
  {
    label: "Stratechery",
    href: "https://stratechery.com",
    description: "Ben Thompson on tech strategy. Deep and consistent.",
  },
  {
    label: "Antler",
    href: "https://www.antler.co",
    description: "The VC that backed Cleve. Great for day-zero founders.",
  },
  {
    label: "The Almanack of Naval Ravikant",
    href: "https://www.navalmanack.com",
    description: "Wealth, leverage, and clear thinking. Free to read.",
  },
];

const ResourcesSection = () => {
  return (
    <SectionBlock id="resources" label="Resources">
      <div className="grid gap-3 md:grid-cols-2">
        {resources.map((resource) => (
          <a
            key={resource.href}
            href={resource.href}
            target="_blank"
            rel="noopener noreferrer"
            className={`group flex min-h-32 items-start justify-between gap-4 ${cardCompact}`}
          >
            <div>
              <p className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
                {resource.label}
              </p>
              <p className="text-sm leading-relaxed text-muted-foreground mt-0.5">
                {resource.description}
              </p>
            </div>
            <span className={`${arrowHover} mt-0.5`}>
              →
            </span>
          </a>
        ))}
      </div>
    </SectionBlock>
  );
};

export default ResourcesSection;
