import { ReactNode } from "react";
import { contentColumnClassName } from "@/lib/layout";
import { cn } from "@/lib/utils";
import RevealOnScroll from "@/components/RevealOnScroll";

interface SectionBlockProps {
  children: ReactNode;
  className?: string;
  id?: string;
  label?: string;
}

const SectionBlock = ({ children, className, id, label }: SectionBlockProps) => {
  return (
    <RevealOnScroll>
      <section
        id={id}
        className={cn(contentColumnClassName, "py-10 md:py-14", className)}
      >
        {label && (
          <h2 className="text-lg font-semibold tracking-tight mb-6">
            {label}
          </h2>
        )}
        {children}
      </section>
    </RevealOnScroll>
  );
};

export default SectionBlock;
