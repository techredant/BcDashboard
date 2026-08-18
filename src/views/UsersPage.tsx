"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import axios from "axios";
import { MoreHorizontal, ChevronLeft, ChevronRight, AlertTriangle, Trash2, Flame, Globe } from "lucide-react";
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

type DashboardUser = {
  id: string;
  name: string;
  email: string;
  country: string;
  county: string;
  constituency: string;
  ward: string;
  status: "verified" | "unverified";
  joined: string;
  followers: number;
  following: number;
};

function normalizeCountry(value: string | null | undefined): string {
  const trimmed = String(value || "").trim();
  return trimmed.length > 0 ? trimmed : "Unknown";
}

export default function UsersPage() {
  const [users, setUsers] = useState<DashboardUser[]>([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [countryFilter, setCountryFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<DashboardUser | null>(null);
  const [openAction, setOpenAction] = useState(false);

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);

      const res = await axios.get(`${API_BASE_URL}/api/users`);
      const rawUsers = res.data.users || res.data;

      const formatted: DashboardUser[] = rawUsers.map((u: any) => ({
        id: u._id || u.id,
        name:
          u.nickName ||
          `${u.firstName || ""} ${u.lastName || ""}`.trim() ||
          "No Name",
        email: u.email || "No Email",
        country: normalizeCountry(u.country),
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

  const countries = useMemo(() => {
    const counts = new Map<string, number>();
    users.forEach((u) => {
      counts.set(u.country, (counts.get(u.country) || 0) + 1);
    });
    return Array.from(counts.entries())
      .map(([country, count]) => ({ country, count }))
      .sort((a, b) => b.count - a.count || a.country.localeCompare(b.country));
  }, [users]);

  const filtered = users.filter((u) => {
    const matchSearch =
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      u.country.toLowerCase().includes(search.toLowerCase());

    const matchFilter = filter === "all" || u.status === filter;
    const matchCountry =
      countryFilter === "all" || u.country === countryFilter;

    return matchSearch && matchFilter && matchCountry;
  });

  const groupedByCountry = useMemo(() => {
    const groups = new Map<string, DashboardUser[]>();
    filtered.forEach((user) => {
      const list = groups.get(user.country) || [];
      list.push(user);
      groups.set(user.country, list);
    });
    return Array.from(groups.entries())
      .map(([country, list]) => ({
        country,
        users: list.sort((a, b) => a.name.localeCompare(b.name)),
      }))
      .sort((a, b) => b.users.length - a.users.length || a.country.localeCompare(b.country));
  }, [filtered]);

  if (loading) {
    return <PageLoading title="Loading users…" />;
  }

  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader
        title="User Management"
        description="Browse users by country across mobile and desktop"
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search by name, email, or country…"
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

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setCountryFilter("all")}
          className={`filter-pill ${countryFilter === "all" ? "filter-pill-active" : ""}`}
        >
          All countries ({users.length})
        </button>
        {countries.map(({ country, count }) => (
          <button
            key={country}
            type="button"
            onClick={() => setCountryFilter(country)}
            className={`filter-pill ${countryFilter === country ? "filter-pill-active" : ""}`}
          >
            {country} ({count})
          </button>
        ))}
      </div>

      <div className="space-y-6">
        {groupedByCountry.length === 0 ? (
          <div className="data-table-wrap px-5 py-10 text-center text-muted-foreground">
            No users found
          </div>
        ) : (
          groupedByCountry.map(({ country, users: countryUsers }) => (
            <div key={country} className="data-table-wrap">
              <div className="flex items-center justify-between border-b px-5 py-3">
                <div className="flex items-center gap-2">
                  <Globe className="h-4 w-4 text-primary" />
                  <h3 className="text-sm font-semibold">{country}</h3>
                </div>
                <span className="text-xs text-muted-foreground">
                  {countryUsers.length} user{countryUsers.length === 1 ? "" : "s"}
                </span>
              </div>

              <table className="data-table">
                <thead>
                  <tr>
                    <th>Country</th>
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
                  {countryUsers.map((user) => (
                    <tr
                      key={user.id}
                      className="border-b last:border-0 hover:bg-secondary/30"
                    >
                      <td className="px-5 py-3 text-sm font-medium">{user.country}</td>
                      <td className="px-5 py-3">
                        <p className="text-sm font-medium">{user.name}</p>
                        <p className="text-xs text-muted-foreground">{user.email}</p>
                      </td>
                      <td className="px-5 py-3 text-sm">{user.county}</td>
                      <td className="px-5 py-3 text-sm">{user.constituency}</td>
                      <td className="px-5 py-3 text-sm">{user.ward}</td>
                      <td className="px-5 py-3">
                        <span className={`badge-${user.status}`}>{user.status}</span>
                      </td>
                      <td className="px-5 py-3 text-sm text-muted-foreground">
                        {user.joined}
                      </td>
                      <td className="px-5 py-3 text-sm font-medium">{user.followers}</td>
                      <td className="px-5 py-3 text-sm font-medium">{user.following}</td>
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
                  ))}
                </tbody>
              </table>
            </div>
          ))
        )}
      </div>

      <div className="flex items-center justify-between rounded-lg border px-5 py-3">
        <p className="text-xs text-muted-foreground">
          Showing {filtered.length} of {users.length} users across {groupedByCountry.length}{" "}
          {groupedByCountry.length === 1 ? "country" : "countries"}
        </p>
        <div className="flex items-center gap-1">
          <button className="p-1.5 rounded-lg hover:bg-secondary" type="button">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-xs px-3 py-1 bg-primary text-white rounded-md">1</span>
          <button className="p-1.5 rounded-lg hover:bg-secondary" type="button">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <Dialog open={openAction} onOpenChange={setOpenAction}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>User actions</DialogTitle>
            <DialogDescription>
              {selectedUser?.name}
              {selectedUser?.country ? ` · ${selectedUser.country}` : ""}
            </DialogDescription>
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
