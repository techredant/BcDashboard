"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, MoreHorizontal } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { PageLoading } from "@/components/PageLoading";
import { AppStatusBadge } from "@/components/AppStatusBadge";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  UserActionDialog,
  type UserActionType,
} from "@/components/UserActionDialog";
import { adminGet, adminPatch } from "@/lib/adminClient";
import { useStaffAuth } from "@/lib/staffAuth";
import { EmptyState } from "@/components/EmptyState";
import { ImageZoomDialog } from "@/components/ImageZoomDialog";
import { UserStaffRoleSelect } from "@/components/UserStaffRoleSelect";
import { toast } from "sonner";

type ModerationRecord = {
  _id: string;
  action?: string;
  reason?: string;
  category?: string;
  severity?: string;
  postId?: string;
  newStatus?: string;
  previousStatus?: string;
  appealStatus?: string;
  appealReason?: string;
  internalNotes?: string;
  userMessage?: string;
  adminName?: string;
  adminId?: string;
  createdAt?: string;
  reversed?: boolean;
  postSnapshot?: { caption?: string; media?: string[]; postId?: string };
};

type DetailResponse = {
  user: Record<string, unknown> & {
    clerkId: string;
    email?: string;
    nickName?: string;
    firstName?: string;
    lastName?: string;
    image?: string;
    accountStatus?: string;
    role?: string;
    isVerified?: boolean;
    createdAt?: string;
    warningCount?: number;
    strikeCount?: number;
    suspensionUntil?: string;
  };
  stats: {
    posts: number;
    comments: number;
    followers: number;
    following: number;
    reports: number;
    warnings: number;
    strikes: number;
    livestreams: number;
  };
  lastActiveAt?: string | null;
  appStatus?: {
    status?: string;
    label?: string;
    lastAppOpenAt?: string | null;
    lastHeartbeatAt?: string | null;
    lastPushSuccessAt?: string | null;
    lastPushFailureAt?: string | null;
    pushTokenStatus?: string;
    deviceCount?: number;
    activeDeviceCount?: number;
    uninstallLikelihood?: string;
  };
  devices?: Array<{
    deviceId?: string;
    platform?: string;
    appVersion?: string | null;
    osVersion?: string | null;
    deviceName?: string | null;
    model?: string | null;
    manufacturer?: string | null;
    active?: boolean;
    pushTokenStatus?: string;
    uninstallLikelihood?: string;
    uninstallEvidence?: string;
    lastAppOpenAt?: string | null;
    lastHeartbeatAt?: string | null;
    lastPushSuccessAt?: string | null;
    lastPushFailureAt?: string | null;
    lastSeenAt?: string | null;
    tokenHint?: string | null;
  }>;
};

