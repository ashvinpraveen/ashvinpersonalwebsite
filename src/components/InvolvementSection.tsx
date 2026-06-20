import SectionBlock from "@/components/SectionBlock";
import { cardCompact, textSecondary, linkPrimary, heading } from "@/lib/styles";

const projects = [
  {
    name: "National AI Competition (NAIC)",
    logo: "/logo-naic.png",
    href: "https://rakantutor.org/naic",
    sourceHref: "https://github.com/ashvinpraveen/rakantutor",
    role: "Director",
    description: "Leading Malaysia's largest student AI challenge, run by Rakan Tutor and co-organized with Sunway University. Students compete in 5 tracks: building AI apps, training models, generative art, smart city engineering, and future classroom design.",
  },
  {
    name: "RakanTutor.org",
    logo: null,
    initials: "RT",
    href: "https://rakantutor.org",
    sourceHref: "https://github.com/ashvinpraveen/rakantutor",
    role: "Builder",
    description: "Built the website for Rakan Tutor, a student-led education nonprofit in Malaysia.",
  },
  {
    name: "Malaysian.ai",
    logo: "/logo-malaysian-ai.png",
    href: "https://www.malaysian.ai/",
    sourceHref: "https://github.com/ashvinpraveen/malaysianai",
    role: "Builder / host",
    description: "The home of AI builders in Malaysia, backed by 500 Global. I built the site and host regular community runs on Mondays and Thursdays.",
  },
  {
    name: "Build for Public",
    logo: null,
    initials: "BP",
    href: "https://buildforpublic.com",
    sourceHref: "https://github.com/mfrashad/buildforpublic",
    role: "Joining",
    description: "Joining a community of people building practical public-interest projects in the open.",
  },
];

const InvolvementSection = () => {
  return (
    <SectionBlock id="involvement" label="Also Involved In">
      <div className="grid gap-4 md:grid-cols-2">
        {projects.map((project) => (
          <div
            key={project.href}
            className={`flex h-full flex-col ${cardCompact}`}
          >
            <div className="flex items-start justify-between gap-4 mb-2">
              <div className="flex items-center gap-3">
                {project.logo ? (
                  <img
                    src={project.logo}
                    alt={project.name}
                    className="w-9 h-9 rounded-lg object-contain shrink-0"
                  />
                ) : (
                  <span className="flex w-9 h-9 items-center justify-center rounded-xl bg-primary/10 font-mono text-xs font-semibold text-primary shrink-0">
                    {project.initials || "P"}
                  </span>
                )}
                <h3 className={`text-base font-semibold ${heading}`}>
                  <a
                    href={project.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-primary transition-colors"
                  >
                    {project.name} ↗
                  </a>
                </h3>
              </div>
              <span className="font-mono text-xs text-primary bg-primary/10 px-2 py-0.5 rounded-full shrink-0">
                {project.role}
              </span>
            </div>
            <p className={`text-sm leading-relaxed ${textSecondary}`}>
              {project.description}
            </p>
            <div className="mt-auto pt-4">
              <a
                href={project.sourceHref}
                target="_blank"
                rel="noopener noreferrer"
                className={`font-mono text-xs ${linkPrimary} text-muted-foreground`}
              >
                Source →
              </a>
            </div>
          </div>
        ))}
      </div>
    </SectionBlock>
  );
};

export default InvolvementSection;
