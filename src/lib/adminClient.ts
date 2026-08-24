import axios, { type AxiosRequestConfig } from "axios";
import { API_BASE_URL, authHeaders, clearStaffSession } from "./api";

export const adminApi = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
});

adminApi.interceptors.request.use((config) => {
  const headers = authHeaders();
  config.headers = { ...config.headers, ...headers } as typeof config.headers;
  return config;
});

adminApi.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err?.response?.status === 401 && typeof window !== "undefined") {
      const path = window.location.pathname;
      // Only force re-login when we have no admin key fallback configured
      const hasKey = Boolean(
        process.env.NEXT_PUBLIC_ADMIN_API_KEY || "",
      );
      if (!path.startsWith("/login") && !hasKey) {
        clearStaffSession();
        window.location.href = `/login?next=${encodeURIComponent(path)}`;
      }
    }
    return Promise.reject(err);
  },
);

export async function adminGet<T = unknown>(url: string, config?: AxiosRequestConfig) {
  const res = await adminApi.get<T>(url, config);
  return res.data;
}

export async function adminPost<T = unknown>(
  url: string,
  body?: unknown,
  config?: AxiosRequestConfig,
) {
  const res = await adminApi.post<T>(url, body, config);
  return res.data;
}

export async function adminPatch<T = unknown>(
  url: string,
  body?: unknown,
  config?: AxiosRequestConfig,
) {
  const res = await adminApi.patch<T>(url, body, config);
  return res.data;
}

export async function adminPut<T = unknown>(
  url: string,
  body?: unknown,
  config?: AxiosRequestConfig,
) {
  const res = await adminApi.put<T>(url, body, config);
  return res.data;
}
