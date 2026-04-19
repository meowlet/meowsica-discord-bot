import { AsyncLocalStorage } from "node:async_hooks";

export interface InteractionContextStore {
  readonly interactionId: string;
  readonly userId: string;
  readonly guildId?: string;
  readonly command?: string;
  readonly shardId?: number;
  readonly startedAt: number;
}

export class InteractionContextService {
  private readonly als = new AsyncLocalStorage<InteractionContextStore>();

  run<T>(store: InteractionContextStore, fn: () => T): T {
    return this.als.run(store, fn);
  }

  get(): InteractionContextStore | undefined {
    return this.als.getStore();
  }
}

export const interactionContext = new InteractionContextService();
