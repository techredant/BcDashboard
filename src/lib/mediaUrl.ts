import { MEDIA_CDN_URL } from "@/lib/api";

const VARIANT_RE = /\/(original|feed|preview|thumb|poster)\.([a-z0-9]+)(?=[?#]|$)/i;
const ORIGINAL_EXTS = ["webp", "jpg", "jpeg", "png", "heic", "gif"];

export function isVideoUrl(url: string) {
  const path = String(url || "").split("?")[0].toLowerCase();
  return (
    path.endsWith(".mp4") ||
    path.endsWith(".mov") ||
    path.endsWith(".webm") ||
    path.endsWith(".m4v") ||
    path.includes("/original.mp4")
  );
}

export function isImageUrl(url: string) {
  const path = String(url || "").split("?")[0].toLowerCase();
  return /\.(webp|jpe?g|png|gif|heic|bmp|avif)$/i.test(path);
}

function rewriteS3ToCdn(url: string) {
  const match = url.match(
    /^https?:\/\/[^.]+\.s3(?:[.-][a-z0-9-]+)?\.amazonaws\.com\/(.+)$/i,
  );
  if (match) return `${MEDIA_CDN_URL}/${match[1]}`;
  return url;
}

/** Stored originals (and S3 keys) → CloudFront. Do not rewrite to preview/poster. */
export function resolveDashboardMediaUrl(uri: string | undefined | null): string {
  const trimmed = String(uri || "").trim();
  if (!trimmed) return "";

  const gridFs = trimmed.match(/\/api\/media\/([^?\s#]+)/i);
  if (gridFs) {
    return `/api/media/${gridFs[1]}`;
  }

  if (trimmed.startsWith("broadcast/")) {
    return `${MEDIA_CDN_URL}/${trimmed.replace(/^\/+/, "")}`;
  }
  if (trimmed.startsWith("/") && !trimmed.startsWith("/api/")) {
    return `${MEDIA_CDN_URL}/${trimmed.replace(/^\/+/, "")}`;
  }
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return rewriteS3ToCdn(trimmed);
  }
  return trimmed;
}

function replaceVariant(url: string, fileName: string) {
  if (!VARIANT_RE.test(url)) return null;
  return url.replace(VARIANT_RE, `/${fileName}`);
}

function preferOriginal(url: string) {
  const resolved = resolveDashboardMediaUrl(url);
  const match = resolved.match(VARIANT_RE);
  if (!match) return resolved;
  const rung = match[1].toLowerCase();
  const ext = match[2];
  if (rung === "original" || rung === "poster") return resolved;
  return resolved.replace(VARIANT_RE, `/original.${ext}`);
}

/**
 * Under review tiles must paint before feed/preview/poster siblings exist.
 * Images: stored original first (preview/feed 403 until generated).
 * Videos: try poster.jpg, then the original so a missing poster does not blank the thumb.
 */
export function mediaDisplayCandidates(url: string): string[] {
  const resolved = resolveDashboardMediaUrl(url);
  if (!resolved) return [];
  const primary = preferOriginal(resolved);
  const originals = ORIGINAL_EXTS.map((ext) => replaceVariant(primary, `original.${ext}`))
    .filter((u): u is string => Boolean(u));
  if (isVideoUrl(primary)) {
    const poster = replaceVariant(primary, "poster.jpg");
    return [poster, primary, resolved].filter(
      (u, i, all): u is string => Boolean(u) && all.indexOf(u) === i,
    );
  }
  return [primary, ...originals, resolved].filter(
    (u, i, all): u is string => Boolean(u) && all.indexOf(u) === i,
  );
}
