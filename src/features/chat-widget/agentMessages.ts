import type { ChatToolCall } from "@/features/chat-widget/types";

type AgentMessagePart = {
  type?: string;
  text?: string;
  toolCallId?: string;
  state?: string;
  input?: unknown;
  output?: unknown;
};

export type AgentUiMessage = {
  key: string;
  id?: string;
  role: "assistant" | "system" | "user";
  text?: string;
  parts?: AgentMessagePart[];
  status?: string;
  _creationTime?: number;
};

export type DisplayChatMessage = {
  _id: string;
  author: "ashvin" | "visitor";
  body: string;
  createdAt: number;
};

function textFromParts(parts: AgentMessagePart[] | undefined) {
  return (parts ?? [])
    .filter((part) => part.type === "text" && typeof part.text === "string")
    .map((part) => part.text)
    .join("");
}

export function toDisplayChatMessages(messages: AgentUiMessage[]): DisplayChatMessage[] {
  return messages
    .map((message) => ({
      _id: message.key || message.id || `${message.role}-${message._creationTime ?? 0}`,
      author: message.role === "user" ? "visitor" as const : "ashvin" as const,
      body: message.text ?? textFromParts(message.parts) ?? "",
      createdAt: message._creationTime ?? Date.now(),
    }))
    .filter((message) => message.body.trim().length > 0);
}

function unwrapToolOutput(output: unknown) {
  if (
    output &&
    typeof output === "object" &&
    "type" in output &&
    (output as { type?: unknown }).type === "json" &&
    "value" in output
  ) {
    return (output as { value: unknown }).value;
  }
  return output;
}

function screenActionFromOutput(output: unknown): ChatToolCall | null {
  const value = unwrapToolOutput(output);
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  if (record.kind !== "screen_action" || typeof record.name !== "string") return null;
  const args = record.args && typeof record.args === "object" ? record.args as Record<string, unknown> : {};

  if (record.name === "navigate_site") {
    const path = typeof args.path === "string" ? args.path : "";
    const reason = typeof args.reason === "string" ? args.reason : undefined;
    return path ? { name: "navigate_site", args: { path, reason } } : null;
  }

  if (record.name === "scroll_to_section" || record.name === "highlight_section") {
    const sectionId = typeof args.sectionId === "string" ? args.sectionId : "";
    const reason = typeof args.reason === "string" ? args.reason : undefined;
    return sectionId ? { name: record.name, args: { sectionId, reason } } : null;
  }

  return null;
}

export function extractScreenToolCalls(messages: AgentUiMessage[], seenToolCallIds: Set<string>) {
  const calls: ChatToolCall[] = [];

  for (const message of messages) {
    for (const part of message.parts ?? []) {
      if (!part.type?.startsWith("tool-") || part.state !== "output-available") continue;
      if (!part.toolCallId || seenToolCallIds.has(part.toolCallId)) continue;

      const call = screenActionFromOutput(part.output);
      if (!call) continue;

      seenToolCallIds.add(part.toolCallId);
      calls.push(call);
    }
  }

  return calls;
}
