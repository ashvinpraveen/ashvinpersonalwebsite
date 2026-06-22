function getConvexSiteUrl(): string | null {
  return process.env.NEXT_PUBLIC_CONVEX_SITE_URL || null;
}

export async function recordArticleView(articleId: string): Promise<void> {
  const siteUrl = getConvexSiteUrl();
  if (!siteUrl) return;

  await fetch(`${siteUrl}/article-views`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ articleId }),
  }).catch(() => {});
}

export async function fetchArticleViews(articleId: string): Promise<number> {
  const siteUrl = getConvexSiteUrl();
  if (!siteUrl) return 0;

  const res = await fetch(`${siteUrl}/article-views?id=${encodeURIComponent(articleId)}`);
  const payload = await res.json().catch(() => null);
  if (!res.ok || !payload) return 0;

  return typeof payload.data === "number" ? payload.data : 0;
}

export async function fetchBatchArticleViews(articleIds: string[]): Promise<Record<string, number>> {
  const siteUrl = getConvexSiteUrl();
  if (!siteUrl || articleIds.length === 0) return {};

  const res = await fetch(
    `${siteUrl}/article-views?ids=${articleIds.map(encodeURIComponent).join(",")}`,
  );
  const payload = await res.json().catch(() => null);
  if (!res.ok || !payload) return {};

  return typeof payload.data === "object" && payload.data !== null ? payload.data : {};
}
