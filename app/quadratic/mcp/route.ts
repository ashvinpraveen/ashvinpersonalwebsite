/**
 * Public MCP endpoint for Quadratic: https://<site>/quadratic/mcp.
 * Forwards to the Convex HTTP action that implements the protocol
 * (convex/quadratic/mcp.ts) so clients get a stable, same-origin URL.
 */

const FORWARDED_HEADERS = [
  "authorization",
  "x-api-key",
  "content-type",
  "accept",
  "mcp-protocol-version",
  "mcp-session-id",
];

export const dynamic = "force-dynamic";

async function forward(request: Request) {
  const siteUrl = process.env.NEXT_PUBLIC_CONVEX_SITE_URL;
  if (!siteUrl) {
    return Response.json(
      { jsonrpc: "2.0", id: null, error: { code: -32000, message: "Quadratic's backend isn't configured." } },
      { status: 503 },
    );
  }
  const headers = new Headers();
  for (const name of FORWARDED_HEADERS) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }
  headers.set("x-quadratic-app-url", new URL(request.url).origin);
  const upstream = await fetch(`${siteUrl}/quadratic/mcp`, {
    method: request.method,
    headers,
    body: request.method === "POST" ? await request.text() : undefined,
    cache: "no-store",
  });
  // fetch already decoded the body, so drop encoding/length headers.
  const responseHeaders = new Headers(upstream.headers);
  responseHeaders.delete("content-encoding");
  responseHeaders.delete("content-length");
  return new Response(upstream.body, { status: upstream.status, headers: responseHeaders });
}

export const GET = forward;
export const POST = forward;
export const DELETE = forward;
export const OPTIONS = forward;
