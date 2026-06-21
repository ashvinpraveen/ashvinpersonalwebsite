import SectionBlock from "@/components/SectionBlock";
import { proseColumnClassName } from "@/lib/layout";
import { textBody, linkPrimary } from "@/lib/styles";

const ContactSection = () => {
  return (
    <SectionBlock id="contact" label="get in touch">
      <div className={`${proseColumnClassName} space-y-6`}>
        <p className={`text-base leading-relaxed ${textBody}`}>
          building something, or want to try cleve? reach out.
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
            href="mailto:ashvin@cleve.ai"
            className={linkPrimary}
          >
            ashvin@cleve.ai
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
