import { loadAppEnvConfig } from "../config/index.ts";
import { Logger, createRootLogger } from "../shared/logger.ts";
import { interactionContext } from "../shared/interaction-context.ts";
import { createDb } from "../infra/db.ts";
import { RedisClient } from "../infra/redis.ts";
import { GoogleCloudTtsClient } from "../infra/google-cloud-tts.ts";
import { SchemaMigrator } from "../features/settings/migration.ts";
import { isShardWorker } from "./runtime.ts";
import { UserPrefsRepository } from "../features/settings/user-prefs-repo.ts";
import { GuildSettingsRepository } from "../features/settings/guild-settings-repo.ts";
import { LocaleResolver } from "../features/settings/locale-resolver.ts";
import { UsageRepository } from "../features/quota/usage-repo.ts";
import { UsageService } from "../features/quota/usage-service.ts";
import { CommandLoggerService } from "../features/logs/command-logger-service.ts";
import { TtsCacheService } from "../features/tts/cache-service.ts";
import { WavenetVoiceCatalog } from "../features/tts/voice-catalog.ts";
import { BasicTtsProvider } from "../features/tts/basic-provider.ts";
import { WavenetTtsProvider } from "../features/tts/wavenet-provider.ts";
import { PlayerManager } from "../features/tts/player-manager.ts";
import { VoiceManager } from "../features/voice/voice-manager.ts";
import { BotClient } from "../discord/client.ts";
import { InteractionRouter } from "../discord/interaction-router.ts";
import { ReadyHandler } from "../discord/ready-handler.ts";
import type { Command, ComponentHandler } from "../shared/command.ts";
import { PingCommand } from "../features/misc/ping-command.ts";
import { HelpCommand } from "../features/misc/help-command.ts";
import { JoinCommand } from "../features/voice/join-command.ts";
import { LeaveCommand } from "../features/voice/leave-command.ts";
import { SayCommand } from "../features/tts/say-command.ts";
import { SkipCommand } from "../features/tts/skip-command.ts";
import { StopCommand } from "../features/tts/stop-command.ts";
import { QueueCommand } from "../features/tts/queue-command.ts";
import { VoiceCommand } from "../features/settings/voice-command.ts";
import { LanguageCommand } from "../features/settings/language-command.ts";
import { ProfileCommand } from "../features/quota/profile-command.ts";
import { VoiceSettingsHandler } from "../features/settings/voice-settings/handler.ts";
import { LanguageSettingsHandler } from "../features/settings/language-settings/handler.ts";
import { Timeouts } from "../shared/timeouts.ts";
import type { AppContext } from "./app-context.ts";

export async function createAppContext(): Promise<AppContext> {
  const config = loadAppEnvConfig();
  const logger = createRootLogger({
    level: config.bot.logLevel,
    jsonMode: config.bot.nodeEnv === "production",
    context: interactionContext,
  });
  logger.info("starting bootstrap");
  const db = createDb({
    url: config.database.url,
    maxConnections: config.database.maxConnections,
  });
  if (!isShardWorker()) {
    await new SchemaMigrator({ db, logger }).run();
  } else {
    logger.info("skipping migrations: running as shard worker");
  }
  const redis = await connectRedis(config.redis, logger);
  const googleCloudTts = config.bot.googleCloudApiKey
    ? new GoogleCloudTtsClient({
        apiKey: config.bot.googleCloudApiKey,
        logger,
      })
    : null;
  const userPrefs = new UserPrefsRepository({ db, redis });
  const guildSettings = new GuildSettingsRepository({
    db,
    redis,
  });
  const localeResolver = new LocaleResolver({ userPrefs, guildSettings });
  const usageRepo = new UsageRepository({ db });
  const usage = new UsageService({
    repo: usageRepo,
    logger,
    monthlyLimit: config.bot.monthlyQuotaLimit,
  });
  const commandLogger = new CommandLoggerService({ db, logger });
  const ttsCache = new TtsCacheService({ logger, shardId: resolveShardId() });
  const voiceCatalog = new WavenetVoiceCatalog({
    client: googleCloudTts,
    logger,
  });
  const basicProvider = new BasicTtsProvider({ logger, cache: ttsCache });
  const wavenetProvider = new WavenetTtsProvider({
    client: googleCloudTts,
    cache: ttsCache,
    usage,
    logger,
  });
  const voice = new VoiceManager({
    logger,
    timeoutMs: config.bot.voiceTimeoutMinutes * Timeouts.OneMinute,
  });
  const player = new PlayerManager({
    logger,
    userPrefs,
    basic: basicProvider,
    wavenet: wavenetProvider,
    voice,
  });
  voice.setLeaveListener((guildId) => player.cleanup(guildId));
  const commands: Command[] = [
    new PingCommand({ localeResolver }),
    new HelpCommand({ localeResolver, getCommands: () => commands }),
    new JoinCommand({ localeResolver, voice }),
    new LeaveCommand({ localeResolver, voice }),
    new SayCommand({
      localeResolver,
      voice,
      player,
      commandLogger,
      usage,
    }),
    new SkipCommand({ localeResolver, voice, player }),
    new StopCommand({ localeResolver, voice, player }),
    new QueueCommand({ localeResolver, voice, player }),
    new VoiceCommand({ localeResolver, userPrefs }),
    new LanguageCommand({ localeResolver, userPrefs, guildSettings }),
    new ProfileCommand({ localeResolver, userPrefs, usage }),
  ];
  const componentHandlers: ComponentHandler[] = [
    new VoiceSettingsHandler({
      logger,
      userPrefs,
      localeResolver,
      voiceCatalog,
    }),
    new LanguageSettingsHandler({
      logger,
      userPrefs,
      guildSettings,
      localeResolver,
    }),
  ];
  const client = new BotClient({ token: config.bot.token });
  const router = new InteractionRouter({
    logger,
    commands,
    componentHandlers,
    localeResolver,
    commandLogger,
    interactionContext,
  });
  const readyHandler = new ReadyHandler({
    logger,
    presence: config.bot.presence,
    cache: ttsCache,
    voiceCatalog,
    player,
  });
  return {
    config,
    logger,
    interactionContext,
    db,
    redis,
    googleCloudTts,
    localeResolver,
    userPrefs,
    guildSettings,
    usageRepo,
    usage,
    commandLogger,
    ttsCache,
    voiceCatalog,
    basicProvider,
    wavenetProvider,
    voice,
    player,
    commands,
    componentHandlers,
    client,
    router,
    readyHandler,
  };
}

function resolveShardId(): number | null {
  const raw = process.env["SHARDS"] ?? process.env["SHARD_ID"];
  if (raw === undefined) return null;
  const parsed = Number.parseInt(raw, 10);
  return Number.isNaN(parsed) ? null : parsed;
}

async function connectRedis(
  config: { enabled: boolean; url: string },
  logger: Logger,
): Promise<RedisClient | null> {
  if (!config.enabled) return null;
  const client = new RedisClient({ url: config.url, logger });
  try {
    await client.connect();
    return client;
  } catch (err) {
    logger.warn("redis connection failed; continuing without cache", err);
    return null;
  }
}
