import { useState } from "react";
import SectionBlock from "@/components/SectionBlock";
import { proseColumnClassName } from "@/lib/layout";
import { linkPrimary, textBody, monoLabel } from "@/lib/styles";

const inlineLinkClassName = linkPrimary;

const preview = [
  "I'm Ashvin, 27, born and raised in Sarawak, Malaysia, now based in Kuala Lumpur. I'm Malaysian with Indian heritage; my grandparents came to Sarawak from Kerala, and that family history still shapes a lot of how I think.",
  "The thread running through my life has been education, social mobility, and progress. I grew up around people who treated learning as a way to change the trajectory of a family, a community, and eventually a region.",
  "That's why I'm drawn to building tools, teaching what I learn, and sharing the process publicly. My usual line is simple: building stuff and sharing what I learn along the way.",
];

const expanded = [
  {
    title: "Where This Comes From",
    paragraphs: [
      "My late grandad was stationed in Sarawak by the British military. He joined the military in India as a teenager and trained as a telegraph operator. Most of his career was near minimum wage, but somehow he prioritised education for all his children.",
      "At one point he mortgaged his house to afford it. The siblings helped each other through their degrees. One generation later, all five sons became engineers and later engineering leaders. My mom's story had a similar arc: small town in Kerala, studied hard, became a doctor.",
      "So from young, I became obsessed with education, knowledge, social mobility, and what it takes to transform a region. I grew up in public schools in Sarawak where many of my smartest friends couldn't afford university. That question never really left me.",
    ],
  },
  {
    title: "What I'm Learning To Build",
    paragraphs: [
      "In university, I got exposed to startups, internet businesses, creators, technology skills, and the new opportunities being created by media and software. I decided to study two things intensely: tech and media.",
      "My goal was to get good enough at these skills that I could teach them honestly. I had to be a practitioner to teach, and I had to become good enough as a practitioner to make the teaching useful.",
      <>
        <a
          href="https://cleve.ai"
          target="_blank"
          rel="noopener noreferrer"
          className={inlineLinkClassName}
        >
          Cleve
        </a>{" "}
        comes from the same place. I've seen that AI only really works when it works alongside human thought. Used well, that can create massive leverage for people and communities.
      </>,
    ],
  },
  {
    title: "How I Think",
    paragraphs: [
      "I learn through building and regularly refining my understanding of the world. My models usually start from physics and first principles, then move up through biology, economics, history, politics, psychology, and the messier human layers I'm still learning.",
      "I care a lot about learning how to learn: the fun factor, getting past the annoyance threshold of a new domain, asking better questions, and helping people reach escape velocity in a subject. Once someone gets there, they can fly fast and go far.",
      "That same mindset is what I bring into business, tech, marketing, and education. The measurements are less clean than exams, but the game is still learnable.",
    ],
  },
  {
    title: "Impact",
    paragraphs: [
      <>
        Being one of the main organisers of the{" "}
        <a
          href="https://rakantutor.org/naic"
          target="_blank"
          rel="noopener noreferrer"
          className={inlineLinkClassName}
        >
          National AI Competition
        </a>{" "}
        was an example of the kind of work I care about. Nearly 2,000 students across Malaysia worked on generative AI tracks and problem statements designed to teach skills that will matter over the next few years.
      </>,
      "I designed the generative arts and innovation tracks, ran workshops, and tried to make the learning fun enough that students could hit escape velocity. And damn, they did.",
      "I'm optimistic things can change. The world is changing faster than ever, but we often assume the hard things are fixed. My role is to be one of many people accelerating things in this region.",
    ],
  },
];

const AboutSection = () => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <SectionBlock id="about" label="About">
      <div className={`${proseColumnClassName} text-base md:text-[17px] leading-relaxed ${textBody}`}>
        <div className="space-y-4">
          {preview.map((paragraph, index) => (
            <p key={index}>{paragraph}</p>
          ))}
        </div>

        {isExpanded && (
          <div className="mt-8 space-y-8">
            {expanded.map((section) => (
              <div key={section.title} className="space-y-3">
                <h3 className={monoLabel}>
                  {section.title}
                </h3>
                <div className="space-y-4">
                  {section.paragraphs.map((paragraph, index) => (
                    <p key={index}>{paragraph}</p>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        <button
          type="button"
          onClick={() => setIsExpanded((value) => !value)}
          className="mt-6 font-mono text-sm text-primary hover:underline underline-offset-4 transition-colors"
          aria-expanded={isExpanded}
        >
          {isExpanded ? "Show less" : "See more"}
        </button>
      </div>
    </SectionBlock>
  );
};

export default AboutSection;
