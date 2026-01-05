# Google TTS Migration Guide

This document describes the migration of the Google Text-to-Speech feature from the legacy `discord-tts-bot` codebase to the modern `meowsica-discord-bot` architecture.

## Overview

### What Changed

| Aspect | Legacy | New |
|--------|--------|-----|
| Language | JavaScript | TypeScript |
| Framework | @greencoast/discord.js-extended | Native discord.js v14 |
| Database | LevelDB / Redis | SQLite (bun:sqlite) |
| TTS Provider | google-tts-api package | Direct Google Translate API |
| UI Languages | English, Spanish, French | English, Vietnamese |
| TTS Voice Languages | 47 languages | 47 languages (unchanged) |
| Runtime | Node.js | Bun |

### Key Architecture Decisions

1. **Simplified UI Localization**: Reduced from 3 languages to 2 (English + Vietnamese) for easier maintenance.

2. **Full TTS Voice Support**: All 47 Google TTS voice languages are preserved.

3. **Separation of Concerns**: UI language (what the bot says) is separate from TTS voice language (what accent the TTS speaks in).

4. **Queue System**: Per-guild message queues with skip functionality.

5. **Direct API Calls**: Instead of using the `google-tts-api` npm package, we make direct calls to Google Translate's TTS endpoint for better control and fewer dependencies.

## File Structure

```
src/
├── tts/
│   ├── index.ts          # Module exports
│   ├── voices.ts         # Voice language configuration (47 languages)
│   ├── provider.ts       # Google TTS API integration
│   └── player.ts         # Queue and playback management
├── commands/
│   ├── say.ts            # /say command
│   ├── stop.ts           # /stop command
│   ├── skip.ts           # /skip command
│   ├── voices.ts         # /voices command
│   └── queue.ts          # /queue command
├── settings/
│   └── tts.ts            # TTS language preferences
└── i18n/locales/
    ├── en.ts             # English translations
    └── vi.ts             # Vietnamese translations
```

## Commands

### New TTS Commands

| Command | Description | Legacy Equivalent |
|---------|-------------|-------------------|
| `/say <message> [lang]` | Speak text in voice channel | `/google_say`, `/say` |
| `/stop` | Stop playback and leave channel | `/stop`, `/leave` |
| `/skip` | Skip current message | New feature |
| `/voices [page]` | List available TTS languages | `/google_langs` |
| `/queue` | Show current queue | New feature |

### Command Changes

1. **Unified Say Command**: Instead of separate commands per provider (`/google_say`, `/amazon_say`), there's now a single `/say` command. Google TTS is the default (and only) provider.

2. **Language Option**: The `/say` command accepts an optional `lang` parameter with autocomplete support.

3. **Default Language**: Users can set their default TTS language via `/lang speech user <language>`.

## Settings Hierarchy

TTS language is resolved in this order:

1. Command option (`/say lang:ja`)
2. User preference (`/lang speech user`)
3. Server preference (`/lang speech server`)
4. Default (`en`)

## Database Schema

New column added to existing tables:

```sql
-- Added to user_settings
tts_language TEXT

-- Added to server_settings
tts_language TEXT
```

## Supported TTS Voice Languages

All 47 Google TTS languages are supported:

| Code | Language | Code | Language |
|------|----------|------|----------|
| af | Afrikaans | ko | Korean |
| ar | Arabic | lv | Latvian |
| bn | Bengali | ml | Malayalam |
| ca | Catalan | mr | Marathi |
| cmn | Chinese (Mandarin) | nb | Norwegian |
| cs | Czech | ne | Nepali |
| da | Danish | nl | Dutch |
| de | German | pl | Polish |
| el | Greek | pt | Portuguese |
| en | English | ro | Romanian |
| es | Spanish | ru | Russian |
| fi | Finnish | si | Sinhala |
| fil | Filipino | sk | Slovak |
| fr | French | sr | Serbian |
| hi | Hindi | su | Sundanese |
| hr | Croatian | sv | Swedish |
| hu | Hungarian | sw | Swahili |
| hy | Armenian | ta | Tamil |
| id | Indonesian | te | Telugu |
| is | Icelandic | th | Thai |
| it | Italian | tr | Turkish |
| ja | Japanese | uk | Ukrainian |
| jv | Javanese | vi | Vietnamese |
| km | Khmer | | |

## Migration Steps

### For Bot Operators

1. **Deploy Commands**: Run `bun run deploy` to register the new slash commands.

2. **Database Migration**: The new `tts_language` columns are created automatically on startup.

3. **User Communication**: Inform users about the new command structure:
   - `/google_say` → `/say`
   - `/google_langs` → `/voices`
   - `/google_set_my language <code>` → `/lang speech user`
   - `/google_set_default language <code>` → `/lang speech server`

### For Developers

1. **Import TTS Module**:
   ```typescript
   import { queueTTS, isValidVoiceLanguage } from "../tts/index.ts";
   ```

2. **Queue a TTS Message**:
   ```typescript
   const { queued, position } = queueTTS(guildId, "Hello world", "en", userId);
   ```

3. **Get User's TTS Language**:
   ```typescript
   import { getTTSLanguage } from "../settings/tts.ts";
   const lang = getTTSLanguage(interaction);
   ```

## Removed Features

The following legacy features were NOT migrated:

1. **Multiple TTS Providers**: Amazon, Microsoft, and Aeiou providers were removed. Only Google TTS remains.

2. **Channel-Based TTS**: The `ENABLE_TTS_CHANNELS` feature (auto-TTS for messages in specific channels) was not migrated.

3. **Speed Setting**: The slow/normal speed toggle was removed for simplicity.

4. **Prefix Commands**: Only slash commands are supported.

5. **Spanish/French UI**: Only English and Vietnamese UI languages are available.

## Performance Improvements

1. **Direct API Calls**: Removed dependency on `google-tts-api` package, making requests directly.

2. **Text Splitting**: Improved algorithm for splitting long messages at sentence boundaries.

3. **Bun Runtime**: Faster startup and execution compared to Node.js.

4. **SQLite**: Faster and simpler than LevelDB for single-instance deployments.

## Error Handling

- URL sanitization removes links from TTS input
- Discord mentions are converted to readable text
- Markdown formatting is stripped
- Empty messages after sanitization are rejected
- Per-guild queue isolation prevents cross-talk

## Testing

Run the bot locally:

```bash
bun run dev
```

Test commands:
1. `/voices` - Should show paginated language list
2. `/say message:Hello` - Should speak in default language
3. `/say message:こんにちは lang:ja` - Should speak in Japanese
4. `/queue` - Should show current queue
5. `/skip` - Should skip current message
6. `/stop` - Should stop and leave channel

## Troubleshooting

### Bot joins but doesn't speak
- Check that the bot has permission to speak in the voice channel
- Verify `selfMute: false` in voice connection settings

### "Invalid language code" error
- Use `/voices` to see valid codes
- Language codes are case-sensitive (use `ja`, not `JA`)

### Audio cuts off
- Long messages are split into segments automatically
- If still cutting off, the Google API may be rate limiting

### Queue not advancing
- Check logs for audio player errors
- Verify network connectivity to Google's servers
