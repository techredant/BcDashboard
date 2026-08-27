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
import { MediaThumb } from "@/components/MediaThumb";

export type UserIdentity = {
  available?: boolean;
  userId?: string;
  username?: string;
  displayName?: string;
  profileImage?: string;
  county?: string;
  constituency?: string;
  ward?: string;
  country?: string;
  accountStatus?: string;
  capturedAt?: string;
};

export type PostSnapshot = {
  available?: boolean;
  postId?: string;
  content?: string;
  media?: string[];
  authorId?: string;
  createdAt?: string;
  capturedAt?: string;
  isDeletedAtCapture?: boolean;
};

export type ModerationEvent = {
  action: string;
  adminUserId?: string;
  timestamp?: string;
  reason?: string;
};

export type ModerationReport = {
  reportId: string;
  _id: string;
  postId: string;
  reportedUserId: string;
  reporterUserId: string;
  reason: string;
  description?: string;
  status: string;
  createdAt: string;
  reportedUserSnapshot?: UserIdentity;
  currentReportedUser?: UserIdentity;
  postSnapshot?: PostSnapshot;
  currentPost?: {
    postId?: string;
    status?: string;
    available?: boolean;
    moderationState?: string;
    content?: string;
    media?: string[];
  };
  reporter?: { userId?: string; username?: string; displayName?: string };
  moderationHistory?: ModerationEvent[];
  identityChanged?: {
    usernameChanged?: boolean;
    displayNameChanged?: boolean;
    profileImageChanged?: boolean;
  };
  accountDeleted?: boolean;
  post?: { _id?: string; content?: string; media?: string[] };
};

const ACTION_LABELS: Record<string, string> = {
  report_created: "Report created",
  report_opened: "Admin opened report",
  report_assigned: "Report assigned",
  report_marked_reviewing: "Marked reviewing",
  report_dismissed: "Report dismissed",
  post_removed: "Post removed",
  user_warned: "User warned",
  user_restricted: "User restricted",
  user_suspended: "User suspended",
  user_banned: "User banned",
  user_restored: "User restored",
  warning_reversed: "Warning reversed",
  report_resolved: "Report resolved",
  post_restored: "Post restored",
  appeal_approved: "Appeal approved",
  appeal_rejected: "Appeal rejected",
};

function handleOf(user?: UserIdentity | null) {
  const name = user?.username || "";
  if (!name) return "—";
  return name.startsWith("@") ? name : `@${name}`;
}

function IdentityCard({
  title,
  user,
  fallbackLabel,
}: {
  title: string;
  user?: UserIdentity | null;
  fallbackLabel: string;
}) {
  const unavailable = !user?.available;
  return (
    <div className="rounded-lg border p-4">
      <p className="mb-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {title}
      </p>
      {unavailable ? (
        <p className="text-sm font-medium text-destructive">{fallbackLabel}</p>
      ) : (
        <div className="flex items-start gap-3">
          {user?.profileImage ? (
            <img
              src={user.profileImage}
              alt=""
              className="h-12 w-12 rounded-full object-cover"
            />
          ) : (
            <div className="h-12 w-12 rounded-full bg-muted" />
          )}
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">
              {user?.displayName || "Unknown"}
            </p>
            <p className="text-xs text-muted-foreground">{handleOf(user)}</p>
            <p className="mt-1 break-all font-mono text-[11px] text-muted-foreground">
              User ID {user?.userId || "—"}
            </p>
            {user?.accountStatus ? (
              <p className="mt-1 text-xs capitalize text-muted-foreground">
                Account status: {user.accountStatus}
              </p>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}

export function ReportDetailDialog({
  report,
  open,
  onOpenChange,
  onUpdated,
}: {
  report: ModerationReport | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdated: (report: ModerationReport) => void;
}) {
  const runAction = async (action: string) => {
    if (!report) return;
    const res = await adminApi.patch(
      `/api/reports/${report.reportId || report._id}`,
      { action },
    );
    if (res.data?.report) onUpdated(res.data.report);
  };

  if (!report) return null;

  const snap = report.reportedUserSnapshot;
  const current = report.currentReportedUser;
  const changes = report.identityChanged || {};
  const postDeleted = report.currentPost?.status === "deleted";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Report detail</DialogTitle>
        </DialogHeader>

        <section className="space-y-2 rounded-lg border p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Report
          </p>
          <p className="font-mono text-xs">Report ID {report.reportId}</p>
          <p className="text-sm">
            Reason <span className="font-medium capitalize">{report.reason}</span>
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

        <div className="grid gap-3 sm:grid-cols-2">
          <IdentityCard
            title="Reported user at time of report"
            user={snap}
            fallbackLabel="Snapshot unavailable"
          />
          <IdentityCard
            title="Current user"
            user={current}
            fallbackLabel="Account deleted / unavailable"
          />
        </div>

        <p className="break-all font-mono text-[11px] text-muted-foreground">
          Permanent user ID {report.reportedUserId}
        </p>

        {changes.usernameChanged ? (
          <div className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm">
            Username changed {handleOf(snap)} → {handleOf(current)}
          </div>
        ) : null}
        {changes.displayNameChanged ? (
          <div className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm">
            Display name changed {snap?.displayName} → {current?.displayName}
          </div>
        ) : null}
        {changes.profileImageChanged ? (
          <div className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm">
            Profile image changed
          </div>
        ) : null}
        {report.accountDeleted ? (
          <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            Account deleted
          </div>
        ) : null}

        <section className="space-y-2 rounded-lg border p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Reported post
          </p>
          <p className="font-mono text-xs">Post ID {report.postId}</p>
          <p className="text-xs text-muted-foreground">
            Original author {report.postSnapshot?.authorId || report.reportedUserId}
          </p>
          <p className="text-sm whitespace-pre-wrap">
            {report.postSnapshot?.content || "No text"}
          </p>
          {report.postSnapshot?.media?.length ? (
            <div className="flex flex-wrap gap-2">
              {report.postSnapshot.media.map((url) => (
                <MediaThumb
                  key={url}
                  src={url}
                  className="h-20 w-20 rounded-md"
                />
              ))}
            </div>
          ) : null}
          <p className="text-xs text-muted-foreground">
            Original creation{" "}
            {report.postSnapshot?.createdAt
              ? new Date(report.postSnapshot.createdAt).toLocaleString()
              : "Unknown"}
          </p>
          <p className="text-sm font-medium">
            Current status: {postDeleted ? "Deleted" : "Active"}
          </p>
          {report.currentPost?.moderationState ? (
            <p className="text-xs text-muted-foreground">
              Moderation state: {report.currentPost.moderationState}
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
                <li key={`${event.action}-${event.timestamp}-${index}`} className="text-sm">
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
            Reporter {report.reporter.displayName || handleOf(report.reporter)} · ID{" "}
            {report.reporter.userId}
          </p>
        ) : null}

        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={() => runAction("report_opened")}>
            Open
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => runAction("report_marked_reviewing")}
          >
            Reviewing
          </Button>
          <Button size="sm" variant="outline" onClick={() => runAction("user_warned")}>
            Warn user
          </Button>
          <Button size="sm" variant="outline" onClick={() => runAction("post_removed")}>
            Remove post
          </Button>
          {postDeleted ? (
            <Button size="sm" variant="outline" onClick={() => runAction("post_restored")}>
              Restore
            </Button>
          ) : null}
          <Button size="sm" variant="outline" onClick={() => runAction("report_dismissed")}>
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
