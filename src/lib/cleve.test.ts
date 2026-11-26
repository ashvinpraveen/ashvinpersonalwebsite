import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchNote, fetchNotes } from "./cleve";

const post = (id: string, day: number) => ({
  id,
  title: `Post ${id}`,
  excerpt: `About ${id}.`,
  url: `https://cleve.ai/@ashvinpraveen/${id}`,
  imageUrl: `https://cleve.ai/@ashvinpraveen/${id}/opengraph-image`,
  publishedAt: `2026-11-${String(day).padStart(2, "0")}T00:00:00.000Z`,
  updatedAt: `2026-11-${String(day).padStart(2, "0")}T12:00:00.000Z`,
  author: { name: "Ashvin Praveen", handle: "ashvinpraveen", imageUrl: null, url: "https://cleve.ai/@ashvinpraveen" },
});

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("fetchNotes", () => {
  it("reads every page of posts from the Cleve posts API", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(json({ data: [post("b", 20)], nextCursor: "next" }))
      .mockResolvedValueOnce(json({ data: [post("a", 10)], nextCursor: null }));
    vi.stubGlobal("fetch", fetchMock);

    const notes = await fetchNotes();

    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
      "https://app.cleve.ai/api/v1/sites/ashvinpraveen/posts?limit=50",
      "https://app.cleve.ai/api/v1/sites/ashvinpraveen/posts?limit=50&cursor=next",
    ]);
    expect(notes).toEqual([
      {
        id: "b",
        title: "Post b",
        excerpt: "About b.",
        content: undefined,
        createdAt: Date.UTC(2026, 10, 20),
        updatedAt: Date.UTC(2026, 10, 20, 12),
      },
      expect.objectContaining({ id: "a", createdAt: Date.UTC(2026, 10, 10) }),
    ]);
  });

  it("throws the API's error message", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(json({ error: "No published posts found at @x." }, 404)));

    await expect(fetchNotes()).rejects.toThrow("No published posts found at @x.");
  });
});

describe("fetchNote", () => {
  it("reads one post with its Markdown body", async () => {
    const fetchMock = vi.fn().mockResolvedValue(json({ data: { ...post("a", 10), markdown: "Hello **there**." } }));
    vi.stubGlobal("fetch", fetchMock);

    const note = await fetchNote("a");

    expect(fetchMock).toHaveBeenCalledWith("https://app.cleve.ai/api/v1/sites/ashvinpraveen/posts/a");
    expect(note).toMatchObject({ id: "a", title: "Post a", content: "Hello **there**." });
  });
});
