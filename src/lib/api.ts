import { API_BASE_URL } from "./config";
import { authStorage } from "../auth/storage";

type ApiError = { statusCode: number; message: string | string[]; error?: string };

function apiUrl(path: string) {
  // jika API_BASE_URL kosong -> pakai relative (vite proxy)
  if (!API_BASE_URL) return path;
  return `${API_BASE_URL}${path}`;
}

export async function apiFetch<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const token = authStorage.getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...((init.headers as Record<string, string>) ?? {}),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  let res: Response;
  try {
    res = await fetch(apiUrl(path), { ...init, headers });
  } catch (e) {
    // browser: TypeError: Failed to fetch = network/CORS/backend mati
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("Failed to fetch") || msg.includes("NetworkError") || msg.includes("fetch")) {
      throw new Error(
        `Tidak bisa terhubung ke API (${API_BASE_URL || "proxy /"}). Pastikan backend jalan di http://localhost:3000 dan coba: 1) set VITE_API_BASE_URL="" di .env untuk pakai proxy (lalu restart npm run dev), atau 2) aktifkan CORS di backend main.ts -> app.enableCors({ origin: true, credentials: true }). Error asli: ${msg}`,
      );
    }
    throw e;
  }

  if (res.status === 401) {
    const text = await res.text().catch(() => "");
    let msg = "Unauthorized";
    try {
      const j = JSON.parse(text) as ApiError;
      msg = Array.isArray(j.message) ? j.message.join(", ") : j.message;
    } catch {
      if (text) msg = text;
    }
    throw Object.assign(new Error(msg), { status: 401 });
  }

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    let msg = `Request failed (${res.status})`;
    try {
      const j = JSON.parse(text) as ApiError;
      msg = Array.isArray(j.message) ? j.message.join(", ") : j.message ?? msg;
    } catch {
      if (text) msg = text;
    }
    throw Object.assign(new Error(msg), { status: res.status });
  }

  if (res.status === 204) return undefined as T;
  const ct = res.headers.get("content-type") ?? "";
  if (ct.includes("application/json")) return (await res.json()) as T;
  return (await res.text()) as unknown as T;
}

export async function loginRequest(email: string, password: string) {
  return apiFetch<import("../auth/types").LoginResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}
