import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { api } from "./_generated/api";

const http = httpRouter();

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

type CleveNote = {
  _id?: unknown;
  title?: unknown;
  content?: unknown;
  publishedAt?: unknown;
  updatedAt?: unknown;
  snapshot?: {
    content?: unknown;
  };
};

type SiteNote = {
  id: string;
  title: string;
  content: string;
  createdAt: number | null;
  updatedAt: number | null;
};

type RichTextNode = {
  type?: unknown;
  attrs?: unknown;
  content?: unknown;
  text?: unknown;
  marks?: unknown;
};

const CLEVE_CONVEX_URL = "https://earnest-chicken-856.convex.cloud";
const CLEVE_PUBLIC_PROFILE_SLUG =
  process.env.CLEVE_PUBLIC_PROFILE_SLUG ?? "ashvinpraveen";

const jsonResponse = (body: unknown, init?: ResponseInit) => {
  const headers = new Headers(init?.headers);
  Object.entries(corsHeaders).forEach(([key, value]) => headers.set(key, value));
  headers.set("Content-Type", "application/json");

  return new Response(JSON.stringify(body), {
    ...init,
    headers,
  });
};

const unwrapData = (payload: unknown): unknown => {
  if (payload && typeof payload === "object" && "data" in payload) {
    return (payload as { data: unknown }).data;
  }
  return payload;
};

const parseList = <T,>(payload: unknown): T[] => {
  const data = unwrapData(payload);
  return Array.isArray(data) ? (data as T[]) : [];
};

const parseTimestamp = (value: unknown): number | null => {
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const parsed = Date.parse(value);
    return Number.isNaN(parsed) ? null : parsed;
  }
  return null;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const getChildren = (node: RichTextNode): RichTextNode[] =>
  Array.isArray(node.content) ? (node.content as RichTextNode[]) : [];

const getAttrNumber = (attrs: unknown, key: string): number | null => {
  if (!isRecord(attrs)) return null;
  const value = attrs[key];
  return typeof value === "number" ? value : null;
};

const getAttrString = (attrs: unknown, key: string): string | null => {
  if (!isRecord(attrs)) return null;
  const value = attrs[key];
  return typeof value === "string" ? value : null;
};

const escapeHtml = (value: string): string =>
  value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const escapeMarkdownText = (value: string): string =>
  escapeHtml(value).replace(/\\/g, "\\\\").replace(/\[/g, "\\[").replace(/\]/g, "\\]").replace(/\n+/g, " ");

const escapeTableCell = (value: string): string =>
  value
    .replace(/\|/g, "\\|")
    .replace(/\n+/g, "<br>")
    .trim();

const sanitizeMarkdownUrl = (value: string): string =>
  value.trim().replace(/\(/g, "%28").replace(/\)/g, "%29");

const renderImageNode = (node: RichTextNode): string => {
  const src = getAttrString(node.attrs, "src") ?? getAttrString(node.attrs, "url") ?? getAttrString(node.attrs, "href");
  if (!src) return "";

  const alt = getAttrString(node.attrs, "alt") ?? getAttrString(node.attrs, "title") ?? "Image";
  return `![${escapeMarkdownText(alt)}](${sanitizeMarkdownUrl(src)})`;
};

const renderIframeNode = (node: RichTextNode): string => {
  const src = getAttrString(node.attrs, "src");
  if (!src) return "";

  const title = getAttrString(node.attrs, "title") ?? "Embedded content";
  return `<iframe src="${escapeHtml(src)}" title="${escapeHtml(title)}" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>`;
};

const renderTableCell = (node: RichTextNode): string => {
  const children = getChildren(node);
  const body = children
    .map((child) => {
      if (child.type === "paragraph") return getChildren(child).map(renderInlineNode).join("");
      return renderBlockNode(child);
    })
    .filter(Boolean)
    .join("<br>");

  return escapeTableCell(body || " ");
};

const renderTableNode = (node: RichTextNode): string => {
  const rows = getChildren(node)
    .filter((row) => row.type === "tableRow")
    .map((row) =>
      getChildren(row)
        .filter((cell) => cell.type === "tableCell" || cell.type === "tableHeader")
        .map(renderTableCell),
    )
    .filter((row) => row.length > 0);

  if (rows.length === 0) return "";

  const columnCount = Math.max(...rows.map((row) => row.length));
  const normalizedRows = rows.map((row) => [
    ...row,
    ...Array.from({ length: columnCount - row.length }, () => " "),
  ]);
  const header = normalizedRows[0];
  const separator = Array.from({ length: columnCount }, () => "---");
  const bodyRows = normalizedRows.slice(1);

  return [header, separator, ...bodyRows].map((row) => `| ${row.join(" | ")} |`).join("\n");
};

