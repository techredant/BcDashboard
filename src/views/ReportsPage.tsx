"use client";

import { useCallback, useEffect, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { PageLoading } from "@/components/PageLoading";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { adminApi, adminGet, adminPost } from "@/lib/adminClient";
import { toast } from "sonner";
import {
  ReportDetailDialog,
  type ModerationReport,
} from "@/views/ReportDetailDialog";
import {
  StatusReportDetailDialog,
  type StatusReportDetail,
} from "@/views/StatusReportDetailDialog";

type ReportRow = ModerationReport & {
  _id: string;
  reportId?: string;
};

type StatusReportRow = StatusReportDetail & {
  _id: string;
};

export default function ReportsPage() {
  const [kind, setKind] = useState<"posts" | "statuses">("posts");
  const [items, setItems] = useState<ReportRow[]>([]);
  const [statusItems, setStatusItems] = useState<StatusReportRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("pending");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [detail, setDetail] = useState<ModerationReport | null>(null);
  const [statusDetail, setStatusDetail] = useState<StatusReportDetail | null>(
    null,
  );
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ limit: "50" });
      if (filter !== "all") params.set("status", filter);

      if (kind === "posts") {
        const data = await adminGet<{ reports: ReportRow[] }>(
          `/api/reports?${params}`,
        );
        setItems(data.reports || []);
        setStatusItems([]);
      } else {
        const data = await adminGet<{ reports: StatusReportRow[] }>(
          `/api/admin/status-reports?${params}`,
        );
        setStatusItems(data.reports || []);
        setItems([]);
      }
      setSelected(new Set());
    } catch (err) {
      console.error(err);
      setItems([]);
      setStatusItems([]);
      toast.error("Failed to load reports");
    } finally {
      setLoading(false);
    }
  }, [filter, kind]);

  useEffect(() => {
    load();
  }, [load]);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const bulk = async (action: "resolve" | "dismiss") => {
    if (!selected.size) return;
    if (!window.confirm(`Bulk ${action} ${selected.size} report(s)?`)) return;
    setBusy(true);
    try {
      await adminPost("/api/admin/reports/bulk", {
        ids: [...selected],
        action,
        reason: `Bulk ${action}`,
      });
      toast.success("Bulk action completed");
      load();
    } catch (err: unknown) {
      toast.error(
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || "Bulk action failed",
      );
    } finally {
      setBusy(false);
    }
  };

  const openStatusReview = async (row: StatusReportRow) => {
    const id = row.reportId || row._id;
    try {
      const res = await adminApi.get(`/api/admin/status-reports/${id}`);
      let detail = (res.data.report || row) as StatusReportDetail;
      if (detail.status === "pending") {
        const opened = await adminApi.patch(
          `/api/admin/status-reports/${detail.reportId || id}`,
          { action: "report_opened" },
        );
        if (opened.data?.report) detail = opened.data.report;
      }
      setStatusDetail(detail);
      setStatusItems((prev) =>
        prev.map((item) =>
          (item.reportId || item._id) === (detail.reportId || id)
            ? { ...item, ...detail }
            : item,
        ),
      );
    } catch {
      setStatusDetail(row);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reports"
        description="Review user reports for posts and statuses."
      />

      <div className="flex flex-wrap gap-2">
        {(
          [
            ["posts", "Posts"],
            ["statuses", "Statuses"],
          ] as const
        ).map(([key, label]) => (
          <Button
            key={key}
            size="sm"
            variant={kind === key ? "default" : "outline"}
            onClick={() => {
              setKind(key);
              setFilter("pending");
            }}
          >
            {label}
          </Button>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        {(kind === "posts"
          ? ["pending", "reviewing", "resolved", "dismissed", "all"]
          : ["pending", "reviewing", "resolved", "dismissed", "all"]
        ).map((f) => (
          <Button
            key={f}
            size="sm"
            variant={filter === f ? "default" : "outline"}
            onClick={() => setFilter(f)}
            className="capitalize"
          >
            {f}
          </Button>
        ))}
        <div className="ml-auto flex gap-2">
          <Button
            size="sm"
            variant="outline"
            disabled={!selected.size || busy}
            onClick={() => bulk("resolve")}
          >
            Bulk resolve
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={!selected.size || busy}
            onClick={() => bulk("dismiss")}
          >
            Bulk dismiss
          </Button>
        </div>
      </div>

      {loading ? (
        <PageLoading title="Loading reports…" />
      ) : kind === "posts" ? (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40 text-left text-xs uppercase text-muted-foreground">
                <th className="w-8 px-3 py-2" />
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Reason</th>
                <th className="px-3 py-2">Reported</th>
                <th className="px-3 py-2">Content</th>
                <th className="px-3 py-2">Date</th>
                <th className="px-3 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((r) => {
                const id = r.reportId || r._id;
                return (
                  <tr
                    key={id}
                    className="border-b border-border/60 hover:bg-muted/20"
                  >
                    <td className="px-3 py-2">
                      <Checkbox
                        checked={selected.has(id)}
                        onCheckedChange={() => toggle(id)}
                      />
                    </td>
                    <td className="px-3 py-2">
                      <StatusBadge status={r.status} />
                    </td>
                    <td className="px-3 py-2 capitalize">{r.reason}</td>
                    <td className="px-3 py-2">
                      {r.reportedUserSnapshot?.displayName ||
                        r.reportedUserSnapshot?.username ||
                        r.reportedUserId}
                    </td>
                    <td className="max-w-xs truncate px-3 py-2 text-muted-foreground">
                      {r.postSnapshot?.content || r.postId}
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">
                      {r.createdAt
                        ? new Date(r.createdAt).toLocaleString()
                        : "—"}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={async () => {
                          try {
                            const res = await adminApi.get(
                              `/api/reports/${id}`,
                            );
                            const d = res.data.report || r;
                            setDetail({
                              ...d,
                              reportId: d.reportId || id,
                              _id: d._id || id,
                            });
                            if (d.status === "pending") {
                              const opened = await adminApi.patch(
                                `/api/reports/${d.reportId || id}`,
                                { action: "report_opened" },
                              );
                              if (opened.data?.report) {
                                setDetail(opened.data.report);
                              }
                            }
                          } catch {
                            setDetail({
                              ...r,
                              reportId: id,
                              _id: r._id || id,
                            });
                          }
                        }}
                      >
                        Review
                      </Button>
                    </td>
                  </tr>
                );
              })}
              {!items.length ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-3 py-8 text-center text-muted-foreground"
                  >
                    No post reports
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40 text-left text-xs uppercase text-muted-foreground">
                <th className="w-8 px-3 py-2" />
                <th className="px-3 py-2">Queue</th>
                <th className="px-3 py-2">Reason</th>
                <th className="px-3 py-2">Reported user</th>
                <th className="px-3 py-2">Status content</th>
                <th className="px-3 py-2">Date</th>
                <th className="px-3 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {statusItems.map((r) => {
                const id = r.reportId || r._id;
                const snap = r.statusSnapshot;
                return (
                  <tr
                    key={id}
                    className="border-b border-border/60 hover:bg-muted/20"
                  >
                    <td className="px-3 py-2">
                      <Checkbox
                        checked={selected.has(id)}
                        onCheckedChange={() => toggle(id)}
                      />
                    </td>
                    <td className="px-3 py-2">
                      <StatusBadge status={r.status} />
                    </td>
                    <td className="px-3 py-2 capitalize">{r.reason}</td>
                    <td className="px-3 py-2">
                      {r.reportedUserSnapshot?.displayName ||
                        r.reportedUserId}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex max-w-xs items-start gap-2">
                        {snap?.media?.[0] ? (
                          <img
                            src={snap.media[0]}
                            alt=""
                            className="h-10 w-10 shrink-0 rounded object-cover"
                          />
                        ) : null}
                        <div className="min-w-0">
                          <p className="truncate text-muted-foreground">
                            {snap?.caption || "(no caption)"}
                          </p>
                          {snap?.moderationState ? (
                            <StatusBadge status={snap.moderationState} />
                          ) : null}
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-2 text-muted-foreground whitespace-nowrap">
                      {r.createdAt
                        ? new Date(r.createdAt).toLocaleString()
                        : "—"}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openStatusReview(r)}
                      >
                        Review
                      </Button>
                    </td>
                  </tr>
                );
              })}
              {!statusItems.length ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-3 py-8 text-center text-muted-foreground"
                  >
                    No status reports
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      )}

      <ReportDetailDialog
        report={detail}
        open={Boolean(detail)}
        onOpenChange={(open) => {
          if (!open) {
            setDetail(null);
            load();
          }
        }}
        onUpdated={(report) => setDetail(report)}
      />

      <StatusReportDetailDialog
        report={statusDetail}
        open={Boolean(statusDetail)}
        onOpenChange={(open) => {
          if (!open) {
            setStatusDetail(null);
            load();
          }
        }}
        onUpdated={(report) => setStatusDetail(report)}
      />
    </div>
  );
}
