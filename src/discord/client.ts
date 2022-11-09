import {
  Client,
  GatewayIntentBits,
  Options,
  type ClientOptions,
} from "discord.js";

export interface BotClientDeps {
  readonly token: string;
  readonly clientOptions?: Partial<ClientOptions>;
}

export class BotClient extends Client {
  private readonly authToken: string;
  shardId: number | null = null;
  totalShards: number | null = null;

  constructor(deps: BotClientDeps) {
    const intents = [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildVoiceStates,
    ];
    const clientOptions: ClientOptions = {
      intents,
      makeCache: Options.cacheWithLimits({
        MessageManager: 0,
        PresenceManager: 0,
        ReactionManager: 0,
        ReactionUserManager: 0,
        GuildMemberManager: {
          maxSize: 1,
          keepOverLimit: (member) => member.id === member.client.user?.id,
        },
        ThreadManager: { maxSize: 0 },
      }),
      sweepers: {
        ...Options.DefaultSweeperSettings,
        messages: { interval: 600, lifetime: 60 },
        users: {
          interval: 3600,
          filter: () => (user) => user.id !== user.client.user?.id,
        },
      },
      ...deps.clientOptions,
    };
    super(clientOptions);
    this.authToken = deps.token;
    const shardsEnv = process.env["SHARDS"] ?? process.env["SHARD_ID"];
    if (shardsEnv !== undefined) {
      const parsed = Number.parseInt(shardsEnv, 10);
      if (!Number.isNaN(parsed)) this.shardId = parsed;
    }
    if (process.env["SHARD_COUNT"] !== undefined) {
      const parsed = Number.parseInt(process.env["SHARD_COUNT"], 10);
      if (!Number.isNaN(parsed)) this.totalShards = parsed;
    }
  }

  async start(): Promise<void> {
    await this.login(this.authToken);
  }

  getShardInfo(): string {
    if (this.shardId !== null && this.totalShards !== null) {
      return `[Shard ${this.shardId}/${this.totalShards - 1}]`;
    }
    return "[Single]";
  }
}
