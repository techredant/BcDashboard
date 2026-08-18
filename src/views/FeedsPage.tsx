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
  Play,
} from "lucide-react";
import { API_BASE_URL, ADMIN_API_KEY, adminHeaders } from "@/lib/api";
import { PageHeader } from "@/components/PageHeader";
import { PageLoading } from "@/components/PageLoading";
import { SearchInput } from "@/components/SearchInput";
import { LevelTabs } from "@/components/LevelTabs";
import { EmptyState } from "@/components/EmptyState";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ReportDetailDialog,
  type ModerationReport,
} from "@/views/ReportDetailDialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Post = {
  _id: string;
  content: string;
  media?: string[];
  levelType: "national" | "county" | "constituency" | "ward";
  levelValue?: string;
  country: string;
  county?: string;
  constituency?: string;
  ward?: string;
  createdAt: string;
  user?: { name?: string; email?: string };
};

type Report = ModerationReport;

type KenyaRegion = {
  name: string;
  constituencies: { name: string; wards: string[] }[];
};

type FeedsResponse = {
  posts: Post[];
  countries: { country: string; count: number }[];
  kenyaRegions: KenyaRegion[];
};

const levelBadge: Record<string, string> = {
  national: "badge-national",
  county: "badge-county",
  constituency: "badge-constituency",
  ward: "badge-ward",
};

const levels = [
  { key: "all", label: "All levels", icon: Globe },
  { key: "national", label: "National", icon: Globe },
  { key: "county", label: "County", icon: Building },
  { key: "constituency", label: "Constituency", icon: Map },
  { key: "ward", label: "Ward", icon: MapPin },
];

function isKenya(country: string) {
  return country.trim().toLowerCase() === "kenya";
}

function isVideoUrl(url: string) {
  const path = url.split("?")[0].toLowerCase();
  return (
    path.endsWith(".mp4") ||
    path.endsWith(".mov") ||
    path.endsWith(".webm") ||
    path.includes("/original.mp4")
  );
}

function mediaThumbUrl(url: string) {
  if (!isVideoUrl(url)) return url;
  return url.replace(/\/original\.(mp4|mov|webm)$/i, "/poster.jpg");
}

