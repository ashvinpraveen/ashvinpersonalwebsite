const projects = [
  {
    name: "National AI Competition (NAIC)",
    href: "https://rakantutor.org/naic",
    role: "Director",
    description: "Helping young Malaysians understand and build with AI.",
  },
  {
    name: "Malaysian.ai",
    href: "https://www.malaysian.ai/",
    role: "Contributor",
    description: "The home of AI builders in Malaysia. Events, communities, and education for anyone building with AI.",
  },
];

const InvolvementSection = () => {
  return (
    <section className="py-16 md:py-20 border-t border-border">
      <p className="font-mono text-xs text-muted-foreground uppercase tracking-widest mb-8">
        Also Involved In
      </p>
      <div className="max-w-prose space-y-8">
        {projects.map((project) => (
          <div key={project.href}>
            <h3 className="text-lg font-semibold mb-1">
              <a
                href={project.href}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:underline underline-offset-4 transition-colors"
              >
                {project.name}
              </a>
            </h3>
            <p className="font-mono text-xs text-muted-foreground uppercase tracking-widest mb-2">
              {project.role}
            </p>
            <p className="text-base leading-relaxed text-foreground/90">
              {project.description}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
};

export default InvolvementSection;
