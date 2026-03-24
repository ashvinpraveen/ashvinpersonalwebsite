const WorkSection = () => {
  return (
    <section id="cleve" className="py-16 md:py-20 border-t border-border">
      <p className="font-mono text-xs text-muted-foreground uppercase tracking-widest mb-8">
        What I'm Building
      </p>
      <div className="max-w-prose space-y-10">

        <div>
          <h3 className="text-lg font-semibold mb-3">
            <a
              href="https://cleve.ai"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:underline underline-offset-4 transition-colors"
            >
              Cleve.ai
            </a>
          </h3>
          <div className="space-y-3 text-base leading-relaxed text-foreground/90">
            <p>
              AI workspace for writing and thinking. All the major models in one place, with memory that carries across sessions.
            </p>
            <p>
              ~35,000 users. Antler-backed. The tool I kept wishing existed when I was running the agency.
            </p>
          </div>
          <div className="mt-5">
            <a
              href="https://cleve.ai"
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono text-sm text-primary hover:underline underline-offset-4 transition-colors"
            >
              Try it free →
            </a>
          </div>
        </div>

        <div>
          <h3 className="text-lg font-semibold mb-3">
            <a
              href="https://rakantutor.org/naic"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:underline underline-offset-4 transition-colors"
            >
              National AI Competition (NAIC)
            </a>
          </h3>
          <p className="text-base leading-relaxed text-foreground/90">
            Director. Helping young Malaysians understand and build with AI.
          </p>
        </div>

      </div>
    </section>
  );
};

export default WorkSection;
