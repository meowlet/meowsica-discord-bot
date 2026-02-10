import type { PresenceData } from "discord.js";
import type { BotConfig } from "../types/config.ts";

let currentPresence: PresenceData | null = null;

/**
 * Initialize store from config (call once at startup).
 */
export function initPresenceFromConfig(config: BotConfig): void {
  currentPresence = {
    status: config.presenceStatus,
    activities: [
      {
        name: config.presenceActivityName,
        type: config.presenceActivityType,
      },
    ],
  };
}

/**
 * Get current presence for applying to client.
 */
export function getPresence(): PresenceData | null {
  return currentPresence;
}
