/**
 * src/lib/api.ts
 * -----------------------------------------------------------------
 * The ONLY entry point from the frontend to the ( backend.
 * Frontend components must import from "@/lib/api" — never use fetch
 * directly. All request shapes are typed here.
 *
 * Base URL comes from VITE_API_BASE_URL in .env.
 * Update the endpoints below to match your Go REST spec.
 * -----------------------------------------------------------------
 */

const BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? "").replace(/\/$/, "");

/* ---------- Types ---------- */

export type CustomerStatus = "active" | "suspended" | "cancelled";

export interface Customer {
  id: string;
  name: string;
  phone: string;
  plan: string;
  status: CustomerStatus | string;
  notes?: string;
  created_at: string;
}

export type CustomerInput = Omit<Customer, "id" | "created_at">;

export type MessageStatus = "sent" | "failed" | "queued" | "delivered";

export interface Message {
  id: string;
  customer_id?: string | null;
  phone: string;
  body: string;
  status: MessageStatus | string;
  error?: string | null;
  cost?: number | null;
  created_at: string;
}

export interface SendResult {
  batch_id: string;
  total: number;
  succeeded: number;
  failed: number;
}

export interface Balance {
  credits: number;
  currency?: string;
}

export interface DashboardStats {
  customers: number;
  sent_today: number;
  sent_month: number;
  delivery_rate: number;
  balance: number;
}

export interface ImportResult {
  inserted: number;
  failed: number;
  errors: string[];
}

/* ---------- Core request helper ---------- */

export class ApiError extends Error {
  constructor(public status: number, message: string, public body?: unknown) {
    super(message);
    this.name = "ApiError";
  }
}

function qs(params?: Record<string, string | number | undefined | null>): string {
  if (!params) return "";
  const usp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== "") usp.append(k, String(v));
  }
  const s = usp.toString();
  return s ? `?${s}` : "";
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  if (!BASE_URL) {
    throw new ApiError(0, "VITE_API_BASE_URL is not set. Add it to .env");
  }
  const headers = new Headers(init.headers);
  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  headers.set("Accept", "application/json");

  let res: Response;
  try {
    res = await fetch(`${BASE_URL}${path}`, { ...init, headers });
  } catch (e) {
    throw new ApiError(0, `Network error: ${(e as Error).message}`);
  }

  const isJson = res.headers.get("content-type")?.includes("application/json");
  const body = isJson ? await res.json().catch(() => null) : await res.text().catch(() => null);

  if (!res.ok) {
    const msg =
      (body && typeof body === "object" && "error" in body && String((body as { error: unknown }).error)) ||
      (typeof body === "string" && body) ||
      res.statusText ||
      "Request failed";
    throw new ApiError(res.status, msg, body);
  }
  return body as T;
}

/* ---------- Customers ---------- */

export const listCustomers = (q?: { search?: string; plan?: string; status?: string }) =>
  request<Customer[]>(`/customers${qs(q)}`);

export const getCustomer = (id: string) => request<Customer>(`/customers/${encodeURIComponent(id)}`);

export const createCustomer = (data: CustomerInput) =>
  request<Customer>("/customers", { method: "POST", body: JSON.stringify(data) });

export const updateCustomer = (id: string, data: Partial<CustomerInput>) =>
  request<Customer>(`/customers/${encodeURIComponent(id)}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });

export const deleteCustomer = (id: string, confirmCode: string) =>
  request<void>(`/customers/${encodeURIComponent(id)}`, 
    { 
      method: "DELETE",
      headers: {"X-Confirm-Code": confirmCode},
     });

export const importCustomers = (rows: CustomerInput[]) =>
  request<ImportResult>("/customers/import", {
    method: "POST",
    body: JSON.stringify({ rows }),
  });

/* ---------- SMS ---------- */

export const sendSms = (data: { to: string; message: string; customer_id?: string }) =>
  request<SendResult>("/sms/send", { method: "POST", body: JSON.stringify(data) });

export const sendBulkSms = (data: { recipients: string[]; message: string; name?: string }) =>
  request<SendResult>("/sms/send/bulk", { method: "POST", body: JSON.stringify(data) });

export const listMessages = (q?: {
  from?: string;
  to?: string;
  status?: string;
  customer_id?: string;
  limit?: number;
}) => request<Message[]>(`/messages${qs(q)}`);

export const getBalance = () => request<Balance>("/sms/balance");

/* ---------- Dashboard ---------- */

export const getStats = () => request<DashboardStats>("/stats");
