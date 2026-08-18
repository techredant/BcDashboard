"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import {
  MoreHorizontal,
  ShieldAlert,
  Globe,
  Building,
  Map,
  MapPin,
} from "lucide-react";
import { API_BASE_URL } from "@/lib/api";
import { PageHeader } from "@/components/PageHeader";
import { PageLoading } from "@/components/PageLoading";
import { SearchInput } from "@/components/SearchInput";
import { LevelTabs } from "@/components/LevelTabs";
import { EmptyState } from "@/components/EmptyState";
import { Badge } from "@/components/ui/badge";

type Post = {
  _id: string;
  content: string;
  levelType: "national" | "county" | "constituency" | "ward";
  county?: string;
  constituency?: string;
  ward?: string;
  createdAt: string;
  user?: { name?: string; email?: string };
};

type Report = {
  _id: string;
  reason: string;
  post: Post;
};

const levelBadge: Record<string, string> = {
  national: "badge-national",
  county: "badge-county",
  constituency: "badge-constituency",
  ward: "badge-ward",
};

const levels = [
  { key: "all", label: "All", icon: Globe },
  { key: "national", label: "National", icon: Globe },
  { key: "county", label: "County", icon: Building },
  { key: "constituency", label: "Constituency", icon: Map },
  { key: "ward", label: "Ward", icon: MapPin },
];

export default function FeedsPage() {
  const [tab, setTab] = useState<"all" | "reports">("all");
  const [posts, setPosts] = useState<Post[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [search, setSearch] = useState("");
  const [level, setLevel] = useState("all");
  const [loading, setLoading] = useState(true);

  const fetchPosts = useCallback(async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/posts`);
      setPosts(res.data || []);
    } catch {
      setPosts([]);
    }
  }, []);

  const fetchReports = useCallback(async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/reports`);
      setReports(res.data.reports || []);
    } catch {
      setReports([]);
    }
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      await Promise.all([fetchPosts(), fetchReports()]);
      setLoading(false);
    })();
  }, [fetchPosts, fetchReports]);

  const filteredPosts = useMemo(() => {
    return posts
      .filter((p) => level === "all" || p.levelType === level)
      .filter((p) =>
        p.content?.toLowerCase().includes(search.toLowerCase()),
      );
  }, [posts, level, search]);

  const filteredReports = useMemo(() => {
    return reports.filter((r) =>
      r.post?.content?.toLowerCase().includes(search.toLowerCase()),
    );
  }, [reports, search]);

  if (loading) {
    return <PageLoading title="Loading feed moderation…" />;
  }

  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader
        title="Feed Moderation"
        description="Review and manage posts across all IEBC levels"
      />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="filter-pills">
          <button
            type="button"
            onClick={() => setTab("all")}
            className={`filter-pill ${tab === "all" ? "filter-pill-active" : ""}`}
          >
            All posts
          </button>
          <button
            type="button"
            onClick={() => setTab("reports")}
            className={`filter-pill flex items-center gap-1.5 ${tab === "reports" ? "filter-pill-active" : ""}`}
          >
            <ShieldAlert className="h-3.5 w-3.5" />
            Reported
            <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px]">
              {reports.length}
            </Badge>
          </button>
        </div>

        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search posts…"
          className="w-full sm:max-w-sm"
        />
      </div>

      {tab === "all" && (
        <LevelTabs options={levels} value={level} onChange={setLevel} />
      )}

      <div className="data-table-wrap">
        {tab === "all" ? (
          filteredPosts.length === 0 ? (
            <EmptyState
              icon={<Globe className="h-5 w-5 text-muted-foreground" />}
              title="No posts found"
              subtitle="Try adjusting your search or level filter"
            />
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Content</th>
                  <th>Level</th>
                  <th>Author</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredPosts.map((p) => (
                  <tr key={p._id}>
                    <td className="max-w-md">
                      <p className="line-clamp-2 font-medium">{p.content}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {new Date(p.createdAt).toLocaleDateString()}
                      </p>
                    </td>
                    <td>
                      <span className={levelBadge[p.levelType] || "badge-national"}>
                        {p.levelType}
                      </span>
                    </td>
                    <td className="text-muted-foreground">
                      {p.user?.name || "Unknown"}
                    </td>
                    <td className="text-right">
                      <button
                        type="button"
                        className="rounded-lg p-1.5 hover:bg-muted"
                        aria-label="Post actions"
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )
        ) : filteredReports.length === 0 ? (
          <EmptyState
            icon={<ShieldAlert className="h-5 w-5 text-destructive" />}
            title="No reported posts"
            subtitle="User reports will appear here for review"
          />
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Post</th>
                <th>Reason</th>
                <th className="text-right">Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredReports.map((r) => (
                <tr key={r._id}>
                  <td className="max-w-lg">
                    <p className="line-clamp-2 font-medium">{r.post?.content}</p>
                  </td>
                  <td>
                    <span className="text-sm text-destructive">{r.reason}</span>
                  </td>
                  <td className="text-right">
                    <Badge variant="outline">Pending review</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