function PostMedia({
  media,
  onOpen,
}: {
  media: string[];
  onOpen: (index: number) => void;
}) {
  if (!media.length) return null;
  const extra = media.length - 3;

  return (
    <div className="mt-2 flex gap-1.5">
      {media.slice(0, 3).map((url, index) => {
        const video = isVideoUrl(url);
        return (
          <button
            key={`${url}-${index}`}
            type="button"
            onClick={() => onOpen(index)}
            className="relative h-16 w-16 overflow-hidden rounded-md border bg-muted"
            aria-label={video ? "Open video" : "Open image"}
          >
            <img
              src={mediaThumbUrl(url)}
              alt=""
              className="h-full w-full object-cover"
            />
            {video ? (
              <span className="absolute inset-0 flex items-center justify-center bg-black/35">
                <Play className="h-4 w-4 fill-white text-white" />
              </span>
            ) : null}
            {index === 2 && extra > 0 ? (
              <span className="absolute inset-0 flex items-center justify-center bg-black/50 text-xs font-semibold text-white">
                +{extra}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

export default function FeedsPage() {
  const [tab, setTab] = useState<"all" | "reports">("all");
  const [posts, setPosts] = useState<Post[]>([]);
  const [countries, setCountries] = useState<{ country: string; count: number }[]>([]);
  const [kenyaRegions, setKenyaRegions] = useState<KenyaRegion[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [reportStatusFilter, setReportStatusFilter] = useState("all");
  const [deletedAccountsOnly, setDeletedAccountsOnly] = useState(false);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [reportsError, setReportsError] = useState("");
  const [search, setSearch] = useState("");
  const [countryFilter, setCountryFilter] = useState("all");
  const [level, setLevel] = useState("all");
  const [countyFilter, setCountyFilter] = useState("all");
  const [constituencyFilter, setConstituencyFilter] = useState("all");
  const [wardFilter, setWardFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [preview, setPreview] = useState<{ media: string[]; index: number } | null>(null);
  const previewItem = preview?.media[preview.index] || "";

  const resetDepartments = () => {
    setCountyFilter("all");
    setConstituencyFilter("all");
    setWardFilter("all");
  };

  const fetchPosts = useCallback(async () => {
    try {
      const res = await axios.get<FeedsResponse>(`${API_BASE_URL}/api/dashboard/feeds`, {
        params: { limit: 300 },
      });
      setPosts(res.data.posts || []);
      setCountries(res.data.countries || []);
      setKenyaRegions(res.data.kenyaRegions || []);
    } catch {
      setPosts([]);
      setCountries([]);
      setKenyaRegions([]);
    }
  }, []);

  const fetchReports = useCallback(async () => {
    try {
      setReportsError("");
      const res = await axios.get(`${API_BASE_URL}/api/reports`, {
        headers: adminHeaders,
        params: {
          limit: 50,
          status: reportStatusFilter === "all" ? undefined : reportStatusFilter,
          accountDeleted: deletedAccountsOnly ? "true" : undefined,
        },
      });
      setReports(res.data.reports || []);
    } catch (err: any) {
      setReports([]);
      setReportsError(
        err?.response?.status === 401
          ? "Set NEXT_PUBLIC_ADMIN_API_KEY to load reports."
          : "Could not load reports.",
      );
    }
  }, [reportStatusFilter, deletedAccountsOnly]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      await fetchPosts();
      setLoading(false);
    })();
  }, [fetchPosts]);

  useEffect(() => {
    void fetchReports();
  }, [fetchReports]);

  const countryPosts = useMemo(() => {
    if (countryFilter === "all") return posts;
    return posts.filter((p) => p.country === countryFilter);
  }, [posts, countryFilter]);

  const kenyaCounties = useMemo(
    () => kenyaRegions.map((c) => c.name).sort((a, b) => a.localeCompare(b)),
    [kenyaRegions],
  );

  const dynamicCounties = useMemo(() => {
    const values = countryPosts
      .map((p) => p.county)
      .filter(Boolean) as string[];
    return [...new Set(values)].sort((a, b) => a.localeCompare(b));
  }, [countryPosts]);

  const counties = useMemo(() => {
    if (countryFilter !== "all" && isKenya(countryFilter)) return kenyaCounties;
    return dynamicCounties;
  }, [countryFilter, kenyaCounties, dynamicCounties]);

  const constituencies = useMemo(() => {
    if (countryFilter !== "all" && isKenya(countryFilter)) {
      if (countyFilter === "all") {
        return kenyaRegions.flatMap((c) => c.constituencies.map((x) => x.name));
      }
      const county = kenyaRegions.find((c) => c.name === countyFilter);
      return (county?.constituencies || []).map((c) => c.name);
    }
    return [
      ...new Set(
        countryPosts
          .filter((p) => countyFilter === "all" || p.county === countyFilter)
          .map((p) => p.constituency)
          .filter(Boolean) as string[],
      ),
    ].sort((a, b) => a.localeCompare(b));
  }, [countryFilter, countryPosts, countyFilter, kenyaRegions]);

  const wards = useMemo(() => {
    if (countryFilter !== "all" && isKenya(countryFilter)) {
      const county = kenyaRegions.find((c) => c.name === countyFilter);
      if (!county) {
        return kenyaRegions.flatMap((c) =>
          c.constituencies.flatMap((x) => x.wards),
        );
      }
      const constituenciesInCounty = county.constituencies || [];
      if (constituencyFilter === "all") {
        return constituenciesInCounty.flatMap((c) => c.wards);
      }
      const constituency = constituenciesInCounty.find(
        (c) => c.name === constituencyFilter,
      );
      return constituency?.wards || [];
    }
    return [
      ...new Set(
        countryPosts
          .filter(
            (p) =>
              (countyFilter === "all" || p.county === countyFilter) &&
              (constituencyFilter === "all" ||
                p.constituency === constituencyFilter),
          )
          .map((p) => p.ward)
          .filter(Boolean) as string[],
      ),
    ].sort((a, b) => a.localeCompare(b));
  }, [
    countryFilter,
    countryPosts,
    countyFilter,
    constituencyFilter,
    kenyaRegions,
  ]);

  const filteredPosts = useMemo(() => {
    return countryPosts
      .filter((p) => level === "all" || p.levelType === level)
      .filter((p) => countyFilter === "all" || p.county === countyFilter)
      .filter(
        (p) =>
          constituencyFilter === "all" || p.constituency === constituencyFilter,
      )
      .filter((p) => wardFilter === "all" || p.ward === wardFilter)
      .filter((p) => {
        const text = (p.content || "").toLowerCase();
        const q = search.toLowerCase();
        return (
          text.includes(q) ||
          p.country.toLowerCase().includes(q) ||
          (p.county || "").toLowerCase().includes(q) ||
          (p.constituency || "").toLowerCase().includes(q) ||
          (p.ward || "").toLowerCase().includes(q) ||
          (p.user?.name || "").toLowerCase().includes(q)
        );
      });
  }, [
    countryPosts,
    level,
    countyFilter,
    constituencyFilter,
    wardFilter,
    search,
  ]);

  const filteredReports = useMemo(() => {
    const q = search.toLowerCase();
    return reports.filter((r) => {
      const snapName = `${r.reportedUserSnapshot?.displayName || ""} ${r.reportedUserSnapshot?.username || ""}`.toLowerCase();
      const currentName = `${r.currentReportedUser?.displayName || ""} ${r.currentReportedUser?.username || ""}`.toLowerCase();
      const content = (r.postSnapshot?.content || r.post?.content || "").toLowerCase();
      return (
        !q ||
        content.includes(q) ||
        (r.reason || "").toLowerCase().includes(q) ||
        snapName.includes(q) ||
        currentName.includes(q) ||
        (r.reportedUserId || "").toLowerCase().includes(q) ||
        (r.postId || "").toLowerCase().includes(q)
      );
    });
  }, [reports, search]);

  const showDepartmentFilters = level !== "national" && level !== "all";

  if (loading) {
    return <PageLoading title="Loading feed moderation…" />;
  }

  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader
        title="Feed Moderation"
        description="Browse posts by country and local departments"
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
          placeholder="Search posts, country, or department…"
          className="w-full sm:max-w-sm"
        />
      </div>

      <div className="space-y-3">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Country
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => {
              setCountryFilter("all");
              resetDepartments();
            }}
            className={`filter-pill ${countryFilter === "all" ? "filter-pill-active" : ""}`}
          >
            All countries ({posts.length})
          </button>
          {countries.map(({ country, count }) => (
            <button
              key={country}
              type="button"
              onClick={() => {
                setCountryFilter(country);
                resetDepartments();
              }}
              className={`filter-pill ${countryFilter === country ? "filter-pill-active" : ""}`}
            >
              {country} ({count})
            </button>
          ))}
        </div>
      </div>

      {tab === "reports" && (
        <div className="flex flex-wrap items-center gap-2">
          {["all", "pending", "opened", "reviewing", "dismissed", "resolved"].map((status) => (
            <button
              key={status}
              type="button"
              onClick={() => setReportStatusFilter(status)}
              className={`filter-pill ${reportStatusFilter === status ? "filter-pill-active" : ""}`}
            >
              {status}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setDeletedAccountsOnly((value) => !value)}
            className={`filter-pill ${deletedAccountsOnly ? "filter-pill-active" : ""}`}
          >
            Deleted accounts
          </button>
          {!ADMIN_API_KEY ? (
            <span className="text-xs text-destructive">
              Set NEXT_PUBLIC_ADMIN_API_KEY to match ADMIN_API_KEY
            </span>
          ) : null}
        </div>
      )}

      {tab === "all" && (
        <>
          <div className="space-y-3">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Department level
            </p>
            <LevelTabs
              options={levels}
              value={level}
              onChange={(value) => {
                setLevel(value);
                resetDepartments();
              }}
            />
          </div>

          {showDepartmentFilters && (
            <div className="flex flex-wrap gap-2">
              {(level === "county" ||
                level === "constituency" ||
                level === "ward") && (
                <Select
                  value={countyFilter}
                  onValueChange={(v) => {
                    setCountyFilter(v);
                    setConstituencyFilter("all");
                    setWardFilter("all");
                  }}
                >
                  <SelectTrigger className="w-[170px]">
                    <SelectValue placeholder="County" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All counties</SelectItem>
                    {counties.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              {(level === "constituency" || level === "ward") && (
                <Select
                  value={constituencyFilter}
                  onValueChange={(v) => {
                    setConstituencyFilter(v);
                    setWardFilter("all");
                  }}
                >
                  <SelectTrigger className="w-[190px]">
                    <SelectValue placeholder="Constituency" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All constituencies</SelectItem>
                    {constituencies.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              {level === "ward" && (
                <Select
                  value={wardFilter}
                  onValueChange={setWardFilter}
                >
                  <SelectTrigger className="w-[170px]">
                    <SelectValue placeholder="Ward" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All wards</SelectItem>
                    {wards.map((w) => (
                      <SelectItem key={w} value={w}>
                        {w}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          )}
        </>
      )}

      <div className="data-table-wrap">
        {tab === "all" ? (
          filteredPosts.length === 0 ? (
            <EmptyState
              icon={<Globe className="h-5 w-5 text-muted-foreground" />}
              title="No posts found"
              subtitle="Try another country or department filter"
            />
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Content</th>
                  <th>Country</th>
                  <th>Department</th>
                  <th>Level</th>
                  <th>Author</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredPosts.map((p) => (
                  <tr key={p._id}>
                    <td className="max-w-md">
                      {p.content ? (
                        <p className="line-clamp-2 font-medium">{p.content}</p>
                      ) : !p.media?.length ? (
                        <p className="font-medium">—</p>
                      ) : null}
                      <PostMedia
                        media={p.media || []}
                        onOpen={(index) => setPreview({ media: p.media || [], index })}
                      />
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {new Date(p.createdAt).toLocaleDateString()}
                      </p>
                    </td>
                    <td className="text-sm font-medium">{p.country}</td>
                    <td className="text-sm text-muted-foreground">
                      {p.ward
                        ? `${p.county || "—"} · ${p.constituency || "—"} · ${p.ward}`
                        : p.constituency
                          ? `${p.county || "—"} · ${p.constituency}`
                          : p.county || "National"}
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
        ) : reportsError ? (
          <EmptyState
            icon={<ShieldAlert className="h-5 w-5 text-destructive" />}
            title="Reports unavailable"
            subtitle={reportsError}
          />
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
                <th>Reported identity</th>
                <th>Current identity</th>
                <th>Post</th>
                <th>Reason</th>
                <th>Status</th>
                <th className="text-right">Open</th>
              </tr>
            </thead>
            <tbody>
              {filteredReports.map((r) => (
                <tr key={r.reportId || r._id}>
                  <td className="text-sm">
                    <p className="font-medium">
                      {r.reportedUserSnapshot?.displayName || "Unknown"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {r.reportedUserSnapshot?.username || "—"}
                    </p>
                  </td>
                  <td className="text-sm">
                    {r.accountDeleted ? (
                      <span className="text-destructive">Account unavailable</span>
                    ) : (
                      <>
                        <p className="font-medium">
                          {r.currentReportedUser?.displayName || "Unknown"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {r.currentReportedUser?.username || "—"}
                        </p>
                      </>
                    )}
                  </td>
                  <td className="max-w-sm">
                    <p className="line-clamp-2 font-medium">
                      {r.postSnapshot?.content || r.post?.content || "—"}
                    </p>
                    {r.currentPost?.status === "deleted" ? (
                      <p className="text-xs text-destructive">Post status: Deleted</p>
                    ) : null}
                  </td>
                  <td>
                    <span className="text-sm capitalize text-destructive">{r.reason}</span>
                  </td>
                  <td>
                    <Badge variant="outline" className="capitalize">
                      {r.status}
                    </Badge>
                  </td>
                  <td className="text-right">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={async () => {
                        try {
                          const res = await axios.get(
                            `${API_BASE_URL}/api/reports/${r.reportId || r._id}`,
                            { headers: adminHeaders },
                          );
                          const detail = res.data.report || r;
                          setSelectedReport(detail);
                          if (detail.status === "pending") {
                            const opened = await axios.patch(
                              `${API_BASE_URL}/api/reports/${detail.reportId}`,
                              { action: "report_opened" },
                              { headers: adminHeaders },
                            );
                            if (opened.data?.report) {
                              setSelectedReport(opened.data.report);
                              setReports((prev) =>
                                prev.map((item) =>
                                  item.reportId === opened.data.report.reportId
                                    ? opened.data.report
                                    : item,
                                ),
                              );
                            }
                          }
                        } catch {
                          setSelectedReport(r);
                        }
                      }}
                    >
                      Review
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {tab === "all" && (
        <p className="text-xs text-muted-foreground">
          Showing {filteredPosts.length} of {countryPosts.length} posts
          {countryFilter !== "all" ? ` in ${countryFilter}` : ""}
        </p>
      )}

      <Dialog open={!!preview} onOpenChange={(open) => !open && setPreview(null)}>
        <DialogContent className="max-w-3xl overflow-hidden p-0">
          <DialogHeader className="px-5 pt-4">
            <DialogTitle>Post media</DialogTitle>
          </DialogHeader>
          {previewItem ? (
            <div className="bg-black">
              {isVideoUrl(previewItem) ? (
                <video
                  src={previewItem}
                  controls
                  autoPlay
                  className="max-h-[70vh] w-full object-contain"
                />
              ) : (
                <img
                  src={previewItem}
                  alt=""
                  className="max-h-[70vh] w-full object-contain"
                />
              )}
            </div>
          ) : null}
          {preview && preview.media.length > 1 ? (
            <div className="flex gap-2 overflow-x-auto px-5 pb-4">
              {preview.media.map((url, index) => (
                <button
                  key={`${url}-${index}`}
                  type="button"
                  onClick={() => setPreview({ ...preview, index })}
                  className={`relative h-14 w-14 shrink-0 overflow-hidden rounded-md border ${
                    preview.index === index ? "ring-2 ring-primary" : ""
                  }`}
                >
                  <img
                    src={mediaThumbUrl(url)}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                </button>
              ))}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <ReportDetailDialog
        report={selectedReport}
        open={!!selectedReport}
        onOpenChange={(open) => {
          if (!open) setSelectedReport(null);
        }}
        onUpdated={(updated) => {
          setSelectedReport(updated);
          setReports((prev) =>
            prev.map((item) =>
              item.reportId === updated.reportId ? updated : item,
            ),
          );
        }}
      />
    </div>
  );
}
