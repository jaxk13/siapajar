// Calls to /api/super-admin (server/README.md §3). Every function returns ApiResult so pages
// can show the backend's user-facing message.
import { apiRequest, type ApiResult } from "../../lib/apiClient";

const BASE = "/super-admin";

export type UserRole = "super_admin" | "admin";
export type CodeStatus = "unused" | "active" | "expired" | "disabled";
export type PaymentMethod = "bank_transfer" | "qris" | "virtual_account" | "e_wallet" | "card" | "other";
/** Methods an admin can record for a manual order. */
export type ManualPaymentMethod = "bank_transfer" | "qris";
export type OrderStatus = "pending" | "paid" | "fulfilled" | "cancelled" | "expired" | "failed";
export type OrderFilter = "" | "paid" | "unpaid" | "closed";
export type DeliveryStatus = "sent" | "failed" | "skipped";

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  mustChangePassword: boolean;
  sessionExpiresAt: string;
}

export interface CodeSummary {
  id: string;
  hint: string;
  status: CodeStatus;
  expiresAt: string | null;
}

export interface OrderRow {
  id: string;
  createdAt: string;
  buyerName: string;
  buyerWhatsapp: string;
  amountIdr: number;
  paymentMethod: PaymentMethod | null;
  status: OrderStatus;
  buyerEmail: string | null;
  /** "midtrans" for automatic checkout; null for orders recorded by an admin. */
  provider: string | null;
  campaign: string | null;
  source: string | null;
  /** Latest attempt to email the code. */
  emailStatus: DeliveryStatus | null;
  planName: string;
  code: CodeSummary | null;
  createdByName: string | null;
}

export interface Delivery {
  id: string;
  channel: "email";
  status: DeliveryStatus;
  error: string | null;
  createdAt: string;
  createdByName: string | null;
}

export interface CodeRow {
  id: string;
  hint: string;
  status: CodeStatus;
  planName: string;
  orderId: string | null;
  buyerName: string | null;
  durationDays: number;
  maxDevices: number | null;
  activeDevices: number;
  activatedAt: string | null;
  expiresAt: string | null;
  disabledAt: string | null;
  disabledReason: string | null;
  createdAt: string;
  createdByName: string | null;
}

export interface Device {
  id: string;
  userAgent: string | null;
  createdAt: string;
  lastSeenAt: string;
}

export interface OrderDetail {
  order: OrderRow & {
    paymentReference: string | null;
    providerRef: string | null;
    note: string | null;
    paidAt: string | null;
    hasProof: boolean;
    buyerWhatsappUrl: string;
    reminderWhatsappUrl: string | null;
    attribution: {
      source: string | null;
      medium: string | null;
      campaign: string | null;
      content: string | null;
      term: string | null;
      fromMetaAd: boolean;
    };
  };
  deliveries: Delivery[];
  code: CodeRow | null;
  devices: Device[];
}

export interface IssuedCode {
  codeId: string;
  code: string;
  planName: string;
  durationDays: number;
  maxDevices: number | null;
  orderId: string | null;
  expiresAt: string | null;
  message: string;
  buyerWhatsappUrl: string | null;
}

export interface AdminPlan {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  priceIdr: number;
  durationDays: number;
  maxDevices: number | null;
  isActive: boolean;
}

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  mustChangePassword: boolean;
  lastLoginAt: string | null;
  createdAt: string;
}

export interface ActivityRow {
  id: string;
  action: string;
  targetType: string | null;
  targetId: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  userName: string | null;
}

export interface Overview {
  orders: {
    ordersToday: number;
    ordersMonth: number;
    revenueMonth: number;
    checkoutsMonth: number;
    unpaidOpen: number;
    closedMonth: number;
    undeliveredPaid: number;
  };
  codes: { active: number; unused: number; expiringSoon: number };
  recentOrders: OrderRow[];
}

function query(params: Record<string, string | number | null | undefined>): string {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v !== null && v !== undefined && v !== "") q.set(k, String(v));
  const s = q.toString();
  return s ? `?${s}` : "";
}

