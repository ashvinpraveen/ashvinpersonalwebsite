const HeroSection = () => {
  return (
    <section className="pt-16 pb-16 md:pt-24 md:pb-24">
      <div className="flex flex-col-reverse md:flex-row md:items-start md:justify-between gap-10">
        <div className="max-w-prose">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight leading-[1.1] mb-4">
            Ashvin Praveen
          </h1>
          <p className="font-mono text-sm text-muted-foreground mb-6">
            Co-founder & CEO, Cleve.ai
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
          className="w-32 h-32 md:w-40 md:h-40 rounded-full object-cover object-top shrink-0"
        />
      </div>
    </section>
  );
};

export default HeroSection;
