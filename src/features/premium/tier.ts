// WIP premium tier model — not shipped
export type PremiumTier = 'free' | 'plus' | 'pro';

export interface UserPremium {
  readonly userId: string;
  readonly tier: PremiumTier;
  readonly expiresAt: Date | null;
}
