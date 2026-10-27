"use client";

import {
  createContext,
  forwardRef,
  useContext,
  type ButtonHTMLAttributes,
  type ReactNode,
} from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import * as DropdownPrimitive from "@radix-ui/react-dropdown-menu";
import * as ContextMenuPrimitive from "@radix-ui/react-context-menu";
import * as PopoverPrimitive from "@radix-ui/react-popover";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import { Check, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

/** Portals render inside .quadratic-root so they inherit the theme variables. */
export const PortalContext = createContext<HTMLElement | null>(null);
export const usePortal = () => useContext(PortalContext) ?? undefined;

export function Kbd({ children, className }: { children: ReactNode; className?: string }) {
  return <kbd className={cn("q-kbd", className)}>{children}</kbd>;
}

export function Shortcut({ keys }: { keys: string[] }) {
  return (
    <span className="ml-auto flex items-center gap-1">
      {keys.map((key, index) => (
        <Kbd key={`${key}-${index}`}>{key}</Kbd>
      ))}
    </span>
  );
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md";
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "secondary", size = "sm", className, type = "button", ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={cn(
        "inline-flex shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-[6px] font-medium transition-colors disabled:pointer-events-none disabled:opacity-50",
        size === "sm" ? "h-7 px-2.5 text-[12px]" : "h-8 px-3 text-[13px]",
        variant === "primary" && "bg-q-accent text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] hover:bg-q-accent-hover",
        variant === "secondary" && "border border-q-border bg-q-raised text-q-text2 hover:bg-q-active hover:text-q-text",
        variant === "ghost" && "text-q-text3 hover:bg-q-hover hover:text-q-text",
        variant === "danger" && "bg-[#c4453c] text-white hover:bg-[#d4544a]",
        className,
      )}
      {...props}
    />
  );
});

export const IconButton = forwardRef<HTMLButtonElement, ButtonHTMLAttributes<HTMLButtonElement> & { label: string }>(
  function IconButton({ label, className, type = "button", ...props }, ref) {
    return (
      <button
        ref={ref}
        type={type}
        aria-label={label}
        className={cn(
          "inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-[6px] text-q-text3 transition-colors hover:bg-q-hover hover:text-q-text disabled:opacity-40",
          className,
        )}
        {...props}
      />
    );
  },
);

export function Tooltip({
  label,
  keys,
  children,
  side = "bottom",
}: {
  label: ReactNode;
  keys?: string[];
  children: ReactNode;
  side?: "top" | "bottom" | "left" | "right";
}) {
  const container = usePortal();
  return (
    <TooltipPrimitive.Root delayDuration={500}>
      <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
      <TooltipPrimitive.Portal container={container}>
        <TooltipPrimitive.Content
          side={side}
          sideOffset={6}
          className="q-popover z-[90] flex items-center gap-2 px-2 py-1 text-[12px] text-q-text2"
        >
          {label}
          {keys ? (
            <span className="flex gap-0.5">
              {keys.map((key) => (
                <Kbd key={key}>{key}</Kbd>
              ))}
            </span>
          ) : null}
        </TooltipPrimitive.Content>
      </TooltipPrimitive.Portal>
    </TooltipPrimitive.Root>
  );
}

export function Switch({ checked, onChange, label }: { checked: boolean; onChange: (value: boolean) => void; label?: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative inline-flex h-[18px] w-[30px] shrink-0 items-center rounded-full transition-colors",
        checked ? "bg-q-accent" : "bg-q-active",
      )}
    >
      <span
        className={cn(
          "inline-block h-[14px] w-[14px] rounded-full bg-white shadow transition-transform",
          checked ? "translate-x-[14px]" : "translate-x-[2px]",
        )}
      />
    </button>
  );
}

// ---------- popover ----------

export function Popover({
  trigger,
  children,
  open,
  onOpenChange,
  align = "start",
  side = "bottom",
  className,
  modal = false,
}: {
  trigger: ReactNode;
  children: ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  align?: "start" | "center" | "end";
  side?: "top" | "bottom" | "left" | "right";
  className?: string;
  modal?: boolean;
}) {
  const container = usePortal();
  return (
    <PopoverPrimitive.Root open={open} onOpenChange={onOpenChange} modal={modal}>
      <PopoverPrimitive.Trigger asChild>{trigger}</PopoverPrimitive.Trigger>
      <PopoverPrimitive.Portal container={container}>
        <PopoverPrimitive.Content
          align={align}
          side={side}
          sideOffset={4}
          collisionPadding={8}
          className={cn("q-popover", className)}
          onClick={(event) => event.stopPropagation()}
        >
          {children}
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  );
}

