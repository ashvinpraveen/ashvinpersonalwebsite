import SectionBlock from "@/components/SectionBlock";
import { cardCompact, textSecondary, heading } from "@/lib/styles";

const projects = [
  {
    name: "National AI Competition (NAIC)",
    logo: "/logo-naic.png",
    href: "https://rakantutor.org/naic",
    githubHref: "https://github.com/ashvinpraveen/rakantutor",
    description: "Leading Malaysia's largest student AI challenge, run by Rakan Tutor and co-organized with Sunway University. Students compete in 5 tracks: building AI apps, training models, generative art, smart city engineering, and future classroom design.",
  },
  {
    name: "RakanTutor.org",
    logo: null,
    initials: "RT",
    href: "https://rakantutor.org",
    githubHref: "https://github.com/ashvinpraveen/rakantutor",
    description: "Built the website for Rakan Tutor, a student-led education nonprofit in Malaysia.",
  },
  {
    name: "Malaysian.ai",
    logo: "/logo-malaysian-ai.png",
    href: "https://www.malaysian.ai/",
    githubHref: "https://github.com/ashvinpraveen/malaysianai",
    description: "The home of AI builders in Malaysia, backed by 500 Global. I built the site and host regular community runs on Mondays and Thursdays.",
  },
  {
    name: "Build for Public",
    logo: null,
    initials: "BP",
    href: "https://buildforpublic.com",
    githubHref: "https://github.com/mfrashad/buildforpublic",
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
            <div className="flex items-center gap-3 mb-2">
              {project.logo ? (
                <img
                  src={project.logo}
                  alt={project.name}
                  className="w-9 h-9 rounded-xl object-contain shrink-0"
                />
              ) : (
                <span className="flex w-9 h-9 items-center justify-center rounded-xl bg-muted font-mono text-xs font-semibold text-muted-foreground shrink-0">
                  {project.initials || "P"}
                </span>
              )}
              <h3 className={`text-base font-semibold ${heading}`}>
                {project.name}
              </h3>
            </div>
            <p className={`text-sm leading-relaxed ${textSecondary}`}>
              {project.description}
            </p>
            <div className="mt-auto pt-4 flex gap-4">
              <a
                href={project.href}
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                View →
              </a>
              <a
                href={project.githubHref}
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                GitHub →
              </a>
            </div>
          </div>
        ))}
      </div>
    </SectionBlock>
  );
};

export default InvolvementSection;
