"use client";

import { useCallback, useEffect, useState } from "react";
import axios from "axios";
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
} from "lucide-react";
import { StatCard } from "@/components/StatCard";
import { PageHeader } from "@/components/PageHeader";
import { PageLoading } from "@/components/PageLoading";
import { ChartCard } from "@/components/ChartCard";
import { API_BASE_URL } from "@/lib/api";
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

export default function Overview() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchDashboard = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      else setRefreshing(true);
      const res = await axios.get(`${API_BASE_URL}/api/dashboard/overview`);
      setData(res.data);
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
        subtitle="Check your API connection and try again."
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
        description="Monitor BroadCast mobile and desktop activity across the platform"
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

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <ChartCard
          title="User Growth"
          description="Login activity over time"
          className="lg:col-span-2"
        >
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={data.logins}>
              <defs>
                <linearGradient id="userGrowth" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} className="text-muted-foreground" />
              <YAxis tick={{ fontSize: 12 }} className="text-muted-foreground" />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                  fontSize: "13px",
                }}
              />
              <Area
                type="monotone"
                dataKey="logins"
                stroke="hsl(var(--primary))"
                fill="url(#userGrowth)"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Verification Mix" description="Account status breakdown">
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie
                data={data.segments}
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={85}
                dataKey="value"
                paddingAngle={3}
              >
                {data.segments.map((_: unknown, i: number) => (
                  <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <ChartCard
          title="Users by Level"
          description="Distribution across IEBC levels"
          className="lg:col-span-2"
        >
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={data.levels}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="level" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                }}
              />
              <Bar
                dataKey="users"
                fill="hsl(var(--chart-2))"
                radius={[6, 6, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Recent Activity" description="Latest mobile + desktop events">
          <div className="max-h-[280px] space-y-1 overflow-y-auto pr-1">
            {data.activity?.length ? (
              data.activity.map((item: any, i: number) => (
                <div
                  key={i}
                  className="flex items-start justify-between gap-3 rounded-lg border border-transparent px-2 py-2.5 transition-colors hover:border-border hover:bg-muted/40"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{item.user}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.action} · {item.level}
                      {item.country ? ` · ${item.country}` : ""}
                    </p>
                  </div>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {item.time}
                  </span>
                </div>
              ))
            ) : (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No recent activity
              </p>
            )}
          </div>
        </ChartCard>
      </div>

      <ChartCard title="Platform Activity" description="Active users and devices by platform">
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={data.platformActivity ?? []}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis dataKey="platform" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "8px",
              }}
            />
            <Bar dataKey="users" fill="hsl(var(--chart-1))" radius={[6, 6, 0, 0]} />
            <Bar dataKey="devices" fill="hsl(var(--chart-2))" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="Country Activity" description="Active users by country (mobile + desktop)">
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={data.countryActivity ?? []}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis dataKey="country" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "8px",
              }}
            />
            <Bar dataKey="users" fill="hsl(var(--chart-3))" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>
    </div>
  );
}