const renderInlineNode = (node: RichTextNode): string => {
  if (node.type === "text") {
    let text = typeof node.text === "string" ? escapeHtml(node.text) : "";
    if (Array.isArray(node.marks)) {
      for (const mark of node.marks) {
        if (!isRecord(mark)) continue;
        if (mark.type === "bold" || mark.type === "strong") text = `**${text}**`;
        if (mark.type === "italic" || mark.type === "em") text = `_${text}_`;
        if (mark.type === "code") text = `\`${text}\``;
        if (mark.type === "strike") text = `~~${text}~~`;
        if (mark.type === "underline") text = `<u>${text}</u>`;
        if (mark.type === "subscript") text = `<sub>${text}</sub>`;
        if (mark.type === "superscript") text = `<sup>${text}</sup>`;
        if (mark.type === "highlight") text = `<mark>${text}</mark>`;
        if (mark.type === "link") {
          const href = getAttrString(mark.attrs, "href");
          if (href) text = `[${text}](${sanitizeMarkdownUrl(href)})`;
        }
      }
    }
    return text;
  }

  if (node.type === "hardBreak") return "\n";
  if (node.type === "image") return renderImageNode(node);
  if (node.type === "iframe" || node.type === "youtube") return renderIframeNode(node);

  return getChildren(node).map(renderInlineNode).join("");
};

const renderBlockNode = (node: RichTextNode, index = 0, listKind: "bullet" | "ordered" | null = null): string => {
  const children = getChildren(node);

  switch (node.type) {
    case "doc":
      return children.map((child) => renderBlockNode(child)).filter(Boolean).join("\n\n");
    case "paragraph":
      return children.map(renderInlineNode).join("").trim();
    case "heading": {
      const level = Math.min(Math.max(getAttrNumber(node.attrs, "level") ?? 2, 1), 6);
      const text = children.map(renderInlineNode).join("").trim();
      return text ? `${"#".repeat(level)} ${text}` : "";
    }
    case "bulletList":
      return children.map((child, childIndex) => renderBlockNode(child, childIndex, "bullet")).filter(Boolean).join("\n");
    case "orderedList":
      return children.map((child, childIndex) => renderBlockNode(child, childIndex, "ordered")).filter(Boolean).join("\n");
    case "taskList":
      return children.map((child) => renderBlockNode(child, 0, "bullet")).filter(Boolean).join("\n");
    case "taskItem": {
      const checked = isRecord(node.attrs) && node.attrs.checked === true;
      const body = children.map((child) => renderBlockNode(child)).filter(Boolean).join("\n  ");
      return body ? `- [${checked ? "x" : " "}] ${body}` : "";
    }
    case "listItem": {
      const body = children.map((child) => renderBlockNode(child)).filter(Boolean).join("\n  ");
      const prefix = listKind === "ordered" ? `${index + 1}. ` : "- ";
      return body ? `${prefix}${body}` : "";
    }
    case "blockquote": {
      const body = children.map((child) => renderBlockNode(child)).filter(Boolean).join("\n\n");
      return body.split("\n").map((line) => `> ${line}`).join("\n");
    }
    case "codeBlock": {
      const code = children.map(renderInlineNode).join("");
      return `\`\`\`\n${code}\n\`\`\``;
    }
    case "horizontalRule":
      return "---";
    case "image":
      return renderImageNode(node);
    case "iframe":
    case "youtube":
      return renderIframeNode(node);
    case "table":
      return renderTableNode(node);
    default:
      return children.length > 0 ? children.map((child) => renderBlockNode(child)).filter(Boolean).join("\n\n") : "";
  }
};

const parseSnapshotContent = (content: unknown): string | null => {
  if (typeof content !== "string") return null;

  try {
    const parsed: unknown = JSON.parse(content);
    if (!isRecord(parsed)) return null;
    const markdown = renderBlockNode(parsed).trim();
    return markdown.length > 0 ? markdown : null;
  } catch {
    return null;
  }
};

const normalizePlainTextContent = (content: unknown): string => {
  if (typeof content !== "string") return "";
  return content
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .join("\n\n");
};

const stripDuplicateTitle = (content: string, title: string) => {
  const escapedTitle = title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return content
    .replace(new RegExp(`^#\\s+${escapedTitle}\\s*\\n+`, "i"), "")
    .replace(new RegExp(`^${escapedTitle}\\s*\\n+`, "i"), "")
    .trim();
};

