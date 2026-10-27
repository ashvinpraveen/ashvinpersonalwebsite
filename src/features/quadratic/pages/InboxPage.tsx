"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { AlarmClock, Check, CheckCheck, Inbox, MoreHorizontal, Trash2 } from "lucide-react";
import type { FunctionReturnType } from "convex/server";
import { api } from "../../../../convex/_generated/api";
import { useToast, useWorkspace, type Issue } from "../data";
import { Avatar, StatusIcon } from "../icons";
import { useShortcuts } from "../shortcuts";
import { useUi } from "../ui";
import { IssueDetail } from "../components/IssueDetail";
import { ViewHeader } from "../components/IssueView";
import { EmptyState, IconButton, Menu, MenuItem, MenuSeparator, Tooltip, timeAgo } from "../components/primitives";
import { cn } from "@/lib/utils";

type Notification = NonNullable<FunctionReturnType<typeof api.quadratic.inbox.list>>[number];

function describe(notification: Notification) {
  switch (notification.kind) {
    case "assigned":
      return "assigned the issue to you";
    case "unassigned":
      return "unassigned you";
    case "comment":
      return `commented: ${notification.body ?? ""}`;
    case "mention":
      return `mentioned you: ${notification.body ?? ""}`;
    case "status":
      return `marked as ${notification.body ?? "done"}`;
    case "priority":
      return `set priority to ${notification.body ?? "Urgent"}`;
    case "reaction":
      return `reacted ${notification.body ?? ""} to your comment`;
    default:
      return "updated the issue";
  }
}

