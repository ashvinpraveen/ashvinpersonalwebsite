import { ReactNode } from "react";
import { contentColumnClassName } from "@/lib/layout";
import { cn } from "@/lib/utils";

interface SectionBlockProps {
  children: ReactNode;
  className?: string;
  id?: string;
  label?: string;
}

const SectionBlock = ({ children, className, id, label }: SectionBlockProps) => {
  return (
    <section
      id={id}
      className={cn(contentColumnClassName, "py-20 md:py-28", className)}
    >
      {label && (
        <h2 className="text-2xl md:text-3xl font-semibold tracking-tight mb-10">
          {label}
        </h2>
      )}
      {children}
    </section>
  );
};

export default SectionBlock;
