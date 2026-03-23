import SiteNav from "@/components/SiteNav";
import Footer from "@/components/Footer";
import HeroSection from "@/components/HeroSection";
import AboutSection from "@/components/AboutSection";
import WorkSection from "@/components/WorkSection";
import ThinkingSection from "@/components/ThinkingSection";
import WritingSection from "@/components/WritingSection";
import FactsSection from "@/components/FactsSection";
import ContactSection from "@/components/ContactSection";

const Index = () => {
  return (
    <>
      <SiteNav />
      <main className="px-6 md:px-12 lg:px-20 max-w-3xl mx-auto pb-20 pt-12">
        <HeroSection />
        <AboutSection />
        <WorkSection />
        <ThinkingSection />
        <WritingSection />
        <FactsSection />
        <ContactSection />
        <Footer />
      </main>
    </>
  );
};

export default Index;
