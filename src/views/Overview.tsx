"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Users,
  Landmark,
  ShieldCheck,
  UserX,
  RefreshCw,
  Activity,
  Smartphone,
  Monitor,
  Globe,
  Flag,
  AlertTriangle,
  Ban,
  Scale,
} from "lucide-react";
import { StatCard } from "@/components/StatCard";
import { PageHeader } from "@/components/PageHeader";
import { PageLoading } from "@/components/PageLoading";
import { ChartCard } from "@/components/ChartCard";
import { StatusBadge } from "@/components/StatusBadge";
import { adminGet } from "@/lib/adminClient";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/EmptyState";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from "recharts";

const CHART_COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
];

type OverviewPayload = {
  stats: {
    users: number;
    verified: number;
    unverified: number;
    politicians: number;
    mobileActiveUsers?: number;
    desktopActiveUsers?: number;
    mobileDevices?: number;
    desktopDevices?: number;
  };
  logins?: unknown[];
  accountTypes?: unknown[];
  countries?: unknown[];
  countryActivity?: unknown[];
  [key: string]: unknown;
};

type ModStats = {
  users: {
    total: number;
    active: number;
    suspended: number;
    banned: number;
    deleted: number;
    restricted: number;
    newToday: number;
    newWeek: number;
    newMonth: number;
  };
  moderation: {
    reportedPosts: number;
    reportedComments: number;
    reportedUsers: number;
    pendingModerationCases: number;
    pendingReports: number;
    warningsIssued: number;
    livestreamReports: number;
    contentRemoved: number;
    appealsPending: number;
  };
  recentAdminActions: Array<{
    _id: string;
    adminName?: string;
    action?: string;
    targetType?: string;
    targetId?: string;
    reason?: string;
    createdAt?: string;
  }>;
};

