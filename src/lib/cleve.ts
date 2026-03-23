const PROXY_BASE = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/cleve-proxy`;

export interface CleveNote {
  id: string;
  title: string;
  content: string;
  created_at: string;
  updated_at?: string;
}

async function cleveRequest<T>(path: string): Promise<T> {
  const res = await fetch(`${PROXY_BASE}${path}`, {
    headers: {
      apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
    },
  });
  if (!res.ok) throw new Error(`Cleve proxy error: ${res.status}`);
  return res.json();
}

export async function fetchNotes(): Promise<CleveNote[]> {
  const data = await cleveRequest<CleveNote[] | { notes: CleveNote[] }>("/notes");
  return Array.isArray(data) ? data : data.notes;
}

export async function fetchNote(id: string): Promise<CleveNote> {
  const data = await cleveRequest<CleveNote | { note: CleveNote }>(`/notes/${id}`);
  return "note" in data ? data.note : data;
}
