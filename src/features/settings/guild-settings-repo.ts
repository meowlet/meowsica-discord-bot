import { getGuildLocale, setGuildLocale } from './internal/guild-settings-db';

export class GuildSettingsRepo {
  async getLocale(guildId: string): Promise<string | null> {
    return getGuildLocale(guildId);
  }
  async setLocale(guildId: string, locale: string): Promise<void> {
    setGuildLocale(guildId, locale);
  }
}