export function InboxPage() {
  const ws = useWorkspace();
  const ui = useUi();
  const toast = useToast();
  const notifications = useQuery(api.quadratic.inbox.list, { token: ws.token, workspaceId: ws.workspace._id });
  const markRead = useMutation(api.quadratic.inbox.markRead);
  const markAllRead = useMutation(api.quadratic.inbox.markAllRead);
  const archive = useMutation(api.quadratic.inbox.archive);
  const archiveRead = useMutation(api.quadratic.inbox.archiveRead);
  const snooze = useMutation(api.quadratic.inbox.snooze);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const base = { token: ws.token, workspaceId: ws.workspace._id };

  const visible = useMemo(() => {
    const now = Date.now();
    return (notifications ?? []).filter((n) => !(n.snoozedUntil && n.snoozedUntil > now));
  }, [notifications]);
  const selected = visible.find((n) => n._id === selectedId) ?? null;

  useEffect(() => {
    if (!selected && visible.length && !selectedId) setSelectedId(visible[0]._id);
  }, [selected, selectedId, visible]);

  useEffect(() => {
    if (selected && !selected.readAt) {
      void markRead({ ...base, notificationIds: [selected._id], read: true }).catch(() => undefined);
    }
    // Only when the selection changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected?._id]);

  useEffect(() => {
    ui.activeIssues.current = () => {
      const issue = selected?.issue ? ws.issuesById.get(selected.issue._id) : undefined;
      return issue ? [issue] : [];
    };
  }, [selected, ui.activeIssues, ws.issuesById]);

  const move = (delta: number) => {
    if (!visible.length) return;
    const index = visible.findIndex((n) => n._id === selectedId);
    const next = visible[Math.max(0, Math.min(visible.length - 1, index + delta))];
    if (next) {
      setSelectedId(next._id);
      requestAnimationFrame(() => document.querySelector(`[data-notification-id="${next._id}"]`)?.scrollIntoView({ block: "nearest" }));
    }
  };

  const removeSelected = () => {
    if (!selected) return;
    const index = visible.findIndex((n) => n._id === selected._id);
    setSelectedId(visible[index + 1]?._id ?? visible[index - 1]?._id ?? null);
    void archive({ ...base, notificationIds: [selected._id] }).catch(toast.error);
  };

  useShortcuts(
    {
      j: () => move(1),
      arrowdown: () => move(1),
      k: () => move(-1),
      arrowup: () => move(-1),
      backspace: removeSelected,
      delete: removeSelected,
      u: () => {
        if (selected) void markRead({ ...base, notificationIds: [selected._id], read: !selected.readAt }).catch(toast.error);
      },
      h: () => {
        if (selected) {
          void snooze({ ...base, notificationId: selected._id, until: Date.now() + 24 * 3600 * 1000 }).catch(toast.error);
          toast.show({ title: "Snoozed until tomorrow" });
        }
      },
    },
    !ui.dialogOpen,
  );

  const unread = visible.filter((n) => !n.readAt).length;

  return (
    <div className="flex h-full min-h-0">
      <div className={cn("flex min-h-0 w-full flex-col border-r border-q-line md:w-[380px] md:shrink-0", selected && "hidden md:flex")}>
        <ViewHeader
          right={
            <Menu
              align="end"
              trigger={
                <IconButton label="Inbox actions">
                  <MoreHorizontal size={15} />
                </IconButton>
              }
            >
              <MenuItem icon={<CheckCheck size={14} />} onSelect={() => markAllRead(base).catch(toast.error)}>
                Mark all as read
              </MenuItem>
              <MenuSeparator />
              <MenuItem icon={<Trash2 size={14} />} onSelect={() => archiveRead(base).catch(toast.error)}>
                Delete all read notifications
              </MenuItem>
            </Menu>
          }
        >
          <span className="font-medium text-q-text">Inbox</span>
          {unread ? <span className="text-q-text3">{unread} unread</span> : null}
        </ViewHeader>
        <div className="q-scroll flex-1">
          {notifications === undefined ? null : visible.length === 0 ? (
            <EmptyState icon={<Inbox size={36} strokeWidth={1.25} />} title="No notifications" description="You're all caught up." />
          ) : (
            visible.map((notification) => {
              const actor = notification.actorId ? ws.membersById.get(notification.actorId) : undefined;
              const issue = notification.issue
                ? ((ws.issuesById.get(notification.issue._id) as Issue | undefined) ?? (notification.issue as Issue))
                : undefined;
              const state = issue ? ws.statesById.get(issue.stateId) : undefined;
              const active = notification._id === selectedId;
              return (
                <button
                  key={notification._id}
                  type="button"
                  data-notification-id={notification._id}
                  onClick={() => setSelectedId(notification._id)}
                  className={cn(
                    "group flex w-full gap-3 border-b border-q-line px-4 py-3 text-left",
                    active ? "bg-q-active" : "hover:bg-q-hover",
                  )}
                >
                  <div className="relative mt-0.5">
                    <Avatar name={actor?.name ?? "Quadratic"} hue={actor?.avatarHue} size={28} />
                    {state ? (
                      <span className="absolute -bottom-1 -right-1 rounded-full bg-q-panel p-[1px]">
                        <StatusIcon type={state.type} color={state.color} progress={ws.stateProgress(state)} size={12} />
                      </span>
                    ) : null}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className={cn("min-w-0 flex-1 truncate", notification.readAt ? "text-q-text2" : "font-medium text-q-text")}>
                        {issue ? `${ws.identifier(issue)} ${issue.title}` : "Notification"}
                      </span>
                      <span className="shrink-0 text-[11px] text-q-text4">{timeAgo(notification.createdAt)}</span>
                    </div>
                    <div className="mt-0.5 flex items-center gap-2">
                      <span className="min-w-0 flex-1 truncate text-[12.5px] text-q-text3">
                        {actor?.name ?? "Someone"} {describe(notification)}
                      </span>
                      {!notification.readAt ? <span className="h-2 w-2 shrink-0 rounded-full bg-q-accent" /> : null}
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>
      <div className={cn("min-w-0 flex-1", !selected && "hidden md:block")}>
        {selected?.issue ? (
          <div className="flex h-full flex-col">
            <div className="flex h-9 shrink-0 items-center gap-1 border-b border-q-line px-3">
              <button type="button" className="mr-auto text-[12px] text-q-text3 md:hidden" onClick={() => setSelectedId(null)}>
                ← Inbox
              </button>
              <Tooltip label={selected.readAt ? "Mark as unread" : "Mark as read"} keys={["U"]}>
                <IconButton label="Toggle read" onClick={() => markRead({ ...base, notificationIds: [selected._id], read: !selected.readAt }).catch(toast.error)}>
                  <Check size={14} />
                </IconButton>
              </Tooltip>
              <Menu
                align="end"
                trigger={
                  <IconButton label="Snooze">
                    <AlarmClock size={14} />
                  </IconButton>
                }
              >
                {[
                  { label: "In 1 hour", ms: 3600 * 1000 },
                  { label: "Tomorrow", ms: 24 * 3600 * 1000 },
                  { label: "Next week", ms: 7 * 24 * 3600 * 1000 },
                ].map((option) => (
                  <MenuItem
                    key={option.label}
                    onSelect={() => {
                      void snooze({ ...base, notificationId: selected._id, until: Date.now() + option.ms }).catch(toast.error);
                      move(1);
                    }}
                  >
                    {option.label}
                  </MenuItem>
                ))}
              </Menu>
              <Tooltip label="Delete notification" keys={["⌫"]}>
                <IconButton label="Delete notification" onClick={removeSelected}>
                  <Trash2 size={14} />
                </IconButton>
              </Tooltip>
            </div>
            <div className="min-h-0 flex-1">
              <IssueDetail identifier={ws.identifier(selected.issue as Issue)} embedded />
            </div>
          </div>
        ) : (
          <EmptyState icon={<Inbox size={40} strokeWidth={1.1} />} title="Inbox" description="Select a notification to see its issue." />
        )}
      </div>
    </div>
  );
}