export const adminApi = {
  login: (email: string, password: string) =>
    apiRequest<{ user: AdminUser }>(`${BASE}/auth/login`, { method: "POST", body: { email, password } }),
  logout: () => apiRequest<object>(`${BASE}/auth/logout`, { method: "POST", body: {} }),
  me: () => apiRequest<{ user: AdminUser }>(`${BASE}/me`),
  changePassword: (currentPassword: string, newPassword: string) =>
    apiRequest<object>(`${BASE}/me/password`, { method: "POST", body: { currentPassword, newPassword } }),

  overview: () => apiRequest<Overview>(`${BASE}/overview`),
  orders: (search: string, status: OrderFilter, pageNumber: number) =>
    apiRequest<{ orders: OrderRow[]; total: number }>(`${BASE}/orders${query({ search, status, page: pageNumber })}`),
  order: (id: string) => apiRequest<OrderDetail>(`${BASE}/orders/${id}`),
  orderProofUrl: (id: string) => `/api${BASE}/orders/${id}/proof`,
  resendOrderEmail: (id: string, email: string) =>
    apiRequest<{ status: DeliveryStatus; email: string }>(`${BASE}/orders/${id}/send-email`, { method: "POST", body: { email } }),
  createOrder: (data: {
    planId: string;
    buyerName: string;
    buyerWhatsapp: string;
    paymentMethod: ManualPaymentMethod;
    paymentReference: string;
    note: string;
    proof: { dataBase64: string };
  }) => apiRequest<{ issued: IssuedCode }>(`${BASE}/orders`, { method: "POST", body: data }),

  codes: (status: CodeStatus | "", search: string, pageNumber: number) =>
    apiRequest<{ codes: CodeRow[]; total: number }>(`${BASE}/codes${query({ status, search, page: pageNumber })}`),
  code: (id: string) => apiRequest<{ code: CodeRow; devices: Device[] }>(`${BASE}/codes/${id}`),
  createTestCode: (planId: string) => apiRequest<{ issued: IssuedCode }>(`${BASE}/codes/test`, { method: "POST", body: { planId } }),
  disableCode: (id: string, reason: string) =>
    apiRequest<{ hint: string; revokedSessions: number }>(`${BASE}/codes/${id}/disable`, { method: "POST", body: { reason } }),
  regenerateCode: (id: string) => apiRequest<{ issued: IssuedCode }>(`${BASE}/codes/${id}/regenerate`, { method: "POST", body: {} }),

  plans: () => apiRequest<{ plans: AdminPlan[] }>(`${BASE}/plans`),
  updatePlan: (plan: AdminPlan) => apiRequest<{ plan: AdminPlan }>(`${BASE}/plans/${plan.id}`, { method: "PATCH", body: plan }),
  settings: () => apiRequest<{ adminWhatsapp: string | null }>(`${BASE}/settings`),
  updateSettings: (adminWhatsapp: string) =>
    apiRequest<{ adminWhatsapp: string | null }>(`${BASE}/settings`, { method: "PUT", body: { adminWhatsapp } }),

  users: () => apiRequest<{ users: TeamMember[] }>(`${BASE}/users`),
  createUser: (data: { name: string; email: string; role: UserRole }) =>
    apiRequest<{ user: TeamMember; temporaryPassword: string }>(`${BASE}/users`, { method: "POST", body: data }),
  updateUser: (id: string, data: { name: string; role: UserRole; isActive: boolean }) =>
    apiRequest<{ user: TeamMember }>(`${BASE}/users/${id}`, { method: "PATCH", body: data }),
  resetPassword: (id: string) =>
    apiRequest<{ user: TeamMember; temporaryPassword: string }>(`${BASE}/users/${id}/reset-password`, { method: "POST", body: {} }),

  activity: (pageNumber: number) =>
    apiRequest<{ activity: ActivityRow[]; total: number }>(`${BASE}/activity${query({ page: pageNumber, limit: 30 })}`),
};

export type { ApiResult };