const normalizeNote = (note: CleveNote): SiteNote | null => {
  const id = typeof note._id === "string" ? note._id : null;
  if (!id) return null;
  const title = typeof note.title === "string" ? note.title : "Untitled";
  const content = stripDuplicateTitle(
    parseSnapshotContent(note.snapshot?.content) ?? normalizePlainTextContent(note.content),
    title,
  );

  return {
    id,
    title,
    content,
    createdAt: parseTimestamp(note.publishedAt),
    updatedAt: parseTimestamp(note.updatedAt),
  };
};

const cleveQuery = async <T,>(path: string, args: Record<string, unknown>): Promise<T> => {
  const res = await fetch(`${CLEVE_CONVEX_URL}/api/query`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Convex-Client": "npm-1.34.0",
    },
    body: JSON.stringify({
      path,
      format: "convex_encoded_json",
      args: [args],
    }),
  });

  const payload = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(`Cleve published notes query failed: ${res.status}`);
  }

  if (!payload || typeof payload !== "object" || !("status" in payload)) {
    throw new Error("Invalid Cleve published notes response.");
  }

  if ((payload as { status: unknown }).status !== "success") {
    throw new Error("Cleve published notes query returned an error.");
  }

  return (payload as { value: T }).value;
};

const listPublicNotes = async () => {
  const notesPayload = await cleveQuery<CleveNote[]>("notes/api/publishing:getPublishedNotes", {
    slug: CLEVE_PUBLIC_PROFILE_SLUG,
  });

  const notes = parseList<CleveNote>(notesPayload)
    .map(normalizeNote)
    .filter((note): note is SiteNote => note !== null)
    .sort((a, b) => (b.createdAt ?? b.updatedAt ?? 0) - (a.createdAt ?? a.updatedAt ?? 0));

  return notes;
};

const getPublicNote = async (noteId: string) => {
  const note = await cleveQuery<CleveNote | null>("notes/api/publishing:getPublishedNote", {
    slug: CLEVE_PUBLIC_PROFILE_SLUG,
    noteId,
  });

  return note ? normalizeNote(note) : null;
};

http.route({
  path: "/cleve-proxy",
  method: "OPTIONS",
  handler: httpAction(async () => new Response(null, { headers: corsHeaders })),
});

http.route({
  path: "/cleve-proxy",
  method: "GET",
  handler: httpAction(async (_, req) => {
    const url = new URL(req.url);
    const resource = url.searchParams.get("resource") ?? "notes";

    try {
      if (resource === "notes") {
        const notes = await listPublicNotes();
        return jsonResponse({ data: notes.map(({ content, ...note }) => note) });
      }

      if (resource === "note") {
        const noteId = url.searchParams.get("id");
        if (!noteId) return jsonResponse({ error: "Missing note id" }, { status: 400 });
        const note = await getPublicNote(noteId);
        if (!note) return jsonResponse({ error: "Note not found" }, { status: 404 });
        return jsonResponse({ data: note });
      }

      return jsonResponse({ error: "Unsupported Cleve proxy resource" }, { status: 400 });
    } catch (error) {
      return jsonResponse(
        { error: error instanceof Error ? error.message : "Cleve proxy error" },
        { status: 500 },
      );
    }
  }),
});

http.route({
  path: "/article-views",
  method: "OPTIONS",
  handler: httpAction(async () => new Response(null, { headers: corsHeaders })),
});

http.route({
  path: "/article-views",
  method: "POST",
  handler: httpAction(async (ctx, req) => {
    try {
      const body = (await req.json()) as { articleId?: string };
      const articleId = typeof body.articleId === "string" ? body.articleId : null;
      if (!articleId) {
        return jsonResponse({ error: "Missing articleId" }, { status: 400 });
      }
      await ctx.runMutation(api.articleViews.record, { articleId });
      return jsonResponse({ ok: true });
    } catch (error) {
      return jsonResponse(
        { error: error instanceof Error ? error.message : "Failed to record view" },
        { status: 500 },
      );
    }
  }),
});

http.route({
  path: "/article-views",
  method: "GET",
  handler: httpAction(async (ctx, req) => {
    const url = new URL(req.url);
    const articleIds = url.searchParams.get("ids");

    try {
      if (articleIds) {
        const ids = articleIds.split(",").filter(Boolean);
        const views: Record<string, number> = await ctx.runQuery(api.articleViews.getBatch, {
          articleIds: ids,
        });
        return jsonResponse({ data: views });
      }

      const articleId = url.searchParams.get("id");
      if (!articleId) {
        return jsonResponse({ error: "Missing article id(s)" }, { status: 400 });
      }
      const views: number = await ctx.runQuery(api.articleViews.get, { articleId });
      return jsonResponse({ data: views });
    } catch (error) {
      return jsonResponse(
        { error: error instanceof Error ? error.message : "Failed to fetch views" },
        { status: 500 },
      );
    }
  }),
});

export default http;
