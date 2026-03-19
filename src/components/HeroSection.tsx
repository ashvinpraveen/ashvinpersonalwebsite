const HeroSection = () => {
  return (
    <section className="pt-24 pb-16 md:pt-32 md:pb-24">
      <div className="max-w-prose">
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight leading-[1.1] mb-4">
          Ashvin Praveen
        </h1>
        <p className="font-mono text-sm text-muted-foreground mb-6">
          Co-founder & CEO, Cleve.ai
        </p>
        <p className="text-lg md:text-xl text-muted-foreground leading-relaxed">
          Building tools that help people think and communicate better.
        </p>
        <nav className="mt-8 flex flex-wrap gap-x-6 gap-y-2 font-mono text-sm">
          <a href="#writing" className="text-primary hover:underline underline-offset-4 transition-colors">
            Read my writing
          </a>
          <a href="#about" className="text-primary hover:underline underline-offset-4 transition-colors">
            About me
          </a>
          <a href="#contact" className="text-primary hover:underline underline-offset-4 transition-colors">
            Get in touch
          </a>
        </nav>
      </div>
    </section>
  );
};

export default HeroSection;
