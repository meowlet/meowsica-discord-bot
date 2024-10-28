// WIP subscription service — not shipped
import type { UserPremium } from './tier';

export class SubscriptionService {
  async getFor(userId: string): Promise<UserPremium | null> {
    return null;
  }
}
