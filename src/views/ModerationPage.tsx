"use client";

import { useCallback, useEffect, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { PageLoading } from "@/components/PageLoading";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { adminGet, adminPatch, adminPost } from "@/lib/adminClient";
import { toast } from "sonner";
import { MediaThumb } from "@/components/MediaThumb";

type CaseRow = {
  _id: string;
  targetType?: string;
  targetId?: string;
  authorId?: string;
  text?: string;
  status?: string;
  severity?: number;
  priority?: "URGENT" | "HIGH" | "NORMAL" | "LOW" | string;
  action?: string;
  finalDecision?: string;
  agreement?: string;
  engineReason?: string;
  judge?: string;
  resultStatus?: string;
  providers?: Record<string, { status?: string; highestRiskScore?: number; reasons?: string[] }>;
  mediaUrls?: string[];
  assignedModeratorId?: string;
  humanStatus?: string;
  createdAt?: string;
  labels?: unknown;
};

const PRIORITY_ORDER = ["URGENT", "HIGH", "NORMAL", "LOW"] as const;

function priorityBadgeClass(priority?: string) {
  switch (String(priority || "").toUpperCase()) {
    case "URGENT":
      return "bg-red-600 text-white";
    case "HIGH":
      return "bg-orange-500 text-white";
    case "NORMAL":
      return "bg-slate-600 text-white";
    default:
      return "bg-muted text-muted-foreground";
  }
}

export default function ModerationPage() {
  const [tab, setTab] = useState("cases");
  const [cases, setCases] = useState<CaseRow[]>([]);
  const [queue, setQueue] = useState<CaseRow[]>([]);
  const [metrics, setMetrics] = useState<Record<string, number> | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState("open");
  const [priorityFilter, setPriorityFilter] = useState("all");

  const loadCases = useCallback(async () => {
    const params = new URLSearchParams({ limit: "40" });
    if (statusFilter !== "all") params.set("status", statusFilter);
    const data = await adminGet<{ items: CaseRow[] }>(
      `/api/admin/moderation/cases?${params}`,
    );
    setCases(data.items || []);
  }, [statusFilter]);

  const loadQueue = useCallback(async () => {
    const params = new URLSearchParams({ limit: "40" });
    if (priorityFilter !== "all") params.set("priority", priorityFilter);
    const data = await adminGet<{ cases: CaseRow[]; metrics?: Record<string, number> }>(
      `/api/ai/moderation/queue?${params}`,
    );
    setQueue(data.cases || []);
    setMetrics(data.metrics || null);
  }, [priorityFilter]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      await Promise.all([loadCases(), loadQueue()]);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load moderation data");
    } finally {
      setLoading(false);
    }
  }, [loadCases, loadQueue]);

  useEffect(() => {
    load();
  }, [load]);

  const assignMe = async (id: string) => {
    try {
      await adminPatch(`/api/admin/moderation/cases/${id}`, { assignTo: "me", status: "under_review" });
      toast.success("Assigned");
      loadCases();
    } catch {
      toast.error("Assign failed");
    }
  };

  const decideAi = async (id: string, action: "allow" | "block") => {
    setBusyId(id);
    try {
      await adminPost(
        `/api/ai/moderation/${id}/${action === "allow" ? "approve" : "reject"}`,
      );
      toast.success(action === "allow" ? "Approved" : "Rejected");
      loadQueue();
    } catch {
      toast.error("Decision failed");
    } finally {
      setBusyId(null);
    }
  };

  if (loading) return <PageLoading title="Loading moderation…" />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Moderation"
        description="Human cases and AI dual-provider review. AI scores are never shown as human decisions."
      />

      {metrics ? (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {Object.entries(metrics).slice(0, 8).map(([k, v]) => (
            <div key={k} className="rounded-lg border p-3">
              <p className="text-xs text-muted-foreground">{k}</p>
              <p className="text-lg font-semibold">{v}</p>
            </div>
          ))}
        </div>
      ) : null}

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="cases">Cases</TabsTrigger>
          <TabsTrigger value="ai">AI queue</TabsTrigger>
        </TabsList>

        <TabsContent value="cases" className="space-y-4 pt-4">
          <div className="flex flex-wrap gap-2">
            {["open", "pending", "under_review", "action_required", "resolved", "dismissed", "appealed", "all"].map(
              (s) => (
                <Button
                  key={s}
                  size="sm"
                  variant={statusFilter === s ? "default" : "outline"}
                  onClick={() => setStatusFilter(s)}
                  className="capitalize"
                >
                  {s.replace(/_/g, " ")}
                </Button>
              ),
            )}
          </div>
          <div className="space-y-3">
            {cases.map((c) => (
              <div key={c._id} className="rounded-lg border p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-mono text-xs text-muted-foreground">{c._id}</p>
                    <p className="text-sm font-medium">
                      {c.targetType}/{c.targetId} · author {c.authorId || "—"}
                    </p>
                    <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                      {c.text || "—"}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <StatusBadge status={c.status || "open"} />
                    <span className="text-xs text-muted-foreground">
                      Severity {c.severity ?? 0}
                    </span>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-2 text-xs">
                  <span className="rounded bg-muted px-2 py-1">
                    AI decision: {c.finalDecision || c.action || c.resultStatus || "—"}
                    {c.judge === "ai" ? " (automated)" : ""}
                  </span>
                  {c.humanStatus ? (
                    <span className="rounded bg-muted px-2 py-1">
                      Human: {c.humanStatus}
                    </span>
                  ) : (
                    <span className="rounded bg-muted px-2 py-1">Human: pending</span>
                  )}
                </div>
                <div className="mt-3 flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => assignMe(c._id)}>
                    Assign to me
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={async () => {
                      await adminPatch(`/api/admin/moderation/cases/${c._id}`, {
                        status: "resolved",
                        humanStatus: "resolved",
                        resolution: "Resolved by moderator",
                      });
                      toast.success("Resolved");
                      loadCases();
                    }}
                  >
                    Resolve
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={async () => {
                      await adminPatch(`/api/admin/moderation/cases/${c._id}`, {
                        status: "dismissed",
                        humanStatus: "dismissed",
                      });
                      toast.success("Dismissed");
                      loadCases();
                    }}
                  >
                    Dismiss
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="ai" className="space-y-3 pt-4">
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant={priorityFilter === "all" ? "default" : "outline"}
              onClick={() => setPriorityFilter("all")}
            >
              All
            </Button>
            {PRIORITY_ORDER.map((p) => (
              <Button
                key={p}
                size="sm"
                variant={priorityFilter === p ? "default" : "outline"}
                onClick={() => setPriorityFilter(p)}
              >
                {p}
              </Button>
            ))}
          </div>
          {queue.map((c) => (
            <div key={c._id} className="rounded-lg border p-4">
              <div className="flex justify-between gap-2">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`rounded px-2 py-0.5 text-[10px] font-semibold tracking-wide ${priorityBadgeClass(c.priority)}`}
                    >
                      {c.priority || "NORMAL"}
                    </span>
                    <p className="text-sm font-medium">
                      {c.targetType} · {c.authorId}
                    </p>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
                    {c.text}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Severity {c.severity ?? 0}
                  </p>
                  <p className="mt-2 text-xs text-amber-700 dark:text-amber-400">
                    AI only — not a human decision: {c.engineReason || c.finalDecision || c.action}
                  </p>
                  {c.providers ? (
                    <div className="mt-2 grid gap-2 sm:grid-cols-2">
                      {Object.entries(c.providers).map(([name, p]) => (
                        <div key={name} className="rounded border p-2 text-xs">
                          <p className="font-medium capitalize">{name}</p>
                          <p>Status: {p.status || "—"}</p>
                          <p>Score: {p.highestRiskScore ?? "—"}</p>
                          <p className="text-muted-foreground">
                            {(p.reasons || []).join(", ") || "No reasons"}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : null}
                  {c.mediaUrls?.length ? (
                    <div className="mt-2 flex gap-2 overflow-x-auto">
                      {c.mediaUrls.slice(0, 3).map((url) => (
                        <MediaThumb
                          key={url}
                          src={url}
                          className="h-16 w-16 shrink-0 rounded"
                        />
                      ))}
                    </div>
                  ) : null}
                </div>
                <div className="flex flex-col gap-2">
                  <Button
                    size="sm"
                    disabled={busyId === c._id}
                    onClick={() => decideAi(c._id, "allow")}
                  >
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    disabled={busyId === c._id}
                    onClick={() => decideAi(c._id, "block")}
                  >
                    Reject
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}
