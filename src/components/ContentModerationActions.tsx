"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { adminPost } from "@/lib/adminClient";
import { toast } from "sonner";
import {
  UserActionDialog,
  type UserActionType,
} from "@/components/UserActionDialog";

export type ModeratableContentType =
  | "post"
  | "status"
  | "product"
  | "livestream"
  | "comment";

type Props = {
  contentType: ModeratableContentType;
  contentId: string;
  ownerUserId?: string;
  /** When true, show Restore instead of Remove */
  blocked?: boolean;
  onUpdated?: () => void;
  className?: string;
};

export function ContentModerationActions({
  contentType,
  contentId,
  ownerUserId,
  blocked = false,
  onUpdated,
  className,
}: Props) {
  const [busy, setBusy] = useState(false);
  const [warnOpen, setWarnOpen] = useState(false);
  const [warnAction, setWarnAction] = useState<UserActionType | null>(null);

  const id = String(contentId || "");
  if (!id) return null;

  const run = async (action: "approve" | "remove" | "restore") => {
    if (action === "remove" && !window.confirm("Remove this content?")) return;
    setBusy(true);
    try {
      await adminPost(`/api/admin/content/${contentType}/${id}/${action}`, {
        reason:
          action === "approve"
            ? "Approved by moderator"
            : action === "restore"
              ? "Restored by moderator"
              : "Removed by moderator",
      });
      toast.success(
        action === "approve"
          ? "Approved"
          : action === "restore"
            ? "Restored"
            : "Removed",
      );
      onUpdated?.();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || `${action} failed`;
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <div className={className ?? "flex flex-wrap gap-2"}>
        <Button
          size="sm"
          variant="outline"
          disabled={busy}
          onClick={() => run("approve")}
        >
          Approve
        </Button>
        {blocked ? (
          <Button
            size="sm"
            variant="outline"
            disabled={busy}
            onClick={() => run("restore")}
          >
            Restore
          </Button>
        ) : (
          <Button
            size="sm"
            variant="destructive"
            disabled={busy}
            onClick={() => run("remove")}
          >
            Remove
          </Button>
        )}
        {ownerUserId ? (
          <Button
            size="sm"
            variant="secondary"
            disabled={busy}
            onClick={() => {
              setWarnAction("warn");
              setWarnOpen(true);
            }}
          >
            {contentType === "product"
              ? "Warn listing"
              : contentType === "status"
                ? "Warn status"
                : contentType === "livestream"
                  ? "Warn livestream"
                  : "Warn"}
          </Button>
        ) : null}
      </div>

      <UserActionDialog
        open={warnOpen}
        onOpenChange={setWarnOpen}
        action={warnAction}
        user={ownerUserId ? { clerkId: ownerUserId } : null}
        relatedContentType={contentType === "post" ? "post" : contentType}
        relatedContentId={id}
        postId={contentType === "post" ? id : undefined}
        onSuccess={onUpdated}
      />
    </>
  );
}

export function isContentBlocked(state?: string | null, aiStatus?: string | null) {
  const s = String(state || "").toLowerCase();
  return (
    ["blocked", "removed", "flagged", "hidden", "ended", "warned", "limited", "under_review"].includes(
      s,
    ) || String(aiStatus || "").toLowerCase() === "blocked"
  );
}
