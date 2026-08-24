"use client";

import { useCallback, useEffect, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { PageLoading } from "@/components/PageLoading";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { adminGet, adminPost } from "@/lib/adminClient";
import { toast } from "sonner";
import { useStaffAuth } from "@/lib/staffAuth";

type Appeal = {
  _id: string;
  userId: string;
  targetType: string;
  targetId: string;
  reason: string;
  status: string;
  createdAt: string;
  reviewNotes?: string;
};

export default function AppealsPage() {
  const [items, setItems] = useState<Appeal[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("pending");
  const { hasPermission } = useStaffAuth();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: "40" });
      if (status !== "all") params.set("status", status);
      const data = await adminGet<{ items: Appeal[] }>(`/api/admin/appeals?${params}`);
      setItems(data.items || []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => {
    load();
  }, [load]);

  const decide = async (id: string, decision: "approved" | "rejected") => {
    if (!hasPermission("manage_appeals")) {
      toast.error("Insufficient permissions");
      return;
    }
    try {
      await adminPost(`/api/admin/appeals/${id}/decide`, {
        decision,
        reviewNotes: `Appeal ${decision}`,
        resolution: `Appeal ${decision}`,
      });
      toast.success(`Appeal ${decision}`);
      load();
    } catch (err: unknown) {
      toast.error(
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || "Failed",
      );
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Appeals"
        description="Review appeals. Approvals restore accounts or content where applicable."
      />
      <div className="flex gap-2">
        {["pending", "approved", "rejected", "all"].map((s) => (
          <Button
            key={s}
            size="sm"
            variant={status === s ? "default" : "outline"}
            onClick={() => setStatus(s)}
            className="capitalize"
          >
            {s}
          </Button>
        ))}
      </div>
      {loading ? (
        <PageLoading title="Loading appeals…" />
      ) : (
        <div className="space-y-3">
          {items.map((a) => (
            <div key={a._id} className="rounded-lg border p-4">
              <div className="flex flex-wrap justify-between gap-2">
                <div>
                  <StatusBadge status={a.status} />
                  <p className="mt-2 text-sm font-medium">
                    {a.targetType}/{a.targetId}
                  </p>
                  <p className="text-xs text-muted-foreground">User {a.userId}</p>
                  <p className="mt-2 text-sm">{a.reason}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {new Date(a.createdAt).toLocaleString()}
                  </p>
                </div>
                {a.status === "pending" ? (
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => decide(a._id, "approved")}>
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => decide(a._id, "rejected")}
                    >
                      Reject
                    </Button>
                  </div>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
