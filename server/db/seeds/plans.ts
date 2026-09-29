// Plan data for the seeder. Edit the values here, then run `npm run db:seed` again
// (the seeder updates existing plans by slug).
//
// PRICES AND DURATIONS ARE PLACEHOLDERS (BELUM DIPUTUSKAN, PRD FR-P01).
// Both plans stay `isActive: false` so placeholder prices are never shown on the
// pricing section. Set the real values and `isActive: true` before launch.
//
// Changing a plan never affects codes already created: each code keeps a copy of
// its duration and device limit (docs/DECISIONS.md ADR-012).

export interface PlanSeed {
  slug: string;
  name: string;
  description: string;
  priceIdr: number;
  durationDays: number;
  maxDevices: number | null;
  isActive: boolean;
  sortOrder: number;
}

export const PLAN_SEEDS: PlanSeed[] = [
  {
    slug: "instan",
    name: "Instan",
    description: "Akses singkat untuk menyusun naskah soal.",
    priceIdr: 0, // PLACEHOLDER
    durationDays: 7, // PLACEHOLDER
    maxDevices: 2,
    isActive: true,
    sortOrder: 1,
  },
  {
    slug: "pro",
    name: "Pro",
    description: "Akses lebih panjang untuk menyusun banyak naskah soal.",
    priceIdr: 0, // PLACEHOLDER
    durationDays: 30, // PLACEHOLDER
    maxDevices: 2,
    isActive: true,
    sortOrder: 2,
  },
];
