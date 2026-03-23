const ContactSection = () => {
  const links = [
    { label: "ashvin@cleve.ai", href: "mailto:ashvin@cleve.ai" },
    { label: "LinkedIn", href: "https://linkedin.com/in/ashvinpraveen" },
    { label: "cal.com/ashvinpraveen", href: "https://cal.com/ashvinpraveen" },
    { label: "cleve.ai", href: "https://cleve.ai" },
  ];

  return (
    <section id="contact" className="py-16 md:py-20 border-t border-border">
      <p className="font-mono text-xs text-muted-foreground uppercase tracking-widest mb-8">
        Contact
      </p>
      <div className="max-w-prose">
        <p className="text-base leading-relaxed text-foreground/90 mb-6">
          Building something? Have a question? Just reach out.
        </p>
        <div className="flex flex-wrap gap-x-6 gap-y-2 font-mono text-sm">
          {links.map((link) => (
            <a
              key={link.label}
              href={link.href}
              target={link.href.startsWith("mailto") ? undefined : "_blank"}
              rel="noopener noreferrer"
              className="text-primary hover:underline underline-offset-4 transition-colors"
            >
              {link.label}
            </a>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ContactSection;
