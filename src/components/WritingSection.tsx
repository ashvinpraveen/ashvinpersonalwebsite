const WritingSection = () => {
  return (
    <section id="writing" className="py-16 md:py-20 border-t border-border">
      <p className="font-mono text-xs text-muted-foreground uppercase tracking-widest mb-8">
        Writing
      </p>
      <div className="max-w-prose space-y-4">
        <p className="text-base leading-relaxed text-foreground/90 mb-6">
          Thoughts on building, AI, content, and whatever I'm figuring out right now.
        </p>
        <div className="space-y-3">
          <a
            href="https://linkedin.com/in/ashvinpraveen"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-primary hover:underline underline-offset-4 transition-colors font-mono text-sm"
          >
            <span className="text-muted-foreground">→</span> LinkedIn - where I share most of my thinking
          </a>
          <a
            href="https://instagram.com/ashvinpraveen"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-primary hover:underline underline-offset-4 transition-colors font-mono text-sm"
          >
            <span className="text-muted-foreground">→</span> Instagram — more casual, more behind-the-scenes
          </a>
        </div>
      </div>
    </section>
  );
};

export default WritingSection;
