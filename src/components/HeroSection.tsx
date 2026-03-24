const HeroSection = () => {
  return (
    <section className="pt-16 pb-16 md:pt-24 md:pb-24">
      <div className="flex flex-col-reverse md:flex-row md:items-start md:justify-between gap-10">
        <div className="max-w-prose">
          <h1 className="text-5xl md:text-6xl font-bold tracking-tight leading-[1.05] mb-4">
            Ashvin Praveen
          </h1>
          <p className="font-mono text-sm mb-6 flex items-center gap-2">
            <span className="text-primary font-semibold">Co-founder & CEO</span>
            <span className="text-muted-foreground">·</span>
            <a
              href="https://cleve.ai"
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-primary transition-colors"
            >
              Cleve.ai
            </a>
          </p>
          <p className="text-lg md:text-xl text-foreground/90 leading-relaxed">
            I build AI tools and teach people how to use them well.
          </p>
          <nav className="mt-8 flex flex-wrap gap-x-6 gap-y-2 font-mono text-sm">
            <a href="#cleve" className="text-primary hover:underline underline-offset-4 transition-colors">
              What I'm building
            </a>
            <a href="#writing" className="text-primary hover:underline underline-offset-4 transition-colors">
              Writing
            </a>
            <a href="#contact" className="text-primary hover:underline underline-offset-4 transition-colors">
              Get in touch
            </a>
          </nav>
        </div>
        <img
          src="/ashvin-profile.png"
          alt="Ashvin Praveen"
          className="w-32 h-32 md:w-44 md:h-44 rounded-2xl object-cover object-top shrink-0 ring-4 ring-primary/15"
        />
      </div>
    </section>
  );
};

export default HeroSection;
