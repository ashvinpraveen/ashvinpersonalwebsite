import SiteNav from "@/components/SiteNav";
import Footer from "@/components/Footer";
import HeroSection from "@/components/HeroSection";
import AboutSection from "@/components/AboutSection";
import WorkSection from "@/components/WorkSection";
import InvolvementSection from "@/components/InvolvementSection";
import WritingSection from "@/components/WritingSection";
import InterestsSection from "@/components/InterestsSection";
import ResourcesSection from "@/components/ResourcesSection";
import ContactSection from "@/components/ContactSection";

const Index = () => {
  return (
    <>
      <SiteNav />
      <main className="px-6 md:px-12 lg:px-20 max-w-3xl mx-auto pb-20 pt-12">
        <HeroSection />
        <WorkSection />
        <InvolvementSection />
        <AboutSection />
        <WritingSection />
        <InterestsSection />
        <ResourcesSection />
        <ContactSection />
        <Footer />
      </main>
    </>
  );
};

export default Index;
