"use client";

import { useEffect, useMemo, useState } from "react";
import { Play } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  isImageUrl,
  isVideoUrl,
  mediaDisplayCandidates,
  resolveDashboardMediaUrl,
} from "@/lib/mediaUrl";

type Props = {
  src: string;
  className?: string;
  imgClassName?: string;
  showPlay?: boolean;
  alt?: string;
};

/**
 * Dashboard media tile. Loads the uploaded original first so Under review
 * posts show before poster/preview variants are generated.
 */
export function MediaThumb({
  src,
  className,
  imgClassName,
  showPlay,
  alt = "",
}: Props) {
  const candidates = useMemo(() => mediaDisplayCandidates(src), [src]);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    setIndex(0);
  }, [src]);

  const current = candidates[index] || resolveDashboardMediaUrl(src);
  const play = showPlay ?? isVideoUrl(src);
  const useVideoEl = current ? isVideoUrl(current) && !isImageUrl(current) : false;

  return (
    <div className={cn("relative overflow-hidden bg-muted", className)}>
      {useVideoEl ? (
        <video
          src={current}
          muted
          playsInline
          preload="metadata"
          className={cn("h-full w-full object-cover", imgClassName)}
          onError={() => {
            if (index < candidates.length - 1) setIndex((i) => i + 1);
          }}
        />
      ) : current ? (
        <img
          src={current}
          alt={alt}
          referrerPolicy="no-referrer"
          className={cn("h-full w-full object-cover", imgClassName)}
          onError={() => {
            if (index < candidates.length - 1) setIndex((i) => i + 1);
          }}
        />
      ) : null}
      {play ? (
        <span className="absolute inset-0 flex items-center justify-center bg-black/35">
          <Play className="h-4 w-4 fill-white text-white" />
        </span>
      ) : null}
    </div>
  );
}

export function DashboardMedia({
  src,
  className,
  controls = true,
}: {
  src: string;
  className?: string;
  controls?: boolean;
}) {
  const resolved = resolveDashboardMediaUrl(src);
  if (isVideoUrl(src)) {
    return (
      <video
        src={resolved}
        controls={controls}
        playsInline
        preload="metadata"
        className={className}
      />
    );
  }
  return (
    <img
      src={resolved}
      alt=""
      referrerPolicy="no-referrer"
      className={className}
    />
  );
}
