"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

/**
 * Prefer a sharper source for zoom (Google size bump / CloudFront original),
 * but never break the URL — callers fall back to the raw src on load error.
 */
export function profileImageForZoom(url: string): string {
  const raw = String(url || "").trim();
  if (!raw) return raw;
  let next = raw;

  // Only rewrite known CDN variant filenames to original (same extension).
  if (/\/(feed|preview|thumb|poster)\.[a-z0-9]+(?=[?#]|$)/i.test(next)) {
    next = next.replace(
      /\/(feed|preview|thumb|poster)\.([a-z0-9]+)(?=[?#]|$)/i,
      "/original.$2",
    );
  }

  const lower = next.toLowerCase();
  const isGoogle =
    lower.includes("googleusercontent.com") ||
    lower.includes("ggpht.com") ||
    lower.includes("lh3.google");

  if (isGoogle && /=s\d+/i.test(next)) {
    next = next.replace(/=s\d+(-[a-z]+)*/gi, "=s1024-c");
  } else if (isGoogle && /[?&]sz=\d+/i.test(next)) {
    next = next.replace(/([?&])sz=\d+/gi, "$1sz=1024");
  }

  return next;
}

type Props = {
  src: string | null;
  title?: string;
  onClose: () => void;
};

export function ImageZoomDialog({
  src,
  title = "Profile photo",
  onClose,
}: Props) {
  const preferred = src ? profileImageForZoom(src) : null;
  const [activeSrc, setActiveSrc] = useState<string | null>(preferred);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setActiveSrc(src ? profileImageForZoom(src) : null);
    setFailed(false);
  }, [src]);

  return (
    <Dialog open={!!src} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl gap-0 overflow-hidden p-0 sm:rounded-lg">
        <DialogHeader className="border-b border-border px-5 py-4 pr-12">
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="flex min-h-[50vh] items-center justify-center bg-black">
          {activeSrc && !failed ? (
            <img
              key={activeSrc}
              src={activeSrc}
              alt=""
              className="max-h-[70vh] w-full object-contain"
              onError={() => {
                // Upgraded URL missing (e.g. no original.webp) → show stored URL.
                if (src && activeSrc !== src) {
                  setActiveSrc(src);
                  return;
                }
                setFailed(true);
              }}
            />
          ) : (
            <p className="px-4 text-sm text-white/70">
              Could not load profile photo
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
