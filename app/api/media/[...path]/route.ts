import { NextRequest, NextResponse } from "next/server";
import { API_BASE_URL } from "@/lib/api";

type RouteContext = {
  params: Promise<{ path: string[] }>;
};

/** Proxy GridFS `/api/media/*` through the dashboard so thumbs load. */
export async function GET(request: NextRequest, context: RouteContext) {
  const { path } = await context.params;
  const filename = path.join("/");

  if (!filename || filename.includes("..")) {
    return new NextResponse("Bad request", { status: 400 });
  }

  const headers: Record<string, string> = {};
  const bypass = process.env.NEXT_PUBLIC_VERCEL_PROTECTION_BYPASS?.trim();
  if (bypass) {
    headers["x-vercel-protection-bypass"] = bypass;
    headers["x-vercel-set-bypass-cookie"] = "true";
  }

  const range = request.headers.get("range");
  if (range) headers.Range = range;

  const upstream = `${API_BASE_URL.replace(/\/$/, "")}/api/media/${filename}`;
  const res = await fetch(upstream, { headers, cache: "no-store" });

  if (!res.ok) {
    return new NextResponse(null, { status: res.status });
  }

  const responseHeaders = new Headers();
  const contentType = res.headers.get("content-type");
  const contentLength = res.headers.get("content-length");
  const contentRange = res.headers.get("content-range");
  const acceptRanges = res.headers.get("accept-ranges");

  if (contentType) responseHeaders.set("Content-Type", contentType);
  if (contentLength) responseHeaders.set("Content-Length", contentLength);
  if (contentRange) responseHeaders.set("Content-Range", contentRange);
  if (acceptRanges) responseHeaders.set("Accept-Ranges", acceptRanges);
  responseHeaders.set("Cache-Control", "public, max-age=86400");

  return new NextResponse(res.body, {
    status: res.status,
    headers: responseHeaders,
  });
}
