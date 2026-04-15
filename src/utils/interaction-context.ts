import { AsyncLocalStorage } from "node:async_hooks";

export interface InteractionContextStore {
  interactionId: string;
  userId: string;
  guildId?: string;
  command?: string;
  shardId?: number;
  startedAt: number;
}

class InteractionContextService {
  private readonly als = new AsyncLocalStorage<InteractionContextStore>();

  run<T>(store: InteractionContextStore, fn: () => T): T {
    return this.als.run(store, fn);
  }

  get(): InteractionContextStore | undefined {
    return this.als.getStore();
  }
}

export const interactionContext = new InteractionContextService();
