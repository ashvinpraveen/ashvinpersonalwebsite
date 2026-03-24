const AboutSection = () => {
  return (
    <section id="about" className="py-16 md:py-20 border-t border-border">
      <p className="font-mono text-xs text-muted-foreground uppercase tracking-widest mb-8">
        About
      </p>
      <div className="max-w-prose space-y-4 text-base md:text-[17px] leading-relaxed text-foreground/90">
        <p>
          Engineering degree. Background in content and brand. I think about design, systems, and how things are made.
        </p>
        <p>
          Ran a 14-person content agency helping founders build their brands. Now building Cleve and directing Malaysia's National AI Competition.
        </p>
      </div>
    </section>
  );
};

export default AboutSection;
