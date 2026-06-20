import { ReactNode } from "react";
import { contentColumnClassName } from "@/lib/layout";
import { monoLabel } from "@/lib/styles";
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
        <div className="flex items-center gap-3 mb-10">
          <span className="h-px w-6 bg-muted-foreground/40 shrink-0" />
          <p className={monoLabel}>{label}</p>
        </div>
      )}
      {children}
    </section>
  );
};

export default SectionBlock;
