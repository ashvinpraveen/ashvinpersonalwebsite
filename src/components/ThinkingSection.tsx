const ThinkingSection = () => {
  const models = [
    "Clear inputs, feedback loops, daily reps. Not because it's a system I read about — because it's the only thing that's ever actually worked for me.",
    "Approximate the human capability threshold. Anyone can do that. Everything is learnable.",
    "First principles over formulas. If the underlying assumption changes, rebuild. Don't patch.",
  ];

  return (
    <section className="py-16 md:py-20 border-t border-border">
      <p className="font-mono text-xs text-muted-foreground uppercase tracking-widest mb-8">
        How I Think
      </p>
      <div className="max-w-prose">
        <p className="text-base leading-relaxed text-foreground/90 mb-8">
          I apply an engineer and athlete mindset to everything.
        </p>
        <div className="space-y-6">
          {models.map((model, i) => (
            <div key={i} className="flex gap-4">
              <span className="font-mono text-sm text-muted-foreground mt-0.5 shrink-0">
                {String(i + 1).padStart(2, "0")}
              </span>
              <p className="text-base leading-relaxed text-foreground/90 border-l border-border pl-4">
                {model}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ThinkingSection;
