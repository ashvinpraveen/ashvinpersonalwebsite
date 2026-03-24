const ContactSection = () => {
  return (
    <section id="contact" className="py-16 md:py-20 border-t border-border">
      <div className="flex items-center gap-3 mb-8">
        <span className="h-px w-6 bg-primary shrink-0" />
        <p className="font-mono text-xs text-muted-foreground uppercase tracking-widest">Get in Touch</p>
      </div>
      <div className="max-w-prose space-y-6">
        <p className="text-base leading-relaxed text-foreground/90">
          Building something, or want to try Cleve? Reach out.
        </p>
        <div className="flex flex-wrap gap-x-6 gap-y-2 font-mono text-sm">
          <a
            href="https://cleve.ai"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline underline-offset-4 transition-colors"
          >
            cleve.ai
          </a>
          <a
            href="mailto:ashvin@cleve.ai"
            className="text-primary hover:underline underline-offset-4 transition-colors"
          >
            ashvin@cleve.ai
          </a>
          <a
            href="https://cal.com/ashvinpraveen"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline underline-offset-4 transition-colors"
          >
            Book a call
          </a>
          <a
            href="https://linkedin.com/in/ashvinpraveen"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline underline-offset-4 transition-colors"
          >
            LinkedIn
          </a>
        </div>
      </div>
    </section>
  );
};

export default ContactSection;
