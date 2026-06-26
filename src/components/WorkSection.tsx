import SectionBlock from "@/components/SectionBlock";
import { cardCompact, textSecondary, heading } from "@/lib/styles";

type ProjectItem = {
  name: string;
  href: string;
  githubHref?: string;
  description: string;
  logo?: string;
  alt?: string;
  initials?: string;
};

const projects: ProjectItem[] = [
  {
    name: "Cleve.ai",
    href: "https://cleve.ai",
    logo: "/logo-cleve.png",
    alt: "Cleve",
    description:
      "AI workspace for writing and thinking. 40,000+ users. Backed by Antler.",
  },
  {
    name: "National AI Competition (NAIC)",
    logo: "/logo-naic.png",
    href: "https://rakantutor.org/naic",
    githubHref: "https://github.com/ashvinpraveen/rakantutor",
    description:
      "Malaysia's largest student AI challenge. Co-organized with Sunway University.",
  },
  {
    name: "Malaysian.ai",
    logo: "/logo-malaysian-ai.png",
    href: "https://www.malaysian.ai/",
    githubHref: "https://github.com/ashvinpraveen/malaysianai",
    description: "Community for AI builders in Malaysia. Backed by 500 Global.",
  },
  {
    name: "RakanTutor.org",
    logo: null,
    initials: "RT",
    href: "https://rakantutor.org",
    githubHref: "https://github.com/ashvinpraveen/rakantutor",
    description: "Website for a student-led education nonprofit in Malaysia.",
  },
  {
    name: "Build for Public",
    logo: null,
    initials: "BP",
    href: "https://buildforpublic.com",
    githubHref: "https://github.com/mfrashad/buildforpublic",
    description:
      "Community building practical public-interest projects in the open.",
  },
];

const WorkSection = () => {
  return (
    <SectionBlock id="projects" label="Projects">
      <div className="grid gap-3 md:grid-cols-2">
        {projects.map((item) => (
          <div key={item.href} className={`group relative flex h-full flex-col ${cardCompact}`}>
            <a
              href={item.href}
              target="_blank"
              rel="noopener noreferrer"
              className="absolute inset-0 z-10 rounded-2xl"
              aria-label={`View ${item.name}`}
            />
            <div className="relative z-20 flex items-center gap-3 mb-2 pointer-events-none">
              {item.logo ? (
                <img
                  src={item.logo}
                  alt={item.alt ?? item.name}
                  className="w-9 h-9 rounded-xl object-contain shrink-0"
                />
              ) : (
                <span className="flex w-9 h-9 items-center justify-center rounded-xl bg-muted font-mono text-xs font-semibold text-muted-foreground shrink-0">
                  {item.initials}
                </span>
              )}
              <h3 className={`text-sm font-semibold ${heading}`}>
                {item.name}
              </h3>
            </div>
            <p className={`relative z-20 text-sm leading-relaxed pointer-events-none ${textSecondary}`}>
              {item.description}
            </p>
            <div className="relative z-20 mt-auto pt-3 flex gap-4">
              <span className="font-mono text-xs text-muted-foreground transition-colors group-hover:text-foreground">
                View →
              </span>
              {item.githubHref && (
                <a
                  href={item.githubHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  GitHub →
                </a>
              )}
            </div>
          </div>
        ))}
      </div>
    </SectionBlock>
  );
};

export default WorkSection;
