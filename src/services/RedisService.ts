






import { RedisClient } from "bun";
import { getRedisConfig, type RedisConfig } from "../config/index.ts";
import { logger } from "../utils/logger.ts";

const redisLogger = logger.withTag("REDIS");

interface RedisServiceState {
  client: RedisClient | null;
  isConnected: boolean;
  reconnectAttempts: number;
}

const state: RedisServiceState = {
  client: null,
  isConnected: false,
  reconnectAttempts: 0,
};

let config: RedisConfig | null = null;




async function connect(): Promise<RedisClient> {
  if (state.client && state.isConnected) {
    return state.client;
  }

  config = getRedisConfig();
  redisLogger.info("Connecting to Redis...");

  try {
    
    state.client = new RedisClient(config.url, {
      autoReconnect: true,
      maxRetries: config.maxRetries,
      enableOfflineQueue: true,
    });

    
    state.client.onconnect = () => {
      state.isConnected = true;
      state.reconnectAttempts = 0;
      redisLogger.success("Connected to Redis");
    };

    state.client.onclose = (error) => {
      state.isConnected = false;
      if (error) {
        redisLogger.error("Redis connection closed with error:", error);
      } else {
        redisLogger.info("Redis connection closed");
      }
    };

    
    await state.client.connect();
    state.isConnected = true;
    state.reconnectAttempts = 0;

    redisLogger.success("Connected to Redis");
    return state.client;
  } catch (error) {
    state.isConnected = false;
    redisLogger.error("Failed to connect to Redis:", error);
    throw error;
  }
}




async function reconnect(): Promise<void> {
  if (!config) {
    config = getRedisConfig();
  }

  while (state.reconnectAttempts < config.maxRetries) {
    state.reconnectAttempts++;
    const delay = config.retryDelay * Math.pow(2, state.reconnectAttempts - 1);

    redisLogger.warn(
      `Reconnecting to Redis (attempt ${state.reconnectAttempts}/${config.maxRetries}) in ${delay}ms...`
    );

    await Bun.sleep(delay);

    try {
      await connect();
      return;
    } catch {
      
    }
  }

  redisLogger.error("Max reconnection attempts reached. Redis unavailable.");
}




async function getClient(): Promise<RedisClient> {
  if (!state.client || !state.isConnected) {
    return await connect();
  }
  return state.client;
}




function disconnect(): void {
  if (state.client) {
    try {
      state.client.close();
      redisLogger.info("Disconnected from Redis");
    } catch (error) {
      redisLogger.error("Error disconnecting from Redis:", error);
    } finally {
      state.client = null;
      state.isConnected = false;
    }
  }
}




function isConnected(): boolean {
  return state.isConnected && state.client !== null;
}








async function get(key: string): Promise<string | null> {
  const client = await getClient();
  try {
    return await client.get(key);
  } catch (error) {
    redisLogger.error(`Error getting key ${key}:`, error);
    await reconnect();
    throw error;
  }
}




async function set(key: string, value: string, ttlSeconds?: number): Promise<void> {
  const client = await getClient();
  try {
    await client.set(key, value);
    if (ttlSeconds) {
      await client.expire(key, ttlSeconds);
    }
  } catch (error) {
    redisLogger.error(`Error setting key ${key}:`, error);
    await reconnect();
    throw error;
  }
}




async function del(key: string): Promise<number> {
  const client = await getClient();
  try {
    return await client.del(key);
  } catch (error) {
    redisLogger.error(`Error deleting key ${key}:`, error);
    await reconnect();
    throw error;
  }
}




async function exists(key: string): Promise<boolean> {
  const client = await getClient();
  try {
    return await client.exists(key);
  } catch (error) {
    redisLogger.error(`Error checking key ${key}:`, error);
    await reconnect();
    throw error;
  }
}








async function hget(key: string, field: string): Promise<string | null> {
  const client = await getClient();
  try {
    return await client.hget(key, field);
  } catch (error) {
    redisLogger.error(`Error getting hash field ${key}:${field}:`, error);
    await reconnect();
    throw error;
  }
}




async function hset(key: string, field: string, value: string): Promise<number> {
  const client = await getClient();
  try {
    
    const result = await client.send("HSET", [key, field, value]);
    return result as number;
  } catch (error) {
    redisLogger.error(`Error setting hash field ${key}:${field}:`, error);
    await reconnect();
    throw error;
  }
}




async function hgetall(key: string): Promise<Record<string, string>> {
  const client = await getClient();
  try {
    const result = await client.send("HGETALL", [key]);
    
    if (!Array.isArray(result)) {
      return {};
    }
    const obj: Record<string, string> = {};
    for (let i = 0; i < result.length; i += 2) {
      const field = result[i] as string;
      const value = result[i + 1] as string;
      if (field) {
        obj[field] = value ?? "";
      }
    }
    return obj;
  } catch (error) {
    redisLogger.error(`Error getting all hash fields ${key}:`, error);
    await reconnect();
    throw error;
  }
}

/**
 * Delete a hash field using raw command
 */
async function hdel(key: string, field: string): Promise<number> {
  const client = await getClient();
  try {
    const result = await client.send("HDEL", [key, field]);
    return result as number;
  } catch (error) {
    redisLogger.error(`Error deleting hash field ${key}:${field}:`, error);
    await reconnect();
    throw error;
  }
}








async function publish(channel: string, message: string): Promise<number> {
  const client = await getClient();
  try {
    return await client.publish(channel, message);
  } catch (error) {
    redisLogger.error(`Error publishing to channel ${channel}:`, error);
    await reconnect();
    throw error;
  }
}





const GUILD_SETTINGS_PREFIX = "guild:settings:";
const USER_SETTINGS_PREFIX = "user:settings:";

function guildKey(guildId: string): string {
  return `${GUILD_SETTINGS_PREFIX}${guildId}`;
}

function userKey(userId: string): string {
  return `${USER_SETTINGS_PREFIX}${userId}`;
}




async function getGuildSettings(guildId: string): Promise<Record<string, string> | null> {
  try {
    const data = await hgetall(guildKey(guildId));
    return Object.keys(data).length > 0 ? data : null;
  } catch {
    return null;
  }
}




async function setGuildSetting(guildId: string, field: string, value: string): Promise<void> {
  await hset(guildKey(guildId), field, value);
}




async function getUserSettings(userId: string): Promise<Record<string, string> | null> {
  try {
    const data = await hgetall(userKey(userId));
    return Object.keys(data).length > 0 ? data : null;
  } catch {
    return null;
  }
}




async function setUserSetting(userId: string, field: string, value: string): Promise<void> {
  await hset(userKey(userId), field, value);
}




async function clearGuildSettings(guildId: string): Promise<void> {
  await del(guildKey(guildId));
}





export const RedisService = {
  
  connect,
  disconnect,
  isConnected,
  reconnect,
  
  get,
  set,
  del,
  exists,
  
  hget,
  hset,
  hgetall,
  hdel,
  
  publish,
  
  getGuildSettings,
  setGuildSetting,
  getUserSettings,
  setUserSetting,
  clearGuildSettings,
};
