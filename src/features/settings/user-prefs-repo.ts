import type { Db } from "../../infra/db.ts";
import type { RedisClient } from "../../infra/redis.ts";
import { MultiTierCache } from "../../shared/multi-tier-cache.ts";
import type { TtsProvider } from "../tts/types.ts";
import { DEFAULT_USER_TTS_PROFILE } from "../tts/types.ts";
import {
  UserPrefsDbAdapter,
  type UserPreferences,
  type UserPrefsFields,
} from "./internal/user-prefs-db.ts";

export type { UserPreferences } from "./internal/user-prefs-db.ts";

export interface UserPrefsRepoDeps {
  readonly db: Db;
  readonly redis?: RedisClient | null;
  readonly memoryTtlMs?: number;
  readonly memoryMaxEntries?: number;
}

const CACHE_PREFIX = "user:prefs:";
const CACHE_TTL_SECONDS = 5 * 60;
const DEFAULT_MEMORY_TTL_MS = 30_000;
const DEFAULT_MEMORY_MAX_ENTRIES = 5_000;

export class UserPrefsRepository {
  private readonly db: UserPrefsDbAdapter;
  private readonly cache: MultiTierCache<UserPreferences>;

  constructor(deps: UserPrefsRepoDeps) {
    this.db = new UserPrefsDbAdapter(deps.db);
    this.cache = new MultiTierCache<UserPreferences>({
      redis: deps.redis ?? null,
      keyPrefix: CACHE_PREFIX,
      memoryTtlMs: deps.memoryTtlMs ?? DEFAULT_MEMORY_TTL_MS,
      memoryMaxEntries: deps.memoryMaxEntries ?? DEFAULT_MEMORY_MAX_ENTRIES,
      redisTtlSeconds: CACHE_TTL_SECONDS,
    });
  }

  async get(userId: string): Promise<UserPreferences | null> {
    const cached = await this.cache.get(userId);
    if (cached !== undefined) return cached;
    const value = await this.db.findById(userId);
    await this.cache.set(userId, value);
    return value;
  }

  async getOrDefault(userId: string): Promise<UserPreferences> {
    const existing = await this.get(userId);
    if (existing) return existing;
    return {
      userId,
      uiLocale: null,
      tts: DEFAULT_USER_TTS_PROFILE,
    };
  }

  async setUiLocale(userId: string, locale: string | null): Promise<void> {
    await this.upsert(userId, { uiLocale: locale });
  }

  async setTtsProvider(userId: string, provider: TtsProvider): Promise<void> {
    await this.upsert(userId, { ttsProvider: provider });
  }

  async setTtsLanguage(userId: string, language: string | null): Promise<void> {
    await this.upsert(userId, { ttsLanguage: language });
  }

  async setTtsVoice(userId: string, voiceId: string | null): Promise<void> {
    await this.upsert(userId, { ttsVoiceId: voiceId });
  }

  async setTtsSpeed(userId: string, speed: number): Promise<void> {
    await this.upsert(userId, { ttsSpeed: speed });
  }

  async setTtsPitch(userId: string, pitch: number): Promise<void> {
    await this.upsert(userId, { ttsPitch: pitch });
  }

  async resetTuning(userId: string): Promise<void> {
    await this.upsert(userId, { ttsSpeed: 1.0, ttsPitch: 0.0 });
  }

  async upsertFields(userId: string, fields: UserPrefsFields): Promise<void> {
    if (Object.keys(fields).length === 0) return;
    await this.upsert(userId, fields);
  }

  invalidate(userId: string): void {
    void this.cache.invalidate(userId);
  }

  private async upsert(userId: string, fields: UserPrefsFields): Promise<void> {
    await this.db.upsert(userId, fields);
    await this.cache.invalidate(userId);
  }
}