export default function UserDetailPage() {
  const params = useParams();
  const id = decodeURIComponent(String(params.id || ""));
  const { hasPermission } = useStaffAuth();
  const [data, setData] = useState<DetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("overview");
  const [tabItems, setTabItems] = useState<unknown[]>([]);
  const [moderationItems, setModerationItems] = useState<ModerationRecord[]>([]);
  const [action, setAction] = useState<UserActionType | null>(null);
  const [actionOpen, setActionOpen] = useState(false);
  const [notesDraft, setNotesDraft] = useState<Record<string, string>>({});
  const [zoomImage, setZoomImage] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const res = await adminGet<DetailResponse>(`/api/admin/users/${encodeURIComponent(id)}`);
      setData(res);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  const loadModeration = useCallback(async () => {
    try {
      const res = await adminGet<{ items: ModerationRecord[] }>(
        `/api/admin/moderation/user/${encodeURIComponent(id)}?limit=10`,
      );
      setModerationItems(res.items || []);
    } catch {
      setModerationItems([]);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!data) return;
    if (tab === "history" || tab === "warnings") {
      void loadModeration();
      return;
    }
    if (tab === "overview") return;
    const pathMap: Record<string, string> = {
      posts: "posts",
      comments: "comments",
      media: "posts",
      reports: "reports",
      activity: "activity",
    };
    const seg = pathMap[tab];
    if (!seg) return;
    (async () => {
      try {
        if (tab === "activity") {
          const res = await adminGet<{ recentPosts: unknown[] }>(
            `/api/admin/users/${encodeURIComponent(id)}/activity`,
          );
          setTabItems(res.recentPosts || []);
          return;
        }
        const res = await adminGet<{ items: unknown[] }>(
          `/api/admin/users/${encodeURIComponent(id)}/${seg}?limit=10`,
        );
        setTabItems(res.items || []);
      } catch {
        setTabItems([]);
      }
    })();
  }, [tab, data, id, loadModeration]);

  const reverseAction = async (moderationId: string) => {
    if (!hasPermission("restore_user") && !hasPermission("moderate_content")) {
      toast.error("Insufficient permissions");
      return;
    }
    try {
      await adminPatch(`/api/admin/moderation/${moderationId}`, {
        reverse: true,
        reason: "Reversed from user detail",
      });
      toast.success("Action reversed");
      void loadModeration();
      void load();
    } catch (err: unknown) {
      toast.error(
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || "Reverse failed",
      );
    }
  };

  const saveNotes = async (moderationId: string) => {
    try {
      await adminPatch(`/api/admin/moderation/${moderationId}`, {
        internalNotes: notesDraft[moderationId] || "",
      });
      toast.success("Notes saved");
      void loadModeration();
    } catch {
      toast.error("Could not save notes");
    }
  };

  if (loading) return <PageLoading title="Loading user…" />;
  if (!data?.user) {
    return (
      <EmptyState
        title="User not found"
        subtitle="This account may have been removed."
      />
    );
  }

  const u = data.user;
  const name =
    u.nickName ||
    `${u.firstName || ""} ${u.lastName || ""}`.trim() ||
    u.email ||
    u.clerkId;

  const openAction = (a: UserActionType) => {
    setAction(a);
    setActionOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/users">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          {u.image ? (
            <button
              type="button"
              className="rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              onClick={() => setZoomImage(u.image || null)}
              title="View profile photo"
            >
              <img
                src={u.image}
                alt=""
                className="h-16 w-16 rounded-full object-cover ring-2 ring-border transition hover:opacity-90"
              />
            </button>
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted text-lg font-semibold">
              {String(name).slice(0, 1).toUpperCase()}
            </div>
          )}
          <div>
            <h1 className="font-display text-2xl font-semibold">{name}</h1>
            <p className="text-sm text-muted-foreground">
              @{u.nickName || "—"} · {u.email}
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              <StatusBadge status={u.accountStatus || "active"} />
              {u.isVerified ? <StatusBadge status="verified" /> : null}
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Joined{" "}
              {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : "—"} ·
              Last active{" "}
              {data.lastActiveAt
                ? new Date(data.lastActiveAt).toLocaleString()
                : "—"}
            </p>
          </div>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button>
              Actions
              <MoreHorizontal className="ml-2 h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {hasPermission("warn_user") ? (
              <DropdownMenuItem onClick={() => openAction("warn")}>Warn</DropdownMenuItem>
            ) : null}
            {hasPermission("restrict_user") ? (
              <DropdownMenuItem onClick={() => openAction("restrict")}>
                Restrict
              </DropdownMenuItem>
            ) : null}
            {hasPermission("suspend_user") ? (
              <DropdownMenuItem onClick={() => openAction("suspend")}>
                Suspend
              </DropdownMenuItem>
            ) : null}
            {hasPermission("ban_user") ? (
              <DropdownMenuItem onClick={() => openAction("ban")}>
                Permanent ban
              </DropdownMenuItem>
            ) : null}
            {hasPermission("restore_user") ? (
              <DropdownMenuItem onClick={() => openAction("restore")}>
                Restore
              </DropdownMenuItem>
            ) : null}
            {hasPermission("delete_user") ? (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive"
                  onClick={() => openAction("delete")}
                >
                  Deactivate account
                </DropdownMenuItem>
              </>
            ) : null}
            {!hasPermission("warn_user") &&
            !hasPermission("restrict_user") &&
            !hasPermission("suspend_user") &&
            !hasPermission("ban_user") &&
            !hasPermission("restore_user") &&
            !hasPermission("delete_user") ? (
              <DropdownMenuItem disabled>
                No moderation permissions for this role
              </DropdownMenuItem>
            ) : null}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="grid gap-3 sm:grid-cols-4 lg:grid-cols-8">
        {[
          ["Posts", data.stats.posts],
          ["Followers", data.stats.followers],
          ["Following", data.stats.following],
          ["Comments", data.stats.comments],
          ["Reports", data.stats.reports],
          ["Warnings", data.stats.warnings],
          ["Strikes", data.stats.strikes],
          ["Lives", data.stats.livestreams],
        ].map(([label, value]) => (
          <div key={String(label)} className="rounded-lg border border-border p-3">
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="text-lg font-semibold">{value}</p>
          </div>
        ))}
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="flex h-auto flex-wrap">
          {[
            "overview",
            "posts",
            "comments",
            "media",
            "reports",
            "warnings",
            "history",
            "activity",
          ].map((t) => (
            <TabsTrigger key={t} value={t} className="capitalize">
              {t}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="overview" className="space-y-4 pt-4 text-sm">
          <div className="rounded-lg border border-border p-4 space-y-2">
            <h3 className="font-medium">Account</h3>
            <p>
              Moderation status:{" "}
              <StatusBadge status={u.accountStatus || "active"} />
            </p>
            {hasPermission("assign_roles") ? (
              <div className="flex flex-col gap-2 pt-1 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-medium">Staff access level</p>
                  <p className="text-xs text-muted-foreground">
                    Elevate or revoke dashboard permissions for this account.
                  </p>
                </div>
                <UserStaffRoleSelect
                  userId={u.clerkId}
                  role={u.role}
                  onUpdated={(nextRole) => {
                    setData((prev) =>
                      prev
                        ? {
                            ...prev,
                            user: { ...prev.user, role: nextRole },
                          }
                        : prev,
                    );
                  }}
                />
              </div>
            ) : u.role && u.role !== "user" ? (
              <p className="text-muted-foreground capitalize">
                Staff access: {u.role.replace("_", " ")}
              </p>
            ) : null}
            <p className="text-muted-foreground">
              Internal strikes: {data.stats.strikes} (not shown on public profile)
            </p>
            {u.suspensionUntil ? (
              <p className="text-muted-foreground">
                Suspension until {new Date(String(u.suspensionUntil)).toLocaleString()}
              </p>
            ) : null}
          </div>

          <div className="rounded-lg border border-border p-4 space-y-2">
            <h3 className="font-medium">App</h3>
            <p>
              Status: <AppStatusBadge appStatus={data.appStatus} />
            </p>
            <p className="text-muted-foreground">
              Last app open:{" "}
              {data.appStatus?.lastAppOpenAt
                ? formatDistanceToNow(new Date(data.appStatus.lastAppOpenAt), {
                    addSuffix: true,
                  })
                : "—"}
            </p>
            <p className="text-muted-foreground">
              Last heartbeat:{" "}
              {data.appStatus?.lastHeartbeatAt
                ? formatDistanceToNow(new Date(data.appStatus.lastHeartbeatAt), {
                    addSuffix: true,
                  })
                : "—"}
            </p>
            <p className="text-muted-foreground">
              Devices: {data.appStatus?.deviceCount ?? 0} registered (
              {data.appStatus?.activeDeviceCount ?? 0} active)
            </p>
          </div>

          <div className="rounded-lg border border-border p-4 space-y-2">
            <h3 className="font-medium">Push notifications</h3>
            <p>
              Token status:{" "}
              <StatusBadge
                status={data.appStatus?.pushTokenStatus || "unknown"}
                label={
                  data.appStatus?.pushTokenStatus === "valid"
                    ? "Valid"
                    : data.appStatus?.pushTokenStatus === "invalid"
                      ? "Invalid"
                      : "Unknown"
                }
              />
            </p>
            <p className="text-muted-foreground">
              Last push success:{" "}
              {data.appStatus?.lastPushSuccessAt
                ? new Date(data.appStatus.lastPushSuccessAt).toLocaleString()
                : "—"}
            </p>
            <p className="text-muted-foreground">
              Last push failure:{" "}
              {data.appStatus?.lastPushFailureAt
                ? new Date(data.appStatus.lastPushFailureAt).toLocaleString()
                : "—"}
            </p>
            <p className="text-muted-foreground">
              Uninstall likelihood:{" "}
              <StatusBadge status={data.appStatus?.uninstallLikelihood || "unknown"} />
            </p>
          </div>

          {(data.devices?.length ?? 0) > 0 ? (
            <div className="rounded-lg border border-border p-4 space-y-3">
              <h3 className="font-medium">Devices</h3>
              {data.devices?.map((device) => (
                <div
                  key={device.deviceId}
                  className="rounded-md border border-border/60 p-3 text-xs space-y-1"
                >
                  <p className="font-medium">
                    {device.manufacturer || device.platform || "Device"}{" "}
                    {device.model || device.deviceName || device.deviceId}
                  </p>
                  <p className="text-muted-foreground">
                    {device.platform} · app {device.appVersion || "—"} · OS{" "}
                    {device.osVersion || "—"}
                  </p>
                  <div className="flex flex-wrap gap-2 pt-1">
                    <StatusBadge
                      status={device.pushTokenStatus || "unknown"}
                      label={`Push ${device.pushTokenStatus || "unknown"}`}
                    />
                    <StatusBadge
                      status={device.uninstallLikelihood || "unknown"}
                      label={`Uninstall ${device.uninstallLikelihood || "unknown"}`}
                    />
                    {!device.active ? (
                      <StatusBadge status="inactive" label="Inactive" />
                    ) : null}
                  </div>
                  <p className="text-muted-foreground">
                    Last active:{" "}
                    {device.lastAppOpenAt || device.lastHeartbeatAt || device.lastSeenAt
                      ? formatDistanceToNow(
                          new Date(
                            device.lastAppOpenAt ||
                              device.lastHeartbeatAt ||
                              device.lastSeenAt ||
                              "",
                          ),
                          { addSuffix: true },
                        )
                      : "—"}
                  </p>
                  {device.uninstallEvidence && device.uninstallEvidence !== "none" ? (
                    <p className="text-muted-foreground">
                      Evidence: {device.uninstallEvidence.replace(/_/g, " ")}
                    </p>
                  ) : null}
                </div>
              ))}
            </div>
          ) : null}

          <p className="text-muted-foreground">Clerk ID: {u.clerkId}</p>
        </TabsContent>

        {["history", "warnings"].map((t) => (
          <TabsContent key={t} value={t} className="space-y-3 pt-4">
            {!(t === "warnings"
              ? moderationItems.filter((m) =>
                  ["warn", "warn_content"].includes(m.action || ""),
                )
              : moderationItems
            ).length ? (
              <p className="text-sm text-muted-foreground">No records.</p>
            ) : (
              (t === "warnings"
                ? moderationItems.filter((m) =>
                    ["warn", "warn_content"].includes(m.action || ""),
                  )
                : moderationItems
              ).map((m) => (
                <div key={m._id} className="rounded-lg border border-border p-4 text-sm">
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge status={m.action || "info"} />
                    {m.severity ? <StatusBadge status={m.severity} /> : null}
                    {m.appealStatus ? (
                      <StatusBadge status={m.appealStatus} />
                    ) : null}
                    {m.reversed ? <StatusBadge status="restored" /> : null}
                  </div>
                  <p className="mt-2 font-medium">{m.reason || m.userMessage || "—"}</p>
                  <p className="text-xs text-muted-foreground">
                    {m.createdAt ? new Date(m.createdAt).toLocaleString() : "—"} ·{" "}
                    {m.adminName || m.adminId || "moderator"}
                    {m.category ? ` · ${m.category}` : ""}
                  </p>
                  {m.postId ? (
                    <p className="mt-1 text-xs">
                      Post: <code className="text-[11px]">{m.postId}</code>
                      {m.postSnapshot?.caption ? (
                        <span className="text-muted-foreground">
                          {" "}
                          — {m.postSnapshot.caption.slice(0, 120)}
                        </span>
                      ) : null}
                    </p>
                  ) : null}
                  {m.appealReason ? (
                    <p className="mt-1 text-xs text-muted-foreground">
                      Appeal: {m.appealReason}
                    </p>
                  ) : null}
                  <div className="mt-3 space-y-2">
                    <label className="text-xs text-muted-foreground">
                      Moderator notes (internal)
                    </label>
                    <textarea
                      className="min-h-16 w-full rounded-md border border-input bg-background px-2 py-1 text-xs"
                      defaultValue={m.internalNotes || ""}
                      onChange={(e) =>
                        setNotesDraft((prev) => ({
                          ...prev,
                          [m._id]: e.target.value,
                        }))
                      }
                    />
                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => void saveNotes(m._id)}
                      >
                        Save notes
                      </Button>
                      {!m.reversed ? (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => void reverseAction(m._id)}
                        >
                          Reverse
                        </Button>
                      ) : null}
                      {m.appealStatus === "pending" ? (
                        <>
                          <Button
                            size="sm"
                            onClick={async () => {
                              await adminPatch(`/api/admin/moderation/${m._id}`, {
                                appealDecision: "approved",
                                resolution: "Appeal approved",
                              });
                              toast.success("Appeal approved");
                              void loadModeration();
                            }}
                          >
                            Approve appeal
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={async () => {
                              await adminPatch(`/api/admin/moderation/${m._id}`, {
                                appealDecision: "rejected",
                                resolution: "Appeal rejected",
                              });
                              toast.success("Appeal rejected");
                              void loadModeration();
                            }}
                          >
                            Reject appeal
                          </Button>
                        </>
                      ) : null}
                    </div>
                  </div>
                </div>
              ))
            )}
          </TabsContent>
        ))}

        {["posts", "comments", "media", "reports", "activity"].map((t) => (
            <TabsContent key={t} value={t} className="pt-4">
              {!tabItems.length ? (
                <p className="text-sm text-muted-foreground">No items.</p>
              ) : (
                <ul className="space-y-2">
                  {tabItems.map((item, i) => (
                    <li
                      key={i}
                      className="rounded-md border border-border p-3 text-sm"
                    >
                      <pre className="max-h-40 overflow-auto whitespace-pre-wrap break-all text-xs text-muted-foreground">
                        {JSON.stringify(item, null, 2)}
                      </pre>
                    </li>
                  ))}
                </ul>
              )}
            </TabsContent>
          ))}
      </Tabs>

      <UserActionDialog
        open={actionOpen}
        onOpenChange={setActionOpen}
        action={action}
        user={u}
        onSuccess={() => {
          void load();
          void loadModeration();
        }}
      />

      <ImageZoomDialog
        src={zoomImage}
        title="Profile photo"
        onClose={() => setZoomImage(null)}
      />
    </div>
  );
}
