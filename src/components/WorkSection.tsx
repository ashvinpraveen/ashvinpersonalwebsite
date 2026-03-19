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
            The AI writing workspace. Think Google Docs, if it had a senior thought partner who remembered everything you've ever written. We're building toward what Canva did for design - but for writing and self-expression.
          </p>
        </div>
        <div>
          <h3 className="text-lg font-semibold mb-2">
            National AI Competition (NAIC)
          </h3>
          <p className="text-base leading-relaxed text-foreground/90">
            Director — helping young people actually understand AI, not just fear it.
          </p>
        </div>
      </div>
    </section>
  );
};

export default WorkSection;
