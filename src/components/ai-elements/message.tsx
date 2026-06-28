"use client";

import {
  type ComponentProps,
  createContext,
  forwardRef,
  type HTMLAttributes,
  ReactNode,
  useContext,
} from "react";
import { CopyIcon } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

type MessageRole = "assistant" | "system" | "user";

const MessageContext = createContext<{ from: MessageRole }>({
  from: "assistant",
});

type MessageProps = HTMLAttributes<HTMLDivElement> & {
  from?: MessageRole;
};

const Message = forwardRef<HTMLDivElement, MessageProps>(
  ({ className, from = "assistant", ...props }, ref) => (
    <MessageContext.Provider value={{ from }}>
      <div
        ref={ref}
        className={cn(
          "group flex w-full flex-col gap-1",
          from === "user" ? "items-end" : "items-start",
          className,
        )}
        data-role={from}
        {...props}
      />
    </MessageContext.Provider>
  ),
);
Message.displayName = "Message";

type MessageContentProps = HTMLAttributes<HTMLDivElement>;

const MessageContent = forwardRef<HTMLDivElement, MessageContentProps>(
  ({ className, ...props }, ref) => {
    const { from } = useContext(MessageContext);
    const isUser = from === "user";

    return (
      <div
        ref={ref}
        className={cn(
          "text-base leading-relaxed sm:text-sm",
          isUser
            ? "ml-auto max-w-[82%] rounded-lg bg-primary px-3 py-2 text-primary-foreground"
            : "mr-auto w-full max-w-none px-0 py-1 text-foreground",
          className,
        )}
        {...props}
      />
    );
  },
);
MessageContent.displayName = "MessageContent";

function MessageResponse({
  children,
  className,
  parseIncompleteMarkdown = true,
}: {
  children?: string;
  className?: string;
  parseIncompleteMarkdown?: boolean;
}) {
  const { from } = useContext(MessageContext);
  const isUser = from === "user";
  const content = parseIncompleteMarkdown ? closeDanglingFence(children ?? "") : children;

  return (
    <div className={cn("min-w-0", className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: ({ children, href, ...props }) => (
            <a
              className="underline underline-offset-2"
              href={href}
              rel="noreferrer"
              target="_blank"
              {...props}
            >
              {children}
            </a>
          ),
          blockquote: ({ children }) => (
            <blockquote
              className={cn(
                "my-2 border-l-2 pl-3 italic",
                isUser
                  ? "border-primary-foreground/45"
                  : "border-border text-muted-foreground",
              )}
            >
              {children}
            </blockquote>
          ),
          code: ({ children }) => (
            <code
              className={cn(
                "rounded px-1 py-0.5 text-[0.85em]",
                isUser ? "bg-primary-foreground/15" : "bg-background/70",
              )}
            >
              {children}
            </code>
          ),
          ol: ({ children }) => (
            <ol className="mb-2 list-decimal space-y-1 pl-4 last:mb-0">
              {children}
            </ol>
          ),
          p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
          pre: ({ children }) => (
            <pre
              className={cn(
                "my-2 overflow-x-auto rounded-md p-3 text-xs",
                isUser ? "bg-primary-foreground/15" : "bg-background/70",
              )}
            >
              {children}
            </pre>
          ),
          table: ({ children }) => (
            <div className="my-2 overflow-x-auto">
              <table className="w-full border-collapse text-xs">{children}</table>
            </div>
          ),
          td: ({ children }) => (
            <td
              className={cn(
                "border px-2 py-1 align-top",
                isUser ? "border-primary-foreground/25" : "border-border",
              )}
            >
              {children}
            </td>
          ),
          th: ({ children }) => (
            <th
              className={cn(
                "border px-2 py-1 text-left align-top font-medium",
                isUser ? "border-primary-foreground/25" : "border-border",
              )}
            >
              {children}
            </th>
          ),
          ul: ({ children }) => (
            <ul className="mb-2 list-disc space-y-1 pl-4 last:mb-0">
              {children}
            </ul>
          ),
        }}
      >
        {content ?? ""}
      </ReactMarkdown>
    </div>
  );
}

function MessageLoading({
  children = "Thinking...",
  className,
}: {
  children?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "inline-flex items-center gap-2 text-muted-foreground",
        className,
      )}
      aria-live="polite"
    >
      <span className="flex gap-1">
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-current [animation-delay:-0.2s]" />
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-current [animation-delay:-0.1s]" />
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-current" />
      </span>
      <span>{children}</span>
    </div>
  );
}

type MessageActionsProps = HTMLAttributes<HTMLDivElement>;

const MessageActions = forwardRef<HTMLDivElement, MessageActionsProps>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100",
        className,
      )}
      {...props}
    />
  ),
);
MessageActions.displayName = "MessageActions";

type MessageActionProps = ComponentProps<typeof Button> & {
  label: string;
};

function MessageAction({ label, children, ...props }: MessageActionProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-7 w-7 rounded-md text-muted-foreground hover:text-foreground"
          aria-label={label}
          {...props}
        >
          {children ?? <CopyIcon aria-hidden="true" className="h-3.5 w-3.5" />}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

function closeDanglingFence(value: string) {
  const fenceCount = value.match(/```/g)?.length ?? 0;
  return fenceCount % 2 === 1 ? `${value}\n\`\`\`` : value;
}

export {
  Message,
  MessageAction,
  MessageActions,
  MessageContent,
  MessageLoading,
  MessageResponse,
};
