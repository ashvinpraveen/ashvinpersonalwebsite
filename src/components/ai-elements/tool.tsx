"use client";

import type { HTMLAttributes } from "react";
import { CheckCircle2Icon, Loader2Icon, WrenchIcon, XCircleIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type ToolStatus = "error" | "input-available" | "output-available" | "running";

type ToolProps = HTMLAttributes<HTMLDivElement> & {
  status?: ToolStatus;
};

function Tool({ className, status = "output-available", ...props }: ToolProps) {
  return (
    <div
      className={cn(
        "rounded-lg border border-border bg-background/65 text-sm",
        className,
      )}
      data-status={status}
      {...props}
    />
  );
}

function ToolHeader({
  children,
  className,
  status = "output-available",
}: HTMLAttributes<HTMLDivElement> & {
  status?: ToolStatus;
}) {
  const Icon =
    status === "running"
      ? Loader2Icon
      : status === "error"
        ? XCircleIcon
        : status === "output-available"
          ? CheckCircle2Icon
          : WrenchIcon;

  return (
    <div
      className={cn(
        "flex items-center gap-2 border-b border-border px-3 py-2 font-mono text-[10px] uppercase tracking-widest text-muted-foreground",
        className,
      )}
    >
      <Icon
        aria-hidden="true"
        className={cn("h-3.5 w-3.5", status === "running" && "animate-spin")}
      />
      {children}
    </div>
  );
}

function ToolContent({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("px-3 py-2 text-muted-foreground", className)}
      {...props}
    />
  );
}

export { Tool, ToolContent, ToolHeader };
export type { ToolStatus };
