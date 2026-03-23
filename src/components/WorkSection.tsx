const WorkSection = () => {
  return (
    <section className="py-16 md:py-20 border-t border-border">
      <p className="font-mono text-xs text-muted-foreground uppercase tracking-widest mb-8">
        What I'm Working On
      </p>
      <div className="max-w-prose space-y-10">
        <div>
          <h3 className="text-lg font-semibold mb-2">
            <a
              href="https://cleve.ai"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline underline-offset-4 transition-colors"
            >
              Cleve.ai
            </a>
          </h3>
          <p className="text-base leading-relaxed text-foreground/90">
            An AI writing workspace that builds context on how you think and what you're trying to say — so you're not starting from scratch every session.
          </p>
        </div>
        <div>
          <h3 className="text-lg font-semibold mb-2">
            National AI Competition (NAIC)
          </h3>
          <p className="text-base leading-relaxed text-foreground/90">
            Director. Getting young people to engage with AI seriously, not just consume it.
          </p>
        </div>
      </div>
    </section>
  );
};

export default WorkSection;
