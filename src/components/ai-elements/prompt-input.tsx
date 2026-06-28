"use client";

import {
  type ComponentProps,
  forwardRef,
  type FormHTMLAttributes,
  type HTMLAttributes,
} from "react";
import { ArrowUpIcon, Loader2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type PromptInputStatus = "error" | "ready" | "streaming" | "submitted";

const PromptInput = forwardRef<
  HTMLFormElement,
  FormHTMLAttributes<HTMLFormElement>
>(({ className, ...props }, ref) => (
  <form ref={ref} className={cn("w-full", className)} {...props} />
));
PromptInput.displayName = "PromptInput";

const PromptInputBody = forwardRef<
  HTMLDivElement,
  HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "overflow-hidden rounded-3xl bg-popover shadow-sm ring-1 ring-border/35 dark:bg-secondary sm:bg-popover/85 sm:dark:bg-secondary/80",
      className,
    )}
    {...props}
  />
));
PromptInputBody.displayName = "PromptInputBody";

const PromptInputHeader = forwardRef<
  HTMLDivElement,
  HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("px-3 pt-3", className)} {...props} />
));
PromptInputHeader.displayName = "PromptInputHeader";

const PromptInputTextarea = forwardRef<
  HTMLTextAreaElement,
  ComponentProps<typeof Textarea>
>(({ className, ...props }, ref) => (
  <Textarea
    ref={ref}
    className={cn(
      "min-h-11 resize-none border-0 bg-transparent px-3 py-2 text-base leading-relaxed shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 sm:text-sm",
      className,
    )}
    {...props}
  />
));
PromptInputTextarea.displayName = "PromptInputTextarea";

const PromptInputFooter = forwardRef<
  HTMLDivElement,
  HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex min-h-12 items-center justify-between gap-2 px-2.5 pb-2.5", className)}
    {...props}
  />
));
PromptInputFooter.displayName = "PromptInputFooter";

const PromptInputTools = forwardRef<
  HTMLDivElement,
  HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex min-w-0 flex-1 items-center gap-1.5", className)}
    {...props}
  />
));
PromptInputTools.displayName = "PromptInputTools";

type PromptInputSubmitProps = ComponentProps<typeof Button> & {
  status?: PromptInputStatus;
};

function PromptInputSubmit({
  children,
  disabled,
  status = "ready",
  ...props
}: PromptInputSubmitProps) {
  const isBusy = status === "submitted" || status === "streaming";

  return (
    <Button
      type="submit"
      size="icon"
      aria-label={isBusy ? "Sending message" : "Send message"}
      disabled={disabled || isBusy}
      className="h-8 w-8 shrink-0 rounded-full"
      {...props}
    >
      {children ?? (
        isBusy ? (
          <Loader2Icon aria-hidden="true" className="h-4 w-4 animate-spin" />
        ) : (
          <ArrowUpIcon aria-hidden="true" className="h-4 w-4" />
        )
      )}
    </Button>
  );
}

export {
  PromptInput,
  PromptInputBody,
  PromptInputFooter,
  PromptInputHeader,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputTools,
};
export type { PromptInputStatus };
