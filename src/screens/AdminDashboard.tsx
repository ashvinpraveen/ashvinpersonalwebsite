"use client";

import type { ReactNode } from "react";
import { useQuery } from "convex/react";
import { Activity, BarChart3, Inbox, MailWarning, MessageCircle, PencilLine } from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
} from "recharts";
import { api } from "../../convex/_generated/api";
import AdminShell from "@/screens/AdminShell";
import FeatureUnavailable from "@/components/FeatureUnavailable";
import {
  ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  ADMIN_UNAVAILABLE_MESSAGE,
  formatMessageTime,
  getThreadTitle,
} from "@/features/admin/formatters";
import { isAdminEnabled, isPostHogEnabled } from "@/lib/features";
import { cn } from "@/lib/utils";

const activityChartConfig = {
  postcards: {
    label: "Postcards",
    color: "hsl(var(--link))",
  },
  chats: {
    label: "Chats",
    color: "hsl(var(--primary))",
  },
} satisfies ChartConfig;

const messageChartConfig = {
  visitorMessages: {
    label: "Visitor",
    color: "hsl(var(--link))",
  },
  aiMessages: {
    label: "AI",
    color: "hsl(var(--muted-foreground))",
  },
} satisfies ChartConfig;

function formatDateLabel(date: string) {
  return new Date(`${date}T00:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function MetricCard({
  icon: Icon,
  label,
  value,
  detail,
  accent = false,
}: {
  icon: typeof Activity;
  label: string;
  value: number | string;
  detail: string;
  accent?: boolean;
}) {
  return (
    <div
      className={cn(
        "min-w-0 rounded-[8px] border border-border bg-card p-4",
        accent && "border-primary/30 bg-primary text-primary-foreground",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className={cn("font-mono text-[10px] uppercase tracking-widest", accent ? "opacity-75" : "text-muted-foreground")}>
            {label}
          </p>
          <p className="mt-2 text-2xl font-semibold tabular-nums">{value}</p>
        </div>
        <Icon
          aria-hidden="true"
          className={cn("h-4 w-4 shrink-0", accent ? "opacity-70" : "text-muted-foreground")}
        />
      </div>
      <p className={cn("mt-3 truncate text-xs", accent ? "opacity-75" : "text-muted-foreground")}>
        {detail}
      </p>
    </div>
  );
}

function DashboardPanel({
  title,
  children,
  aside,
}: {
  title: string;
  children: ReactNode;
  aside?: ReactNode;
}) {
  return (
    <section className="min-w-0 rounded-[8px] border border-border bg-card">
      <div className="flex min-h-14 items-center justify-between gap-3 border-b border-border px-4">
        <h2 className="text-sm font-semibold">{title}</h2>
        {aside}
      </div>
      <div className="p-4">{children}</div>
    </section>
  );
}

function AdminDashboardContent({ adminSecret }: { adminSecret: string }) {
  const dashboard = useQuery(api.adminDashboard.getOverview, { adminSecret });
  const hasPostHogCapture = isPostHogEnabled;

  if (dashboard === undefined) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="font-mono text-xs text-muted-foreground">Loading dashboard...</p>
      </div>
    );
  }

  if (dashboard === null) {
    return (
      <div className="m-4 max-w-md rounded-[8px] border border-border bg-card p-5">
        <p className="text-sm text-muted-foreground">
          {ADMIN_UNAVAILABLE_MESSAGE}
        </p>
      </div>
    );
  }

  const totals = dashboard.totals;
  const windowDetail = `Last ${dashboard.windowDays} days`;
  const latestUnread = dashboard.recentUnread[0];

  return (
    <div className="h-full overflow-y-auto bg-background/50 p-3 lg:p-4">
      <div className="mx-auto flex max-w-7xl flex-col gap-4">
        <div className="flex min-h-14 flex-wrap items-end justify-between gap-3">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
              Admin
            </p>
            <h1 className="mt-1 text-xl font-semibold">Dashboard</h1>
          </div>
          <p className="font-mono text-[11px] text-muted-foreground">
            Updated {formatMessageTime(dashboard.generatedAt)}
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            icon={MessageCircle}
            label="Unread"
            value={totals.unreadChats}
            detail={latestUnread ? getThreadTitle(latestUnread) : "Inbox is clear"}
            accent={totals.unreadChats > 0}
          />
          <MetricCard
            icon={PencilLine}
            label="Postcards"
            value={totals.postcards}
            detail={`${totals.repliedPostcards} replied · ${totals.hiddenPostcards} hidden`}
          />
          <MetricCard
            icon={BarChart3}
            label="Chats"
            value={totals.chats}
            detail={`${totals.visitorMessages} visitor messages`}
          />
          <MetricCard
            icon={Activity}
            label="Engagement"
            value={totals.postcardLikes}
            detail={`${totals.chatMessages} total chat messages`}
          />
        </div>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(22rem,0.8fr)]">
          <DashboardPanel
            title="Postcards and Chats"
            aside={<span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{windowDetail}</span>}
          >
            <ChartContainer config={activityChartConfig} className="h-72 aspect-auto">
              <AreaChart data={dashboard.series} margin={{ left: 0, right: 8, top: 8 }}>
                <CartesianGrid vertical={false} />
                <XAxis
                  dataKey="date"
                  tickLine={false}
                  axisLine={false}
                  minTickGap={28}
                  tickFormatter={formatDateLabel}
                />
                <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={24} />
                <ChartTooltip
                  content={<ChartTooltipContent labelFormatter={(value) => formatDateLabel(String(value))} />}
                />
                <ChartLegend content={<ChartLegendContent />} />
                <Area
                  type="monotone"
                  dataKey="postcards"
                  stroke="var(--color-postcards)"
                  fill="var(--color-postcards)"
                  fillOpacity={0.2}
                  strokeWidth={2}
                />
                <Area
                  type="monotone"
                  dataKey="chats"
                  stroke="var(--color-chats)"
                  fill="var(--color-chats)"
                  fillOpacity={0.14}
                  strokeWidth={2}
                />
              </AreaChart>
            </ChartContainer>
          </DashboardPanel>

          <DashboardPanel
            title="Recent Unread"
            aside={<MailWarning aria-hidden="true" className="h-4 w-4 text-muted-foreground" />}
          >
            {dashboard.recentUnread.length > 0 ? (
              <div className="space-y-2">
                {dashboard.recentUnread.map((message) => (
                  <article
                    key={message.threadId}
                    className="rounded-[8px] border border-border bg-background/65 p-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <p className="min-w-0 truncate text-sm font-medium">
                        {getThreadTitle(message)}
                      </p>
                      <time className="shrink-0 font-mono text-[10px] text-muted-foreground">
                        {formatMessageTime(message.createdAt)}
                      </time>
                    </div>
                    <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-muted-foreground">
                      {message.body}
                    </p>
                  </article>
                ))}
              </div>
            ) : (
              <div className="flex min-h-44 flex-col items-center justify-center text-center">
                <Inbox aria-hidden="true" className="mb-3 h-7 w-7 text-muted-foreground" />
                <p className="text-sm font-medium">No unread visitor messages.</p>
                <p className="mt-1 text-sm text-muted-foreground">Everything recent has been opened.</p>
              </div>
            )}
          </DashboardPanel>
        </div>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(20rem,0.55fr)]">
          <DashboardPanel title="Message Mix">
            <ChartContainer config={messageChartConfig} className="h-64 aspect-auto">
              <BarChart data={dashboard.series} margin={{ left: 0, right: 8, top: 8 }}>
                <CartesianGrid vertical={false} />
                <XAxis
                  dataKey="date"
                  tickLine={false}
                  axisLine={false}
                  minTickGap={28}
                  tickFormatter={formatDateLabel}
                />
                <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={24} />
                <ChartTooltip
                  content={<ChartTooltipContent labelFormatter={(value) => formatDateLabel(String(value))} />}
                />
                <ChartLegend content={<ChartLegendContent />} />
                <Bar dataKey="visitorMessages" stackId="messages" fill="var(--color-visitorMessages)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="aiMessages" stackId="messages" fill="var(--color-aiMessages)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ChartContainer>
          </DashboardPanel>

          <DashboardPanel title="PostHog">
            <div className="space-y-3 text-sm leading-relaxed text-muted-foreground">
              <p>
                {hasPostHogCapture
                  ? "PostHog capture is configured for the site, but analytics querying is not wired into admin yet."
                  : "PostHog capture is not configured in this environment."}
              </p>
              <p>
                To show pageviews, referrers, and funnels here, add a server-only PostHog personal API key
                and proxy the query through a protected admin endpoint.
              </p>
            </div>
          </DashboardPanel>
        </div>
      </div>
    </div>
  );
}

const AdminDashboard = () => {
  if (!isAdminEnabled) {
    return (
      <main className="flex h-dvh items-center justify-center bg-background p-6">
        <FeatureUnavailable
          title="Admin dashboard is not configured"
          description="Set NEXT_PUBLIC_CONVEX_URL and run Convex to enable dashboard data."
        />
      </main>
    );
  }

  return (
    <AdminShell
      activePath="/admin/dashboard"
      title="Dashboard"
    >
      {(adminSecret) => <AdminDashboardContent adminSecret={adminSecret} />}
    </AdminShell>
  );
};

export default AdminDashboard;
