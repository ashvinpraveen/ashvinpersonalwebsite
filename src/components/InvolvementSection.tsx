const projects = [
  {
    name: "National AI Competition (NAIC)",
    logo: "/logo-naic.png",
    href: "https://rakantutor.org/naic",
    role: "Director",
    description: "Malaysia's largest student AI challenge, co-organized with Sunway University. Students compete in 5 tracks — building AI apps, training models, generative art, smart city engineering, and future classroom design. Grand Finals at Sunway University, June 2026.",
  },
  {
    name: "Malaysian.ai",
    logo: "/logo-malaysian-ai.png",
    href: "https://www.malaysian.ai/",
    role: "Contributor",
    description: "The home of AI builders in Malaysia. Events, communities, and education for anyone building with AI.",
  },
];

const InvolvementSection = () => {
  return (
    <section className="py-16 md:py-20 border-t border-border">
      <div className="flex items-center gap-3 mb-8">
        <span className="h-px w-6 bg-primary shrink-0" />
        <p className="font-mono text-xs text-muted-foreground uppercase tracking-widest">Also Involved In</p>
      </div>
      <div className="max-w-prose space-y-4">
        {projects.map((project) => (
          <div
            key={project.href}
            className="rounded-xl border border-border bg-muted/40 p-5 hover:border-primary/40 hover:bg-muted/60 transition-all"
          >
            <div className="flex items-start justify-between gap-4 mb-2">
              <div className="flex items-center gap-3">
                <img
                  src={project.logo}
                  alt={project.name}
                  className="w-9 h-9 rounded-lg object-contain shrink-0"
                />
                <h3 className="text-base font-semibold">
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
            <p className="text-sm leading-relaxed text-foreground/80 pl-12">
              {project.description}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
};

export default InvolvementSection;
