const FactsSection = () => {
  const facts = [
    "Born in Kuching. Studied in Sheffield. Based in KL.",
    "Ran competitively for a while. Still think about it more than I should.",
    "Taught myself to code in my late 20s out of necessity. Mechanical engineers don't get that class.",
    "Most people know more than they think. They just haven't found the words yet.",
    "Always got music on.",
  ];

  return (
    <section className="py-16 md:py-20 border-t border-border">
      <p className="font-mono text-xs text-muted-foreground uppercase tracking-widest mb-8">
        A Few Things That Are True About Me
      </p>
      <ul className="max-w-prose space-y-4">
        {facts.map((fact, i) => (
          <li key={i} className="flex gap-3 text-base leading-relaxed text-foreground/90">
            <span className="text-muted-foreground mt-1.5 shrink-0 w-1.5 h-1.5 rounded-full bg-muted-foreground/40" />
            <span>{fact}</span>
          </li>
        ))}
      </ul>
    </section>
  );
};

export default FactsSection;
