import { isBlogEnabled } from "@/lib/features";

export interface CleveNote {
  id: string;
  title: string;
  content?: string;
  createdAt: number | null;
  updatedAt?: number | null;
}

function getConvexSiteUrl(): string | null {
  if (!isBlogEnabled) return null;
  return process.env.NEXT_PUBLIC_CONVEX_SITE_URL || null;
}

function cleveProxyUrl(params: Record<string, string>) {
  const siteUrl = getConvexSiteUrl();
  if (!siteUrl) return null;
  const url = new URL(`${siteUrl}/cleve-proxy`);
  Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value));
  return url.toString();
}

async function cleveRequest<T>(params: Record<string, string>, fallback: T): Promise<T> {
  const url = cleveProxyUrl(params);
  if (!url) return fallback;

  const res = await fetch(url);
  const payload = await res.json().catch(() => null);

  if (!res.ok) {
    const message =
      payload && typeof payload === "object" && "error" in payload
        ? String((payload as { error: unknown }).error)
        : `Cleve proxy error: ${res.status}`;
    throw new Error(message);
  }

  if (payload && typeof payload === "object" && "data" in payload) {
    return (payload as { data: T }).data;
  }

  return payload as T;
}

export async function fetchNotes(): Promise<CleveNote[]> {
  return cleveRequest<CleveNote[]>({ resource: "notes" }, []);
}

export async function fetchNote(id: string): Promise<CleveNote> {
  return cleveRequest<CleveNote>({ resource: "note", id }, { id, title: "", createdAt: null });
}
