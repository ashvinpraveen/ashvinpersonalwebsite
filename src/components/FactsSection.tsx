const FactsSection = () => {
  const facts = [
    "Born in Kuching. Built in Sheffield. Operating out of KL.",
    "I ran a competitive distance running phase that I think about more than I should.",
    "I got obsessed with a problem and taught myself to code in my late 20s - not because it was efficient, but because I had to.",
    "I care a lot about helping people communicate what they actually know, not a filtered version of it.",
    "Music is still in the rotation. Always.",
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
