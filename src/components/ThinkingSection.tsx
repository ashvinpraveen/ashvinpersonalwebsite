const ThinkingSection = () => {
  const models = [
    "Clear inputs, feedback loops, daily reps. The only thing that's ever actually worked.",
    "Most skills have a learnable ceiling that most people never reach. That gap is just reps.",
    "First principles over formulas. If the underlying assumption changes, rebuild — don't patch.",
  ];

  return (
    <section className="py-16 md:py-20 border-t border-border">
      <p className="font-mono text-xs text-muted-foreground uppercase tracking-widest mb-8">
        How I Think
      </p>
      <div className="max-w-prose">
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
