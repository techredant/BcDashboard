"use client";

import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { ShoppingBag, TrendingUp, Package, DollarSign } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { API_BASE_URL } from "@/lib/api";
import { PageHeader } from "@/components/PageHeader";
import { PageLoading } from "@/components/PageLoading";
import { StatCard } from "@/components/StatCard";
import { LevelTabs } from "@/components/LevelTabs";
import { ChartCard } from "@/components/ChartCard";
import { EmptyState } from "@/components/EmptyState";

type Product = {
  _id: string;
  title: string;
  price: number;
  category: string;
  levelType?: "national" | "county" | "constituency" | "ward";
  levelValue?: string;
};

const levelOptions = [
  { key: "all", label: "All" },
  { key: "national", label: "National" },
  { key: "county", label: "County" },
  { key: "constituency", label: "Constituency" },
  { key: "ward", label: "Ward" },
];

export default function MarketsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [levelFilter, setLevelFilter] = useState("all");

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const res = await axios.get(`${API_BASE_URL}/api/products`);
        setProducts(res.data || []);
      } catch {
        setProducts([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filteredProducts = useMemo(() => {
    if (levelFilter === "all") return products;
    return products.filter((p) => p.levelType === levelFilter);
  }, [products, levelFilter]);

  const chartData = useMemo(() => {
    const byCategory: Record<string, number> = {};
    filteredProducts.forEach((p) => {
      const cat = p.category || "Other";
      byCategory[cat] = (byCategory[cat] || 0) + 1;
    });
    return Object.entries(byCategory)
      .map(([name, value]) => ({ name, value }))
      .slice(0, 8);
  }, [filteredProducts]);

  const totalValue = filteredProducts.reduce((a, b) => a + (b.price || 0), 0);
  const categories = new Set(filteredProducts.map((p) => p.category)).size;

  if (loading) {
    return <PageLoading title="Loading marketplace…" />;
  }

  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader
        title="Markets"
        description="Monitor marketplace listings across all IEBC levels"
      />

      <LevelTabs
        options={levelOptions}
        value={levelFilter}
        onChange={setLevelFilter}
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Listings"
          value={filteredProducts.length}
          icon={ShoppingBag}
          change="Active products"
          changeType="neutral"
        />
        <StatCard
          title="Categories"
          value={categories}
          icon={Package}
          accent="info"
          change="Product types"
          changeType="neutral"
        />
        <StatCard
          title="Total value"
          value={`KES ${totalValue.toLocaleString()}`}
          icon={DollarSign}
          accent="success"
          change="Combined listing prices"
          changeType="neutral"
        />
        <StatCard
          title="Activity"
          value="Live"
          icon={TrendingUp}
          accent="warning"
          change="Marketplace status"
          changeType="positive"
        />
      </div>

      {chartData.length > 0 && (
        <ChartCard title="Listings by category" description="Top product categories">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                }}
              />
              <Bar dataKey="value" fill="hsl(var(--chart-2))" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      )}

      <div className="data-table-wrap">
        {filteredProducts.length === 0 ? (
          <EmptyState
            icon={<ShoppingBag className="h-5 w-5 text-muted-foreground" />}
            title="No listings"
            subtitle="Products will appear here when sellers post on the mobile app"
          />
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Product</th>
                <th>Category</th>
                <th>Level</th>
                <th>Price</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.map((p) => (
                <tr key={p._id}>
                  <td className="font-medium">{p.title}</td>
                  <td className="text-muted-foreground">{p.category}</td>
                  <td>
                    <span className={`badge-${p.levelType || "national"}`}>
                      {p.levelType || "general"}
                    </span>
                  </td>
                  <td className="font-semibold">
                    KES {p.price?.toLocaleString()}
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


