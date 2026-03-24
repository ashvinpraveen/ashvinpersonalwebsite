const FactsSection = () => {
  const facts = [
    "Born in Sarawak. Studied in Sheffield. Based in KL.",
    "Engineering degree. Marketing background. Can't stop thinking about design.",
    "Music is always on.",
    "Used to run competitively. Still lace up most mornings.",
  ];

  return (
    <section className="py-16 md:py-20 border-t border-border">
      <p className="font-mono text-xs text-muted-foreground uppercase tracking-widest mb-8">
        A Few Things
      </p>
      <ul className="max-w-prose space-y-3">
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
