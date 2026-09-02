"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { PageLoading } from "@/components/PageLoading";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MediaThumb } from "@/components/MediaThumb";
import { adminGet, adminPost } from "@/lib/adminClient";
import { toast } from "sonner";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  UserActionDialog,
  type UserActionType,
} from "@/components/UserActionDialog";
import { roleHasPermission, STAFF_PERMISSIONS } from "@/lib/staffPermissions";
import { useStaffAuth } from "@/lib/staffAuth";

type Counts = {
  pendingReview: number;
  aiFlagged: number;
  userReports: number;
  appealsPending: number;
  failedJobs: number;
  recentlyBlocked: number;
  pending?: number;
  approved?: number;
  rejected?: number;
  blocked?: number;
  critical?: number;
  livestreamIncidents?: number;
  marketplaceIncidents?: number;
  profileIncidents?: number;
};

type QueueRow = {
  _id: string;
  targetType?: string;
  targetId?: string;
  authorId?: string;
  thumb?: string;
  user?: { clerkId?: string; nickName?: string; firstName?: string; lastName?: string };
  reason?: string[];
  aiCategory?: string;
  aiConfidence?: number;
  reportCount?: number;
  priorStrikes?: number;
  createdAt?: string;
  priority?: string;
  status?: string;
  resultStatus?: string;
  finalDecision?: string;
  text?: string;
};

type FailedJob = {
  _id: string;
  jobId: string;
  contentId?: string;
  contentType?: string;
  status?: string;
  error?: string;
  attempts?: number;
  updatedAt?: string;
};

type DetailPayload = {
  case?: QueueRow & { providers?: Record<string, unknown>; engineReason?: string; text?: string; judge?: string; humanStatus?: string };
  user?: { clerkId: string; nickName?: string; firstName?: string; lastName?: string; strikeCount?: number; accountStatus?: string };
  content?: { caption?: string; media?: string[]; moderation?: { status?: string } };
  reports?: unknown[];
  previousActions?: Array<{ _id: string; action?: string; reason?: string; createdAt?: string }>;
  ocrSnippet?: string;
};

