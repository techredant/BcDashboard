export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "https://cast-api-zeta.vercel.app";

/** Public media CDN — must match backend `CLOUDFRONT_URL`. */
export const MEDIA_CDN_URL = (
  process.env.NEXT_PUBLIC_CDN_BASE_URL ||
  "https://dtjlba0j1xvqa.cloudfront.net"
).replace(/\/$/, "");

export const ADMIN_API_KEY = process.env.NEXT_PUBLIC_ADMIN_API_KEY || "";

const TOKEN_KEY = "broadcast_admin_token";
const STAFF_KEY = "broadcast_admin_staff";
const KEY_FALLBACK = "broadcast_admin_use_key";

export type StaffSession = {
  clerkId: string;
  email: string;
  name: string;
  role: string;
  permissions: string[];
  image?: string | null;
};

export function getStoredToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function getStoredStaff(): StaffSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STAFF_KEY);
    return raw ? (JSON.parse(raw) as StaffSession) : null;
  } catch {
    return null;
  }
}

export function usesAdminKeyFallback(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(KEY_FALLBACK) === "1" || Boolean(ADMIN_API_KEY && !getStoredToken());
}

export function setStaffSession(token: string, staff: StaffSession) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(STAFF_KEY, JSON.stringify(staff));
  localStorage.removeItem(KEY_FALLBACK);
}

export function setAdminKeySession(staff?: StaffSession) {
  localStorage.setItem(KEY_FALLBACK, "1");
  localStorage.removeItem(TOKEN_KEY);
  if (staff) {
    localStorage.setItem(
      STAFF_KEY,
      JSON.stringify({
        ...staff,
        role: staff.role || "super_admin",
        permissions:
          staff.permissions?.length
            ? staff.permissions
            : [], // role matrix on client fills this gap
      } satisfies StaffSession),
    );
  } else {
    localStorage.setItem(
      STAFF_KEY,
      JSON.stringify({
        clerkId: "dashboard",
        email: "",
        name: "API Key Admin",
        role: "super_admin",
        permissions: [],
      } satisfies StaffSession),
    );
  }
}

export function clearStaffSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(STAFF_KEY);
  localStorage.removeItem(KEY_FALLBACK);
}

export function authHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  const token = getStoredToken();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  // Always send the admin key when configured so a stale JWT cannot
  // block access (backend accepts JWT or x-admin-key).
  if (ADMIN_API_KEY) {
    headers["x-admin-key"] = ADMIN_API_KEY;
  }
  return headers;
}

export { ADMIN_API_KEY as adminApiKeyConstant };

/** @deprecated use authHeaders — kept for existing pages during migration */
export const adminHeaders = {
  get "x-admin-key"() {
    return ADMIN_API_KEY;
  },
};
