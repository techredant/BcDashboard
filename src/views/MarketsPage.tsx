"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ShoppingBag, Package, DollarSign, Flag } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { PageLoading } from "@/components/PageLoading";
import { StatCard } from "@/components/StatCard";
import { EmptyState } from "@/components/EmptyState";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { adminGet } from "@/lib/adminClient";
import { toast } from "sonner";
import { MediaThumb } from "@/components/MediaThumb";
import {
  ContentModerationActions,
  isContentBlocked,
} from "@/components/ContentModerationActions";

type Product = {
  _id: string;
  title?: string;
  description?: string;
  price?: number;
  currency?: string;
  category?: string;
  userId?: string;
  status?: string;
  media?: string[];
  createdAt?: string;
  moderationState?: string;
  listingStatus?: string;
  aiModeration?: { status?: string };
  location?: { county?: string; city?: string };
};

export default function MarketsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [statusFilter, setStatusFilter] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams({
        type: "market",
        page: String(page),
        limit: "30",
      });
      if (statusFilter) qs.set("status", statusFilter);
      const data = await adminGet<{ items?: Product[]; total?: number }>(
        `/api/admin/content?${qs.toString()}`,
      );
      setProducts(data.items || []);
      setTotal(data.total || 0);
    } catch {
      setProducts([]);
      toast.error("Failed to load marketplace listings");
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    setPage(1);
  }, [statusFilter]);

  const totalValue = useMemo(
    () => products.reduce((sum, p) => sum + (Number(p.price) || 0), 0),
    [products],
  );
  const categories = useMemo(
    () => new Set(products.map((p) => p.category).filter(Boolean)).size,
    [products],
  );
  const flagged = useMemo(
    () =>
      products.filter((p) =>
        isContentBlocked(p.status || p.moderationState, p.aiModeration?.status),
      ).length,
    [products],
  );

  if (loading && products.length === 0) {
    return <PageLoading title="Loading marketplace…" />;
  }

  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader
        title="Markets"
        description="Review and moderate marketplace listings"
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Listings"
          value={total}
          icon={ShoppingBag}
          change="In marketplace"
          changeType="neutral"
        />
        <StatCard
          title="On this page"
          value={products.length}
          icon={Package}
          accent="info"
          change={`${categories} categories`}
          changeType="neutral"
        />
        <StatCard
          title="Page value"
          value={`KES ${totalValue.toLocaleString()}`}
          icon={DollarSign}
          accent="success"
          change="Sum of visible prices"
          changeType="neutral"
        />
        <StatCard
          title="Flagged / blocked"
          value={flagged}
          icon={Flag}
          accent="warning"
          change="Need review on this page"
          changeType={flagged ? "negative" : "neutral"}
        />
      </div>

      <div className="flex flex-wrap gap-2">
        {[
          { key: "", label: "All" },
          { key: "warned", label: "Warned" },
          { key: "flagged", label: "Flagged" },
          { key: "hidden", label: "Hidden" },
          { key: "blocked", label: "AI blocked" },
          { key: "removed", label: "Removed" },
        ].map((f) => (
          <Button
            key={f.key || "all"}
            size="sm"
            variant={statusFilter === f.key ? "default" : "outline"}
            onClick={() => setStatusFilter(f.key)}
          >
            {f.label}
          </Button>
        ))}
      </div>

      <div className="data-table-wrap">
        {products.length === 0 ? (
          <EmptyState
            icon={<ShoppingBag className="h-5 w-5 text-muted-foreground" />}
            title="No listings"
            subtitle="Products will appear here when sellers post listings"
          />
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Product</th>
                <th>Seller</th>
                <th>Category</th>
                <th>Price</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => {
                const listingStatus = p.listingStatus || p.status;
                const modState = p.moderationState;
                const state =
                  (modState && modState !== "active" && modState !== "restored"
                    ? modState
                    : null) ||
                  listingStatus ||
                  p.aiModeration?.status;
                const blocked = isContentBlocked(
                  modState || listingStatus,
                  p.aiModeration?.status,
                );
                return (
                  <tr key={p._id}>
                    <td>
                      <div className="flex items-start gap-3">
                        {p.media?.[0] ? (
                          <MediaThumb
                            src={p.media[0]}
                            className="h-12 w-12 shrink-0 rounded"
                          />
                        ) : null}
                        <div className="min-w-0">
                          <p className="font-medium line-clamp-1">
                            {p.title || "Untitled"}
                          </p>
                          <p className="text-xs text-muted-foreground line-clamp-1">
                            {p.description || "—"}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="text-xs text-muted-foreground max-w-[120px] truncate">
                      {p.userId || "—"}
                    </td>
                    <td className="text-muted-foreground">{p.category || "—"}</td>
                    <td className="font-semibold whitespace-nowrap">
                      {p.currency || "KES"} {Number(p.price || 0).toLocaleString()}
                    </td>
                    <td>
                      <div className="flex flex-col gap-1">
                        {state ? <StatusBadge status={state} /> : "—"}
                        {listingStatus &&
                        modState &&
                        listingStatus !== modState &&
                        modState !== "active" &&
                        modState !== "restored" ? (
                          <span className="text-[10px] text-muted-foreground">
                            listing: {listingStatus}
                          </span>
                        ) : null}
                      </div>
                    </td>
                    <td>
                      <ContentModerationActions
                        contentType="product"
                        contentId={p._id}
                        ownerUserId={p.userId}
                        blocked={blocked}
                        onUpdated={load}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={page <= 1}
          onClick={() => setPage((p) => p - 1)}
        >
          Previous
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={products.length === 0}
          onClick={() => setPage((p) => p + 1)}
        >
          Next
        </Button>
      </div>
    </div>
  );
}
