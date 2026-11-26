import { isBlogEnabled } from "@/lib/features";

/**
 * Posts come from Cleve's public posts API: everything published at
 * cleve.ai/@handle. It needs no key and allows any origin, so the server and
 * the browser both call it directly.
 * Docs: https://docs.cleve.ai/developers/api#published-posts
 */
const CLEVE_API_URL =
  process.env.NEXT_PUBLIC_CLEVE_API_URL || "https://app.cleve.ai/api/v1";
const CLEVE_HANDLE = process.env.NEXT_PUBLIC_CLEVE_HANDLE || "ashvinpraveen";
const PAGE_SIZE = 50;

export interface CleveNote {
  id: string;
  title: string;
  excerpt: string;
  /** The body as Markdown, on a single post only. */
  content?: string;
  createdAt: number | null;
  updatedAt: number | null;
}

type CleveApiPost = {
  id: string;
  title: string;
  excerpt: string;
  publishedAt: string;
  updatedAt: string;
  markdown?: string;
};

const toNote = (post: CleveApiPost): CleveNote => ({
  id: post.id,
  title: post.title,
  excerpt: post.excerpt,
  content: post.markdown,
  createdAt: Date.parse(post.publishedAt),
  updatedAt: Date.parse(post.updatedAt),
});

async function cleveGet<T>(path: string): Promise<T> {
  const res = await fetch(`${CLEVE_API_URL}/sites/${CLEVE_HANDLE}${path}`);
  const payload = await res.json().catch(() => null);

  if (!res.ok) {
    const message =
      payload && typeof payload === "object" && "error" in payload
        ? String((payload as { error: unknown }).error)
        : `Cleve API error: ${res.status}`;
    throw new Error(message);
  }

  return payload as T;
}

/** Every published post, newest first. */
export async function fetchNotes(): Promise<CleveNote[]> {
  if (!isBlogEnabled) return [];

  const notes: CleveNote[] = [];
  let cursor: string | null = null;
  do {
    const params = new URLSearchParams({ limit: String(PAGE_SIZE) });
    if (cursor) params.set("cursor", cursor);
    const page: { data: CleveApiPost[]; nextCursor: string | null } =
      await cleveGet(`/posts?${params}`);
    notes.push(...page.data.map(toNote));
    cursor = page.nextCursor;
  } while (cursor);

  return notes;
}

export async function fetchNote(id: string): Promise<CleveNote> {
  if (!isBlogEnabled) {
    return { id, title: "", excerpt: "", createdAt: null, updatedAt: null };
  }

  const { data } = await cleveGet<{ data: CleveApiPost }>(
    `/posts/${encodeURIComponent(id)}`,
  );
  return toNote(data);
}
