import Database from 'better-sqlite3';

const db = new Database('data/settings.db');
db.exec(`CREATE TABLE IF NOT EXISTS guild_settings (
  guild_id TEXT PRIMARY KEY,
  locale TEXT
)`);

export function getGuildLocale(guildId: string): string | null {
  const row = db.prepare('SELECT locale FROM guild_settings WHERE guild_id = ?').get(guildId) as
    | { locale: string | null }
    | undefined;
  return row?.locale ?? null;
}

export function setGuildLocale(guildId: string, locale: string): void {
  db.prepare(
    'INSERT INTO guild_settings (guild_id, locale) VALUES (?, ?) ON CONFLICT(guild_id) DO UPDATE SET locale = excluded.locale'
  ).run(guildId, locale);
}
