"use client";

import { ChevronDown } from "lucide-react";
import type { ReactNode } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

type MusicPickerProps = {
  label: string;
  value: string;
  detail?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
};

export default function MusicPicker({
  label,
  value,
  detail,
  open,
  onOpenChange,
  title,
  description,
  children,
  className,
}: MusicPickerProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <button
          type="button"
          className={cn(
            "group flex w-full items-center justify-between gap-3 rounded-2xl bg-background/70 px-4 py-3 text-left transition-colors hover:bg-accent/60",
            className,
          )}
        >
          <span className="min-w-0">
            <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              {label}
            </span>
            <span className="mt-1 block truncate text-lg font-semibold tracking-tight text-foreground">
              {value}
            </span>
            {detail ? (
              <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                {detail}
              </span>
            ) : null}
          </span>
          <ChevronDown
            size={18}
            className="shrink-0 text-muted-foreground transition group-hover:text-foreground"
          />
        </button>
      </DialogTrigger>
      <DialogContent className="max-h-[85dvh] overflow-y-auto border-border bg-background sm:rounded-2xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description ? <DialogDescription>{description}</DialogDescription> : null}
        </DialogHeader>
        <div className="pt-1">{children}</div>
      </DialogContent>
    </Dialog>
  );
}
