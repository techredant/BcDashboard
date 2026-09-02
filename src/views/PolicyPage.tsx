"use client";

import { useCallback, useEffect, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { PageLoading } from "@/components/PageLoading";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { adminGet, adminPut } from "@/lib/adminClient";
import { toast } from "sonner";
import { useStaffAuth } from "@/lib/staffAuth";

type ModerationPolicyDoc = {
  version: string;
  active: boolean;
  thresholds: {
    approveMax: number;
    reviewMax: number;
    blockMin: number;
    limitMax: number;
  };
  categoryRules: Record<string, unknown>;
  riskWeights: Record<string, number>;
};

export default function PolicyPage() {
  const [active, setActive] = useState<ModerationPolicyDoc | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { hasPermission } = useStaffAuth();
  const canEdit = hasPermission("moderate_content");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await adminGet<{ active: ModerationPolicyDoc }>(
        "/api/admin/moderation/policy",
      );
      setActive(data.active);
    } catch {
      setActive(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const save = async () => {
    if (!active || !canEdit) return;
    setSaving(true);
    try {
      const data = await adminPut<{ policy: ModerationPolicyDoc }>(
        "/api/admin/moderation/policy",
        active,
      );
      setActive(data.policy);
      toast.success("Moderation policy saved");
    } catch (err: unknown) {
      toast.error(
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || "Save failed",
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <PageLoading title="Loading moderation policy…" />;
  if (!active) {
    return <p className="text-sm text-muted-foreground">Could not load policy.</p>;
  }

  const t = active.thresholds;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Content safety policy"
        description="Configure risk thresholds and category rules. Changes apply to new moderation decisions."
        actions={
          canEdit ? (
            <Button onClick={save} disabled={saving}>
              {saving ? "Saving…" : "Save policy"}
            </Button>
          ) : undefined
        }
      />

      <div className="grid gap-4 md:grid-cols-2 max-w-3xl">
        <div className="space-y-2">
          <Label htmlFor="approveMax">Approve max (0–1)</Label>
          <Input
            id="approveMax"
            type="number"
            step="0.01"
            value={t.approveMax}
            disabled={!canEdit}
            onChange={(e) =>
              setActive({
                ...active,
                thresholds: { ...t, approveMax: Number(e.target.value) },
              })
            }
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="limitMax">Limit max (0–1)</Label>
          <Input
            id="limitMax"
            type="number"
            step="0.01"
            value={t.limitMax}
            disabled={!canEdit}
            onChange={(e) =>
              setActive({
                ...active,
                thresholds: { ...t, limitMax: Number(e.target.value) },
              })
            }
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="reviewMax">Review max (0–1)</Label>
          <Input
            id="reviewMax"
            type="number"
            step="0.01"
            value={t.reviewMax}
            disabled={!canEdit}
            onChange={(e) =>
              setActive({
                ...active,
                thresholds: { ...t, reviewMax: Number(e.target.value) },
              })
            }
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="blockMin">Block min (0–1)</Label>
          <Input
            id="blockMin"
            type="number"
            step="0.01"
            value={t.blockMin}
            disabled={!canEdit}
            onChange={(e) =>
              setActive({
                ...active,
                thresholds: { ...t, blockMin: Number(e.target.value) },
              })
            }
          />
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        Active version: {active.version}
      </p>
    </div>
  );
}
