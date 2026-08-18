export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "https://cast-api-zeta.vercel.app";

export const ADMIN_API_KEY = process.env.NEXT_PUBLIC_ADMIN_API_KEY || "";

export const adminHeaders = { "x-admin-key": ADMIN_API_KEY };
