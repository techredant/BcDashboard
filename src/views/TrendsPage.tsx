"use client";

import { useEffect, useState, useMemo } from "react";
import axios from "axios";
import { TrendingUp, TrendingDown, Hash, MessageCircle } from "lucide-react";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

import { API_BASE_URL } from "@/lib/api";
import { PageHeader } from "@/components/PageHeader";
import { PageLoading } from "@/components/PageLoading";
import { LevelTabs } from "@/components/LevelTabs";
import { ChartCard } from "@/components/ChartCard";

const LEVELS = ["national", "county", "constituency", "ward"];

const POLITICAL_KEYWORDS = [
  "ruto",
  "president",
  "raila",
  "iebc",
  "parliament",
  "senate",
  "mp",
  "governor",
  "finance bill",
  "budget",
  "cabinet",
  "election",
  "votes",
  "cs",
];

type Post = {
  id: string;
  content?: string;
  caption?: string;
  county?: string;
  constituency?: string;
  ward?: string;
};

type Trend = {
  id: string;
  tag: string;
  mentions: number;
  sentiment: "positive" | "negative" | "mixed";
  trend: "up" | "down";
};

export default function TrendsPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  // 🔥 LEVEL STATE
  const [level, setLevel] = useState("national");
  const [locationValue, setLocationValue] = useState("all");

  // ---------------- FETCH POSTS ----------------
  const fetchPosts = async () => {
    try {
      setLoading(true);

      const res = await axios.get(`${API_BASE_URL}/api/posts`);

      setPosts(res.data || []);
    } catch (err) {
      console.log("Error fetching posts:", err);
      setPosts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, []);

  // ---------------- FILTER POSTS BY LEVEL ----------------
  const filteredPosts = useMemo(() => {
    return posts.filter((post) => {
      if (level === "national") return true;

      if (level === "county") {
        return locationValue === "all" ? true : post.county === locationValue;
      }

      if (level === "constituency") {
        return locationValue === "all"
          ? true
          : post.constituency === locationValue;
      }

      if (level === "ward") {
        return locationValue === "all" ? true : post.ward === locationValue;
      }

      return true;
    });
  }, [posts, level, locationValue]);

  // ---------------- EXTRACT TRENDS (LIKE EXPO) ----------------
  const trends: Trend[] = useMemo(() => {
    const counts: Record<string, number> = {};

    filteredPosts.forEach((post) => {
      const text = (post.caption || post.content || "").toLowerCase();

      // hashtags
      const hashtags = text.match(/#\w+/g) || [];
      hashtags.forEach((tag) => {
        counts[tag] = (counts[tag] || 0) + 2;
      });

      // keywords
      POLITICAL_KEYWORDS.forEach((keyword) => {
        if (text.includes(keyword)) {
          const tag = `#${keyword.replace(/\s/g, "")}`;
          counts[tag] = (counts[tag] || 0) + 1;
        }
      });
    });

    return Object.entries(counts)
      .map(
        ([tag, mentions], i): Trend => ({
          id: String(i),
          tag,
          mentions,
          sentiment:
            mentions > 5000 ? "positive" : mentions > 2000 ? "mixed" : "negative",
          trend: mentions > 3000 ? "up" : "down",
        }),
      )
      .sort((a, b) => b.mentions - a.mentions);
  }, [filteredPosts]);

  // ---------------- CHART DATA ----------------
  const chartData = trends.map((t, i) => ({
    hour: `T${i + 1}`,
    mentions: t.mentions,
  }));

  // ---------------- LOADING ----------------
  if (loading) {
    return <PageLoading title="Loading trends…" />;
  }

  const levelOptions = LEVELS.map((l) => ({ key: l, label: l }));

  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader
        title="Trends"
        description="Live trending topics by political level"
      />

      <div className="flex flex-wrap items-center gap-3">
        <LevelTabs options={levelOptions} value={level} onChange={setLevel} />

        {/* LOCATION FILTER (optional simple input) */}
        {level !== "national" && (
          <input
            placeholder={`Enter ${level}`}
            className="border px-2 py-1 text-xs rounded-md"
            value={locationValue}
            onChange={(e) => setLocationValue(e.target.value)}
          />
        )}
      </div>

      {/* 🔢 STATS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="stat-card flex items-center gap-4">
          <Hash className="text-primary" />
          <div>
            <p className="text-2xl font-bold">{trends.length}</p>
            <p className="text-sm text-muted-foreground">Active Trends</p>
          </div>
        </div>

        <div className="stat-card flex items-center gap-4">
          <MessageCircle className="text-accent" />
          <div>
            <p className="text-2xl font-bold">
              {trends.reduce((a, b) => a + b.mentions, 0)}
            </p>
            <p className="text-sm text-muted-foreground">Total Mentions</p>
          </div>
        </div>

        <div className="stat-card flex items-center gap-4">
          <TrendingUp className="text-success" />
          <div>
            <p className="text-2xl font-bold">Live</p>
            <p className="text-sm text-muted-foreground">Trending Now</p>
          </div>
        </div>
      </div>

      {/* 📈 CHART */}
      <div className="bg-card rounded-xl border p-5 mb-6">
        <h3 className="font-semibold mb-4">Mentions Timeline</h3>

        <ResponsiveContainer width="100%" height={240}>
          <AreaChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="hour" />
            <YAxis />
            <Tooltip />

            <Area
              type="monotone"
              dataKey="mentions"
              strokeWidth={2}
              fillOpacity={0.3}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* 📋 TREND LIST */}
      <div className="bg-card rounded-xl border overflow-hidden">
        <div className="px-5 py-3 border-b">
          <h3 className="font-semibold text-sm">Trending Topics</h3>
        </div>

        {trends.map((t, i) => (
          <div
            key={t.id}
            className="flex items-center justify-between px-5 py-3 border-b hover:bg-secondary/30"
          >
            <div className="flex items-center gap-4">
              <span className="font-bold w-6 text-muted-foreground">
                {i + 1}
              </span>

              <div>
                <p className="text-sm font-semibold">{t.tag}</p>
                <p className="text-xs text-muted-foreground">
                  {t.mentions.toLocaleString()} mentions
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-xs capitalize">{t.sentiment}</span>

              {t.trend === "up" ? (
                <TrendingUp className="text-green-500 h-4 w-4" />
              ) : (
                <TrendingDown className="text-red-500 h-4 w-4" />
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
