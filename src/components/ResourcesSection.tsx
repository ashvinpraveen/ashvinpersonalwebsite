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
];

const ResourcesSection = () => {
  return (
    <section className="py-16 md:py-20 border-t border-border">
      <div className="flex items-center gap-3 mb-8">
        <span className="h-px w-6 bg-primary shrink-0" />
        <p className="font-mono text-xs text-muted-foreground uppercase tracking-widest">Resources</p>
      </div>
      <div className="max-w-prose space-y-3">
        {resources.map((resource) => (
          <a
            key={resource.href}
            href={resource.href}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-start justify-between gap-4 p-4 rounded-xl border border-border bg-muted/40 hover:border-primary/40 hover:bg-muted/60 transition-all"
          >
            <div>
              <p className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
                {resource.label}
              </p>
              <p className="text-sm leading-relaxed text-muted-foreground mt-0.5">
                {resource.description}
              </p>
            </div>
            <span className="text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all text-sm mt-0.5 shrink-0">
              →
            </span>
          </a>
        ))}
      </div>
    </section>
  );
};

export default ResourcesSection;
