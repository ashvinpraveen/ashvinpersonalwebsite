const interests = [
  "Music — always on",
  "Running — most mornings",
  "Design obsessive",
  "AI × human creativity",
  "Building in public",
  "Sarawak born, KL based",
];

const InterestsSection = () => {
  return (
    <section className="py-16 md:py-20 border-t border-border">
      <div className="flex items-center gap-3 mb-8">
        <span className="h-px w-6 bg-primary shrink-0" />
        <p className="font-mono text-xs text-muted-foreground uppercase tracking-widest">Interests</p>
      </div>
      <div className="flex flex-wrap gap-2 max-w-prose">
        {interests.map((item, i) => (
          <span
            key={i}
            className="px-4 py-2 rounded-full border border-border bg-muted/60 text-sm font-medium text-foreground/80 hover:border-primary/40 hover:bg-muted transition-colors cursor-default"
          >
            {item}
          </span>
        ))}
      </div>
    </section>
  );
};

export default InterestsSection;
