export const ADMIN_UNAVAILABLE_MESSAGE =
  "That password did not work, or the admin secret is not configured.";

export function formatThreadTime(timestamp: number) {
  const date = new Date(timestamp);
  const today = new Date();
  const isToday = date.toDateString() === today.toDateString();

  if (isToday) {
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    });
  }

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

export function formatMessageTime(timestamp: number) {
  return new Date(timestamp).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function shortClientId(clientId: string) {
  if (clientId.length <= 12) return clientId;
  return `${clientId.slice(0, 6)}...${clientId.slice(-4)}`;
}

export function getThreadTitle(thread: { title?: string; clientId: string }) {
  return thread.title?.trim() || `Visitor ${shortClientId(thread.clientId)}`;
}
