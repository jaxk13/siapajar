import type { CodeStatus, DeliveryStatus, OrderStatus, PaymentMethod, UserRole } from "./adminApi";

export { formatRupiah, formatWhatsapp } from "../plans/plansService";

const TZ = "Asia/Jakarta";

export function formatDate(iso: string | null): string {
  if (!iso) return "-";
  return new Date(iso).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric", timeZone: TZ });
}

export function formatDateTime(iso: string | null): string {
  if (!iso) return "-";
  return new Date(iso).toLocaleString("id-ID", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: TZ });
}

export const PAYMENT_LABELS: Record<PaymentMethod, string> = {
  bank_transfer: "Transfer bank",
  qris: "QRIS",
  virtual_account: "Virtual account",
  e_wallet: "E-wallet",
  card: "Kartu",
  other: "Lainnya",
};

export const ORDER_STATUS: Record<OrderStatus, { label: string; tone: "brand" | "neutral" | "outline" | "danger" }> = {
  pending: { label: "Menunggu bayar", tone: "outline" },
  paid: { label: "Lunas, kode belum terkirim", tone: "danger" },
  fulfilled: { label: "Lunas", tone: "brand" },
  expired: { label: "Kedaluwarsa", tone: "neutral" },
  failed: { label: "Gagal", tone: "neutral" },
  cancelled: { label: "Dibatalkan", tone: "neutral" },
};

export const DELIVERY_STATUS: Record<DeliveryStatus, string> = {
  sent: "Terkirim",
  failed: "Gagal",
  skipped: "Dilewati (email belum diatur)",
};

export const ROLE_LABELS: Record<UserRole, string> = { super_admin: "Super admin", admin: "Admin" };

export const CODE_STATUS: Record<CodeStatus, { label: string; tone: "brand" | "neutral" | "outline" | "danger" }> = {
  unused: { label: "Belum dipakai", tone: "outline" },
  active: { label: "Aktif", tone: "brand" },
  expired: { label: "Kedaluwarsa", tone: "neutral" },
  disabled: { label: "Nonaktif", tone: "danger" },
};

const ACTION_LABELS: Record<string, string> = {
  login: "Masuk ke panel admin",
  "order.create": "Membuat pesanan dan kode akses",
  "order.paid": "Menerima pembayaran otomatis dan membuat kode akses",
  "order.email_resend": "Mengirim ulang kode akses lewat email",
  "code.create_test": "Membuat kode uji",
  "code.disable": "Menonaktifkan kode akses",
  "code.regenerate": "Mengganti kode akses",
  "plan.update": "Mengubah paket",
  "settings.update": "Mengubah pengaturan",
  "user.create": "Menambah anggota tim",
  "user.update": "Mengubah anggota tim",
  "user.reset_password": "Mereset password anggota tim",
  "user.change_password": "Mengganti password sendiri",
};

export function actionLabel(action: string): string {
  return ACTION_LABELS[action] ?? action;
}

/** Short, human-readable device name from a user agent. */
export function deviceLabel(userAgent: string | null): string {
  if (!userAgent) return "Perangkat tidak dikenal";
  const os = /iPhone|iPad/.test(userAgent)
    ? /iPad/.test(userAgent) ? "iPad" : "iPhone"
    : /Android/.test(userAgent) ? "Android" : /Windows/.test(userAgent) ? "Windows" : /Mac OS X|Macintosh/.test(userAgent) ? "Mac" : /Linux/.test(userAgent) ? "Linux" : "";
  const browser = /Edg\//.test(userAgent) ? "Edge" : /Chrome\//.test(userAgent) ? "Chrome" : /Firefox\//.test(userAgent) ? "Firefox" : /Safari\//.test(userAgent) ? "Safari" : "";
  return [browser, os].filter(Boolean).join(" · ") || userAgent.slice(0, 40);
}

/** Reads a File as base64 (without the data: prefix). */
export function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).replace(/^data:[^;]+;base64,/, ""));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}