export default function Overview() {
  const [data, setData] = useState<OverviewPayload | null>(null);
  const [mod, setMod] = useState<ModStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchDashboard = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      else setRefreshing(true);
      const [overview, stats] = await Promise.all([
        adminGet<OverviewPayload>("/api/dashboard/overview"),
        adminGet<ModStats>("/api/admin/stats").catch(() => null),
      ]);
      setData(overview);
      setMod(stats);
    } catch (err) {
      console.error("Dashboard fetch error:", err);
      if (!silent) setData(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  if (loading) {
    return <PageLoading title="Loading platform overview…" />;
  }

  if (!data) {
    return (
      <EmptyState
        icon={<Activity className="h-6 w-6 text-muted-foreground" />}
        title="Could not load dashboard"
        subtitle="Check your API connection and staff session."
      />
    );
  }

  const verifiedPct =
    data.stats.users > 0
      ? Math.round((data.stats.verified / data.stats.users) * 100)
      : 0;

  return (
    <div className="animate-fade-in space-y-8">
      <PageHeader
        title="Dashboard Overview"
        description="Monitor BroadCast activity and Trust & Safety health"
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchDashboard(true)}
            disabled={refreshing}
          >
            <RefreshCw
              className={`mr-2 h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>
        }
      />

      {mod ? (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
          <StatCard title="Total users" value={mod.users.total} icon={Users} changeType="neutral" />
          <StatCard title="Active" value={mod.users.active} icon={Users} accent="success" changeType="positive" />
          <StatCard
            title="New today / week / month"
            value={`${mod.users.newToday} / ${mod.users.newWeek} / ${mod.users.newMonth}`}
            icon={Activity}
            changeType="neutral"
          />
          <StatCard title="Suspended" value={mod.users.suspended} icon={AlertTriangle} accent="warning" changeType="neutral" />
          <StatCard title="Banned" value={mod.users.banned} icon={Ban} accent="warning" changeType="neutral" />
          <StatCard title="Deleted" value={mod.users.deleted} icon={UserX} changeType="neutral" />
        </div>
      ) : null}

      {mod ? (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
          <StatCard title="Reported posts" value={mod.moderation.reportedPosts} icon={Flag} changeType="neutral" />
          <StatCard title="Pending reports" value={mod.moderation.pendingReports} icon={Flag} accent="warning" changeType="neutral" />
          <StatCard title="Pending cases" value={mod.moderation.pendingModerationCases} icon={ShieldCheck} accent="warning" changeType="neutral" />
          <StatCard title="Warnings" value={mod.moderation.warningsIssued} icon={AlertTriangle} changeType="neutral" />
          <StatCard title="Appeals" value={mod.moderation.appealsPending} icon={Scale} changeType="neutral" />
          <StatCard title="Content removed" value={mod.moderation.contentRemoved} icon={Ban} changeType="neutral" />
          <StatCard title="Livestream reports" value={mod.moderation.livestreamReports} icon={Flag} changeType="neutral" />
          <StatCard title="Reported users" value={mod.moderation.reportedUsers} icon={Users} changeType="neutral" />
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Users"
          value={data.stats.users}
          icon={Users}
          change="Registered accounts"
          changeType="neutral"
        />
        <StatCard
          title="Verified"
          value={data.stats.verified}
          icon={ShieldCheck}
          accent="success"
          change={`${verifiedPct}% of users`}
          changeType="positive"
        />
        <StatCard
          title="Unverified"
          value={data.stats.unverified}
          icon={UserX}
          accent="warning"
          change="Pending verification"
          changeType="neutral"
        />
        <StatCard
          title="Politicians"
          value={data.stats.politicians}
          icon={Landmark}
          accent="info"
          change="Public leader profiles"
          changeType="neutral"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <StatCard
          title="Mobile Active Users"
          value={data.stats.mobileActiveUsers ?? 0}
          icon={Smartphone}
          accent="info"
          change={`${data.stats.mobileDevices ?? 0} active mobile devices`}
          changeType="neutral"
        />
        <StatCard
          title="Desktop Active Users"
          value={data.stats.desktopActiveUsers ?? 0}
          icon={Monitor}
          accent="info"
          change={`${data.stats.desktopDevices ?? 0} active desktop devices`}
          changeType="neutral"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-1">
        <StatCard
          title="Countries Active"
          value={(data.countryActivity ?? []).length}
          icon={Globe}
          accent="info"
          change="Countries with active sessions"
          changeType="neutral"
        />
      </div>

      {mod?.recentAdminActions?.length ? (
        <div className="rounded-lg border border-border">
          <div className="border-b border-border px-4 py-3">
            <h3 className="font-display text-sm font-semibold">Recent admin actions</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs uppercase text-muted-foreground">
                  <th className="px-4 py-2">When</th>
                  <th className="px-4 py-2">Admin</th>
                  <th className="px-4 py-2">Action</th>
                  <th className="px-4 py-2">Target</th>
                  <th className="px-4 py-2">Reason</th>
                </tr>
              </thead>
              <tbody>
                {mod.recentAdminActions.map((a) => (
                  <tr key={a._id} className="border-b border-border/50">
                    <td className="px-4 py-2 text-muted-foreground">
                      {a.createdAt ? new Date(a.createdAt).toLocaleString() : "—"}
                    </td>
                    <td className="px-4 py-2">{a.adminName || "—"}</td>
                    <td className="px-4 py-2">
                      <StatusBadge status={a.action || "info"} />
                    </td>
                    <td className="px-4 py-2 text-xs text-muted-foreground">
                      {a.targetType}/{a.targetId}
                    </td>
                    <td className="px-4 py-2 text-muted-foreground">{a.reason || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <ChartCard
          title="User Growth"
          description="Login activity over time"
          className="lg:col-span-2"
        >
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={(data.logins as object[]) || []}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Area
                type="monotone"
                dataKey="count"
                stroke="hsl(var(--chart-1))"
                fill="hsl(var(--chart-1))"
                fillOpacity={0.2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Account types" description="Distribution">
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie
                data={(data.accountTypes as { name: string; value: number }[]) || []}
                dataKey="value"
                nameKey="name"
                outerRadius={90}
                label
              >
                {((data.accountTypes as unknown[]) || []).map((_, i) => (
                  <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {(data.countries as unknown[])?.length ? (
        <ChartCard title="Users by country" description="Top locations">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={(data.countries as object[]) || []}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="country" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="count" fill="hsl(var(--chart-2))" radius={4} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      ) : null}
    </div>
  );
}
