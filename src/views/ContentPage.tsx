"use client";

import { useCallback, useEffect, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { PageLoading } from "@/components/PageLoading";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { MediaThumb } from "@/components/MediaThumb";
import { adminGet } from "@/lib/adminClient";
import { toast } from "sonner";
import {
  ContentModerationActions,
  isContentBlocked,
  type ModeratableContentType,
} from "@/components/ContentModerationActions";

type ContentItem = {
  _id: string;
  userId?: string;
  hostUserId?: string;
  caption?: string;
  title?: string;
  text?: string;
  description?: string;
  media?: string[];
  createdAt?: string;
  status?: string;
  moderationState?: string;
  reportCount?: number;
  reportReasons?: string[];
  callId?: string;
  streamKind?: string;
  price?: number;
  currency?: string;
  aiModeration?: {
    status?: string;
    labels?: Array<{ name?: string; confidence?: number }>;
    checkedAt?: string;
    provider?: string;
    finalDecision?: string;
    reviewedBy?: string;
  };
  humanDecision?: { by?: string; at?: string; status?: string } | null;
  nickName?: string;
  firstName?: string;
  clerkId?: string;
  accountStatus?: string;
};

const TABS = [
  "posts",
  "images",
  "videos",
  "statuses",
  "market",
  "comments",
  "livestreams",
  "profiles",
] as const;

type Tab = (typeof TABS)[number];

function apiTypeForTab(tab: Tab): string {
  if (tab === "market") return "market";
  if (tab === "statuses") return "statuses";
  return tab;
}

function actionTypeForTab(tab: Tab): ModeratableContentType {
  if (tab === "posts" || tab === "images" || tab === "videos") return "post";
  if (tab === "statuses") return "status";
  if (tab === "market") return "product";
  if (tab === "livestreams") return "livestream";
  if (tab === "comments") return "comment";
  return "post";
}

function ownerId(item: ContentItem) {
  return item.userId || item.hostUserId || item.clerkId || "";
}

function previewText(item: ContentItem) {
  return (
    item.caption ||
    item.title ||
    item.text ||
    item.description ||
    item.nickName ||
    item.firstName ||
    item._id
  );
}

function statusLabel(item: ContentItem) {
  return (
    item.moderationState ||
    item.aiModeration?.status ||
    item.status ||
    item.accountStatus ||
    ""
  );
}

export default function ContentPage() {
  const [type, setType] = useState<Tab>("posts");
  const [items, setItems] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await adminGet<{ items: ContentItem[] }>(
        `/api/admin/content?type=${apiTypeForTab(type)}&page=${page}&limit=20`,
      );
      setItems(data.items || []);
    } catch {
      setItems([]);
      toast.error("Failed to load content");
    } finally {
      setLoading(false);
    }
  }, [type, page]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    setPage(1);
  }, [type]);

  const canModerateType = type !== "profiles";

  return (
    <div className="space-y-6">
      <PageHeader
        title="Content moderation"
        description="Review posts, statuses, marketplace listings, livestreams, and more."
      />

      <div className="flex flex-wrap gap-2">
        {TABS.map((t) => (
          <Button
            key={t}
            size="sm"
            variant={type === t ? "default" : "outline"}
            onClick={() => setType(t)}
            className="capitalize"
          >
            {t}
          </Button>
        ))}
      </div>

      {loading ? (
        <PageLoading title="Loading content…" />
      ) : items.length === 0 ? (
        <p className="text-sm text-muted-foreground">No items in this queue.</p>
      ) : (
        <div className="space-y-3">
          {items.map((item) => {
            const id = String(item._id || item.clerkId || "");
            const owner = ownerId(item);
            const state = statusLabel(item);
            const blocked = isContentBlocked(
              item.moderationState || item.status,
              item.aiModeration?.status,
            );
            return (
              <div key={id} className="rounded-lg border p-4">
                <div className="flex flex-wrap justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium line-clamp-2">
                      {previewText(item)}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      User {owner || "—"}
                      {item.callId ? ` · call ${item.callId}` : ""}
                      {typeof item.price === "number"
                        ? ` · ${item.currency || "KES"} ${item.price}`
                        : ""}
                      {" · "}
                      {item.createdAt
                        ? new Date(item.createdAt).toLocaleString()
                        : "—"}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {state ? <StatusBadge status={state} /> : null}
                      {item.streamKind ? (
                        <StatusBadge status={item.streamKind} />
                      ) : null}
                      {item.accountStatus ? (
                        <StatusBadge status={item.accountStatus} />
                      ) : null}
                      {typeof item.reportCount === "number" ? (
                        <span className="text-xs text-muted-foreground">
                          {item.reportCount} reports
                          {item.reportReasons?.length
                            ? `: ${item.reportReasons.join(", ")}`
                            : ""}
                        </span>
                      ) : null}
                    </div>
                    {item.aiModeration ? (
                      <div className="mt-2 rounded bg-muted/50 p-2 text-xs">
                        <p className="font-medium text-amber-700 dark:text-amber-400">
                          AI moderation (not human)
                        </p>
                        <p>
                          Status: {item.aiModeration.status} · Decision:{" "}
                          {item.aiModeration.finalDecision || "—"} · Provider:{" "}
                          {item.aiModeration.provider || "—"}
                        </p>
                        <p>
                          Labels:{" "}
                          {(item.aiModeration.labels || [])
                            .map(
                              (l) =>
                                `${l.name} (${Math.round((l.confidence || 0) * 100)}%)`,
                            )
                            .join(", ") || "—"}
                        </p>
                      </div>
                    ) : null}
                    {item.media?.length ? (
                      <div className="mt-2 flex gap-2 overflow-x-auto">
                        {item.media.slice(0, 4).map((url) => (
                          <MediaThumb
                            key={url}
                            src={url}
                            className="h-16 w-16 shrink-0 rounded"
                          />
                        ))}
                      </div>
                    ) : null}
                  </div>
                  {canModerateType ? (
                    <ContentModerationActions
                      contentType={actionTypeForTab(type)}
                      contentId={id}
                      ownerUserId={owner}
                      blocked={blocked}
                      onUpdated={load}
                      className="flex flex-col gap-2"
                    />
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={page <= 1}
          onClick={() => setPage((p) => p - 1)}
        >
          Previous
        </Button>
        <Button variant="outline" size="sm" onClick={() => setPage((p) => p + 1)}>
          Next
        </Button>
      </div>
    </div>
  );
}
