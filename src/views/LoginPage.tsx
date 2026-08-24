"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useStaffAuth } from "@/lib/staffAuth";
import { ADMIN_API_KEY } from "@/lib/api";
import { toast } from "sonner";

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: Record<string, unknown>) => void;
          renderButton: (el: HTMLElement, config: Record<string, unknown>) => void;
        };
      };
    };
  }
}

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "";

export default function LoginPage() {
  const { isAuthenticated, loading, loginWithGoogleIdToken, loginWithAdminKey } =
    useStaffAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "/";
  const googleBtnRef = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!loading && isAuthenticated) {
      router.replace(next);
    }
  }, [loading, isAuthenticated, router, next]);

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID || !googleBtnRef.current) return;

    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.onload = () => {
      if (!window.google || !googleBtnRef.current) return;
      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: async (response: { credential: string }) => {
          try {
            setBusy(true);
            setError("");
            await loginWithGoogleIdToken(response.credential);
            toast.success("Signed in");
            router.replace(next);
          } catch (err: unknown) {
            const msg =
              (err as { response?: { data?: { message?: string } } })?.response
                ?.data?.message || "Staff sign-in failed";
            setError(msg);
            toast.error(msg);
          } finally {
            setBusy(false);
          }
        },
      });
      window.google.accounts.id.renderButton(googleBtnRef.current, {
        theme: "outline",
        size: "large",
        width: 320,
        text: "signin_with",
      });
    };
    document.body.appendChild(script);
    return () => {
      script.remove();
    };
  }, [loginWithGoogleIdToken, router, next]);

  const onKeyLogin = async () => {
    try {
      setBusy(true);
      setError("");
      await loginWithAdminKey();
      toast.success("Signed in with admin key");
      router.replace(next);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } }; message?: string })
          ?.response?.data?.message ||
        (err as { message?: string })?.message ||
        "Admin key login failed";
      setError(msg);
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md space-y-8 rounded-xl border border-border bg-card p-8 shadow-sm">
        <div className="space-y-2 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Shield className="h-6 w-6 text-primary" />
          </div>
          <h1 className="font-display text-2xl font-semibold tracking-tight">
            BroadCast Admin
          </h1>
          <p className="text-sm text-muted-foreground">
            Sign in with a staff account to access Trust &amp; Safety tools.
          </p>
        </div>

        {error ? (
          <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        ) : null}

        <div className="flex flex-col items-center gap-4">
          {GOOGLE_CLIENT_ID ? (
            <div ref={googleBtnRef} className={busy ? "pointer-events-none opacity-50" : ""} />
          ) : (
            <p className="text-center text-xs text-muted-foreground">
              Set <code className="text-[11px]">NEXT_PUBLIC_GOOGLE_CLIENT_ID</code> for
              staff Google sign-in.
            </p>
          )}

          {ADMIN_API_KEY ? (
            <>
              <div className="flex w-full items-center gap-3 text-xs text-muted-foreground">
                <div className="h-px flex-1 bg-border" />
                or
                <div className="h-px flex-1 bg-border" />
              </div>
              <Button
                type="button"
                variant="outline"
                className="w-full"
                disabled={busy}
                onClick={onKeyLogin}
              >
                Continue with admin API key
              </Button>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
