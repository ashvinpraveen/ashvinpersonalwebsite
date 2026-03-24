const ThinkingSection = () => {
  const models = [
    {
      idea: "Everyone's talking about AI. I want to show people how to use it.",
      detail: "Practical, applied, from someone building with it daily.",
    },
    {
      idea: "Speed matters. So does taste.",
      detail:
        "The tools are getting faster. The outputs are getting blander. Knowing how to direct AI well is the skill worth building.",
    },
    {
      idea: "Build first, then teach.",
      detail:
        "Everything I share comes from building Cleve. The lessons are real.",
    },
  ];

  return (
    <section className="py-16 md:py-20 border-t border-border">
      <p className="font-mono text-xs text-muted-foreground uppercase tracking-widest mb-8">
        What I Believe
      </p>
      <div className="max-w-prose">
        <div className="space-y-8">
          {models.map((model, i) => (
            <div key={i} className="flex gap-4">
              <span className="font-mono text-sm text-muted-foreground mt-0.5 shrink-0">
                {String(i + 1).padStart(2, "0")}
              </span>
              <div className="border-l border-border pl-4">
                <p className="text-base font-medium leading-snug text-foreground mb-1.5">
                  {model.idea}
                </p>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {model.detail}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ThinkingSection;
