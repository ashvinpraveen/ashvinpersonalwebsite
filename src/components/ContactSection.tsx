import SectionBlock from "@/components/SectionBlock";
import { proseColumnClassName } from "@/lib/layout";
import { textBody, linkPrimary } from "@/lib/styles";

const ContactSection = () => {
  return (
    <SectionBlock id="contact" label="Get in Touch">
      <div className={`${proseColumnClassName} space-y-6`}>
        <p className={`text-base leading-relaxed ${textBody}`}>
          Let me know how I can help with what you're working on.
        </p>
        <div className="flex flex-wrap gap-x-6 gap-y-2 font-mono text-sm">
          <a
            href="https://cleve.ai"
            target="_blank"
            rel="noopener noreferrer"
            className={linkPrimary}
          >
            cleve.ai
          </a>
          <a
            href="https://cal.com/ashvinpraveen"
            target="_blank"
            rel="noopener noreferrer"
            className={linkPrimary}
          >
            Book a call
          </a>
          <a
            href="https://linkedin.com/in/ashvinpraveen"
            target="_blank"
            rel="noopener noreferrer"
            className={linkPrimary}
          >
            LinkedIn
          </a>
        </div>
      </div>
    </SectionBlock>
  );
};

export default ContactSection;