export default function ModerationCenterPage() {
  const isMobile = useIsMobile();
  const { staff } = useStaffAuth();
  const role = staff?.role;
  const [counts, setCounts] = useState<Counts | null>(null);
  const [analytics, setAnalytics] = useState<{
    today?: { posts?: number; images?: number; videos?: number; comments?: number };
    jobs?: { sampleSize?: number; averageMs?: number | null; p95Ms?: number | null; byResult?: Record<string, number> };
  } | null>(null);
  const [items, setItems] = useState<QueueRow[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [failed, setFailed] = useState<FailedJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("open");
  const [contentType, setContentType] = useState("");
  const [priority, setPriority] = useState("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [detailId, setDetailId] = useState<string | null>(null);
  const [detail, setDetail] = useState<DetailPayload | null>(null);
  const [busy, setBusy] = useState(false);
  const [userAction, setUserAction] = useState<UserActionType | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const canModerate = roleHasPermission(role, STAFF_PERMISSIONS.MODERATE_CONTENT);
  const canBan = roleHasPermission(role, STAFF_PERMISSIONS.BAN_USER);
  const canSuspend = roleHasPermission(role, STAFF_PERMISSIONS.SUSPEND_USER);

  const loadCenter = useCallback(async () => {
    const data = await adminGet<{ counts: Counts; analytics: typeof analytics }>(
      "/api/admin/moderation/center",
    );
    setCounts(data.counts);
    setAnalytics(data.analytics);
  }, []);

  const loadQueue = useCallback(
    async (cursor?: string | null, append = false) => {
      const params = new URLSearchParams({ limit: "20" });
      if (status && status !== "all") params.set("status", status);
      if (contentType) params.set("contentType", contentType);
      if (priority && priority !== "all") params.set("priority", priority);
      if (q.trim()) params.set("q", q.trim());
      if (cursor) params.set("cursor", cursor);
      const data = await adminGet<{ items: QueueRow[]; nextCursor: string | null }>(
        `/api/admin/moderation/queue?${params}`,
      );
      setItems((prev) => (append ? [...prev, ...(data.items || [])] : data.items || []));
      setNextCursor(data.nextCursor || null);
    },
    [status, contentType, priority, q],
  );

  const loadFailed = useCallback(async () => {
    const data = await adminGet<{ items: FailedJob[] }>("/api/admin/moderation/jobs?limit=20");
    setFailed(data.items || []);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      await Promise.all([loadCenter(), loadQueue(), loadFailed()]);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load Command Center");
    } finally {
      setLoading(false);
    }
  }, [loadCenter, loadQueue, loadFailed]);

  useEffect(() => {
    load();
  }, [load]);

  const openDetail = async (id: string) => {
    setDetailId(id);
    try {
      const data = await adminGet<DetailPayload>(`/api/admin/moderation/queue/${id}`);
      setDetail(data);
    } catch {
      toast.error("Could not load detail");
    }
  };

  const runBulk = async (action: "approve" | "reject") => {
    const ids = [...selected];
    if (!ids.length) return;
    if (action === "reject") {
      const reason = rejectReason.trim() || window.prompt("Reason for reject?");
      if (!reason) return;
      setRejectReason(reason);
    }
    if (action === "reject" && !window.confirm(`Reject ${ids.length} item(s)?`)) return;
    if (action === "approve" && !window.confirm(`Approve ${ids.length} item(s)?`)) return;
    setBusy(true);
    try {
      await adminPost("/api/admin/moderation/bulk", {
        ids,
        action,
        reason: action === "reject" ? rejectReason || "Rejected from Command Center" : "Approved from Command Center",
      });
      toast.success(action === "approve" ? "Approved" : "Rejected");
      setSelected(new Set());
      await load();
    } catch {
      toast.error("Bulk action failed");
    } finally {
      setBusy(false);
    }
  };

  const actOnCase = async (id: string, action: "approve" | "reject") => {
    const row = items.find((i) => i._id === id) || detail?.case;
    if (!row?.targetId || !row.targetType) return;
    if (action === "reject") {
      const reason = window.prompt("Reason?");
      if (!reason) return;
      if (!window.confirm("Reject and remove this content?")) return;
      setBusy(true);
      try {
        await adminPost(`/api/admin/content/${row.targetType}/${row.targetId}/remove`, {
          reason,
        });
        toast.success("Rejected");
        await load();
        setDetailId(null);
      } catch {
        toast.error("Reject failed");
      } finally {
        setBusy(false);
      }
      return;
    }
    setBusy(true);
    try {
      await adminPost(`/api/admin/content/${row.targetType}/${row.targetId}/approve`, {
        reason: "Approved from Command Center",
      });
      toast.success("Approved");
      await load();
      setDetailId(null);
    } catch {
      toast.error("Approve failed");
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <PageLoading title="Loading Command Center…" />;

  const countCards: Array<{ label: string; value: number; href: string }> = counts
    ? [
        { label: "Pending Review", value: counts.pendingReview, href: "/moderation/center" },
        { label: "AI Flagged", value: counts.aiFlagged, href: "/moderation" },
        { label: "Pending Content", value: counts.pending ?? 0, href: "/content" },
        { label: "Critical", value: counts.critical ?? 0, href: "/moderation/center" },
        { label: "Rejected", value: counts.rejected ?? 0, href: "/content" },
        { label: "Live Incidents", value: counts.livestreamIncidents ?? 0, href: "/livestreams" },
        { label: "User Reports", value: counts.userReports, href: "/reports" },
        { label: "Appeals", value: counts.appealsPending, href: "/appeals" },
        { label: "Failed Jobs", value: counts.failedJobs, href: "/moderation/center" },
        { label: "Blocked (24h)", value: counts.recentlyBlocked, href: "/content" },
      ]
    : [];

  return (
    <div className={`space-y-6 ${isMobile ? "pb-8" : ""}`}>
      <PageHeader
        title="Moderation Command Center"
        description="Unified queue, SLA, and failed jobs. AI scores are staff-only."
        actions={
          <Button variant="outline" size="sm" onClick={() => load()}>
            Refresh
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        {countCards.map((c) => (
          <Link
            key={c.label}
            href={c.href}
            className="rounded-lg border p-3 hover:bg-muted/40"
          >
            <p className="text-xs text-muted-foreground">{c.label}</p>
            <p className="text-xl font-semibold">{c.value}</p>
          </Link>
        ))}
      </div>

      {analytics?.today ? (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 text-sm">
          <div className="rounded-lg border p-3">
            Posts today: {analytics.today.posts ?? 0}
          </div>
          <div className="rounded-lg border p-3">
            Images: {analytics.today.images ?? 0}
          </div>
          <div className="rounded-lg border p-3">
            Videos: {analytics.today.videos ?? 0}
          </div>
          <div className="rounded-lg border p-3">
            Comments: {analytics.today.comments ?? 0}
          </div>
        </div>
      ) : null}

      {analytics?.jobs ? (
        <p className="text-xs text-muted-foreground">
          Job timings (completed sample {analytics.jobs.sampleSize ?? 0}): avg{" "}
          {analytics.jobs.averageMs ?? "—"} ms
          {analytics.jobs.p95Ms != null ? ` · P95 ${analytics.jobs.p95Ms} ms` : " · P95 needs n≥5"}
          {analytics.jobs.byResult
            ? ` · mix allow ${analytics.jobs.byResult.approved ?? 0} / review ${analytics.jobs.byResult.review ?? 0} / block ${analytics.jobs.byResult.blocked ?? 0}`
            : ""}
        </p>
      ) : null}

      <div className={`flex flex-wrap gap-2 ${isMobile ? "flex-col" : "items-end"}`}>
        <Input
          placeholder="Search username, clerkId, contentId"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="max-w-sm"
        />
        <select
          className="h-9 rounded-md border bg-background px-2 text-sm"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          {["open", "pending", "under_review", "action_required", "all"].map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <select
          className="h-9 rounded-md border bg-background px-2 text-sm"
          value={contentType}
          onChange={(e) => setContentType(e.target.value)}
        >
          <option value="">All types</option>
          {["post", "comment", "status", "product", "livestream"].map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <select
          className="h-9 rounded-md border bg-background px-2 text-sm"
          value={priority}
          onChange={(e) => setPriority(e.target.value)}
        >
          {["all", "URGENT", "HIGH", "NORMAL", "LOW"].map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <Button size="sm" onClick={() => loadQueue()}>
          Apply
        </Button>
        {canModerate && selected.size > 0 ? (
          <>
            <Button size="sm" disabled={busy} onClick={() => runBulk("approve")}>
              Approve {selected.size}
            </Button>
            <Button
              size="sm"
              variant="destructive"
              disabled={busy}
              onClick={() => runBulk("reject")}
            >
              Reject {selected.size}
            </Button>
          </>
        ) : null}
      </div>

      <div className={`grid gap-4 ${isMobile ? "grid-cols-1" : "lg:grid-cols-3"}`}>
        <div className={isMobile ? "" : "lg:col-span-2 space-y-3"}>
          {items.map((row) => (
            <div key={row._id} className="rounded-lg border p-3">
              <div className="flex gap-3">
                {canModerate ? (
                  <input
                    type="checkbox"
                    checked={selected.has(row._id)}
                    onChange={(e) => {
                      setSelected((prev) => {
                        const next = new Set(prev);
                        if (e.target.checked) next.add(row._id);
                        else next.delete(row._id);
                        return next;
                      });
                    }}
                  />
                ) : null}
                {row.thumb ? (
                  <MediaThumb src={row.thumb} className="h-16 w-16 rounded object-cover" />
                ) : (
                  <div className="h-16 w-16 rounded bg-muted" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">
                    {row.user?.nickName || row.user?.firstName || row.authorId || "—"} ·{" "}
                    {row.targetType}/{String(row.targetId || "").slice(-8)}
                  </p>
                  <p className="line-clamp-2 text-xs text-muted-foreground">{row.text || "—"}</p>
                  <div className="mt-1 flex flex-wrap gap-2 text-xs">
                    <StatusBadge status={row.status || "open"} />
                    <span className="rounded bg-muted px-2 py-0.5">{row.priority}</span>
                    <span className="rounded bg-muted px-2 py-0.5">
                      AI {row.aiCategory || "—"} {row.aiConfidence ? Math.round(Number(row.aiConfidence) * 100) / 100 : ""}
                    </span>
                    <span>reports {row.reportCount ?? 0}</span>
                    <span>strikes {row.priorStrikes ?? 0}</span>
                  </div>
                </div>
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                <Button size="sm" variant="outline" onClick={() => openDetail(row._id)}>
                  Detail
                </Button>
                {canModerate ? (
                  <>
                    <Button size="sm" variant="outline" disabled={busy} onClick={() => actOnCase(row._id, "approve")}>
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      disabled={busy}
                      onClick={() => actOnCase(row._id, "reject")}
                    >
                      Reject
                    </Button>
                  </>
                ) : null}
              </div>
            </div>
          ))}
          {nextCursor ? (
            <Button variant="outline" onClick={() => loadQueue(nextCursor, true)}>
              Load more
            </Button>
          ) : null}
        </div>

        <div className="space-y-4">
          {detailId && detail ? (
            <div className="rounded-lg border p-3 space-y-2">
              <p className="font-medium">Detail</p>
              <p className="text-xs font-mono text-muted-foreground">{detailId}</p>
              <p className="text-sm">{detail.content?.caption || detail.ocrSnippet || "—"}</p>
              <p className="text-xs">
                User {detail.user?.nickName || detail.user?.clerkId} · strikes {detail.user?.strikeCount ?? 0}
              </p>
              <p className="text-xs">
                Judge {detail.case?.judge || "ai"} · human {detail.case?.humanStatus || "pending"}
              </p>
              {detail.user?.clerkId ? (
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" onClick={() => setUserAction("warn")}>
                    Warn
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setUserAction("restrict")}>
                    Restrict
                  </Button>
                  {canSuspend ? (
                    <Button size="sm" variant="outline" onClick={() => setUserAction("suspend")}>
                      Suspend
                    </Button>
                  ) : null}
                  {canBan ? (
                    <Button size="sm" variant="destructive" onClick={() => setUserAction("ban")}>
                      Ban
                    </Button>
                  ) : null}
                </div>
              ) : null}
              <Button size="sm" variant="ghost" onClick={() => setDetailId(null)}>
                Close
              </Button>
            </div>
          ) : null}

          <div className="rounded-lg border p-3">
            <p className="mb-2 font-medium">Failed jobs</p>
            {failed.length === 0 ? (
              <p className="text-xs text-muted-foreground">None</p>
            ) : (
              failed.map((job) => (
                <div key={job._id} className="mb-3 border-b pb-2 last:border-0">
                  <p className="text-xs font-mono">{job.jobId}</p>
                  <p className="text-xs text-muted-foreground">{job.error || job.status}</p>
                  {canModerate ? (
                    <div className="mt-1 flex gap-1">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={async () => {
                          await adminPost(`/api/admin/moderation/jobs/${job.jobId}/retry`);
                          toast.success("Requeued");
                          loadFailed();
                        }}
                      >
                        Retry
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={async () => {
                          await adminPost(`/api/admin/moderation/jobs/${job.jobId}/review`);
                          toast.success("Moved to review");
                          loadFailed();
                          loadQueue();
                        }}
                      >
                        Review
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={async () => {
                          if (!window.confirm("Cancel this job?")) return;
                          await adminPost(`/api/admin/moderation/jobs/${job.jobId}/cancel`);
                          toast.success("Cancelled");
                          loadFailed();
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  ) : null}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <UserActionDialog
        open={Boolean(userAction)}
        onOpenChange={(open) => {
          if (!open) setUserAction(null);
        }}
        action={userAction}
        user={
          detail?.user
            ? {
                clerkId: detail.user.clerkId,
                nickName: detail.user.nickName,
                firstName: detail.user.firstName,
                lastName: detail.user.lastName,
              }
            : null
        }
        relatedContentType={detail?.case?.targetType}
        relatedContentId={detail?.case?.targetId}
        onSuccess={() => {
          setUserAction(null);
          load();
        }}
      />
    </div>
  );
}
