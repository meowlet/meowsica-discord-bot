// WIP quota gate helper — not shipped
import type { PremiumTier } from './tier';

const LIMITS: Record<PremiumTier, number> = {
  free: 10_000,
  plus: 100_000,
  pro: 500_000,
};

export function monthlyCharLimit(tier: PremiumTier): number {
  return LIMITS[tier];
}
