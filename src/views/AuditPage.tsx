"use client";

import { useCallback, useEffect, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { PageLoading } from "@/components/PageLoading";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { SearchInput } from "@/components/SearchInput";
import { adminGet } from "@/lib/adminClient";

type AuditItem = {
  _id: string;
  adminId: string;
  adminName?: string;
  action: string;
  targetType?: string;
  targetId?: string;
  userId?: string;
  reason?: string;
  previousStatus?: string;
  newStatus?: string;
  createdAt: string;
};

export default function AuditPage() {
  const [items, setItems] = useState<AuditItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [action, setAction] = useState("");
  const [q, setQ] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: "10",
      });
      if (action) params.set("action", action);
      if (q) params.set("userId", q);
      const data = await adminGet<{
        items: AuditItem[];
        totalPages: number;
      }>(`/api/admin/audit-logs?${params}`);
      setItems(data.items || []);
      setTotalPages(data.totalPages || 1);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [page, action, q]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Audit logs"
        description="Immutable record of administrative actions. Cannot be edited from this UI."
      />
      <div className="flex flex-wrap gap-3">
        <SearchInput
          value={q}
          onChange={setQ}
          placeholder="Filter by user id…"
          className="max-w-xs"
        />
        <input
          className="h-9 rounded-md border border-input bg-background px-3 text-sm"
          placeholder="Action filter"
          value={action}
          onChange={(e) => setAction(e.target.value)}
        />
      </div>
      {loading ? (
        <PageLoading title="Loading audit logs…" />
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40 text-left text-xs uppercase text-muted-foreground">
                <th className="px-3 py-2">When</th>
                <th className="px-3 py-2">Admin</th>
                <th className="px-3 py-2">Action</th>
                <th className="px-3 py-2">Target</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Reason</th>
              </tr>
            </thead>
            <tbody>
              {items.map((a) => (
                <tr key={a._id} className="border-b border-border/50">
                  <td className="whitespace-nowrap px-3 py-2 text-muted-foreground">
                    {new Date(a.createdAt).toLocaleString()}
                  </td>
                  <td className="px-3 py-2">
                    {a.adminName || a.adminId}
                  </td>
                  <td className="px-3 py-2">
                    <StatusBadge status={a.action} />
                  </td>
                  <td className="px-3 py-2 text-xs">
                    {a.targetType}/{a.targetId}
                    {a.userId ? ` · ${a.userId}` : ""}
                  </td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">
                    {a.previousStatus || "—"} → {a.newStatus || "—"}
                  </td>
                  <td className="max-w-xs truncate px-3 py-2 text-muted-foreground">
                    {a.reason || "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div className="flex gap-2">
        <Button
          size="sm"
          variant="outline"
          disabled={page <= 1}
          onClick={() => setPage((p) => p - 1)}
        >
          Previous
        </Button>
        <span className="self-center text-xs text-muted-foreground">
          Page {page} / {totalPages}
        </span>
        <Button
          size="sm"
          variant="outline"
          disabled={page >= totalPages}
          onClick={() => setPage((p) => p + 1)}
        >
          Next
        </Button>
      </div>
    </div>
  );
}
