// Plans for the pricing section (docs/API.md §4, GET /api/plans).
import { apiRequest } from "../../lib/apiClient";

export interface Plan {
  slug: string;
  name: string;
  description: string | null;
  priceIdr: number;
  durationDays: number;
  maxDevices: number | null;
}

export interface AdminContact {
  whatsappNumber: string;
  whatsappUrl: string;
}

export interface PlansData {
  plans: Plan[];
  contact: AdminContact | null;
}

export async function fetchPlans(): Promise<PlansData | null> {
  const result = await apiRequest<PlansData>("/plans");
  return result.ok ? result.data : null;
}

export function formatRupiah(value: number): string {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(value);
}

/** "6281234567890" -> "+62 812-3456-7890" */
export function formatWhatsapp(number: string): string {
  const local = number.startsWith("62") ? number.slice(2) : number;
  const groups = [local.slice(0, 3), local.slice(3, 7), local.slice(7)].filter(Boolean);
  return `+62 ${groups.join("-")}`;
}

export function whatsappLink(contact: AdminContact, message: string): string {
  return `${contact.whatsappUrl}?text=${encodeURIComponent(message)}`;
}
