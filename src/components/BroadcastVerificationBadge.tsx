"use client";

import { cn } from "@/lib/utils";

export type VerificationFamily = "individual" | "business" | "official";

const LEGACY: Record<string, VerificationFamily> = {
  verified: "individual",
  creator: "individual",
  personal: "individual",
  public_figure: "individual",
  organization: "business",
  ngo: "business",
  media: "business",
  education: "business",
  government: "official",
  government_official: "official",
  government_organization: "official",
};

export function verificationFamily(
  badgeOrType?: string | null,
): VerificationFamily {
  const raw = String(badgeOrType || "")
    .toLowerCase()
    .trim();
  if (!raw) return "individual";
  if (raw === "individual" || raw === "business" || raw === "official") {
    return raw;
  }
  return LEGACY[raw] || "individual";
}

export function verificationFamilyLabel(family: VerificationFamily): string {
  switch (family) {
    case "business":
      return "Broadcast Business Verified";
    case "official":
      return "Broadcast Official Verified";
    default:
      return "Broadcast Verified";
  }
}

const ACCENT: Record<VerificationFamily, string> = {
  individual: "#2563EB",
  business: "#7C3AED",
  official: "#0D9488",
};

type Props = {
  isVerified?: boolean;
  verificationType?: string | null;
  verificationBadge?: string | null;
  size?: number;
  className?: string;
  showLabel?: boolean;
};

/**
 * Broadcast B+check family badge (circle / spark / shield).
 * Original Broadcast mark — not a third-party checkmark.
 */
export function BroadcastVerificationBadge({
  isVerified = true,
  verificationType,
  verificationBadge,
  size = 18,
  className,
  showLabel = false,
}: Props) {
  if (!isVerified) return null;
  const family = verificationFamily(verificationBadge || verificationType);
  const accent = ACCENT[family];
  const label = verificationFamilyLabel(family);

  return (
    <span
      className={cn("inline-flex items-center gap-1.5 align-middle", className)}
      title={label}
      aria-label={label}
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden
      >
        {family === "individual" && (
          <>
            <circle cx="12" cy="12" r="11" fill={accent} />
            <circle cx="12" cy="12" r="9" fill="#0B1220" />
          </>
        )}
        {family === "business" && (
          <>
            <path
              d="M12 1.5 L14.2 6.8 L20 7.4 L15.6 11.2 L17 17 L12 14.2 L7 17 L8.4 11.2 L4 7.4 L9.8 6.8 Z"
              fill={accent}
            />
            <path
              d="M12 4.2 L13.5 7.8 L17.4 8.2 L14.4 10.8 L15.3 14.7 L12 12.8 L8.7 14.7 L9.6 10.8 L6.6 8.2 L10.5 7.8 Z"
              fill="#0B1220"
            />
          </>
        )}
        {family === "official" && (
          <>
            <path
              d="M12 2 C15 2 19 3.5 19 7.5 L19 12.5 C19 16.5 15.5 19.5 12 22 C8.5 19.5 5 16.5 5 12.5 L5 7.5 C5 3.5 9 2 12 2 Z"
              fill={accent}
            />
            <path
              d="M12 4.2 C14.2 4.2 17 5.2 17 8 L17 12.2 C17 15.2 14.4 17.5 12 19.4 C9.6 17.5 7 15.2 7 12.2 L7 8 C7 5.2 9.8 4.2 12 4.2 Z"
              fill="#0B1220"
            />
          </>
        )}
        {/* B stem */}
        <path
          d="M8.2 7.2 V16.8"
          stroke="#fff"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
        {/* B bowls */}
        <path
          d="M8.2 7.2 H12.2 C13.6 7.2 14.6 8.1 14.6 9.3 C14.6 10.5 13.6 11.4 12.2 11.4 H8.2"
          stroke="#fff"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        <path
          d="M8.2 11.4 H12.6 C14.1 11.4 15.2 12.4 15.2 13.8 C15.2 15.2 14.1 16.2 12.6 16.2 H8.2"
          stroke="#fff"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        {/* Integrated check */}
        <path
          d="M12.8 14.6 L14.4 16.2 L18.2 11.6"
          stroke="#fff"
          strokeWidth="1.7"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </svg>
      {showLabel ? (
        <span className="text-xs text-muted-foreground">{label}</span>
      ) : null}
    </span>
  );
}
