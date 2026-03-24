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
];

const ResourcesSection = () => {
  return (
    <section className="py-16 md:py-20 border-t border-border">
      <p className="font-mono text-xs text-muted-foreground uppercase tracking-widest mb-8">
        Resources
      </p>
      <div className="max-w-prose space-y-5">
        {resources.map((resource) => (
          <div key={resource.href}>
            <a
              href={resource.href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-base font-medium hover:underline underline-offset-4 transition-colors"
            >
              {resource.label}
            </a>
            <p className="text-sm leading-relaxed text-muted-foreground mt-1">
              {resource.description}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
};

export default ResourcesSection;
