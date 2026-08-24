"use client";

import { adminApi } from "@/lib/adminClient";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export type StatusReportDetail = {
  reportId: string;
  _id: string;
  statusId: string;
  reportedUserId: string;
  reporterId?: string;
  reason: string;
  description?: string;
  status: string;
  createdAt: string;
  contentType?: string;
  reportedUserSnapshot?: {
    available?: boolean;
    userId?: string;
    displayName?: string;
    profileImage?: string;
    accountStatus?: string;
  };
  currentReportedUser?: {
    available?: boolean;
    userId?: string;
    displayName?: string;
    profileImage?: string;
    accountStatus?: string;
  };
  statusSnapshot?: {
    available?: boolean;
    statusId?: string;
    caption?: string;
    media?: string[];
    authorId?: string;
    moderationState?: string;
    createdAt?: string;
  };
  currentStatus?: {
    statusId?: string;
    available?: boolean;
    moderationState?: string;
    caption?: string;
    media?: string[];
    removed?: boolean;
  };
  reporter?: { userId?: string; displayName?: string };
  moderationHistory?: Array<{
    action: string;
    adminUserId?: string;
    timestamp?: string;
    reason?: string;
  }>;
};

const ACTION_LABELS: Record<string, string> = {
  report_created: "Report created",
  report_opened: "Admin opened report",
  report_assigned: "Report assigned",
  report_marked_reviewing: "Marked reviewing",
  report_dismissed: "Report dismissed",
  report_resolved: "Report resolved",
  status_removed: "Status removed",
  status_restored: "Status restored (visible)",
  user_warned: "User warned",
};

export function StatusReportDetailDialog({
  report,
  open,
  onOpenChange,
  onUpdated,
}: {
  report: StatusReportDetail | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdated: (report: StatusReportDetail) => void;
}) {
  const runAction = async (action: string) => {
    if (!report) return;
    const res = await adminApi.patch(
      `/api/admin/status-reports/${report.reportId || report._id}`,
      { action },
    );
    if (res.data?.report) onUpdated(res.data.report);
  };

  if (!report) return null;

  const snap = report.statusSnapshot;
  const current = report.currentStatus;
  const removed =
    current?.removed ||
    current?.moderationState === "removed" ||
    current?.moderationState === "hidden";
  const visible =
    !removed &&
    (!current?.moderationState ||
      ["active", "restored", "warned"].includes(
        String(current.moderationState).toLowerCase(),
      ));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Status report detail</DialogTitle>
        </DialogHeader>

        <section className="space-y-2 rounded-lg border p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Report
          </p>
          <p className="font-mono text-xs">
            Report ID {report.reportId || report._id}
          </p>
          <p className="text-sm">
            Reason{" "}
            <span className="font-medium capitalize">{report.reason}</span>
          </p>
          {report.description ? (
            <p className="text-sm text-muted-foreground">{report.description}</p>
          ) : null}
          <p className="text-xs text-muted-foreground">
            Reported at {new Date(report.createdAt).toLocaleString()}
          </p>
          <Badge variant="outline" className="capitalize">
            {report.status}
          </Badge>
        </section>

        <section className="space-y-2 rounded-lg border p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Reported user
          </p>
          <p className="text-sm font-medium">
            {report.currentReportedUser?.displayName ||
              report.reportedUserSnapshot?.displayName ||
              report.reportedUserId}
          </p>
          <p className="break-all font-mono text-[11px] text-muted-foreground">
            User ID {report.reportedUserId}
          </p>
        </section>

        <section className="space-y-2 rounded-lg border p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Reported status
          </p>
          <p className="font-mono text-xs">
            Status ID {snap?.statusId || report.statusId}
          </p>
          <p className="text-sm whitespace-pre-wrap">
            {snap?.caption || current?.caption || "No caption"}
          </p>
          {(snap?.media?.length || current?.media?.length) ? (
            <div className="flex flex-wrap gap-2">
              {(snap?.media?.length ? snap.media : current?.media || []).map(
                (url) => (
                  <img
                    key={url}
                    src={url}
                    alt=""
                    className="h-20 w-20 rounded-md object-cover"
                  />
                ),
              )}
            </div>
          ) : null}
          <p className="text-sm font-medium">
            Current visibility:{" "}
            {removed
              ? "Hidden / removed"
              : current?.moderationState === "under_review"
                ? "Under review (limited)"
                : visible
                  ? "Visible to everyone"
                  : current?.moderationState || "—"}
          </p>
          {current?.moderationState ? (
            <p className="text-xs text-muted-foreground">
              Moderation state: {current.moderationState}
            </p>
          ) : null}
        </section>

        <section className="space-y-2 rounded-lg border p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Moderation history
          </p>
          {(report.moderationHistory || []).length === 0 ? (
            <p className="text-sm text-muted-foreground">No actions yet</p>
          ) : (
            <ol className="space-y-2">
              {(report.moderationHistory || []).map((event, index) => (
                <li
                  key={`${event.action}-${event.timestamp}-${index}`}
                  className="text-sm"
                >
                  <span className="text-xs text-muted-foreground">
                    {event.timestamp
                      ? new Date(event.timestamp).toLocaleString()
                      : ""}
                  </span>
                  <p className="font-medium">
                    {ACTION_LABELS[event.action] || event.action}
                  </p>
                </li>
              ))}
            </ol>
          )}
        </section>

        {report.reporter?.userId ? (
          <p className="text-xs text-muted-foreground">
            Reporter {report.reporter.displayName} · ID {report.reporter.userId}
          </p>
        ) : null}

        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => runAction("report_opened")}
          >
            Open
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => runAction("report_marked_reviewing")}
          >
            Reviewing
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => runAction("user_warned")}
          >
            Warn status
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => runAction("status_removed")}
          >
            Remove status
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => runAction("status_restored")}
          >
            Restore / make visible
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => runAction("report_dismissed")}
          >
            Dismiss
          </Button>
          <Button size="sm" onClick={() => runAction("report_resolved")}>
            Resolve
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
