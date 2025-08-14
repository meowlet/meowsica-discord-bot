import type { Logger } from "../../shared/logger.ts";
import { QuotaExceededError } from "../../shared/errors.ts";
import type { UsageRepository } from "./usage-repo.ts";
import { renderProgressBar } from "./progress-bar.ts";

export interface UsageInfo {
  readonly charsUsed: number;
  readonly charsRemaining: number;
  readonly limit: number;
  readonly percentage: number;
  readonly period: Date;
  readonly isExceeded: boolean;
}

export interface UsageServiceDeps {
  readonly repo: UsageRepository;
  readonly logger: Logger;
  readonly monthlyLimit: number;
}

export class UsageService {
  private readonly repo: UsageRepository;
  private readonly logger: Logger;
  private readonly monthlyLimit: number;
  private readonly locks = new Map<string, Promise<unknown>>();

  constructor(deps: UsageServiceDeps) {
    this.repo = deps.repo;
    this.logger = deps.logger.withTag("USAGE");
    this.monthlyLimit = deps.monthlyLimit;
  }

  getLimit(): number {
    return this.monthlyLimit;
  }

  async getUsage(userId: string): Promise<UsageInfo> {
    const snapshot = await this.repo.getCurrent(userId);
    return this.toInfo(snapshot.charsUsed, snapshot.period);
  }

  async assertCanUse(userId: string, charsToAdd: number): Promise<void> {
    const info = await this.getUsage(userId);
    if (info.charsUsed + charsToAdd > this.monthlyLimit) {
      throw new QuotaExceededError(
        info.charsUsed,
        this.monthlyLimit,
        nextPeriod(info.period),
      );
    }
  }

  async assertAndReserve(userId: string, chars: number): Promise<void> {
    if (chars <= 0) return;
    await this.withUserLock(userId, async () => {
      await this.assertCanUse(userId, chars);
      await this.repo.incrementCurrent(userId, chars);
    });
  }

  async releaseReservation(userId: string, chars: number): Promise<void> {
    if (chars <= 0) return;
    await this.withUserLock(userId, () =>
      this.repo.decrementCurrent(userId, chars),
    );
  }

  async recordUsage(userId: string, charsAdded: number): Promise<void> {
    await this.repo.incrementCurrent(userId, charsAdded);
  }

  async resetUsage(userId: string): Promise<void> {
    await this.repo.resetCurrent(userId);
    this.logger.info(`reset usage for user=${userId}`);
  }

  async formatUsageLine(userId: string): Promise<string> {
    const info = await this.getUsage(userId);
    const bar = renderProgressBar(info.percentage);
    const used = info.charsUsed.toLocaleString();
    const limit = info.limit.toLocaleString();
    return `${bar} ${info.percentage}% (${used} / ${limit})`;
  }

  private async withUserLock<T>(
    userId: string,
    fn: () => Promise<T>,
  ): Promise<T> {
    const previous = this.locks.get(userId) ?? Promise.resolve();
    const settled = previous.then(
      () => undefined,
      () => undefined,
    );
    const next = settled.then(fn);
    const tail = next.then(
      () => undefined,
      () => undefined,
    );
    this.locks.set(userId, tail);
    try {
      return await next;
    } finally {
      if (this.locks.get(userId) === tail) {
        this.locks.delete(userId);
      }
    }
  }

  private toInfo(charsUsed: number, period: Date): UsageInfo {
    const charsRemaining = Math.max(0, this.monthlyLimit - charsUsed);
    const percentage = Math.min(
      100,
      Math.round((charsUsed / this.monthlyLimit) * 100),
    );
    return {
      charsUsed,
      charsRemaining,
      limit: this.monthlyLimit,
      percentage,
      period,
      isExceeded: charsUsed >= this.monthlyLimit,
    };
  }
}

function nextPeriod(currentPeriod: Date): Date {
  return new Date(
    Date.UTC(
      currentPeriod.getUTCFullYear(),
      currentPeriod.getUTCMonth() + 1,
      1,
    ),
  );
}
