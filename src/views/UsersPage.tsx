"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, MapPin, UserPlus, Users } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { PageHeader } from "@/components/PageHeader";
import { PageLoading } from "@/components/PageLoading";
import { SearchInput } from "@/components/SearchInput";
import { AppStatusBadge } from "@/components/AppStatusBadge";
import { StatusBadge } from "@/components/StatusBadge";
import { StatCard } from "@/components/StatCard";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { EmptyState } from "@/components/EmptyState";
import { ImageZoomDialog } from "@/components/ImageZoomDialog";
import {
  UserActionDialog,
  type UserActionType,
} from "@/components/UserActionDialog";
import { adminGet } from "@/lib/adminClient";
import { useStaffAuth } from "@/lib/staffAuth";
import { UserStaffRoleSelect } from "@/components/UserStaffRoleSelect";
import { cn } from "@/lib/utils";

type OnboardingFilter = "all" | "located" | "signup_only";

const ORG_ACCOUNT_TYPE_RX =
  /organization|business|non-profit|public figure|media|e-commerce|entertainment/i;

function isOrgAccountType(accountType?: string) {
  const t = (accountType || "").trim();
  if (!t || t === "Personal Account" || t.toLowerCase() === "personal") {
    return false;
  }
  return ORG_ACCOUNT_TYPE_RX.test(t);
}

type AdminUser = {
  clerkId: string;
  email: string;
  firstName?: string;
  lastName?: string;
  nickName?: string;
  companyName?: string;
  image?: string;
  isVerified?: boolean;
  accountStatus?: string;
  accountType?: string;
  role?: string;
  country?: string;
  county?: string;
  constituency?: string;
  ward?: string;
  createdAt?: string;
  lastActiveAt?: string | null;
  warningCount?: number;
  strikeCount?: number;
  locationComplete?: boolean;
  appStatus?: {
    status?: string;
    label?: string;
    lastAppOpenAt?: string | null;
    lastHeartbeatAt?: string | null;
    pushTokenStatus?: string;
    deviceCount?: number;
    activeDeviceCount?: number;
    uninstallLikelihood?: string;
  };
};

type UserCounts = {
  all: number;
  withLocation: number;
  signupOnly: number;
};

