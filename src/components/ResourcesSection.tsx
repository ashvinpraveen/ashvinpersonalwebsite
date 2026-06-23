import SectionBlock from "@/components/SectionBlock";
import Link from "next/link";
import { resources } from "@/lib/resources";
import { cardCompact, arrowHover, linkPrimary } from "@/lib/styles";

const ResourcesSection = () => {
  const featuredResources = resources.slice(0, 4);

  return (
    <SectionBlock id="resources" label="Resources">
      <div className="grid gap-3 md:grid-cols-2">
        {featuredResources.map((resource) => (
          <a
            key={resource.href}
            href={resource.href}
            target="_blank"
            rel="noopener noreferrer"
            className={`group flex min-h-32 items-start justify-between gap-4 ${cardCompact}`}
          >
            <div>
              <p className="text-sm font-semibold text-foreground group-hover:text-foreground/70 transition-colors">
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
      <Link href="/resources" className={`mt-5 inline-flex font-mono text-xs ${linkPrimary}`}>
        See all resources →
      </Link>
    </SectionBlock>
  );
};

export default ResourcesSection;
