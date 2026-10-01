// Public plan data for the pricing section (PRD FR-P01, docs/API.md §4).
import { getPool } from "../db/pool";
import { whatsappUrl } from "../lib/whatsapp";
import { listActivePlans } from "../repositories/plans.repository";
import { getSetting } from "../repositories/support.repository";

export interface PublicPlan {
  slug: string;
  name: string;
  description: string | null;
  priceIdr: number;
  durationDays: number;
  maxDevices: number | null;
}

export interface PlansResponse {
  plans: PublicPlan[];
  contact: { whatsappNumber: string; whatsappUrl: string } | null;
}

export async function getPublicPlans(): Promise<PlansResponse> {
  const pool = getPool();
  const [rows, adminWhatsapp] = await Promise.all([listActivePlans(pool), getSetting<string>(pool, "admin_whatsapp")]);

  return {
    plans: rows.map((p) => ({
      slug: p.slug,
      name: p.name,
      description: p.description,
      priceIdr: p.price_idr,
      durationDays: p.duration_days,
      maxDevices: p.max_devices,
    })),
    contact: adminWhatsapp ? { whatsappNumber: adminWhatsapp, whatsappUrl: whatsappUrl(adminWhatsapp) } : null,
  };
}
