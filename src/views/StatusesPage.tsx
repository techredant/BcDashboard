"use client";

import { useCallback, useEffect, useState } from "react";
import { CircleDot } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { PageLoading } from "@/components/PageLoading";
import { EmptyState } from "@/components/EmptyState";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { adminGet } from "@/lib/adminClient";
import { toast } from "sonner";
import {
  ContentModerationActions,
  isContentBlocked,
} from "@/components/ContentModerationActions";

type StatusItem = {
  _id: string;
  userId?: string;
  caption?: string;
  text?: string;
  nickName?: string;
  firstName?: string;
  media?: string[];
  createdAt?: string;
  expiresAt?: string;
  moderationState?: string;
  reportCount?: number;
  pendingReportCount?: number;
  reportReasons?: string[];
  aiModeration?: { status?: string };
  humanDecision?: { status?: string } | null;
};

export default function StatusesPage() {
  const [items, setItems] = useState<StatusItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("reported");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams({
        type: "statuses",
        page: String(page),
        limit: "30",
      });
      if (statusFilter) qs.set("status", statusFilter);
      const data = await adminGet<{ items?: StatusItem[] }>(
        `/api/admin/content?${qs.toString()}`,
      );
      setItems(data.items || []);
    } catch {
      setItems([]);
      toast.error("Failed to load statuses");
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

  if (loading && items.length === 0) {
    return <PageLoading title="Loading statuses…" />;
  }

  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader
        title="Statuses"
        description="Review reported and moderated status updates"
      />

      <div className="flex flex-wrap gap-2">
        {[
          { key: "reported", label: "Reported" },
          { key: "", label: "All" },
          { key: "warned", label: "Warned" },
          { key: "removed", label: "Removed" },
          { key: "blocked", label: "Blocked / flagged" },
          { key: "pending", label: "Pending" },
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
      </div>

      <div className="data-table-wrap">
        {items.length === 0 ? (
          <EmptyState
            icon={<CircleDot className="h-5 w-5 text-muted-foreground" />}
            title={
              statusFilter === "reported"
                ? "No reported statuses"
                : "No statuses"
            }
            subtitle={
              statusFilter === "reported"
                ? "User reports on statuses will appear here"
                : "Status updates will appear here when users post them"
            }
          />
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Status</th>
                <th>User</th>
                <th>Reports</th>
                <th>Created</th>
                <th>Moderation</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((s) => {
                const state =
                  s.moderationState ||
                  s.aiModeration?.status ||
                  s.humanDecision?.status ||
                  "";
                const blocked = isContentBlocked(
                  state,
                  s.aiModeration?.status,
                );
                const name =
                  s.nickName || s.firstName || s.userId || "—";
                const reports = s.reportCount || 0;
                return (
                  <tr key={s._id}>
                    <td>
                      <div className="flex items-start gap-3">
                        {s.media?.[0] ? (
                          <img
                            src={s.media[0]}
                            alt=""
                            className="h-12 w-12 shrink-0 rounded object-cover"
                          />
                        ) : null}
                        <p className="text-sm line-clamp-2 max-w-md">
                          {s.caption || s.text || "(no caption)"}
                        </p>
                      </div>
                    </td>
                    <td>
                      <p className="text-sm">{name}</p>
                      <p className="text-xs text-muted-foreground max-w-[140px] truncate">
                        {s.userId || "—"}
                      </p>
                    </td>
                    <td>
                      {reports > 0 ? (
                        <div>
                          <p className="text-sm font-medium">
                            {reports}
                            {s.pendingReportCount
                              ? ` (${s.pendingReportCount} pending)`
                              : ""}
                          </p>
                          {s.reportReasons?.length ? (
                            <p className="text-xs text-muted-foreground capitalize">
                              {s.reportReasons.join(", ")}
                            </p>
                          ) : null}
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="text-xs text-muted-foreground whitespace-nowrap">
                      {s.createdAt
                        ? new Date(s.createdAt).toLocaleString()
                        : "—"}
                    </td>
                    <td>{state ? <StatusBadge status={state} /> : "—"}</td>
                    <td>
                      <ContentModerationActions
                        contentType="status"
                        contentId={s._id}
                        ownerUserId={s.userId}
                        blocked={blocked}
                        onUpdated={load}
                      />
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
          onClick={() => setPage((p) => p + 1)}
        >
          Next
        </Button>
      </div>
    </div>
  );
}
