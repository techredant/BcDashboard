"use client";

import { useCallback, useEffect, useState } from "react";
import { Landmark } from "lucide-react";
import { toast } from "sonner";

import { adminGet, adminPatch } from "@/lib/adminClient";
import { PageHeader } from "@/components/PageHeader";
import { PageLoading } from "@/components/PageLoading";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useStaffAuth } from "@/lib/staffAuth";

type PaymentRow = {
  applicationId: string;
  _id: string;
  applicant?: {
    clerkId?: string;
    firstName?: string;
    lastName?: string;
    nickName?: string;
    email?: string;
  };
  paymentReference: string;
  amount: number;
  currency: string;
  submittedTransactionRef: string;
  paymentDate?: string | null;
  submittedPaidAt?: string | null;
  status: string;
  paymentStatus: string;
  paymentClarification?: string;
  verificationType?: string;
};

const FILTERS = [
  { id: "payment_submitted", label: "Submitted" },
  { id: "pending_payment", label: "Pending" },
  { id: "payment_verified", label: "Verified" },
  { id: "payment_rejected", label: "Rejected" },
  { id: "all", label: "All" },
];

function applicantName(row: PaymentRow) {
  const u = row.applicant;
  if (!u) return "Unknown";
  const name = [u.firstName, u.lastName].filter(Boolean).join(" ").trim();
  return name || u.nickName || u.email || u.clerkId || "Unknown";
}

export default function VerificationPaymentReviewPage() {
  const { hasPermission } = useStaffAuth();
  const canManage = hasPermission("manage_verification");
  const [rows, setRows] = useState<PaymentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("payment_submitted");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selected, setSelected] = useState<PaymentRow | null>(null);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await adminGet<{
        payments: PaymentRow[];
        totalPages: number;
      }>("/api/verification/admin/payments", {
        params: { paymentStatus: status, q: query, page },
      });
      setRows(data.payments || []);
      setTotalPages(data.totalPages || 1);
    } catch {
      setRows([]);
      toast.error("Unable to load payment queue");
    } finally {
      setLoading(false);
    }
  }, [status, query, page]);

  useEffect(() => {
    load();
  }, [load]);

  const act = async (id: string, action: "confirm" | "reject" | "request-clarification") => {
    if (!canManage) return;
    if (action !== "confirm" && !reason.trim()) {
      toast.error("Add a reason or clarification message");
      return;
    }
    setBusy(true);
    try {
      await adminPatch(`/api/verification/admin/payments/${id}/${action}`, {
        reason: reason.trim(),
        message: reason.trim(),
      });
      toast.success(
        action === "confirm"
          ? "Payment confirmed. Application is now under review — the account is not verified yet."
          : action === "reject"
            ? "Payment rejected"
            : "Clarification requested",
      );
      setSelected(null);
      setReason("");
      await load();
    } catch (err: unknown) {
      toast.error(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
          "Action failed",
      );
    } finally {
      setBusy(false);
    }
  };

  if (loading && rows.length === 0) return <PageLoading title="Loading payments…" />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Verification payments"
        description="Match I&M PayBill payments to the BroadCast application reference (BCAST-VER-…). Confirming payment starts application review — it does not grant the verified badge."
      />

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <Button
            key={f.id}
            size="sm"
            variant={status === f.id ? "default" : "outline"}
            onClick={() => {
              setStatus(f.id);
              setPage(1);
            }}
          >
            {f.label}
          </Button>
        ))}
      </div>
      <Input
        placeholder="Search applicant, BCAST-VER reference, or transaction number"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setPage(1);
        }}
      />

      <div className="grid gap-4 lg:grid-cols-5">
        <div className="space-y-3 lg:col-span-3">
          {rows.map((row) => (
            <button
              key={row.applicationId}
              type="button"
              onClick={() => setSelected(row)}
              className={`w-full rounded-xl border p-4 text-left ${
                selected?.applicationId === row.applicationId ? "border-primary" : ""
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold">{applicantName(row)}</p>
                  <p className="text-xs text-muted-foreground">{row.applicant?.email}</p>
                </div>
                <span className="text-xs font-medium uppercase text-muted-foreground">
                  {row.paymentStatus.replaceAll("_", " ")}
                </span>
              </div>
              <p className="mt-2 text-sm">
                {row.currency} {row.amount} · {row.paymentReference}
              </p>
              <p className="text-xs text-muted-foreground">
                Match in bank: {row.paymentReference || "—"} · App: {row.status.replaceAll("_", " ")}
              </p>
            </button>
          ))}
          {rows.length === 0 && (
            <EmptyState
              icon={<Landmark className="h-8 w-8" />}
              title="No payments in this filter"
              subtitle="Users who tapped I've made the payment appear here. Match the BCAST-VER reference in I&M."
            />
          )}
          {totalPages > 1 && (
            <div className="flex gap-2">
              <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage(page - 1)}>
                Prev
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={page >= totalPages}
                onClick={() => setPage(page + 1)}
              >
                Next
              </Button>
            </div>
          )}
        </div>

        <div className="rounded-xl border p-4 lg:col-span-2">
          {!selected ? (
            <p className="text-sm text-muted-foreground">Select a payment to review.</p>
          ) : (
            <div className="space-y-3">
              <h3 className="font-semibold">{applicantName(selected)}</h3>
              <p className="text-sm font-medium">
                Application reference: {selected.paymentReference}
              </p>
              <p className="text-xs text-muted-foreground">
                Match this reference on the I&M PayBill statement.
              </p>
              <p className="text-sm">
                Amount: {selected.currency} {selected.amount}
              </p>
              <p className="text-sm">
                Bank transaction (optional): {selected.submittedTransactionRef || "—"}
              </p>
              <p className="text-sm">
                Payment date:{" "}
                {selected.paymentDate || selected.submittedPaidAt
                  ? new Date(String(selected.paymentDate || selected.submittedPaidAt)).toLocaleString()
                  : "—"}
              </p>
              <p className="text-sm">Application: {selected.status}</p>
              <p className="text-sm">Payment status: {selected.paymentStatus}</p>
              {selected.paymentClarification ? (
                <p className="text-sm text-amber-700">{selected.paymentClarification}</p>
              ) : null}
              {canManage && selected.paymentStatus === "payment_submitted" && (
                <>
                  <textarea
                    className="w-full rounded border px-2 py-1 text-sm"
                    rows={3}
                    placeholder="Notes, rejection reason, or clarification request"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                  />
                  <Button
                    disabled={busy}
                    onClick={() => act(selected.applicationId, "confirm")}
                  >
                    Confirm payment
                  </Button>
                  <Button
                    variant="destructive"
                    disabled={busy}
                    onClick={() => act(selected.applicationId, "reject")}
                  >
                    Reject payment
                  </Button>
                  <Button
                    variant="outline"
                    disabled={busy}
                    onClick={() => act(selected.applicationId, "request-clarification")}
                  >
                    Request clarification
                  </Button>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
