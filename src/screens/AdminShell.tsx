"use client";

import Link from "next/link";
import { FormEvent, ReactNode, useEffect, useState } from "react";
import { LayoutDashboard, LogOut, MessageCircle, PencilLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export const ADMIN_SECRET_KEY = "postcard-admin-secret";

type AdminShellProps = {
  activePath: "/admin" | "/admin/dashboard" | "/admin/postcards";
  title: string;
  description?: string;
  children: (adminSecret: string) => ReactNode;
};

const adminNavItems = [
  {
    href: "/admin/dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
  },
  {
    href: "/admin",
    label: "Chats",
    icon: MessageCircle,
  },
  {
    href: "/admin/postcards",
    label: "Postcards",
    icon: PencilLine,
  },
] as const;

export default function AdminShell({
  activePath,
  title,
  children,
}: AdminShellProps) {
  const [secretInput, setSecretInput] = useState("");
  const [adminSecret, setAdminSecret] = useState("");

  useEffect(() => {
    const savedSecret = window.sessionStorage.getItem(ADMIN_SECRET_KEY);
    if (savedSecret) {
      setSecretInput(savedSecret);
      setAdminSecret(savedSecret);
    }
  }, []);

  function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedSecret = secretInput.trim();
    if (!trimmedSecret) return;
    window.sessionStorage.setItem(ADMIN_SECRET_KEY, trimmedSecret);
    setAdminSecret(trimmedSecret);
  }

  function logout() {
    window.sessionStorage.removeItem(ADMIN_SECRET_KEY);
    setAdminSecret("");
    setSecretInput("");
  }

  return (
    <main className="h-dvh overflow-hidden bg-background text-foreground">
        {adminSecret ? (
          <div className="grid h-full min-h-0 grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden bg-card lg:grid-cols-[9.5rem_minmax(0,1fr)] lg:grid-rows-1">
            <aside className="flex min-h-0 flex-col border-b border-border bg-background/70 lg:border-b-0 lg:border-r">
              <div className="flex h-14 items-center justify-between gap-3 border-b border-border px-3">
                <div className="min-w-0">
                  <p className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
                    Admin
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={logout}
                  className="h-8 w-8 shrink-0 rounded-[7px] text-muted-foreground hover:text-foreground lg:hidden"
                  aria-label="Log out"
                >
                  <LogOut aria-hidden="true" className="h-3.5 w-3.5" />
                </Button>
              </div>

              <nav className="hidden gap-1 overflow-x-auto p-2 lg:flex lg:flex-1 lg:flex-col lg:overflow-y-auto">
                {adminNavItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = activePath === item.href;

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        "inline-flex h-9 shrink-0 items-center gap-2 rounded-[7px] px-2.5 text-sm transition-colors",
                        isActive
                          ? "bg-foreground text-background"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground",
                      )}
                    >
                      <Icon aria-hidden="true" className="h-4 w-4" />
                      {item.label}
                    </Link>
                  );
                })}
              </nav>

              <div className="hidden border-t border-border p-2 lg:block">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={logout}
                  className="h-9 w-full justify-start gap-2 rounded-[7px] px-3 font-mono text-xs text-muted-foreground hover:text-foreground"
                >
                  <LogOut aria-hidden="true" className="h-3.5 w-3.5" />
                  Log out
                </Button>
              </div>
            </aside>

            <section className="min-h-0 min-w-0 overflow-hidden">{children(adminSecret)}</section>

            <nav className="grid h-16 grid-cols-3 border-t border-border bg-background/95 px-3 py-2 lg:hidden">
              {adminNavItems.map((item) => {
                const Icon = item.icon;
                const isActive = activePath === item.href;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex min-w-0 flex-col items-center justify-center gap-1 rounded-[8px] text-[11px] font-medium transition-colors",
                      isActive
                        ? "bg-foreground text-background"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground",
                    )}
                  >
                    <Icon aria-hidden="true" className="h-4 w-4" />
                    <span className="truncate">{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>
        ) : (
          <div className="flex h-full items-center justify-center">
            <form
              onSubmit={handleLogin}
              className="w-full max-w-sm space-y-4 rounded-[8px] border border-border bg-card p-5 shadow-sm"
            >
              <div>
                <p className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
                  Admin
                </p>
                <h1 className="mt-2 text-lg font-semibold text-foreground">{title}</h1>
              </div>
              <label htmlFor="admin-secret" className="font-mono text-xs text-muted-foreground">
                Admin password
              </label>
              <Input
                id="admin-secret"
                type="password"
                value={secretInput}
                onChange={(event) => setSecretInput(event.target.value)}
                autoComplete="current-password"
                className="rounded-[8px]"
              />
              <Button type="submit" className="rounded-[8px] font-mono text-xs">
                Log in
              </Button>
            </form>
          </div>
        )}
    </main>
  );
}
