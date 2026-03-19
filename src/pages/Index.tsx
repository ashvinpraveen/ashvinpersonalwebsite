import HeroSection from "@/components/HeroSection";
import AboutSection from "@/components/AboutSection";
import WorkSection from "@/components/WorkSection";
import ThinkingSection from "@/components/ThinkingSection";
import WritingSection from "@/components/WritingSection";
import FactsSection from "@/components/FactsSection";
import ContactSection from "@/components/ContactSection";

const Index = () => {
  return (
    <main className="px-6 md:px-12 lg:px-20 max-w-3xl mx-auto pb-20">
      <HeroSection />
      <AboutSection />
      <WorkSection />
      <ThinkingSection />
      <WritingSection />
      <FactsSection />
      <ContactSection />
      <footer className="pt-8 pb-12 border-t border-border">
        <p className="font-mono text-xs text-muted-foreground">
          © {new Date().getFullYear()} Ashvin Praveen
        </p>
      </footer>
    </main>
  );
};

export default Index;