// ---------- dialog ----------

export function Dialog({
  open,
  onOpenChange,
  children,
  className,
  position = "center",
  label,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: ReactNode;
  className?: string;
  position?: "center" | "top";
  label: string;
}) {
  const container = usePortal();
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal container={container}>
        <DialogPrimitive.Overlay className="q-overlay fixed inset-0 z-50 bg-black/50" />
        <DialogPrimitive.Content
          aria-describedby={undefined}
          onEscapeKeyDown={(event) => {
            // Let an open @mention menu consume Escape first.
            if ((document.activeElement as HTMLElement | null)?.dataset.mentionOpen === "true") event.preventDefault();
          }}
          className={cn(
            "q-popover fixed inset-x-0 z-50 mx-auto w-[calc(100vw-24px)] outline-none",
            position === "center" ? "top-[12vh]" : "top-[14vh]",
            className,
          )}
        >
          <DialogPrimitive.Title className="sr-only">{label}</DialogPrimitive.Title>
          {children}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

// ---------- menus ----------

const menuContentClass = "q-popover min-w-[200px] p-1";
const menuItemClass =
  "relative flex h-8 cursor-default select-none items-center gap-2.5 rounded-[5px] px-2.5 text-q-text2 outline-none data-[highlighted]:bg-q-active data-[highlighted]:text-q-text data-[disabled]:opacity-50";

export function Menu({
  trigger,
  children,
  align = "start",
  side = "bottom",
  open,
  onOpenChange,
}: {
  trigger: ReactNode;
  children: ReactNode;
  align?: "start" | "center" | "end";
  side?: "top" | "bottom" | "left" | "right";
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const container = usePortal();
  return (
    <DropdownPrimitive.Root open={open} onOpenChange={onOpenChange} modal={false}>
      <DropdownPrimitive.Trigger asChild>{trigger}</DropdownPrimitive.Trigger>
      <DropdownPrimitive.Portal container={container}>
        <DropdownPrimitive.Content
          align={align}
          side={side}
          sideOffset={4}
          collisionPadding={8}
          className={menuContentClass}
          onClick={(event) => event.stopPropagation()}
        >
          {children}
        </DropdownPrimitive.Content>
      </DropdownPrimitive.Portal>
    </DropdownPrimitive.Root>
  );
}

export function MenuItem({
  children,
  onSelect,
  icon,
  keys,
  danger,
  disabled,
  checked,
}: {
  children: ReactNode;
  onSelect?: () => void;
  icon?: ReactNode;
  keys?: string[];
  danger?: boolean;
  disabled?: boolean;
  checked?: boolean;
}) {
  return (
    <DropdownPrimitive.Item
      className={cn(menuItemClass, danger && "text-[#eb5757] data-[highlighted]:text-[#eb5757]")}
      onSelect={onSelect}
      disabled={disabled}
    >
      {icon ? <span className="flex w-4 justify-center text-q-text3">{icon}</span> : null}
      <span className="flex-1 truncate">{children}</span>
      {checked ? <Check size={14} className="text-q-text2" /> : null}
      {keys ? <Shortcut keys={keys} /> : null}
    </DropdownPrimitive.Item>
  );
}

export function MenuSub({ label, icon, children }: { label: ReactNode; icon?: ReactNode; children: ReactNode }) {
  const container = usePortal();
  return (
    <DropdownPrimitive.Sub>
      <DropdownPrimitive.SubTrigger className={menuItemClass}>
        {icon ? <span className="flex w-4 justify-center text-q-text3">{icon}</span> : null}
        <span className="flex-1">{label}</span>
        <ChevronRight size={14} className="text-q-text3" />
      </DropdownPrimitive.SubTrigger>
      <DropdownPrimitive.Portal container={container}>
        <DropdownPrimitive.SubContent sideOffset={6} className={cn(menuContentClass, "max-h-[60vh] overflow-y-auto")}>
          {children}
        </DropdownPrimitive.SubContent>
      </DropdownPrimitive.Portal>
    </DropdownPrimitive.Sub>
  );
}

export function MenuSeparator() {
  return <DropdownPrimitive.Separator className="mx-1 my-1 h-px bg-q-border" />;
}

export function MenuLabel({ children }: { children: ReactNode }) {
  return <DropdownPrimitive.Label className="px-2.5 pb-1 pt-1.5 text-[11px] font-medium text-q-text4">{children}</DropdownPrimitive.Label>;
}

export function ContextMenu({ children, menu }: { children: ReactNode; menu: ReactNode }) {
  const container = usePortal();
  return (
    <ContextMenuPrimitive.Root modal={false}>
      <ContextMenuPrimitive.Trigger asChild>{children}</ContextMenuPrimitive.Trigger>
      <ContextMenuPrimitive.Portal container={container}>
        <ContextMenuPrimitive.Content
          collisionPadding={8}
          className={menuContentClass}
          onClick={(event) => event.stopPropagation()}
        >
          {menu}
        </ContextMenuPrimitive.Content>
      </ContextMenuPrimitive.Portal>
    </ContextMenuPrimitive.Root>
  );
}

export function ContextItem({
  children,
  onSelect,
  icon,
  keys,
  danger,
}: {
  children: ReactNode;
  onSelect?: () => void;
  icon?: ReactNode;
  keys?: string[];
  danger?: boolean;
}) {
  return (
    <ContextMenuPrimitive.Item
      className={cn(menuItemClass, danger && "text-[#eb5757] data-[highlighted]:text-[#eb5757]")}
      onSelect={onSelect}
    >
      {icon ? <span className="flex w-4 justify-center text-q-text3">{icon}</span> : null}
      <span className="flex-1 truncate">{children}</span>
      {keys ? <Shortcut keys={keys} /> : null}
    </ContextMenuPrimitive.Item>
  );
}

export function ContextSub({ label, icon, children }: { label: ReactNode; icon?: ReactNode; children: ReactNode }) {
  const container = usePortal();
  return (
    <ContextMenuPrimitive.Sub>
      <ContextMenuPrimitive.SubTrigger className={menuItemClass}>
        {icon ? <span className="flex w-4 justify-center text-q-text3">{icon}</span> : null}
        <span className="flex-1">{label}</span>
        <ChevronRight size={14} className="text-q-text3" />
      </ContextMenuPrimitive.SubTrigger>
      <ContextMenuPrimitive.Portal container={container}>
        <ContextMenuPrimitive.SubContent sideOffset={6} className={cn(menuContentClass, "max-h-[60vh] overflow-y-auto")}>
          {children}
        </ContextMenuPrimitive.SubContent>
      </ContextMenuPrimitive.Portal>
    </ContextMenuPrimitive.Sub>
  );
}

export function ContextSeparator() {
  return <ContextMenuPrimitive.Separator className="mx-1 my-1 h-px bg-q-border" />;
}

export function TextInput({
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "h-8 w-full rounded-[6px] border border-q-border bg-q-raised px-2.5 text-[13px] text-q-text outline-none transition-colors placeholder:text-q-text4 focus:border-q-accent",
        className,
      )}
      {...props}
    />
  );
}

export function Field({ label, hint, children }: { label: string; hint?: ReactNode; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[12px] font-medium text-q-text2">{label}</span>
      {children}
      {hint ? <span className="mt-1.5 block text-[12px] text-q-text3">{hint}</span> : null}
    </label>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex h-full min-h-[320px] flex-col items-center justify-center px-6 text-center">
      {icon ? <div className="mb-4 text-q-text4">{icon}</div> : null}
      <div className="text-[15px] font-medium text-q-text">{title}</div>
      {description ? <div className="mt-1.5 max-w-sm text-q-text3">{description}</div> : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

export function formatShortDate(timestamp: number | string) {
  const date = typeof timestamp === "string" ? new Date(`${timestamp}T00:00:00`) : new Date(timestamp);
  const sameYear = date.getFullYear() === new Date().getFullYear();
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric", ...(sameYear ? {} : { year: "numeric" }) });
}

export function timeAgo(timestamp: number) {
  const seconds = Math.round((Date.now() - timestamp) / 1000);
  if (seconds < 45) return "just now";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.round(days / 7)}w ago`;
  return formatShortDate(timestamp);
}