export default function UsersPage() {
  const { hasPermission } = useStaffAuth();
  const [items, setItems] = useState<AdminUser[]>([]);
  const [search, setSearch] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [status, setStatus] = useState("all");
  const [verified, setVerified] = useState("all");
  const [onboarding, setOnboarding] = useState<OnboardingFilter>("all");
  const [appStatusFilter, setAppStatusFilter] = useState("all");
  const [pushStatusFilter, setPushStatusFilter] = useState("all");
  const [lastActiveFilter, setLastActiveFilter] = useState("all");
  const [sortBy, setSortBy] = useState("createdAt");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [counts, setCounts] = useState<UserCounts>({
    all: 0,
    withLocation: 0,
    signupOnly: 0,
  });
  const [loadError, setLoadError] = useState("");
  const [loading, setLoading] = useState(true);
  const [actionUser, setActionUser] = useState<AdminUser | null>(null);
  const [action, setAction] = useState<UserActionType | null>(null);
  const [actionOpen, setActionOpen] = useState(false);
  const [zoomImage, setZoomImage] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: String(page),
        limit: "10",
        sortBy,
        sortDir: "desc",
      });
      if (debouncedQ) params.set("q", debouncedQ);
      if (status !== "all") params.set("status", status);
      if (verified !== "all") params.set("verified", verified);
      if (onboarding !== "all") params.set("onboarding", onboarding);
      if (appStatusFilter !== "all") params.set("appStatus", appStatusFilter);
      if (pushStatusFilter !== "all") params.set("pushStatus", pushStatusFilter);
      if (lastActiveFilter !== "all") params.set("lastActive", lastActiveFilter);

      const data = await adminGet<{
        items: AdminUser[];
        totalPages: number;
        total: number;
        counts?: UserCounts;
      }>(`/api/admin/users?${params}`);
      setLoadError("");
      setItems(data.items || []);
      setTotalPages(data.totalPages || 1);
      setTotal(data.total || 0);
      setCounts({
        all: data.counts?.all ?? data.total ?? 0,
        withLocation: data.counts?.withLocation ?? 0,
        signupOnly: data.counts?.signupOnly ?? 0,
      });
    } catch (err) {
      console.error(err);
      setItems([]);
      setLoadError(
        "Could not load users. The dashboard API is unreachable — set NEXT_PUBLIC_API_URL to a running backend (or https://castapi-production.up.railway.app) and restart Next.",
      );
    } finally {
      setLoading(false);
    }
  }, [page, debouncedQ, status, verified, sortBy, onboarding, appStatusFilter, pushStatusFilter, lastActiveFilter]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  useEffect(() => {
    setPage(1);
  }, [debouncedQ, status, verified, sortBy, onboarding, appStatusFilter, pushStatusFilter, lastActiveFilter]);

  const appLastActiveAt = (u: AdminUser) =>
    u.appStatus?.lastAppOpenAt || u.appStatus?.lastHeartbeatAt || null;

  const formatRelativeActive = (iso: string | null | undefined) => {
    if (!iso) return "—";
    try {
      return formatDistanceToNow(new Date(iso), { addSuffix: true });
    } catch {
      return "—";
    }
  };

  const displayName = (u: AdminUser) =>
    u.nickName ||
    `${u.firstName || ""} ${u.lastName || ""}`.trim() ||
    u.companyName ||
    u.email ||
    u.clerkId;

  const isLocated = (u: AdminUser) => {
    if (typeof u.locationComplete === "boolean") return u.locationComplete;
    if (isOrgAccountType(u.accountType)) return true;
    if (u.country && u.country !== "Kenya") return true;
    return Boolean(u.county && u.constituency && u.ward);
  };

  const locationLabel = (u: AdminUser) => {
    const geo = [u.ward, u.constituency, u.county, u.country]
      .filter(Boolean)
      .join(", ");
    if (geo) return geo;
    if (isOrgAccountType(u.accountType)) return "Organization";
    return "Set";
  };

  const openAction = (u: AdminUser, a: UserActionType) => {
    setActionUser(u);
    setAction(a);
    setActionOpen(true);
  };

  const canWarn = hasPermission("warn_user");
  const canRestore = hasPermission("restore_user");
  const canRestrict = hasPermission("restrict_user");
  const canSuspend = hasPermission("suspend_user");
  const canAssignRoles = hasPermission("assign_roles");
  const showRowActions = canWarn || canRestore || canRestrict || canSuspend;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Users"
        description={`${counts.all.toLocaleString()} accounts · ${counts.signupOnly.toLocaleString()} signup only (personal, never set location)`}
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <button
          type="button"
          onClick={() => setOnboarding("all")}
          className={cn(
            "rounded-xl text-left ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            onboarding === "all" && "ring-2 ring-primary",
          )}
        >
          <StatCard
            title="All users"
            value={counts.all}
            icon={Users}
            change="In this filter"
            changeType="neutral"
          />
        </button>
        <button
          type="button"
          onClick={() => setOnboarding("located")}
          className={cn(
            "rounded-xl text-left ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            onboarding === "located" && "ring-2 ring-primary",
          )}
        >
          <StatCard
            title="Set location"
            value={counts.withLocation}
            icon={MapPin}
            accent="success"
            change="Finished location or organization"
            changeType="positive"
          />
        </button>
        <button
          type="button"
          onClick={() => setOnboarding("signup_only")}
          className={cn(
            "rounded-xl text-left ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            onboarding === "signup_only" && "ring-2 ring-primary",
          )}
        >
          <StatCard
            title="Signup only"
            value={counts.signupOnly}
            icon={UserPlus}
            accent="warning"
            change="Personal, never set location"
            changeType="neutral"
          />
        </button>
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search name, username, email…"
          className="max-w-md"
        />
        <div className="flex flex-wrap gap-2">
          <select
            className="h-9 rounded-md border border-input bg-background px-3 text-sm"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="all">All (excl. deleted)</option>
            <option value="active">Active</option>
            <option value="restricted">Restricted</option>
            <option value="suspended">Suspended</option>
            <option value="banned">Banned</option>
            <option value="deleted">Deleted</option>
          </select>
          <select
            className="h-9 rounded-md border border-input bg-background px-3 text-sm"
            value={verified}
            onChange={(e) => setVerified(e.target.value)}
          >
            <option value="all">Verification</option>
            <option value="true">Verified</option>
            <option value="false">Unverified</option>
          </select>
          <select
            className="h-9 rounded-md border border-input bg-background px-3 text-sm"
            value={onboarding}
            onChange={(e) => setOnboarding(e.target.value as OnboardingFilter)}
          >
            <option value="all">All onboarding</option>
            <option value="located">Set location</option>
            <option value="signup_only">Signup only</option>
          </select>
          <select
            className="h-9 rounded-md border border-input bg-background px-3 text-sm"
            value={appStatusFilter}
            onChange={(e) => setAppStatusFilter(e.target.value)}
          >
            <option value="all">App status</option>
            <option value="active">Installed / Active</option>
            <option value="recent">Recently active</option>
            <option value="inactive">Inactive</option>
            <option value="push_invalid">Push invalid</option>
            <option value="uninstall_likely">Uninstall likely</option>
            <option value="unknown">Unknown</option>
          </select>
          <select
            className="h-9 rounded-md border border-input bg-background px-3 text-sm"
            value={pushStatusFilter}
            onChange={(e) => setPushStatusFilter(e.target.value)}
          >
            <option value="all">Push status</option>
            <option value="valid">Valid</option>
            <option value="invalid">Invalid</option>
            <option value="unknown">Unknown</option>
          </select>
          <select
            className="h-9 rounded-md border border-input bg-background px-3 text-sm"
            value={lastActiveFilter}
            onChange={(e) => setLastActiveFilter(e.target.value)}
          >
            <option value="all">Last active</option>
            <option value="today">Today</option>
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="30d_plus">30+ days ago</option>
            <option value="never">Never</option>
          </select>
          <select
            className="h-9 rounded-md border border-input bg-background px-3 text-sm"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
          >
            <option value="createdAt">Joined</option>
            <option value="activity">Activity</option>
            <option value="updatedAt">Updated</option>
          </select>
        </div>
      </div>

      {loading ? (
        <PageLoading title="Loading users…" />
      ) : loadError ? (
        <EmptyState
          icon={<Users className="h-6 w-6 text-muted-foreground" />}
          title="Could not load users"
          subtitle={loadError}
        />
      ) : !items.length ? (
        <EmptyState
          icon={<Users className="h-6 w-6 text-muted-foreground" />}
          title={
            onboarding === "signup_only"
              ? "No signup-only accounts"
              : onboarding === "located"
                ? "No users with location"
                : "No users found"
          }
          subtitle="Try adjusting search or filters."
        />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="data-table w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-4 py-3 font-medium">User</th>
                <th className="px-4 py-3 font-medium">Account</th>
                {canAssignRoles ? (
                  <th className="px-4 py-3 font-medium">Access level</th>
                ) : null}
                <th className="px-4 py-3 font-medium">App status</th>
                <th className="px-4 py-3 font-medium">Push</th>
                <th className="px-4 py-3 font-medium">Last active</th>
                <th className="px-4 py-3 font-medium">Devices</th>
                <th className="px-4 py-3 font-medium">Location</th>
                <th className="px-4 py-3 font-medium">Joined</th>
                <th className="px-4 py-3 font-medium">Strikes</th>
                <th className="px-4 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((u) => {
                const needsRestore = ["restricted", "suspended", "banned", "deleted"].includes(
                  u.accountStatus || "",
                );
                return (
                  <tr
                    key={u.clerkId}
                    className="border-b border-border/60 hover:bg-muted/30"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          className="shrink-0 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          disabled={!u.image}
                          onClick={() => {
                            if (u.image) setZoomImage(u.image);
                          }}
                          title={u.image ? "View profile photo" : undefined}
                        >
                          <Avatar className="h-9 w-9 ring-1 ring-border">
                            {u.image ? (
                              <AvatarImage src={u.image} alt="" />
                            ) : null}
                            <AvatarFallback className="text-xs font-semibold">
                              {String(displayName(u)).slice(0, 1).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                        </button>
                        <div className="min-w-0">
                          <Link
                            href={`/users/${encodeURIComponent(u.clerkId)}`}
                            className="font-medium text-foreground hover:underline"
                          >
                            {displayName(u)}
                          </Link>
                          <p className="truncate text-xs text-muted-foreground">
                            {u.email}
                          </p>
                          {u.isVerified ? (
                            <span className="text-[10px] text-emerald-600">
                              Verified
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={u.accountStatus || "active"} />
                    </td>
                    {canAssignRoles ? (
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        <UserStaffRoleSelect
                          userId={u.clerkId}
                          role={u.role}
                          className="h-8 w-[9.5rem] text-xs"
                          onUpdated={(nextRole) => {
                            setItems((prev) =>
                              prev.map((row) =>
                                row.clerkId === u.clerkId
                                  ? { ...row, role: nextRole }
                                  : row,
                              ),
                            );
                          }}
                        />
                      </td>
                    ) : null}
                    <td className="px-4 py-3">
                      <AppStatusBadge appStatus={u.appStatus} />
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge
                        status={u.appStatus?.pushTokenStatus || "unknown"}
                        label={
                          u.appStatus?.pushTokenStatus === "valid"
                            ? "Valid"
                            : u.appStatus?.pushTokenStatus === "invalid"
                              ? "Invalid"
                              : "Unknown"
                        }
                      />
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {formatRelativeActive(appLastActiveAt(u))}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex min-w-[1.5rem] justify-center rounded-md bg-muted px-2 py-0.5 text-xs font-medium">
                        {u.appStatus?.deviceCount ?? 0}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {isLocated(u) ? (
                        locationLabel(u)
                      ) : (
                        <span className="inline-flex rounded-full bg-warning/15 px-2 py-0.5 text-[11px] font-medium text-warning">
                          Signup only
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {u.createdAt
                        ? new Date(u.createdAt).toLocaleDateString()
                        : "—"}
                    </td>
                    <td className="px-4 py-3">
                      {u.strikeCount || 0} / {u.warningCount || 0}w
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap justify-end gap-1.5">
                        <Button size="sm" variant="outline" asChild>
                          <Link href={`/users/${encodeURIComponent(u.clerkId)}`}>
                            Open
                          </Link>
                        </Button>
                        {showRowActions && needsRestore && canRestore ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openAction(u, "restore")}
                          >
                            Restore
                          </Button>
                        ) : null}
                        {showRowActions && canWarn ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openAction(u, "warn")}
                          >
                            Warn
                          </Button>
                        ) : null}
                        {showRowActions && canRestrict ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openAction(u, "restrict")}
                          >
                            Restrict
                          </Button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          {total.toLocaleString()} in this list · page {page} of {totalPages}
        </p>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <UserActionDialog
        open={actionOpen}
        onOpenChange={setActionOpen}
        action={action}
        user={
          actionUser
            ? {
                clerkId: actionUser.clerkId,
                nickName: actionUser.nickName,
                firstName: actionUser.firstName,
                lastName: actionUser.lastName,
                email: actionUser.email,
              }
            : null
        }
        onSuccess={() => {
          void fetchUsers();
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
