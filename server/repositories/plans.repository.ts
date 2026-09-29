import type { Queryable } from "../db/pool";

export interface PlanRow {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  price_idr: number;
  duration_days: number;
  max_devices: number | null;
  is_active: boolean;
  sort_order: number;
}

export async function listActivePlans(db: Queryable): Promise<PlanRow[]> {
  const { rows } = await db.query<PlanRow>(
    "SELECT * FROM plans WHERE is_active = true ORDER BY sort_order, name"
  );
  return rows;
}

export async function findPlanBySlug(db: Queryable, slug: string): Promise<PlanRow | null> {
  const { rows } = await db.query<PlanRow>("SELECT * FROM plans WHERE slug = $1", [slug]);
  return rows[0] ?? null;
}

export async function findPlanById(db: Queryable, id: string): Promise<PlanRow | null> {
  const { rows } = await db.query<PlanRow>("SELECT * FROM plans WHERE id = $1", [id]);
  return rows[0] ?? null;
}

export async function listAllPlans(db: Queryable): Promise<PlanRow[]> {
  const { rows } = await db.query<PlanRow>("SELECT * FROM plans ORDER BY sort_order, name");
  return rows;
}
