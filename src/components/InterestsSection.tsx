const interests = [
  "Running. Still lace up most mornings.",
  "Design — the craft of making things look and feel right.",
  "The intersection of AI and human creativity.",
  "Music. Always something on.",
];

const InterestsSection = () => {
  return (
    <section className="py-16 md:py-20 border-t border-border">
      <p className="font-mono text-xs text-muted-foreground uppercase tracking-widest mb-8">
        Interests
      </p>
      <ul className="max-w-prose space-y-3">
        {interests.map((item, i) => (
          <li key={i} className="flex gap-3 text-base leading-relaxed text-foreground/90">
            <span className="text-muted-foreground mt-1.5 shrink-0 w-1.5 h-1.5 rounded-full bg-muted-foreground/40" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </section>
  );
};

export default InterestsSection;
