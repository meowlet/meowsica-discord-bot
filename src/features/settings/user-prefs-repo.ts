import { getUserPrefs } from './internal/user-prefs-db';

export class UserPrefsRepo {
  async get(userId: string): Promise<{ locale: string | null; voiceId: string | null } | null> {
    return getUserPrefs(userId);
  }
}
