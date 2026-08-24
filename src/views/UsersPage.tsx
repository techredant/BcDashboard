"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Users } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { PageLoading } from "@/components/PageLoading";
import { SearchInput } from "@/components/SearchInput";
import { StatusBadge } from "@/components/StatusBadge";
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

type AdminUser = {
  clerkId: string;
  email: string;
  firstName?: string;
  lastName?: string;
  nickName?: string;
  image?: string;
  isVerified?: boolean;
  accountStatus?: string;
  country?: string;
  county?: string;
  createdAt?: string;
  lastActiveAt?: string | null;
  warningCount?: number;
  strikeCount?: number;
};

export default function UsersPage() {
  const { hasPermission } = useStaffAuth();
  const [items, setItems] = useState<AdminUser[]>([]);
  const [search, setSearch] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [status, setStatus] = useState("all");
  const [verified, setVerified] = useState("all");
  const [sortBy, setSortBy] = useState("createdAt");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
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
        limit: "25",
        sortBy,
        sortDir: "desc",
      });
      if (debouncedQ) params.set("q", debouncedQ);
      if (status !== "all") params.set("status", status);
      if (verified !== "all") params.set("verified", verified);

      const data = await adminGet<{
        items: AdminUser[];
        totalPages: number;
        total: number;
      }>(`/api/admin/users?${params}`);
      setItems(data.items || []);
      setTotalPages(data.totalPages || 1);
      setTotal(data.total || 0);
    } catch (err) {
      console.error(err);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [page, debouncedQ, status, verified, sortBy]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  useEffect(() => {
    setPage(1);
  }, [debouncedQ, status, verified, sortBy]);

  const displayName = (u: AdminUser) =>
    u.nickName ||
    `${u.firstName || ""} ${u.lastName || ""}`.trim() ||
    u.email ||
    u.clerkId;

  const openAction = (u: AdminUser, a: UserActionType) => {
    setActionUser(u);
    setAction(a);
    setActionOpen(true);
  };

  const canWarn = hasPermission("warn_user");
  const canRestore = hasPermission("restore_user");
  const canRestrict = hasPermission("restrict_user");
  const canSuspend = hasPermission("suspend_user");
  const showRowActions = canWarn || canRestore || canRestrict || canSuspend;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Users"
        description={`${total.toLocaleString()} accounts · server-side search & filters`}
      />

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
      ) : !items.length ? (
        <EmptyState
          icon={<Users className="h-6 w-6 text-muted-foreground" />}
          title="No users found"
          subtitle="Try adjusting search or filters."
        />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="data-table w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-4 py-3 font-medium">User</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Location</th>
                <th className="px-4 py-3 font-medium">Joined</th>
                <th className="px-4 py-3 font-medium">Last active</th>
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
                    <td className="px-4 py-3 text-muted-foreground">
                      {[u.county, u.country].filter(Boolean).join(", ") || "—"}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {u.createdAt
                        ? new Date(u.createdAt).toLocaleDateString()
                        : "—"}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {u.lastActiveAt
                        ? new Date(u.lastActiveAt).toLocaleString()
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
          Page {page} of {totalPages}
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
