const AboutSection = () => {
  return (
    <section id="about" className="py-16 md:py-20 border-t border-border">
      <p className="font-mono text-xs text-muted-foreground uppercase tracking-widest mb-8">
        About
      </p>
      <div className="max-w-prose space-y-5 text-base md:text-[17px] leading-relaxed text-foreground/90">
        <p>
          I'm a mechanical engineer who somehow ended up building AI startups.
        </p>
        <p>
          Grew up in Sarawak — Kuching, Miri, Bintulu — studied at the University of Sheffield on an ASEAN Merit Scholarship, and came back ready to build things.
        </p>
        <p>
          First thing I built: a content agency. 14 people, six-figure revenue, working with founders to help them put their ideas into words. It was good work. I loved it.
        </p>
        <p>
          Then ChatGPT dropped. And I realised there was a deeper problem nobody had solved: AI tools are great, but they don't know <em>you</em>. Every session, you start from scratch.
        </p>
        <p>
          So I went back to my engineering textbooks, taught myself to code, and started building Cleve — an AI workspace for writing that actually has context on who you are, how you think, and what you're trying to say.
        </p>
        <p>
          Two years in. ~35,000 users. Still going.
        </p>
      </div>
    </section>
  );
};

export default AboutSection;
