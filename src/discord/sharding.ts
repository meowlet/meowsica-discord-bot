import { ShardingManager, type ShardingManagerOptions } from "discord.js";
import type { Logger } from "../shared/logger.ts";
import type { ShardingConfig } from "../config/index.ts";

export interface ShardingFactoryDeps {
  readonly token: string;
  readonly botFile: string;
  readonly sharding: ShardingConfig;
  readonly logger: Logger;
}

export class ShardingFactory {
  private readonly token: string;
  private readonly botFile: string;
  private readonly sharding: ShardingConfig;
  private readonly logger: Logger;

  constructor(deps: ShardingFactoryDeps) {
    this.token = deps.token;
    this.botFile = deps.botFile;
    this.sharding = deps.sharding;
    this.logger = deps.logger.withTag("SHARD");
  }

  create(): ShardingManager {
    const options: ShardingManagerOptions = {
      token: this.token,
      totalShards:
        this.sharding.shardCount === "auto" ? "auto" : this.sharding.shardCount,
      respawn: true,
      execArgv: ["--conditions=bun"],
    };
    const manager = new ShardingManager(this.botFile, options);
    this.attachListeners(manager);
    return manager;
  }

  async start(manager: ShardingManager): Promise<void> {
    await manager.spawn({ timeout: -1, delay: 5000 });
  }

  private attachListeners(manager: ShardingManager): void {
    manager.on("shardCreate", (shard) => {
      const id = shard.id;
      shard.on("ready", () => this.logger.info(`shard ${id} ready`));
      shard.on("disconnect", () =>
        this.logger.warn(`shard ${id} disconnected`),
      );
      shard.on("death", (proc) => {
        const pid = "pid" in proc ? proc.pid : "unknown";
        this.logger.error(`shard ${id} died pid=${pid}`);
      });
      shard.on("error", (err) => this.logger.error(`shard ${id} error`, err));
    });
  }
}
