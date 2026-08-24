"use client";

import { useCallback, useEffect, useState } from "react";
import {
  CheckCircle,
  XCircle,
  Clock,
  Shield,
  RefreshCw,
} from "lucide-react";

import { adminApi } from "@/lib/adminClient";
import { ADMIN_API_KEY } from "@/lib/api";
import { PageHeader } from "@/components/PageHeader";
import { PageLoading } from "@/components/PageLoading";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";

type VerificationRequest = {
  _id: string;
  clerkId: string;
  verificationType: "personal" | "business";
  status: string;
  fullName: string;
  businessName?: string;
  applicationReason?: string;
  phoneNumber: string;
  amount: number;
  currency: string;
  paymentMethod?: "mpesa" | "stripe";
  createdAt: string;
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
  verifiedAt?: string;
  verificationExpiresAt?: string;
};

export default function VerificationPage() {
  const [tab, setTab] = useState<"pending" | "verified">("pending");
  const [requests, setRequests] = useState<VerificationRequest[]>([]);
  const [verifiedUsers, setVerifiedUsers] = useState<VerifiedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const fetchPending = useCallback(async () => {
    const res = await adminApi.get(
      `/api/verification/admin/requests?status=pending_review`,
    );
    setRequests(res.data.requests || []);
  }, []);

  const fetchVerified = useCallback(async () => {
    const res = await adminApi.get(`/api/verification/admin/verified`);
    setVerifiedUsers(res.data.users || []);
  }, []);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      if (tab === "pending") await fetchPending();
      else await fetchVerified();
    } catch (err) {
      console.error(err);
      if (tab === "pending") setRequests([]);
      else setVerifiedUsers([]);
    } finally {
      setLoading(false);
    }
  }, [tab, fetchPending, fetchVerified]);

  useEffect(() => {
    load();
  }, [load]);

  const approve = async (id: string) => {
    try {
      await adminApi.patch(`/api/verification/admin/requests/${id}/approve`, {
        reviewedBy: "admin-dashboard",
      });
      setRequests((prev) => prev.filter((r) => r._id !== id));
    } catch (err) {
      console.error(err);
      alert("Approve failed — check staff session / ADMIN_API_KEY.");
    }
  };

  const reject = async (id: string) => {
    try {
      await adminApi.patch(`/api/verification/admin/requests/${id}/reject`, {
        reason: rejectReason || "Application rejected",
        reviewedBy: "admin-dashboard",
      });
      setRejectId(null);
      setRejectReason("");
      setRequests((prev) => prev.filter((r) => r._id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  const revoke = async (clerkId: string) => {
    if (!confirm("Revoke verification for this user?")) return;
    try {
      await adminApi.patch(`/api/verification/admin/users/${clerkId}/revoke`, {
        reason: "Revoked by admin",
      });
      setVerifiedUsers((prev) => prev.filter((u) => u.clerkId !== clerkId));
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return <PageLoading title="Loading verifications..." />;
  }

  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader
        title="Verification"
        description="Review paid applications — approve, reject, or revoke badges"
        actions={
          <Button variant="outline" size="icon" onClick={load} title="Refresh">
            <RefreshCw className="h-4 w-4" />
          </Button>
        }
      />

      <div className="filter-pills w-fit">
        <TabButton
          active={tab === "pending"}
          onClick={() => setTab("pending")}
          label="Pending review"
          count={requests.length}
        />
        <TabButton
          active={tab === "verified"}
          onClick={() => setTab("verified")}
          label="Verified users"
          count={verifiedUsers.length}
        />
      </div>

      {!ADMIN_API_KEY && (
        <div className="mb-4 p-3 rounded-lg bg-amber-500/10 text-amber-800 text-sm">
          <code>NEXT_PUBLIC_ADMIN_API_KEY</code> is empty in the client bundle.
          Confirm it is set in <code>.env.local</code> and restart the Next.js
          dev server.
        </div>
      )}

      {tab === "pending" && (
        <div className="space-y-3">
          {requests.map((r) => (
            <div
              key={r._id}
              className="bg-card border rounded-xl p-5 flex flex-col md:flex-row md:justify-between gap-4"
            >
              <div className="flex items-start gap-4">
                <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center font-bold">
                  {r.user?.nickName?.[0] || r.fullName?.[0] || "?"}
                </div>
                <div>
                  <p className="font-semibold flex items-center gap-2">
                    {r.fullName}
                    <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 capitalize">
                      {r.verificationType}
                    </span>
                  </p>
                  <p className="text-sm text-muted-foreground">
                    @{r.user?.nickName || "?"} · {r.user?.email}
                  </p>
                  {r.businessName && (
                    <p className="text-sm mt-1">Business: {r.businessName}</p>
                  )}
                  <p className="text-sm mt-2 text-muted-foreground">
                    {r.applicationReason || "No reason provided"}
                  </p>
                  <p className="text-xs mt-2 text-muted-foreground">
                    {r.paymentMethod === "stripe"
                      ? `Card (Stripe) · ${r.currency} ${r.amount}`
                      : `M-Pesa ${r.phoneNumber || "—"} · ${r.currency} ${r.amount}`}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {rejectId === r._id ? (
                  <div className="flex flex-col gap-2 w-full md:w-auto">
                    <input
                      className="border rounded px-2 py-1 text-sm"
                      placeholder="Rejection reason"
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                    />
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => reject(r._id)}
                        className="px-3 py-1.5 text-xs bg-red-600 text-white rounded-lg"
                      >
                        Confirm reject
                      </button>
                      <button
                        type="button"
                        onClick={() => setRejectId(null)}
                        className="px-3 py-1.5 text-xs border rounded-lg"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => approve(r._id)}
                      className="px-3 py-1.5 text-xs bg-green-600 text-white rounded-lg flex items-center gap-1"
                    >
                      <CheckCircle className="w-3 h-3" /> Approve
                    </button>
                    <button
                      type="button"
                      onClick={() => setRejectId(r._id)}
                      className="px-3 py-1.5 text-xs bg-red-600/90 text-white rounded-lg flex items-center gap-1"
                    >
                      <XCircle className="w-3 h-3" /> Reject
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}

          {requests.length === 0 && (
            <EmptyState
              icon={<Clock className="w-8 h-8 text-muted-foreground" />}
              title="No pending applications"
              subtitle="Paid applications awaiting review appear here"
            />
          )}
        </div>
      )}

      {tab === "verified" && (
        <div className="space-y-3">
          {verifiedUsers.map((u) => (
            <div
              key={u.clerkId}
              className="bg-card border rounded-xl p-5 flex justify-between items-center"
            >
              <div>
                <p className="font-semibold flex items-center gap-2">
                  <Shield className="w-4 h-4 text-blue-500" />
                  {u.firstName} {u.lastName}
                  <span className="text-xs capitalize text-muted-foreground">
                    ({u.verificationType})
                  </span>
                </p>
                <p className="text-sm text-muted-foreground">
                  @{u.nickName} · {u.email}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Verified{" "}
                  {u.verifiedAt
                    ? new Date(u.verifiedAt).toLocaleDateString()
                    : "?"}
                  {u.verificationExpiresAt &&
                    ` · Expires ${new Date(u.verificationExpiresAt).toLocaleDateString()}`}
                </p>
              </div>
              <button
                type="button"
                onClick={() => revoke(u.clerkId)}
                className="px-3 py-1.5 text-xs border border-red-500 text-red-600 rounded-lg"
              >
                Revoke
              </button>
            </div>
          ))}

          {verifiedUsers.length === 0 && (
            <EmptyState
              icon={<CheckCircle className="w-8 h-8 text-green-500" />}
              title="No verified users"
              subtitle="Approved accounts appear here"
            />
          )}
        </div>
      )}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  label,
  count,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-4 py-2 rounded-lg text-sm font-medium border ${
        active ? "bg-primary text-primary-foreground" : "bg-card hover:bg-secondary"
      }`}
    >
      {label} ({count})
    </button>
  );
}


