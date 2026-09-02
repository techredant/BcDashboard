"use client";

import { useCallback, useEffect, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { PageLoading } from "@/components/PageLoading";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { adminGet, adminPut } from "@/lib/adminClient";
import { toast } from "sonner";
import { useStaffAuth } from "@/lib/staffAuth";

type CountryConfig = {
  countryCode: string;
  currency: string;
  methods: {
    card: { enabled: boolean; provider: string };
    mpesa: { enabled: boolean; provider: string };
  };
  limits?: { minAmount: number; maxAmount: number };
};

type ProviderHealth = {
  stripe: { status: string; ok?: boolean };
  mpesa: { status: string; ok?: boolean };
};

export default function VerificationPaymentMethodsPage() {
  const [countries, setCountries] = useState<CountryConfig[]>([]);
  const [providers, setProviders] = useState<ProviderHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const { hasPermission } = useStaffAuth();
  const canEdit = hasPermission("configure_payments");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [countriesRes, providersRes] = await Promise.all([
        adminGet<{ countries: CountryConfig[] }>("/api/admin/payment-methods/countries"),
        adminGet<{ providers: ProviderHealth }>("/api/admin/payment-methods/providers"),
      ]);
      setCountries(countriesRes.countries || []);
      setProviders(providersRes.providers);
    } catch {
      setCountries([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const saveCountry = async (country: CountryConfig) => {
    if (!canEdit) return;
    setSaving(country.countryCode);
    try {
      const data = await adminPut<{ country: CountryConfig }>(
        `/api/admin/payment-methods/countries/${country.countryCode}`,
        country,
      );
      setCountries((prev) =>
        prev.map((c) => (c.countryCode === data.country.countryCode ? data.country : c)),
      );
      toast.success(`${country.countryCode} saved`);
    } catch (err: unknown) {
      toast.error(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
          "Save failed",
      );
    } finally {
      setSaving(null);
    }
  };

  const updateCountry = (code: string, patch: Partial<CountryConfig>) => {
    setCountries((prev) =>
      prev.map((c) => (c.countryCode === code ? { ...c, ...patch } : c)),
    );
  };

  if (loading) return <PageLoading title="Loading payment methods…" />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Verification payment methods"
        description="Configure card and M-Pesa availability by country. Methods require a connected backend provider."
      />

      {providers && (
        <div className="flex flex-wrap gap-4 rounded-lg border p-4 text-sm">
          <div>
            <span className="font-medium">Stripe: </span>
            <span
              className={
                providers.stripe.status === "CONNECTED"
                  ? "text-green-600"
                  : "text-amber-600"
              }
            >
              {providers.stripe.status}
            </span>
          </div>
          <div>
            <span className="font-medium">M-Pesa: </span>
            <span
              className={
                providers.mpesa.status === "CONNECTED"
                  ? "text-green-600"
                  : "text-amber-600"
              }
            >
              {providers.mpesa.status}
            </span>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {countries.map((country) => (
          <div key={country.countryCode} className="rounded-lg border p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">{country.countryCode}</h3>
              {canEdit && (
                <Button
                  size="sm"
                  disabled={saving === country.countryCode}
                  onClick={() => saveCountry(country)}
                >
                  {saving === country.countryCode ? "Saving…" : "Save"}
                </Button>
              )}
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label>Currency</Label>
                <Input
                  value={country.currency}
                  disabled={!canEdit}
                  onChange={(e) =>
                    updateCountry(country.countryCode, {
                      currency: e.target.value.toUpperCase(),
                    })
                  }
                />
              </div>
            </div>
            <div className="flex flex-wrap gap-6">
              <div className="flex items-center gap-2">
                <Switch
                  checked={country.methods.card.enabled}
                  disabled={!canEdit || providers?.stripe.status !== "CONNECTED"}
                  onCheckedChange={(enabled) =>
                    updateCountry(country.countryCode, {
                      methods: {
                        ...country.methods,
                        card: { ...country.methods.card, enabled },
                      },
                    })
                  }
                />
                <Label>Card</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={country.methods.mpesa.enabled}
                  disabled={!canEdit || providers?.mpesa.status !== "CONNECTED"}
                  onCheckedChange={(enabled) =>
                    updateCountry(country.countryCode, {
                      methods: {
                        ...country.methods,
                        mpesa: { ...country.methods.mpesa, enabled },
                      },
                    })
                  }
                />
                <Label>M-Pesa</Label>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
