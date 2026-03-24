const AboutSection = () => {
  return (
    <section id="about" className="py-16 md:py-20 border-t border-border">
      <p className="font-mono text-xs text-muted-foreground uppercase tracking-widest mb-8">
        About
      </p>
      <div className="max-w-prose space-y-4 text-base md:text-[17px] leading-relaxed text-foreground/90">
        <p>
          I sit at the intersection of science and art. Engineering degree. Background in marketing and content. Interests in music, design, and building things with my hands.
        </p>
        <p>
          I care about whether things are done with taste. That's the lens I bring to AI.
        </p>
        <p>
          Based in KL. Director of Malaysia's National AI Competition. Previously ran a 14-person content agency helping founders build their brands.
        </p>
      </div>
    </section>
  );
};

export default AboutSection;
