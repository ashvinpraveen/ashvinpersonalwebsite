import SectionBlock from "@/components/SectionBlock";
import { card, textBody, heading } from "@/lib/styles";

type WorkItem = {
  name: string;
  href: string;
  githubHref?: string;
  cta: string;
  description: string[];
  logo?: string;
  alt?: string;
  initials?: string;
};

const work: WorkItem[] = [
  {
    name: "Cleve.ai",
    href: "https://cleve.ai",
    logo: "/logo-cleve.png",
    alt: "Cleve",
    cta: "Try it free",
    description: [
      "AI workspace for writing and thinking. All the major models in one place, with memory that carries across sessions.",
      "40,000+ users. Backed by Antler.",
    ],
  },
];

const WorkSection = () => {
  return (
    <SectionBlock id="work" label="What I'm Building">
      <div className="space-y-4">
        {work.map((item) => (
          <div
            key={item.href}
            className={card}
          >
            <div className="grid gap-5 md:grid-cols-[minmax(0,1fr)_auto] md:items-start">
              <div>
                <div className="flex items-center gap-3 mb-3">
                  {item.logo ? (
                    <img
                      src={item.logo}
                      alt={item.alt ?? item.name}
                      className="w-10 h-10 rounded-xl object-contain shrink-0"
                    />
                  ) : (
                    <span className="flex w-10 h-10 items-center justify-center rounded-xl bg-muted font-mono text-xs font-semibold text-muted-foreground shrink-0">
                      {item.initials}
                    </span>
                  )}
                  <h3 className={`text-lg font-semibold ${heading}`}>
                    {item.name}
                  </h3>
                </div>
                <div className={`max-w-2xl space-y-3 text-base leading-relaxed ${textBody}`}>
                  {item.description.map((paragraph) => (
                    <p key={paragraph}>{paragraph}</p>
                  ))}
                </div>
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-2 md:flex-col md:items-end">
                <a
                  href={item.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  {item.cta} →
                </a>
                {item.githubHref && (
                  <a
                    href={item.githubHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-mono text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    GitHub →
                  </a>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </SectionBlock>
  );
};

export default WorkSection;
