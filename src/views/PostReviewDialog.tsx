"use client";

import { useEffect, useState } from "react";
import { Play } from "lucide-react";
import { adminGet, adminPost } from "@/lib/adminClient";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/StatusBadge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  UserActionDialog,
  type UserActionType,
} from "@/components/UserActionDialog";

export type FeedPostReview = {
  _id: string;
  userId?: string;
  content?: string;
  media?: string[];
  country?: string;
  createdAt?: string;
  moderationState?: string;
  moderationReviewStatus?: string;
  moderationStatus?: string;
  user?: { name?: string; email?: string; clerkId?: string };
};

const ON_FEED_STATUSES = new Set([
  "approved",
  "limited",
  "age_restricted",
]);

type ModerationHistoryItem = {
  _id: string;
  action?: string;
  reason?: string;
  newStatus?: string;
  previousStatus?: string;
  severity?: string;
  reversed?: boolean;
  createdAt?: string;
  adminName?: string;
  postId?: string;
};

const ACTION_LABELS: Record<string, string> = {
  warn: "Warned user",
  warn_content: "Content warning",
  remove_content: "Removed post",
  restore_content: "Restored post",
  limit_content: "Limited distribution",
  hide_content: "Hidden post",
  assign_case: "Marked reviewing",
  resolve_content: "Resolved review",
  reverse_warning: "Reversed action",
};

function isVideoUrl(url: string) {
  const path = url.split("?")[0].toLowerCase();
  return (
    path.endsWith(".mp4") ||
    path.endsWith(".mov") ||
    path.endsWith(".webm") ||
    path.includes("/original.mp4")
  );
}

function mediaThumbUrl(url: string) {
  if (!isVideoUrl(url)) return url;
  return url.replace(/\/original\.(mp4|mov|webm)$/i, "/poster.jpg");
}

