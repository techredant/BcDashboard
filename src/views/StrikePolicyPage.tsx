"use client";

import { useCallback, useEffect, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { PageLoading } from "@/components/PageLoading";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { adminGet, adminPut } from "@/lib/adminClient";
import { toast } from "sonner";
import { useStaffAuth } from "@/lib/staffAuth";

type StrikePolicy = {
  enabled: boolean;
  categoriesThatCount: string[];
  severeCategories: string[];
  severeAction: string;
  severeSuspensionDuration: string;
  steps: Array<{
    strikeNumber: number;
    action: string;
    suspensionDuration?: string;
    restrictTypes?: string[];
  }>;
};

export default function StrikePolicyPage() {
  const [policy, setPolicy] = useState<StrikePolicy | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { hasPermission } = useStaffAuth();
  const canEdit = hasPermission("configure_strikes");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await adminGet<{ policy: StrikePolicy }>("/api/admin/strike-policy");
      setPolicy(data.policy);
    } catch {
      setPolicy(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const save = async () => {
    if (!policy || !canEdit) return;
    setSaving(true);
    try {
      const data = await adminPut<{ policy: StrikePolicy }>("/api/admin/strike-policy", policy);
      setPolicy(data.policy);
      toast.success("Strike policy saved");
    } catch (err: unknown) {
      toast.error(
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || "Save failed",
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <PageLoading title="Loading strike policy…" />;
  if (!policy) {
    return <p className="text-sm text-muted-foreground">Could not load policy.</p>;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Strike policy"
        description="Configure graduated enforcement. Severe categories can bypass normal progression."
        actions={
          canEdit ? (
            <Button onClick={save} disabled={saving}>
              {saving ? "Saving…" : "Save policy"}
            </Button>
          ) : null
        }
      />

      {!canEdit ? (
        <p className="text-sm text-amber-700 dark:text-amber-400">
          View only — super admin required to edit.
        </p>
      ) : null}

      <div className="flex items-center gap-3 rounded-lg border p-4">
        <Switch
          checked={policy.enabled}
          disabled={!canEdit}
          onCheckedChange={(v) => setPolicy({ ...policy, enabled: v })}
        />
        <Label>Enable automatic strike progression</Label>
      </div>

      <div className="space-y-2">
        <Label>Categories that count as strikes (comma-separated)</Label>
        <Textarea
          disabled={!canEdit}
          value={(policy.categoriesThatCount || []).join(", ")}
          onChange={(e) =>
            setPolicy({
              ...policy,
              categoriesThatCount: e.target.value
                .split(",")
                .map((s) => s.trim())
                .filter(Boolean),
            })
          }
        />
      </div>

      <div className="space-y-2">
        <Label>Severe categories (bypass normal progression)</Label>
        <Textarea
          disabled={!canEdit}
          value={(policy.severeCategories || []).join(", ")}
          onChange={(e) =>
            setPolicy({
              ...policy,
              severeCategories: e.target.value
                .split(",")
                .map((s) => s.trim())
                .filter(Boolean),
            })
          }
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Severe action</Label>
          <Input
            disabled={!canEdit}
            value={policy.severeAction}
            onChange={(e) => setPolicy({ ...policy, severeAction: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label>Severe suspension duration</Label>
          <Input
            disabled={!canEdit}
            value={policy.severeSuspensionDuration}
            onChange={(e) =>
              setPolicy({ ...policy, severeSuspensionDuration: e.target.value })
            }
          />
        </div>
      </div>

      <div className="space-y-3">
        <Label>Steps</Label>
        {(policy.steps || []).map((step, idx) => (
          <div key={idx} className="grid gap-2 rounded-lg border p-3 sm:grid-cols-4">
            <Input
              disabled={!canEdit}
              type="number"
              value={step.strikeNumber}
              onChange={(e) => {
                const steps = [...policy.steps];
                steps[idx] = { ...step, strikeNumber: Number(e.target.value) };
                setPolicy({ ...policy, steps });
              }}
            />
            <Input
              disabled={!canEdit}
              value={step.action}
              onChange={(e) => {
                const steps = [...policy.steps];
                steps[idx] = { ...step, action: e.target.value };
                setPolicy({ ...policy, steps });
              }}
            />
            <Input
              disabled={!canEdit}
              value={step.suspensionDuration || ""}
              placeholder="duration"
              onChange={(e) => {
                const steps = [...policy.steps];
                steps[idx] = { ...step, suspensionDuration: e.target.value };
                setPolicy({ ...policy, steps });
              }}
            />
            <Input
              disabled={!canEdit}
              value={(step.restrictTypes || []).join(",")}
              placeholder="restrict types"
              onChange={(e) => {
                const steps = [...policy.steps];
                steps[idx] = {
                  ...step,
                  restrictTypes: e.target.value
                    .split(",")
                    .map((s) => s.trim())
                    .filter(Boolean),
                };
                setPolicy({ ...policy, steps });
              }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
