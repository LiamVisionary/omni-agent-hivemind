import { NextRequest } from "next/server";

export const runtime = "nodejs";

const ICON_PROXY_TIMEOUT_MS = 10_000;

function isAllowedCollectorAsset(url: URL) {
  const host = url.hostname.toLowerCase();
  const localHost = host === "localhost" || host === "127.0.0.1" || host === "::1" || host === "[::1]";
  return localHost && url.pathname.includes("/app-assets/");
}

export async function GET(request: NextRequest) {
  const rawUrl = request.nextUrl.searchParams.get("url") || "";
  let target: URL;
  try {
    target = new URL(rawUrl);
  } catch {
    return Response.json({ ok: false, error: "Invalid icon URL" }, { status: 400 });
  }

  if (!isAllowedCollectorAsset(target)) {
    return Response.json({ ok: false, error: "Icon URL is not allowlisted" }, { status: 400 });
  }

  const upstream = await fetch(target, {
    cache: "no-store",
    signal: AbortSignal.timeout(ICON_PROXY_TIMEOUT_MS),
  }).catch(() => null);
  if (!upstream?.ok) {
    return Response.json({ ok: false, error: "Icon unavailable" }, { status: upstream?.status || 502 });
  }

  const contentType = upstream.headers.get("content-type") || "application/octet-stream";
  if (!contentType.startsWith("image/")) {
    return Response.json({ ok: false, error: "Icon response is not an image" }, { status: 502 });
  }

  return new Response(upstream.body, {
    headers: {
      "Cache-Control": "private, max-age=60",
      "Content-Type": contentType,
    },
  });
}
