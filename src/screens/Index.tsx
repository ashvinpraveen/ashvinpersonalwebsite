"use client";

import SiteNav from "@/components/SiteNav";
import Footer from "@/components/Footer";
import HeroSection from "@/components/HeroSection";
import AboutSection from "@/components/AboutSection";
import WorkSection from "@/components/WorkSection";
import WritingSection from "@/components/WritingSection";

import ResourcesSection from "@/components/ResourcesSection";
import ContactSection from "@/components/ContactSection";
import ChatWidget from "@/components/ChatWidget";
import { pageShellClassName } from "@/lib/layout";

const Index = () => {
  return (
    <>
      <SiteNav variant="light" />
      <HeroSection />
      <main className={`${pageShellClassName} pt-12`}>
        <WorkSection />
        <AboutSection />
        <WritingSection />

        <ResourcesSection />
        <ContactSection />
        <Footer />
      </main>
      <ChatWidget />
    </>
  );
};

export default Index;
