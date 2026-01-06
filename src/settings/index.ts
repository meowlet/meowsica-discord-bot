import type { ChatInputCommandInteraction } from "discord.js";
import { DEFAULT_LOCALE, type Locale } from "../i18n/index.ts";
import {
  getUserLocale,
  getServerLocale,
  getUserVoice,
  getServerVoice,
} from "./db.ts";

export {
  setUserLocale,
  setServerLocale,
  setUserVoice,
  setServerVoice,
} from "./db.ts";







export function getLocale(interaction: ChatInputCommandInteraction): Locale {
  const userLocale = getUserLocale(interaction.user.id);
  if (userLocale) return userLocale;

  if (interaction.guildId) {
    const serverLocale = getServerLocale(interaction.guildId);
    if (serverLocale) return serverLocale;
  }

  return DEFAULT_LOCALE;
}







export function getVoiceLanguage(interaction: ChatInputCommandInteraction): Locale {
  const userVoice = getUserVoice(interaction.user.id);
  if (userVoice) return userVoice;

  if (interaction.guildId) {
    const serverVoice = getServerVoice(interaction.guildId);
    if (serverVoice) return serverVoice;
  }

  return DEFAULT_LOCALE;
}
