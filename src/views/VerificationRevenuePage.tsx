"use client";

import { useCallback, useEffect, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { PageLoading } from "@/components/PageLoading";
import { adminGet } from "@/lib/adminClient";

type RevenueReport = {
  totalRevenue: number;
  netRevenue: number;
  paymentCount: number;
  byMethod: Array<{ _id: string; total: number; count: number }>;
  byCountry: Array<{ _id: string; total: number; count: number }>;
  byVerificationType: Array<{ _id: string; total: number; count: number }>;
  refunds: Array<{ _id: string; total: number; count: number }>;
};

export default function VerificationRevenuePage() {
  const [report, setReport] = useState<RevenueReport | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await adminGet<RevenueReport>("/api/admin/verification/revenue");
      setReport(data);
    } catch {
      setReport(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) return <PageLoading title="Loading revenue…" />;
  if (!report) {
    return <p className="text-sm text-muted-foreground">Could not load revenue report.</p>;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Verification revenue"
        description="Payment totals by method, country, and verification type."
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-lg border p-4">
          <p className="text-sm text-muted-foreground">Total revenue</p>
          <p className="text-2xl font-semibold">{report.totalRevenue.toLocaleString()}</p>
        </div>
        <div className="rounded-lg border p-4">
          <p className="text-sm text-muted-foreground">Net revenue</p>
          <p className="text-2xl font-semibold">{report.netRevenue.toLocaleString()}</p>
        </div>
        <div className="rounded-lg border p-4">
          <p className="text-sm text-muted-foreground">Payments</p>
          <p className="text-2xl font-semibold">{report.paymentCount}</p>
        </div>
      </div>

      <Section title="By payment method" rows={report.byMethod} />
      <Section title="By country" rows={report.byCountry} />
      <Section title="By verification type" rows={report.byVerificationType} />
      <Section title="Refunds" rows={report.refunds} />
    </div>
  );
}

function Section({
  title,
  rows,
}: {
  title: string;
  rows: Array<{ _id: string; total: number; count: number }>;
}) {
  if (!rows?.length) return null;
  return (
    <div className="rounded-lg border p-4">
      <h3 className="mb-3 font-semibold">{title}</h3>
      <ul className="space-y-2 text-sm">
        {rows.map((row) => (
          <li key={row._id || "unknown"} className="flex justify-between">
            <span>{row._id || "Unknown"}</span>
            <span>
              {row.total?.toLocaleString()} ({row.count} payments)
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
