import Database from 'better-sqlite3';

const db = new Database('data/settings.db');
db.exec(`CREATE TABLE IF NOT EXISTS user_prefs (
  user_id TEXT PRIMARY KEY,
  locale TEXT,
  voice_id TEXT
)`);

export function getUserPrefs(userId: string): { locale: string | null; voiceId: string | null } | null {
  const row = db.prepare('SELECT locale, voice_id AS voiceId FROM user_prefs WHERE user_id = ?').get(userId) as
    | { locale: string | null; voiceId: string | null }
    | undefined;
  return row ?? null;
}
