"use client";

import {
  forwardRef,
  type HTMLAttributes,
  type MutableRefObject,
  type RefObject,
  useEffect,
  useRef,
  useState,
} from "react";
import { ArrowDownIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const Conversation = forwardRef<
  HTMLDivElement,
  HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("relative flex min-h-0 flex-1 flex-col", className)}
    {...props}
  />
));
Conversation.displayName = "Conversation";

type ConversationContentProps = HTMLAttributes<HTMLDivElement> & {
  autoScroll?: boolean;
};

const ConversationContent = forwardRef<HTMLDivElement, ConversationContentProps>(
  ({ autoScroll = false, className, children, ...props }, ref) => {
    const localRef = useRef<HTMLDivElement | null>(null);
    const [atBottom, setAtBottom] = useState(true);

    function setRefs(element: HTMLDivElement | null) {
      localRef.current = element;
      if (typeof ref === "function") {
        ref(element);
      } else if (ref) {
        (ref as MutableRefObject<HTMLDivElement | null>).current = element;
      }
    }

    useEffect(() => {
      if (!autoScroll || !atBottom || !localRef.current) return;
      localRef.current.scrollTo({
        top: localRef.current.scrollHeight,
        behavior: "smooth",
      });
    }, [atBottom, autoScroll, children]);

    return (
      <div
        ref={setRefs}
        className={cn("min-h-0 flex-1 overflow-y-auto overscroll-contain", className)}
        onScroll={(event) => {
          const element = event.currentTarget;
          setAtBottom(
            element.scrollHeight - element.scrollTop - element.clientHeight < 24,
          );
          props.onScroll?.(event);
        }}
        {...props}
      >
        {children}
      </div>
    );
  },
);
ConversationContent.displayName = "ConversationContent";

function ConversationScrollButton({
  targetRef,
  className,
}: {
  targetRef: RefObject<HTMLDivElement>;
  className?: string;
}) {
  return (
    <Button
      type="button"
      size="icon"
      variant="secondary"
      className={cn(
        "absolute bottom-3 left-1/2 h-8 w-8 -translate-x-1/2 rounded-full shadow-sm",
        className,
      )}
      aria-label="Scroll to latest message"
      onClick={() => {
        const target = targetRef.current;
        target?.scrollTo({ top: target.scrollHeight, behavior: "smooth" });
      }}
    >
      <ArrowDownIcon aria-hidden="true" className="h-4 w-4" />
    </Button>
  );
}

export { Conversation, ConversationContent, ConversationScrollButton };
