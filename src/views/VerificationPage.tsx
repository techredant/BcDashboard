"use client";

import { useCallback, useEffect, useState } from "react";
import {
  CheckCircle,
  XCircle,
  Clock,
  Shield,
  RefreshCw,
  Ban,
  FileText,
  RotateCcw,
} from "lucide-react";

import { adminApi } from "@/lib/adminClient";
import { ADMIN_API_KEY } from "@/lib/api";
import { PageHeader } from "@/components/PageHeader";
import { PageLoading } from "@/components/PageLoading";
import { EmptyState } from "@/components/EmptyState";
import { StatCard } from "@/components/StatCard";
import { Button } from "@/components/ui/button";
import { useStaffAuth } from "@/lib/staffAuth";

type VerificationRequest = {
  _id: string;
  clerkId: string;
  verificationType: string;
  status: string;
  fullName?: string;
  legalName?: string;
  displayName?: string;
  businessName?: string;
  applicationReason?: string;
  reason?: string;
  website?: string;
  supportingLinks?: string[];
  phoneNumber?: string;
  amount: number;
  currency: string;
  paymentMethod?: "mpesa" | "stripe";
  paymentStatus?: string;
  createdAt: string;
  requestMessage?: string;
  rejectionReason?: string;
  user?: {
    firstName?: string;
    lastName?: string;
    nickName?: string;
    email?: string;
    image?: string;
    isVerified?: boolean;
  };
};

type VerifiedUser = {
  clerkId: string;
  firstName?: string;
  lastName?: string;
  nickName?: string;
  email?: string;
  verificationType?: string;
  verificationBadge?: string;
  verifiedAt?: string;
  verificationExpiresAt?: string;
};

type Stats = {
  total: number;
  pendingPayment: number;
  paid: number;
  underReview: number;
  moreInfo: number;
  approved: number;
  rejected: number;
  expired: number;
};

type AuditRow = {
  _id: string;
  action: string;
  performedBy: string;
  timestamp: string;
};

type DocumentRow = {
  key: string;
  originalName?: string;
  contentType?: string;
  url?: string;
};

const REJECT_PRESETS = [
  "Insufficient information",
  "Unable to verify identity",
  "Supporting evidence insufficient",
  "Account does not meet requirements",
  "Duplicate application",
];

const STATUS_FILTERS = [
  { id: "all", label: "All" },
  { id: "pending_payment", label: "Pending payment" },
  { id: "payment_received", label: "Paid" },
  { id: "under_review", label: "Under review" },
  { id: "more_information_required", label: "More info" },
  { id: "approved", label: "Approved" },
  { id: "rejected", label: "Rejected" },
  { id: "expired", label: "Expired" },
];

const TYPE_FILTERS = [
  { id: "all", label: "All types" },
  { id: "individual", label: "Individual" },
  { id: "creator", label: "Creator" },
  { id: "business", label: "Business" },
  { id: "organization", label: "Organization" },
  { id: "official", label: "Official" },
];

