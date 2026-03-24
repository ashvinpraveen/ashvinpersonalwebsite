const WorkSection = () => {
  return (
    <section id="cleve" className="py-16 md:py-20 border-t border-border">
      <div className="flex items-center gap-3 mb-8">
        <span className="h-px w-6 bg-primary shrink-0" />
        <p className="font-mono text-xs text-muted-foreground uppercase tracking-widest">What I'm Building</p>
      </div>
      <div className="max-w-prose space-y-10">

        <div className="rounded-xl border border-border bg-muted/40 p-5 hover:border-primary/40 hover:bg-muted/60 transition-all">
          <div className="flex items-center gap-3 mb-3">
            <img
              src="/logo-cleve.png"
              alt="Cleve"
              className="w-9 h-9 rounded-lg object-contain shrink-0"
            />
            <h3 className="text-lg font-semibold">
              <a
                href="https://cleve.ai"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-primary transition-colors"
              >
                Cleve.ai ↗
              </a>
            </h3>
          </div>
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

      </div>
    </section>
  );
};

export default WorkSection;
