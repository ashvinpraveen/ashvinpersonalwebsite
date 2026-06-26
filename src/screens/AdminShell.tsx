"use client";

import Link from "next/link";
import { FormEvent, ReactNode, useEffect, useState } from "react";
import { LogOut, MessageCircle, PencilLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export const ADMIN_SECRET_KEY = "postcard-admin-secret";

type AdminShellProps = {
  activePath: "/admin" | "/admin/postcards";
  title: string;
  description: string;
  children: (adminSecret: string) => ReactNode;
};

const adminNavItems = [
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
  description,
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
    <main className="min-h-dvh bg-background text-foreground">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-5 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-5 border-b border-border pb-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-2">
            <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
              Ashvin admin
            </p>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
              {title}
            </h1>
            <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
              {description}
            </p>
          </div>

          {adminSecret ? (
            <Button
              type="button"
              variant="outline"
              onClick={logout}
              className="w-fit gap-2 rounded-[8px] font-mono text-xs"
            >
              <LogOut aria-hidden="true" className="h-3.5 w-3.5" />
              Log out
            </Button>
          ) : null}
        </header>

        {adminSecret ? (
          <div className="grid min-h-[calc(100dvh-10rem)] gap-5 lg:grid-cols-[12rem_minmax(0,1fr)]">
            <nav className="flex gap-2 overflow-x-auto border-b border-border pb-3 lg:flex-col lg:overflow-visible lg:border-b-0 lg:border-r lg:pb-0 lg:pr-3">
              {adminNavItems.map((item) => {
                const Icon = item.icon;
                const isActive = activePath === item.href;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "inline-flex h-10 shrink-0 items-center gap-2 rounded-[8px] px-3 text-sm transition-colors",
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
            <section className="min-w-0">{children(adminSecret)}</section>
          </div>
        ) : (
          <form
            onSubmit={handleLogin}
            className="w-full max-w-sm space-y-4 rounded-[8px] border border-border bg-card p-5"
          >
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
        )}
      </div>
    </main>
  );
}
