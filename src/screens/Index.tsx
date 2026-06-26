"use client";

import SiteNav from "@/components/SiteNav";
import Footer from "@/components/Footer";
import HeroSection from "@/components/HeroSection";
import StatsSection from "@/components/StatsSection";
import AboutSection from "@/components/AboutSection";
import WorkSection from "@/components/WorkSection";
import WritingSection from "@/components/WritingSection";

import ContactSection from "@/components/ContactSection";
import { pageShellClassName } from "@/lib/layout";

const Index = () => {
  return (
    <>
      <SiteNav variant="light" />
      <HeroSection />
      <StatsSection />
      <main className={`${pageShellClassName} pt-12`}>
        <WorkSection />
        <AboutSection />
        <WritingSection />

        <ContactSection />
        <Footer />
      </main>
    </>
  );
};

export default Index;