export default function VerificationPage() {
  const { hasPermission } = useStaffAuth();
  const canManage = hasPermission("manage_verification");
  const [tab, setTab] = useState<"queue" | "verified">("queue");
  const [requests, setRequests] = useState<VerificationRequest[]>([]);
  const [verifiedUsers, setVerifiedUsers] = useState<VerifiedUser[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("payment_received");
  const [type, setType] = useState("all");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<{
    request: VerificationRequest;
    user?: VerificationRequest["user"];
    history: AuditRow[];
    documents: DocumentRow[];
  } | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [infoMessage, setInfoMessage] = useState("");
  const [revokeReason, setRevokeReason] = useState("");

  const loadStats = useCallback(async () => {
    const res = await adminApi.get("/api/verification/admin/stats");
    setStats(res.data);
  }, []);

  const loadQueue = useCallback(async () => {
    const params = new URLSearchParams({
      page: String(page),
      limit: "20",
      status,
    });
    if (type !== "all") params.set("verificationType", type);
    if (query.trim()) params.set("q", query.trim());
    const res = await adminApi.get(`/api/verification/admin/requests?${params}`);
    setRequests(res.data.requests || []);
    setTotalPages(res.data.totalPages || 1);
  }, [page, status, type, query]);

  const loadVerified = useCallback(async () => {
    const res = await adminApi.get(
      `/api/verification/admin/verified?page=${page}&limit=20`,
    );
    setVerifiedUsers(res.data.users || []);
    setTotalPages(res.data.totalPages || 1);
  }, [page]);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      await loadStats();
      if (tab === "queue") await loadQueue();
      else await loadVerified();
    } catch (err) {
      console.error(err);
      setRequests([]);
      setVerifiedUsers([]);
    } finally {
      setLoading(false);
    }
  }, [tab, loadStats, loadQueue, loadVerified]);

  useEffect(() => {
    load();
  }, [load]);

  const openDetail = async (id: string) => {
    setSelectedId(id);
    const res = await adminApi.get(`/api/verification/admin/requests/${id}`);
    setDetail(res.data);
  };

  const refreshDetail = async () => {
    if (selectedId) await openDetail(selectedId);
    await load();
  };

  const approve = async (id: string) => {
    if (!confirm("Are you sure you want to verify this account?")) return;
    await adminApi.patch(`/api/verification/admin/requests/${id}/approve`, {});
    setSelectedId(null);
    setDetail(null);
    await load();
  };

  const reject = async (id: string) => {
    if (!rejectReason.trim()) return;
    await adminApi.patch(`/api/verification/admin/requests/${id}/reject`, {
      reason: rejectReason.trim(),
    });
    setRejectReason("");
    setSelectedId(null);
    setDetail(null);
    await load();
  };

  const startReview = async (id: string) => {
    await adminApi.patch(`/api/verification/admin/requests/${id}/start-review`, {});
    await refreshDetail();
  };

  const requestInfo = async (id: string) => {
    if (!infoMessage.trim()) return;
    await adminApi.patch(`/api/verification/admin/requests/${id}/request-info`, {
      requestMessage: infoMessage.trim(),
    });
    setInfoMessage("");
    await refreshDetail();
  };

  const refund = async (id: string) => {
    if (!confirm("Refund this verification payment?")) return;
    await adminApi.post(`/api/verification/admin/requests/${id}/refund`, {});
    await refreshDetail();
  };

  const revoke = async (clerkId: string) => {
    const reason = revokeReason.trim() || prompt("Revocation reason?") || "";
    if (!reason) return;
    await adminApi.patch(`/api/verification/admin/users/${clerkId}/revoke`, {
      reason,
    });
    setRevokeReason("");
    await load();
  };

  if (loading && !stats) {
    return <PageLoading title="Loading verifications..." />;
  }

  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader
        title="Verification Management"
        description="Review paid applications — payment never auto-approves an account"
        actions={
          <Button variant="outline" size="icon" onClick={load} title="Refresh">
            <RefreshCw className="h-4 w-4" />
          </Button>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Total" value={stats?.total ?? 0} icon={FileText} />
        <StatCard title="Pending payment" value={stats?.pendingPayment ?? 0} icon={Clock} accent="warning" />
        <StatCard title="Paid" value={stats?.paid ?? 0} icon={CheckCircle} accent="info" />
        <StatCard title="Under review" value={stats?.underReview ?? 0} icon={Shield} />
        <StatCard title="Approved" value={stats?.approved ?? 0} icon={CheckCircle} accent="success" />
        <StatCard title="Rejected" value={stats?.rejected ?? 0} icon={XCircle} />
        <StatCard title="Expired" value={stats?.expired ?? 0} icon={RotateCcw} accent="warning" />
        <StatCard title="More info" value={stats?.moreInfo ?? 0} icon={FileText} />
      </div>

      <div className="filter-pills w-fit">
        <TabButton active={tab === "queue"} onClick={() => { setTab("queue"); setPage(1); }} label="Applications" />
        <TabButton active={tab === "verified"} onClick={() => { setTab("verified"); setPage(1); }} label="Verified users" />
      </div>

      {!ADMIN_API_KEY && (
        <div className="mb-4 p-3 rounded-lg bg-amber-500/10 text-amber-800 text-sm">
          <code>NEXT_PUBLIC_ADMIN_API_KEY</code> is empty in the client bundle.
        </div>
      )}

      {tab === "queue" && (
        <div className="flex flex-wrap gap-2">
          <select className="border rounded-lg px-3 py-2 text-sm bg-card" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
            {STATUS_FILTERS.map((s) => (
              <option key={s.id} value={s.id}>{s.label}</option>
            ))}
          </select>
          <select className="border rounded-lg px-3 py-2 text-sm bg-card" value={type} onChange={(e) => { setType(e.target.value); setPage(1); }}>
            {TYPE_FILTERS.map((s) => (
              <option key={s.id} value={s.id}>{s.label}</option>
            ))}
          </select>
          <input
            className="border rounded-lg px-3 py-2 text-sm bg-card min-w-[180px]"
            placeholder="Search user"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && setPage(1)}
          />
        </div>
      )}

      {tab === "queue" && (
        <div className="grid gap-4 lg:grid-cols-[1fr_380px]">
          <div className="space-y-3">
            {requests.map((r) => (
              <button
                type="button"
                key={r._id}
                onClick={() => openDetail(r._id)}
                className={`w-full text-left bg-card border rounded-xl p-5 ${selectedId === r._id ? "ring-2 ring-primary" : ""}`}
              >
                <p className="font-semibold flex items-center gap-2">
                  {r.legalName || r.fullName}
                  <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 capitalize">
                    {r.verificationType}
                  </span>
                  <span className="text-xs text-muted-foreground">{r.status.replaceAll("_", " ")}</span>
                </p>
                <p className="text-sm text-muted-foreground">
                  @{r.user?.nickName || "?"} · {r.paymentStatus || r.paymentMethod} · {r.currency} {r.amount}
                </p>
              </button>
            ))}
            {requests.length === 0 && (
              <EmptyState icon={<Clock className="w-8 h-8 text-muted-foreground" />} title="No applications" subtitle="Adjust filters or wait for paid submissions" />
            )}
            <Pager page={page} totalPages={totalPages} onPage={setPage} />
          </div>

          <div className="bg-card border rounded-xl p-5 space-y-3 h-fit sticky top-4">
            {!detail && <p className="text-sm text-muted-foreground">Select an application to review.</p>}
            {detail && (
              <>
                <p className="font-semibold">{detail.request.legalName || detail.request.fullName}</p>
                <p className="text-sm text-muted-foreground capitalize">{detail.request.verificationType} · {detail.request.status.replaceAll("_", " ")}</p>
                <p className="text-sm">{detail.request.reason || detail.request.applicationReason}</p>
                {detail.request.website && <a className="text-sm text-blue-600 break-all" href={detail.request.website} target="_blank" rel="noreferrer">{detail.request.website}</a>}
                {(detail.request.supportingLinks || []).map((link) => (
                  <a key={link} className="block text-sm text-blue-600 break-all" href={link} target="_blank" rel="noreferrer">{link}</a>
                ))}
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground">Documents</p>
                  {(detail.documents || []).map((doc) => (
                    doc.url ? (
                      <a key={doc.key} href={doc.url} target="_blank" rel="noreferrer" className="block text-sm text-blue-600">
                        {doc.originalName || "Document"}
                      </a>
                    ) : (
                      <p key={doc.key} className="text-xs text-muted-foreground">{doc.originalName || "Unavailable"}</p>
                    )
                  ))}
                  {(!detail.documents || detail.documents.length === 0) && (
                    <p className="text-xs text-muted-foreground">No documents</p>
                  )}
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">History</p>
                  {(detail.history || []).slice(0, 8).map((h) => (
                    <p key={h._id} className="text-xs text-muted-foreground">
                      {h.action} · {h.performedBy} · {new Date(h.timestamp).toLocaleString()}
                    </p>
                  ))}
                </div>
                {canManage && (
                  <div className="flex flex-col gap-2 pt-2">
                    {["payment_received", "pending_review"].includes(detail.request.status) && (
                      <Button size="sm" variant="outline" onClick={() => startReview(detail.request._id)}>Start review</Button>
                    )}
                    {["payment_received", "under_review", "more_information_required", "pending_review"].includes(detail.request.status) && (
                      <Button size="sm" onClick={() => approve(detail.request._id)}>Approve</Button>
                    )}
                    <select className="border rounded px-2 py-1 text-sm" value={rejectReason} onChange={(e) => setRejectReason(e.target.value)}>
                      <option value="">Rejection reason</option>
                      {REJECT_PRESETS.map((r) => <option key={r} value={r}>{r}</option>)}
                    </select>
                    <Button size="sm" variant="destructive" onClick={() => reject(detail.request._id)}>Reject</Button>
                    <textarea
                      className="border rounded px-2 py-1 text-sm"
                      rows={2}
                      placeholder="Request more information…"
                      value={infoMessage}
                      onChange={(e) => setInfoMessage(e.target.value)}
                    />
                    <Button size="sm" variant="outline" onClick={() => requestInfo(detail.request._id)}>Request more information</Button>
                    {detail.request.paymentMethod === "stripe" && detail.request.paymentStatus === "paid" && (
                      <Button size="sm" variant="outline" onClick={() => refund(detail.request._id)}>Refund payment</Button>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {tab === "verified" && (
        <div className="space-y-3">
          {verifiedUsers.map((u) => (
            <div key={u.clerkId} className="bg-card border rounded-xl p-5 flex justify-between items-center gap-3">
              <div>
                <p className="font-semibold flex items-center gap-2">
                  <Shield className="w-4 h-4 text-blue-500" />
                  {u.firstName} {u.lastName}
                  <span className="text-xs capitalize text-muted-foreground">({u.verificationBadge || u.verificationType})</span>
                </p>
                <p className="text-sm text-muted-foreground">@{u.nickName} · {u.email}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Verified {u.verifiedAt ? new Date(u.verifiedAt).toLocaleDateString() : "?"}
                  {u.verificationExpiresAt && ` · Expires ${new Date(u.verificationExpiresAt).toLocaleDateString()}`}
                </p>
              </div>
              {canManage && (
                <div className="flex flex-col items-end gap-2">
                  <input
                    className="border rounded px-2 py-1 text-xs"
                    placeholder="Revoke reason"
                    value={revokeReason}
                    onChange={(e) => setRevokeReason(e.target.value)}
                  />
                  <button type="button" onClick={() => revoke(u.clerkId)} className="px-3 py-1.5 text-xs border border-red-500 text-red-600 rounded-lg flex items-center gap-1">
                    <Ban className="w-3 h-3" /> Revoke
                  </button>
                </div>
              )}
            </div>
          ))}
          {verifiedUsers.length === 0 && (
            <EmptyState icon={<CheckCircle className="w-8 h-8 text-green-500" />} title="No verified users" subtitle="Approved accounts appear here" />
          )}
          <Pager page={page} totalPages={totalPages} onPage={setPage} />
        </div>
      )}
    </div>
  );
}

function TabButton({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-4 py-2 rounded-lg text-sm font-medium border ${
        active ? "bg-primary text-primary-foreground" : "bg-card hover:bg-secondary"
      }`}
    >
      {label}
    </button>
  );
}

function Pager({ page, totalPages, onPage }: { page: number; totalPages: number; onPage: (n: number) => void }) {
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center gap-2">
      <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => onPage(page - 1)}>Prev</Button>
      <span className="text-xs text-muted-foreground">{page} / {totalPages}</span>
      <Button size="sm" variant="outline" disabled={page >= totalPages} onClick={() => onPage(page + 1)}>Next</Button>
    </div>
  );
}
