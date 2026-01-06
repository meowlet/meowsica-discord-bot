






import { Client, Collection, GatewayIntentBits, type ClientOptions } from "discord.js";
import type { BotConfig } from "../types/config.ts";
import { RedisService } from "../services/RedisService.ts";
import { botLogger } from "../utils/logger.ts";

interface BotClientOptions {
  config: BotConfig;
  clientOptions?: Partial<ClientOptions>;
}

export class BotClient extends Client {
  
  public readonly config: BotConfig;

  
  public initialized: boolean = false;

  
  public shardId: number | null = null;

  
  public totalShards: number | null = null;

  constructor(options: BotClientOptions) {
    const defaultIntents = [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildVoiceStates,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent,
    ];

    
    
    const clientOptions: ClientOptions = {
      intents: defaultIntents,
    };

    
    if (options.clientOptions) {
      const { shardCount, ...restOptions } = options.clientOptions;
      
      if (options.config.enableSharding && shardCount !== undefined) {
        Object.assign(clientOptions, { shardCount }, restOptions);
      } else {
        Object.assign(clientOptions, restOptions);
      }
    }

    super(clientOptions);

    this.config = options.config;

    
    if (process.env.SHARD_ID !== undefined) {
      this.shardId = parseInt(process.env.SHARD_ID, 10);
    }
    if (process.env.SHARD_COUNT !== undefined) {
      this.totalShards = parseInt(process.env.SHARD_COUNT, 10);
    }
  }

  


  async initialize(): Promise<void> {
    botLogger.info("Initializing bot services...");

    
    if (this.config.enableRedis) {
      try {
        await RedisService.connect();
        botLogger.success("Redis connected");
      } catch (error) {
        botLogger.error("Failed to connect to Redis:", error);
        
        if (this.config.enableSharding) {
          throw new Error("Redis connection required for sharding mode");
        }
        botLogger.warn("Continuing without Redis...");
      }
    }

    botLogger.success("Bot services initialized");
  }

  


  async shutdown(): Promise<void> {
    botLogger.info("Shutting down bot...");

    
    if (this.config.enableRedis && RedisService.isConnected()) {
      RedisService.disconnect();
    }

    
    this.destroy();

    botLogger.info("Bot shutdown complete");
  }

  


  async start(): Promise<void> {
    await this.initialize();

    botLogger.info("Logging in to Discord...");
    await this.login(this.config.token);
  }

  


  getShardInfo(): string {
    if (this.shardId !== null && this.totalShards !== null) {
      return `[Shard ${this.shardId}/${this.totalShards - 1}]`;
    }
    return "[Single]";
  }

  


  isSharded(): boolean {
    return this.shardId !== null;
  }
}

