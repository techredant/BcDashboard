"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { adminPost } from "@/lib/adminClient";
import { toast } from "sonner";

const POLICY_CATEGORIES = [
  "spam",
  "harassment",
  "hate",
  "violence",
  "misinformation",
  "nudity",
  "impersonation",
  "scam",
  "copyright",
  "other",
];

const DURATIONS = ["1h", "24h", "3d", "7d", "30d", "custom"];

const RESTRICTION_TYPES = [
  { id: "post", label: "Cannot post" },
  { id: "comment", label: "Cannot comment" },
  { id: "livestream", label: "Cannot livestream" },
  { id: "message", label: "Cannot send messages" },
  { id: "mediaUpload", label: "Cannot upload media" },
];

export type UserActionType =
  | "warn"
  | "restrict"
  | "suspend"
  | "ban"
  | "delete"
  | "restore";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  action: UserActionType | null;
  user: {
    clerkId: string;
    nickName?: string;
    firstName?: string;
    lastName?: string;
    email?: string;
  } | null;
  /** When warning content, attach to this post */
  postId?: string;
  /** Non-post content linkage (status, product, livestream, comment) */
  relatedContentType?: string;
  relatedContentId?: string;
  onSuccess?: () => void;
};

export function UserActionDialog({
  open,
  onOpenChange,
  action,
  user,
  postId,
  relatedContentType,
  relatedContentId,
  onSuccess,
}: Props) {
  const [reason, setReason] = useState("");
  const [category, setCategory] = useState("other");
  const [severity, setSeverity] = useState("medium");
  const [linkedPostId, setLinkedPostId] = useState(postId || "");
  const [message, setMessage] = useState("");
  const [duration, setDuration] = useState("7d");
  const [customUntil, setCustomUntil] = useState("");
  const [internalNotes, setInternalNotes] = useState("");
  const [confirmText, setConfirmText] = useState("");
  const [restrictions, setRestrictions] = useState<string[]>(["post", "comment"]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) setLinkedPostId(postId || "");
  }, [open, postId]);

  const displayName =
    user?.nickName ||
    [user?.firstName, user?.lastName].filter(Boolean).join(" ") ||
    user?.email ||
    user?.clerkId ||
    "";

  const reset = () => {
    setReason("");
    setCategory("other");
    setSeverity("medium");
    setLinkedPostId(postId || "");
    setMessage("");
    setDuration("7d");
    setCustomUntil("");
    setInternalNotes("");
    setConfirmText("");
    setRestrictions(["post", "comment"]);
  };

  const titles: Record<UserActionType, string> = {
    warn:
      relatedContentType === "product" || relatedContentType === "market"
        ? "Flag marketplace listing"
        : "Warn user",
    restrict: "Restrict account",
    suspend: "Suspend account",
    ban: "Permanently ban",
    delete: "Deactivate account",
    restore: "Restore account",
  };

  const submit = async () => {
    if (!user?.clerkId || !action) return;
    if (action !== "restore" && !reason.trim()) {
      toast.error("Reason is required");
      return;
    }
    if (action === "ban" && confirmText.trim() !== displayName.trim()) {
      toast.error("Type the exact username to confirm ban");
      return;
    }
    if (action === "delete" && confirmText !== "DELETE") {
      toast.error('Type DELETE to confirm');
      return;
    }

    setSubmitting(true);
    try {
      const id = user.clerkId;
      if (action === "warn") {
        const linkedId = linkedPostId || relatedContentId || undefined;
        const linkedType =
          linkedPostId
            ? "post"
            : relatedContentType || (linkedId ? "post" : undefined);
        const isListing =
          linkedType === "product" || linkedType === "market";
        const isStatus = linkedType === "status";
        const contentFlagOnly = isListing || isStatus;
        await adminPost(`/api/admin/users/${id}/warn`, {
          reason,
          category,
          severity,
          message:
            message.trim() ||
            (isListing
              ? "Your listing has been flagged for violating our Community Guidelines."
              : isStatus
                ? "Your status has been flagged for violating our Community Guidelines."
                : undefined),
          postId: linkedType === "post" ? linkedId : undefined,
          relatedContentType: linkedType,
          relatedContentId: linkedId,
          // Listing / status flags never count toward account strikes / bans.
          countStrike: contentFlagOnly ? false : true,
          internalNotes,
        });
      } else if (action === "restrict") {
        await adminPost(`/api/admin/users/${id}/restrict`, {
          reason,
          category,
          duration,
          customUntil: duration === "custom" ? customUntil : undefined,
          restrictions,
          internalNotes,
        });
      } else if (action === "suspend") {
        await adminPost(`/api/admin/users/${id}/suspend`, {
          reason,
          category,
          duration,
          customUntil: duration === "custom" ? customUntil : undefined,
          internalNotes,
        });
      } else if (action === "ban") {
        await adminPost(`/api/admin/users/${id}/ban`, {
          reason,
          category,
          confirmUsername: confirmText,
          internalNotes,
        });
      } else if (action === "delete") {
        await adminPost(`/api/admin/users/${id}/delete`, {
          reason,
          confirmPhrase: confirmText,
          internalNotes,
        });
      } else if (action === "restore") {
        await adminPost(`/api/admin/users/${id}/restore`, {
          reason: reason || "Account restored",
          internalNotes,
        });
      }
      toast.success("Action completed");
      reset();
      onOpenChange(false);
      onSuccess?.();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || "Action failed";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (!action) return null;

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) reset();
        onOpenChange(v);
      }}
    >
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{titles[action]}</DialogTitle>
          <DialogDescription>
            Target: <strong>{displayName}</strong>
            {user?.email ? ` · ${user.email}` : ""}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="reason">Reason</Label>
            <Input
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Required for most actions"
            />
          </div>

          {["warn", "restrict", "suspend", "ban"].includes(action) ? (
            <div className="space-y-2">
              <Label>Policy category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {POLICY_CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}

          {action === "warn" ? (
            <>
              <div className="space-y-2">
                <Label>Severity</Label>
                <Select value={severity} onValueChange={setSeverity}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {["low", "medium", "high", "critical"].map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="postId">
                  Related content ID
                  {relatedContentType && relatedContentType !== "post"
                    ? ` (${relatedContentType})`
                    : " (post recommended)"}
                </Label>
                <Input
                  id="postId"
                  value={linkedPostId || relatedContentId || ""}
                  onChange={(e) => setLinkedPostId(e.target.value)}
                  placeholder={
                    relatedContentType && relatedContentType !== "post"
                      ? `${relatedContentType} id`
                      : "Mongo post id — shows warning on that post"
                  }
                  readOnly={Boolean(relatedContentId && relatedContentType !== "post")}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="message">
                  Message to user
                  {relatedContentType === "product" ||
                  relatedContentType === "market"
                    ? " (listing flag)"
                    : " (optional)"}
                </Label>
                <Textarea
                  id="message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={3}
                  placeholder={
                    relatedContentType === "product" ||
                    relatedContentType === "market"
                      ? "Your listing has been flagged for violating our Community Guidelines."
                      : relatedContentType === "status"
                        ? "Your status has been flagged for violating our Community Guidelines."
                        : undefined
                  }
                />
                {(relatedContentType === "product" ||
                  relatedContentType === "market" ||
                  relatedContentType === "status") && (
                  <p className="text-xs text-muted-foreground">
                    {relatedContentType === "status"
                      ? "Flags this status only — does not ban or strike the account."
                      : "Flags the listing only — does not ban or strike the seller account."}
                  </p>
                )}
              </div>
            </>
          ) : null}

          {action === "restrict" ? (
            <div className="space-y-2">
              <Label>Restrictions</Label>
              <div className="space-y-2">
                {RESTRICTION_TYPES.map((r) => (
                  <label key={r.id} className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={restrictions.includes(r.id)}
                      onCheckedChange={(checked) => {
                        setRestrictions((prev) =>
                          checked
                            ? [...prev, r.id]
                            : prev.filter((x) => x !== r.id),
                        );
                      }}
                    />
                    {r.label}
                  </label>
                ))}
              </div>
            </div>
          ) : null}

          {action === "restrict" || action === "suspend" ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Duration</Label>
                <Select value={duration} onValueChange={setDuration}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DURATIONS.map((d) => (
                      <SelectItem key={d} value={d}>
                        {d}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {duration === "custom" ? (
                <div className="space-y-2">
                  <Label>Until</Label>
                  <Input
                    type="datetime-local"
                    value={customUntil}
                    onChange={(e) => setCustomUntil(e.target.value)}
                  />
                </div>
              ) : null}
            </div>
          ) : null}

          {["restrict", "suspend", "ban", "delete", "restore"].includes(action) ? (
            <div className="space-y-2">
              <Label>Internal notes (not shown to user)</Label>
              <Textarea
                value={internalNotes}
                onChange={(e) => setInternalNotes(e.target.value)}
                rows={2}
              />
            </div>
          ) : null}

          {action === "ban" ? (
            <div className="space-y-2 rounded-md border border-destructive/40 bg-destructive/5 p-3">
              <Label>Type username to confirm: {displayName}</Label>
              <Input
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                autoComplete="off"
              />
            </div>
          ) : null}

          {action === "delete" ? (
            <div className="space-y-2 rounded-md border border-destructive/40 bg-destructive/5 p-3">
              <Label>Type DELETE to confirm soft-deactivation</Label>
              <Input
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                autoComplete="off"
              />
            </div>
          ) : null}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            disabled={submitting}
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant={action === "ban" || action === "delete" ? "destructive" : "default"}
            disabled={submitting}
            onClick={submit}
          >
            {submitting ? "Working…" : "Confirm"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
