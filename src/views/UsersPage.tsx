"use client";

import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { MoreHorizontal, ChevronLeft, ChevronRight, AlertTriangle, Trash2, Flame } from "lucide-react";
import { API_BASE_URL } from "@/lib/api";
import { PageHeader } from "@/components/PageHeader";
import { PageLoading } from "@/components/PageLoading";
import { SearchInput } from "@/components/SearchInput";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export default function UsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [openAction, setOpenAction] = useState(false);

  // 🔥 FETCH USERS (FIXED)
  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);

      const res = await axios.get(`${API_BASE_URL}/api/users`);

      console.log("RAW RESPONSE:", res.data);

      // ✅ handle both cases: { users: [] } OR []
      const rawUsers = res.data.users || res.data;

      const formatted = rawUsers.map((u: any) => ({
        id: u._id,

        name:
          u.nickName ||
          `${u.firstName || ""} ${u.lastName || ""}`.trim() ||
          "No Name",

        email: u.email || "No Email",

        county: u.county || "N/A",
        constituency: u.constituency || "N/A",
        ward: u.ward || "N/A",

        status: u.isVerified ? "verified" : "unverified",

        joined: u.createdAt
          ? new Date(u.createdAt).toISOString().split("T")[0]
          : "N/A",

        followers: u.followers?.length || 0,
        following: u.following?.length || 0,
      }));

      setUsers(formatted);
    } catch (err) {
      console.error("Users fetch error:", err);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // 🔍 FILTER
  const filtered = users.filter((u) => {
    const matchSearch =
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase());

    const matchFilter = filter === "all" || u.status === filter;

    return matchSearch && matchFilter;
  });

  if (loading) {
    return <PageLoading title="Loading users…" />;
  }

  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader
        title="User Management"
        description="View, search, and moderate all mobile app accounts"
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search by name or email…"
        />
        <div className="filter-pills shrink-0">
          {["all", "verified", "unverified"].map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={`filter-pill ${filter === f ? "filter-pill-active" : ""}`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="data-table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>User</th>
              <th>County</th>
              <th>Constituency</th>
              <th>Ward</th>
              <th>Status</th>
              <th>Joined</th>
              <th>Followers</th>
              <th>Following</th>
              <th className="text-right">Actions</th>
            </tr>
          </thead>

          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td
                  colSpan={9}
                  className="text-center py-6 text-muted-foreground"
                >
                  No users found
                </td>
              </tr>
            ) : (
              filtered.map((user) => (
                <tr
                  key={user.id}
                  className="border-b last:border-0 hover:bg-secondary/30"
                >
                  <td className="px-5 py-3">
                    <p className="text-sm font-medium">{user.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {user.email}
                    </p>
                  </td>

                  <td className="px-5 py-3 text-sm">{user.county}</td>

                  <td className="px-5 py-3 text-sm">{user.constituency}</td>

                  <td className="px-5 py-3 text-sm">{user.ward}</td>

                  <td className="px-5 py-3">
                    <span className={`badge-${user.status}`}>
                      {user.status}
                    </span>
                  </td>

                  <td className="px-5 py-3 text-sm text-muted-foreground">
                    {user.joined}
                  </td>

                  <td className="px-5 py-3 text-sm font-medium">
                    {user.followers}
                  </td>

                  <td className="px-5 py-3 text-sm font-medium">
                    {user.following}
                  </td>

                  <td className="px-5 py-3 text-right">
                    <button
                      className="p-1.5 rounded-lg hover:bg-secondary"
                      onClick={() => {
                        setSelectedUser(user);
                        setOpenAction(true);
                      }}
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* 📄 FOOTER */}
        <div className="flex items-center justify-between px-5 py-3 border-t">
          <p className="text-xs text-muted-foreground">
            Showing {filtered.length} of {users.length} users
          </p>

          <div className="flex items-center gap-1">
            <button className="p-1.5 rounded-lg hover:bg-secondary">
              <ChevronLeft className="h-4 w-4" />
            </button>

            <span className="text-xs px-3 py-1 bg-primary text-white rounded-md">
              1
            </span>

            <button className="p-1.5 rounded-lg hover:bg-secondary">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
      <Dialog open={openAction} onOpenChange={setOpenAction}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>User actions</DialogTitle>
            <DialogDescription>{selectedUser?.name}</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2 pt-2">
            <Button
              variant="outline"
              className="justify-start gap-2"
              onClick={() => {
                alert(`Warning sent to ${selectedUser?.name}`);
                setOpenAction(false);
              }}
            >
              <AlertTriangle className="h-4 w-4 text-warning" />
              Warn user
            </Button>
            <Button
              variant="outline"
              className="justify-start gap-2"
              onClick={() => {
                alert(`User removed: ${selectedUser?.name}`);
                setOpenAction(false);
              }}
            >
              <Trash2 className="h-4 w-4" />
              Remove user
            </Button>
            <Button
              variant="destructive"
              className="justify-start gap-2"
              onClick={() => {
                alert(`User permanently deleted: ${selectedUser?.name}`);
                setOpenAction(false);
              }}
            >
              <Flame className="h-4 w-4" />
              Delete permanently
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}