export function PostReviewDialog({
  post,
  open,
  onOpenChange,
  onUpdated,
}: {
  post: FeedPostReview | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdated?: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [warnOpen, setWarnOpen] = useState(false);
  const [warnAction, setWarnAction] = useState<UserActionType | null>(null);
  const [history, setHistory] = useState<ModerationHistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const authorId = post?.userId || post?.user?.clerkId || "";
  const postId = post?._id || "";

  useEffect(() => {
    if (!open || !authorId || !postId) {
      setHistory([]);
      return;
    }
    let cancelled = false;
    (async () => {
      setHistoryLoading(true);
      try {
        const res = await adminGet<{ items?: ModerationHistoryItem[] }>(
          `/api/admin/moderation/user/${encodeURIComponent(authorId)}?limit=50`,
        );
        if (cancelled) return;
        const items = (res.items || []).filter(
          (item) => String(item.postId || "") === String(postId),
        );
        setHistory(items);
      } catch {
        if (!cancelled) setHistory([]);
      } finally {
        if (!cancelled) setHistoryLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, authorId, postId]);

  if (!post) return null;

  const media = post.media || [];
  const removed =
    post.moderationState === "removed" || post.moderationState === "hidden";
  const warned =
    post.moderationState === "warned" ||
    history.some((h) =>
      ["warn", "warn_content"].includes(h.action || ""),
    );
  const reviewResolved = post.moderationReviewStatus === "resolved";
  const moderationStatus = String(post.moderationStatus || "").toLowerCase();
  const onFeed =
    !moderationStatus || ON_FEED_STATUSES.has(moderationStatus);

  const sendToFeed = async () => {
    if (!post._id || onFeed) return;
    setBusy(true);
    try {
      await adminPost(`/api/admin/content/post/${post._id}/approve`, {
        reason: "Sent to feed from dashboard review",
      });
      toast.success("Sent to feed");
      onUpdated?.();
      onOpenChange(false);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || "Send to feed failed";
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  };

  const runContentAction = async (action: string, reason: string) => {
    if (!post._id) return;
    setBusy(true);
    try {
      await adminPost(`/api/admin/moderation/action`, {
        action,
        postId: post._id,
        userId: authorId || undefined,
        reason,
        severity: "medium",
      });
      toast.success(
        action === "resolve" ? "Review resolved" : `Post ${action} applied`,
      );
      onUpdated?.();
      onOpenChange(false);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || "Action failed";
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Review post</DialogTitle>
          </DialogHeader>

          <section className="space-y-2 rounded-lg border p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Post
            </p>
            <div className="flex flex-wrap gap-2">
              <StatusBadge
                status={
                  onFeed
                    ? "on_feed"
                    : post.moderationStatus || "under_review"
                }
              />
              {post.moderationState && post.moderationState !== "active" ? (
                <StatusBadge status={post.moderationState} />
              ) : null}
              {post.moderationReviewStatus &&
              post.moderationReviewStatus !== "none" ? (
                <StatusBadge status={post.moderationReviewStatus} />
              ) : null}
              {warned ? <StatusBadge status="warned" /> : null}
            </div>
            <p className="font-mono text-xs">Post ID {post._id}</p>
            <p className="text-sm font-medium">{post.user?.name || "Unknown"}</p>
            <p className="break-all font-mono text-[11px] text-muted-foreground">
              Author {authorId || "—"}
            </p>
            <p className="whitespace-pre-wrap text-sm">
              {post.content?.trim() || "No text"}
            </p>
            {media.length ? (
              <div className="flex flex-wrap gap-2 pt-1">
                {media.map((url, index) => {
                  const video = isVideoUrl(url);
                  return (
                    <div
                      key={`${url}-${index}`}
                      className="relative h-24 w-24 overflow-hidden rounded-md border bg-muted"
                    >
                      <img
                        src={mediaThumbUrl(url)}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                      {video ? (
                        <span className="absolute inset-0 flex items-center justify-center bg-black/35">
                          <Play className="h-5 w-5 fill-white text-white" />
                        </span>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            ) : null}
            <p className="text-xs text-muted-foreground">
              {post.createdAt
                ? new Date(post.createdAt).toLocaleString()
                : "—"}
              {post.country ? ` · ${post.country}` : ""}
            </p>
          </section>

          <section className="space-y-2 rounded-lg border p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Action status
            </p>
            {historyLoading ? (
              <p className="text-sm text-muted-foreground">Loading history…</p>
            ) : history.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No moderation actions on this post yet.
              </p>
            ) : (
              <ol className="space-y-2">
                {history.map((item) => (
                  <li
                    key={item._id}
                    className="flex flex-wrap items-start justify-between gap-2 text-sm"
                  >
                    <div>
                      <p className="font-medium">
                        {ACTION_LABELS[item.action || ""] ||
                          (item.action || "action").replace(/_/g, " ")}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {item.createdAt
                          ? new Date(item.createdAt).toLocaleString()
                          : "—"}
                        {item.adminName ? ` · ${item.adminName}` : ""}
                        {item.reason ? ` · ${item.reason}` : ""}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {item.newStatus ? (
                        <StatusBadge status={item.newStatus} />
                      ) : null}
                      {item.reversed ? <StatusBadge status="restored" /> : null}
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </section>

          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              disabled={busy || onFeed}
              onClick={() => void sendToFeed()}
            >
              {onFeed ? "On feed" : "Send to feed"}
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={busy || !authorId}
              onClick={() => {
                setWarnAction("warn");
                setWarnOpen(true);
              }}
            >
              Warn user
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={busy}
              onClick={() =>
                void runContentAction("under_review", "Marked under review")
              }
            >
              Reviewing
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={busy}
              onClick={() =>
                void runContentAction("remove", "Removed from feeds review")
              }
            >
              Remove post
            </Button>
            {removed ? (
              <Button
                size="sm"
                variant="outline"
                disabled={busy}
                onClick={() =>
                  void runContentAction("restore", "Restored from feeds review")
                }
              >
                Restore
              </Button>
            ) : null}
            <Button
              size="sm"
              variant="outline"
              disabled={busy}
              onClick={() => onOpenChange(false)}
            >
              Dismiss
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={busy || reviewResolved}
              onClick={() =>
                void runContentAction("resolve", "Review resolved")
              }
            >
              {reviewResolved ? "Resolved" : "Resolve"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <UserActionDialog
        open={warnOpen}
        onOpenChange={setWarnOpen}
        action={warnAction}
        user={
          authorId
            ? {
                clerkId: authorId,
                nickName: post.user?.name,
                email: post.user?.email,
              }
            : null
        }
        postId={post._id}
        onSuccess={() => {
          onUpdated?.();
          onOpenChange(false);
        }}
      />
    </>
  );
}
