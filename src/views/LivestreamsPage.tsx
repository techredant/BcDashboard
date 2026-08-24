"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Radio, Users, Eye, Flag, Play, Square, ExternalLink } from "lucide-react";
import { StatCard } from "@/components/StatCard";
import { PageHeader } from "@/components/PageHeader";
import { PageLoading } from "@/components/PageLoading";
import { EmptyState } from "@/components/EmptyState";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { adminGet, adminPost } from "@/lib/adminClient";
import { toast } from "sonner";
import {
  ContentModerationActions,
  isContentBlocked,
} from "@/components/ContentModerationActions";

type Livestream = {
  _id: string;
  callId?: string;
  hostUserId?: string;
  userId?: string;
  hostDisplayName?: string;
  title?: string;
  description?: string;
  streamKind?: string;
  status?: string;
  viewerCount?: number;
  createdAt?: string;
  startedAt?: string;
  endedAt?: string;
  moderationState?: string;
  aiModeration?: { status?: string };
};

type DetailStream = Livestream | null;

export default function LivestreamsPage() {
  const [items, setItems] = useState<Livestream[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [statusFilter, setStatusFilter] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [detail, setDetail] = useState<DetailStream>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams({
        type: "livestreams",
        page: String(page),
        limit: "30",
      });
      if (statusFilter) qs.set("status", statusFilter);
      const data = await adminGet<{ items?: Livestream[]; total?: number }>(
        `/api/admin/content?${qs.toString()}`,
      );
      setItems(data.items || []);
      setTotal(data.total || 0);
    } catch {
      setItems([]);
      toast.error("Failed to load livestreams");
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    setPage(1);
  }, [statusFilter]);

  // Keep Live tab fresh while monitoring
  useEffect(() => {
    if (statusFilter !== "live") return;
    const t = setInterval(() => {
      void load();
    }, 15000);
    return () => clearInterval(t);
  }, [statusFilter, load]);

  const liveCount = useMemo(
    () => items.filter((s) => s.status === "live").length,
    [items],
  );
  const viewers = useMemo(
    () => items.reduce((sum, s) => sum + (Number(s.viewerCount) || 0), 0),
    [items],
  );
  const blocked = useMemo(
    () =>
      items.filter((s) =>
        isContentBlocked(
          s.moderationState || s.aiModeration?.status,
          s.aiModeration?.status,
        ),
      ).length,
    [items],
  );

  const runLifecycle = async (stream: Livestream, action: "end" | "open") => {
    const id = stream._id;
    if (action === "end") {
      if (
        !window.confirm(
          `End “${stream.title || "this livestream"}”? Viewers will be disconnected.`,
        )
      ) {
        return;
      }
    }
    setBusyId(id);
    try {
      await adminPost(`/api/admin/livestreams/${id}/${action}`, {
        reason:
          action === "end"
            ? "A moderator ended your livestream from the Broadcast dashboard."
            : undefined,
      });
      toast.success(action === "end" ? "Livestream ended" : "Livestream marked live");
      if (detail?._id === id) {
        setDetail({
          ...stream,
          status: action === "end" ? "ended" : "live",
          endedAt: action === "end" ? new Date().toISOString() : undefined,
        });
      }
      await load();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || `${action} failed`;
      toast.error(msg);
    } finally {
      setBusyId(null);
    }
  };

  if (loading && items.length === 0) {
    return <PageLoading title="Loading livestreams…" />;
  }

  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader
        title="Livestreams"
        description="Monitor, open, end, and moderate live broadcasts"
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total streams"
          value={total}
          icon={Radio}
          change="In catalog"
          changeType="neutral"
        />
        <StatCard
          title="Live on page"
          value={liveCount}
          icon={Users}
          accent="success"
          change="Currently live"
          changeType={liveCount ? "positive" : "neutral"}
        />
        <StatCard
          title="Viewers (page)"
          value={viewers.toLocaleString()}
          icon={Eye}
          accent="info"
          change="Sum of viewer counts"
          changeType="neutral"
        />
        <StatCard
          title="Blocked"
          value={blocked}
          icon={Flag}
          accent="warning"
          change="On this page"
          changeType={blocked ? "negative" : "neutral"}
        />
      </div>

      <div className="flex flex-wrap gap-2">
        {[
          { key: "", label: "All" },
          { key: "live", label: "Live" },
          { key: "ended", label: "Ended" },
          { key: "blocked", label: "Blocked" },
          { key: "flagged", label: "Flagged" },
        ].map((f) => (
          <Button
            key={f.key || "all"}
            size="sm"
            variant={statusFilter === f.key ? "default" : "outline"}
            onClick={() => setStatusFilter(f.key)}
          >
            {f.label}
          </Button>
        ))}
        <Button size="sm" variant="ghost" onClick={() => void load()}>
          Refresh
        </Button>
      </div>

      <div className="data-table-wrap">
        {items.length === 0 ? (
          <EmptyState
            icon={<Radio className="h-5 w-5 text-muted-foreground" />}
            title="No livestreams"
            subtitle="Streams will appear here when hosts go live"
          />
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Stream</th>
                <th>Host</th>
                <th>Kind</th>
                <th>Viewers</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((s) => {
                const owner = s.hostUserId || s.userId || "";
                const state =
                  s.moderationState || s.aiModeration?.status || s.status;
                const isBlocked = isContentBlocked(
                  s.moderationState || s.status,
                  s.aiModeration?.status,
                );
                const isLive = s.status === "live";
                const rowBusy = busyId === s._id;
                return (
                  <tr key={s._id}>
                    <td>
                      <p className="font-medium line-clamp-1">
                        {s.title || "Untitled stream"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {s.callId ? `call ${s.callId}` : s._id}
                        {s.startedAt
                          ? ` · ${new Date(s.startedAt).toLocaleString()}`
                          : ""}
                      </p>
                    </td>
                    <td>
                      <p className="text-sm">{s.hostDisplayName || "—"}</p>
                      <p className="text-xs text-muted-foreground max-w-[140px] truncate">
                        {owner || "—"}
                      </p>
                    </td>
                    <td>
                      {s.streamKind ? (
                        <StatusBadge status={s.streamKind} />
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="font-medium">
                      {(s.viewerCount || 0).toLocaleString()}
                    </td>
                    <td>
                      <div className="flex flex-col gap-1">
                        {s.status ? <StatusBadge status={s.status} /> : null}
                        {state && state !== s.status ? (
                          <StatusBadge status={state} />
                        ) : null}
                      </div>
                    </td>
                    <td>
                      <div className="flex flex-col gap-2">
                        <div className="flex flex-wrap gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={rowBusy}
                            onClick={() => setDetail(s)}
                          >
                            <ExternalLink className="mr-1 h-3.5 w-3.5" />
                            Open
                          </Button>
                          {isLive ? (
                            <Button
                              size="sm"
                              variant="destructive"
                              disabled={rowBusy}
                              onClick={() => void runLifecycle(s, "end")}
                            >
                              <Square className="mr-1 h-3.5 w-3.5" />
                              End
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="default"
                              disabled={rowBusy}
                              onClick={() => void runLifecycle(s, "open")}
                            >
                              <Play className="mr-1 h-3.5 w-3.5" />
                              Mark live
                            </Button>
                          )}
                        </div>
                        <ContentModerationActions
                          contentType="livestream"
                          contentId={s._id}
                          ownerUserId={owner}
                          blocked={isBlocked}
                          onUpdated={load}
                        />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={page <= 1}
          onClick={() => setPage((p) => p - 1)}
        >
          Previous
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={items.length === 0}
          onClick={() => setPage((p) => p + 1)}
        >
          Next
        </Button>
      </div>

      {detail ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={() => setDetail(null)}
          role="presentation"
        >
          <div
            className="w-full max-w-lg rounded-xl border border-border bg-card p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="live-detail-title"
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h2
                  id="live-detail-title"
                  className="text-lg font-semibold"
                >
                  {detail.title || "Livestream"}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {detail.hostDisplayName || "Unknown host"}
                </p>
              </div>
              {detail.status ? <StatusBadge status={detail.status} /> : null}
            </div>

            <dl className="space-y-2 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Call ID</dt>
                <dd className="max-w-[60%] break-all text-right font-mono text-xs">
                  {detail.callId || "—"}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Kind</dt>
                <dd className="capitalize">{detail.streamKind || "—"}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Viewers</dt>
                <dd>{(detail.viewerCount || 0).toLocaleString()}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Started</dt>
                <dd>
                  {detail.startedAt
                    ? new Date(detail.startedAt).toLocaleString()
                    : "—"}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Ended</dt>
                <dd>
                  {detail.endedAt
                    ? new Date(detail.endedAt).toLocaleString()
                    : "—"}
                </dd>
              </div>
              {detail.description ? (
                <div>
                  <dt className="mb-1 text-muted-foreground">Description</dt>
                  <dd className="text-foreground">{detail.description}</dd>
                </div>
              ) : null}
            </dl>

            <div className="mt-5 flex flex-wrap gap-2">
              {detail.callId ? (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    void navigator.clipboard.writeText(detail.callId || "");
                    toast.success("Call ID copied");
                  }}
                >
                  Copy call ID
                </Button>
              ) : null}
              {detail.status === "live" ? (
                <Button
                  size="sm"
                  variant="destructive"
                  disabled={busyId === detail._id}
                  onClick={() => void runLifecycle(detail, "end")}
                >
                  End live
                </Button>
              ) : (
                <Button
                  size="sm"
                  disabled={busyId === detail._id}
                  onClick={() => void runLifecycle(detail, "open")}
                >
                  Mark live
                </Button>
              )}
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setDetail(null)}
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
