# Meowsica Discord Bot - Context Dump

## 1. Project Overview & Tech Stack

### Core Frameworks
- **Discord.js v14.16.3**: Discord API client library
- **@discordjs/voice v0.19.0**: Voice connection and audio streaming
- **Bun Runtime**: JavaScript runtime (replaces Node.js)

### Language & Versions
- **TypeScript 5.7.2**: Primary language
- **ESNext**: Target compilation
- **Module System**: ESM (ES Modules)

### Key Libraries
- **@snazzah/davey**: Sharding manager wrapper
- **consola**: Structured logging
- **bun:sqlite**: Built-in SQLite database (Bun native)
- **bun:sqlite Database**: Persistent storage for user/server settings
- **sodium-native**: Voice encryption dependencies
- **glob**: File pattern matching

### Infrastructure
- **Docker Compose**: Redis service containerization
- **Redis 7.2**: Optional caching/state sharing for sharding (via Bun's RedisClient)
- **SQLite**: Local database (`settings.db`) for persistent settings
- **Sharding Support**: Horizontal scaling via Discord.js ShardingManager

## 2. Architecture & Design Patterns

### Architectural Style
**Modular Monolith with Event-Driven Architecture**
- Single codebase organized by feature domains
- Event handlers for Discord gateway events
- Command-based interaction pattern
- Service layer for cross-cutting concerns (Redis, database)

### Key Patterns Used
1. **Command Pattern**: All interactions via slash commands with unified `Command` interface
2. **Singleton Pattern**: RedisService, database connections, logger instances
3. **Factory Pattern**: `createBot()`, `createShardManager()`
4. **State Management**: In-memory Maps for guild voice states and TTS players
5. **Repository Pattern**: Settings abstraction (`settings/db.ts`, `settings/tts.ts`)
6. **Strategy Pattern**: TTS provider abstraction (currently Google TTS, extensible)

### Data Flow

```
Discord Gateway Event
  ↓
Event Handler (events/interaction.ts)
  ↓
Command Handler (handlers/commandHandler.ts)
  ↓
Command Execute Function
  ↓
Service Layer (voice/manager.ts, tts/player.ts, settings/db.ts)
  ↓
External APIs (Google TTS) / Database (SQLite) / Redis (optional)
```

**Example: `/say` command flow:**
1. User interaction → `handleInteraction()`
2. Command lookup → `handleCommand()`
3. Command execution → `say.execute()`
4. Validation → `validateTTSText()`, `getTTSLanguage()`
5. Voice connection → `joinChannel()` (if needed)
6. TTS queue → `queueTTS()` → `createTTSPayloads()`
7. Audio playback → `@discordjs/voice` AudioPlayer
8. Response → Discord embed reply

## 3. Directory Structure (Annotated)

```
/src
├── bot.ts                    # Bot client factory and startup
├── index.ts                  # Entry point (sharding vs direct mode)
├── deploy.ts                 # Command deployment script
├── commands.ts               # Command registry (exports all commands)
│
├── structs/                  # Core client structures
│   ├── BotClient.ts          # Extended Discord.js Client with config/sharding
│   └── ShardManager.ts       # Sharding manager wrapper
│
├── commands/                 # Slash command implementations
│   ├── config/               # Configuration commands (lang, voices)
│   ├── misc/                 # Utility commands (ping, help)
│   ├── tts/                  # TTS commands (say, stop, skip, queue)
│   └── voice/                # Voice channel commands (join, leave)
│
├── events/                   # Discord gateway event handlers
│   ├── ready.ts              # Bot ready event (presence updates)
│   ├── interaction.ts        # Command/autocomplete routing
│   └── guild.ts              # Guild join/leave (Redis cleanup)
│
├── handlers/                 # Request handlers
│   └── commandHandler.ts     # Command execution logic
│
├── tts/                      # Text-to-Speech core
│   ├── player.ts             # Audio queue management & playback
│   ├── provider.ts           # TTS URL generation (Google TTS)
│   └── voices.ts             # Voice language definitions (69 languages)
│
├── voice/                    # Voice channel management
│   └── manager.ts            # Connection lifecycle, timeouts, reconnection
│
├── settings/                 # Persistent settings layer
│   ├── db.ts                 # SQLite operations (user/server locale/voice)
│   └── tts.ts                # TTS language preferences
│
├── services/                 # External service integrations
│   └── RedisService.ts       # Redis client wrapper (optional, for sharding)
│
├── config/                   # Configuration management
│   └── index.ts              # Environment variable loading & validation
│
├── i18n/                     # Internationalization
│   ├── index.ts              # Translation resolver
│   └── locales/              # Translation files (en.ts, vi.ts)
│
├── types/                    # TypeScript type definitions
│   ├── command.ts            # Command interface
│   └── config.ts             # Configuration types
│
├── constants/                # Application constants
│   └── index.ts              # Colors, timeouts, defaults
│
└── utils/                    # Utility functions
    └── logger.ts             # Consola logger instances
```

## 4. Database & Data Model

### Schema Overview

**SQLite Database: `settings.db`**

#### `user_settings` Table
```sql
CREATE TABLE user_settings (
  user_id TEXT PRIMARY KEY,
  locale_language TEXT,        -- UI language preference (en, vi)
  voice_language TEXT,          -- Speech language preference (en, vi)
  tts_language TEXT,            -- TTS voice language code (e.g., "ja", "fr")
  created_at INTEGER DEFAULT (unixepoch()),
  updated_at INTEGER DEFAULT (unixepoch())
)
```

#### `server_settings` Table
```sql
CREATE TABLE server_settings (
  server_id TEXT PRIMARY KEY,
  locale_language TEXT,        -- Server-wide UI language
  voice_language TEXT,          -- Server-wide speech language
  tts_language TEXT,            -- Server-wide TTS language
  created_at INTEGER DEFAULT (unixepoch()),
  updated_at INTEGER DEFAULT (unixepoch())
)
```

### Relationships
- **No foreign keys**: Flat structure, keyed by Discord IDs
- **Cascade resolution**: User settings override server settings, fallback to `DEFAULT_LOCALE`/`DEFAULT_VOICE_LANGUAGE`
- **Migration strategy**: Schema evolution via try/catch ALTER TABLE (graceful column addition)

### Redis Schema (Optional, for Sharding)
- **Key Pattern**: `guild:settings:{guildId}` (hash)
- **Key Pattern**: `user:settings:{userId}` (hash)
- **Purpose**: Cross-shard state sharing (currently used for guild cleanup on leave)

## 5. Critical Implementation Details

### Authentication/Authorization
- **Discord Bot Token**: Environment variable `DISCORD_TOKEN`
- **Client ID**: Environment variable `DISCORD_CLIENT_ID` or `CLIENT_ID`
- **No custom auth**: Relies on Discord's OAuth2 bot authentication
- **Permission Checks**: Inline in commands (e.g., `ManageGuild` for server settings)

### State Management
- **In-Memory Maps**: 
  - `guildPlayers` (Map<string, GuildPlayerState>): Per-guild TTS queue/player state
  - `guildStates` (Map<string, GuildVoiceState>): Per-guild voice connection state
- **Persistent State**: SQLite for user/server preferences
- **Optional Shared State**: Redis for cross-shard coordination (when sharding enabled)

### API Structure
- **Interaction Type**: Discord Slash Commands (Application Commands)
- **Naming Convention**: kebab-case command names (`/say`, `/lang`)
- **Subcommands**: Grouped via subcommand groups (e.g., `/lang interface user`, `/lang speech server`)
- **Autocomplete**: Supported for language selection (`/say lang:`)

### TTS Provider Implementation
- **Current Provider**: Google Translate TTS (unofficial API)
- **Base URL**: `https://translate.google.com/translate_tts`
- **Text Processing**:
  - Max segment length: 200 characters
  - Smart splitting: Sentence-aware, then comma-aware, then hard split
  - Sanitization: Removes URLs, Discord mentions, markdown, emojis
- **Payload Structure**: `{ url: string, text: string, language: VoiceLanguageCode }`
- **Extensibility**: Provider abstraction ready (currently single implementation)

### Voice Connection Management
- **Connection Lifecycle**: 
  - Join → `joinVoiceChannel()` → Wait for `Ready` state (30s timeout)
  - Auto-reconnect: 5s timeout on disconnect
  - Timeout: Configurable via `VOICE_TIMEOUT_MINUTES` (default: 5 minutes)
- **State Tracking**: Per-guild connection + channel ID + timeout timer
- **Cleanup**: Automatic on destroy/disconnect, manual via `/leave` or timeout

### Sharding Architecture
- **Shard Manager**: Discord.js `ShardingManager` wrapper
- **Auto Sharding**: `SHARD_COUNT=auto` supported
- **Spawn Configuration**: 
  - Delay: 5000ms between shards
  - Timeout: 30s (configurable)
  - Exec: `bun --conditions=bun`
- **Redis Requirement**: Mandatory when `ENABLE_SHARDING=true`
- **Shard Communication**: Via `manager.broadcast()` (currently unused, placeholder)

## 6. Coding Conventions & Style Guide

### Naming Rules
- **Files**: kebab-case (e.g., `commandHandler.ts`, `BotClient.ts`)
- **Classes**: PascalCase (e.g., `BotClient`, `RedisService`)
- **Functions/Variables**: camelCase (e.g., `getLocale`, `guildStates`)
- **Constants**: UPPER_SNAKE_CASE (e.g., `DEFAULT_LOCALE`, `MAX_TEXT_LENGTH`)
- **Types/Interfaces**: PascalCase (e.g., `Command`, `BotConfig`)
- **Enums**: PascalCase with PascalCase values (e.g., `VoiceConnectionStatus`)

### Project Rules
1. **Type Safety**: 
   - Strict TypeScript (`strict: true`, `noUncheckedIndexedAccess: true`)
   - No `any` types (explicit types required)
   - Use `as const` for literal types
2. **Error Handling**: 
   - Try/catch in command handlers
   - Graceful degradation (Redis optional, SQLite fallback)
   - User-facing error messages via i18n
3. **Async/Await**: Prefer async/await over Promises
4. **Early Returns**: Use early returns for validation/guards
5. **Single Responsibility**: One function/class per concern
6. **Imports**: ESM syntax (`import/export`), no CommonJS
7. **Environment Variables**: All config via `Bun.env`, validated in `config/index.ts`
8. **Logging**: Tagged loggers (`botLogger`, `ttsLogger`, `commandLogger`)

### Strict Constraints
1. **DO NOT**:
   - Use Node.js APIs directly (use Bun equivalents: `bun:sqlite`, `Bun.env`, `Bun.sleep`)
   - Mix CommonJS and ESM
   - Hardcode Discord IDs or tokens
   - Access database without prepared statements (SQLite injection prevention)
   - Create multiple BotClient instances (use factory pattern)
   - Modify `guildPlayers`/`guildStates` Maps outside their modules
   - Use `any` type
   - Create documentation files (*.md) unless explicitly requested
   - Write tests unless explicitly requested

2. **MUST**:
   - Use `getLocale()` for user-facing text
   - Use `getTTSLanguage()` for TTS language resolution
   - Validate user input (language codes, text length)
   - Clean up voice connections on guild leave/timeout
   - Use prepared statements for SQLite queries
   - Handle Redis connection failures gracefully (sharding mode exception)

### Code Organization
- **Commands**: Export `Command` interface with `data`, `execute`, optional `autocomplete`
- **Events**: Pure functions taking `(client, event)` parameters
- **Services**: Singleton pattern with exported object (e.g., `RedisService`)
- **Settings**: Pure functions, no class instances
- **Types**: Centralized in `/types` directory

## 7. Current Progress & Missing Pieces

### What is Working
1. **Core Bot Functionality**:
   - Discord.js v14 integration
   - Slash command registration and handling
   - Voice channel joining/leaving
   - TTS queue system with multi-segment support
   - Audio playback via `@discordjs/voice`
   - User/server settings persistence (SQLite)
   - Internationalization (en, vi)
   - 69 TTS voice languages supported

2. **Sharding Support**:
   - Shard manager creation and spawning
   - Redis integration for cross-shard state
   - Shard lifecycle events (ready, disconnect, death, error)

3. **Commands Implemented**:
   - `/ping`: Latency check
   - `/help`: Command list
   - `/lang`: UI and speech language settings (user/server)
   - `/voices`: TTS language list
   - `/join`: Join voice channel
   - `/leave`: Leave voice channel
   - `/say`: Queue TTS message
   - `/stop`: Stop playback and clear queue
   - `/skip`: Skip current message
   - `/queue`: Show queue status

### What is WIP (Work In Progress)
1. **Redis Integration**:
   - Basic connection and hash operations implemented
   - Guild cleanup on leave implemented
   - Cross-shard communication not yet utilized (broadcast placeholder)
   - Settings sync across shards not implemented (SQLite is single-instance)

2. **TTS Provider**:
   - Currently hardcoded to Google TTS
   - Provider abstraction exists but single implementation
   - No provider switching mechanism

3. **Error Recovery**:
   - Basic error handling in place
   - Retry logic for Redis reconnection
   - Voice reconnection logic implemented
   - No exponential backoff for TTS API failures

### TODO/Next Steps
1. **Immediate**:
   - Implement cross-shard settings sync (Redis as source of truth, SQLite as cache)
   - Add TTS provider selection (user/server preference)
   - Implement TTS rate limiting/throttling
   - Add queue position display in `/say` response

2. **Short-term**:
   - Add more TTS providers (Microsoft, Amazon, OpenAI)
   - Implement voice selection per provider
   - Add queue management commands (remove specific item, shuffle)
   - Add TTS history/logging

3. **Long-term**:
   - Web dashboard for settings management
   - Analytics/metrics collection
   - Premium features (longer messages, custom voices)
   - Multi-language detection for automatic TTS language selection

### Known Limitations
1. **Google TTS**: Unofficial API, may be rate-limited or blocked
2. **SQLite**: Single-file database, not suitable for multi-instance deployments (use Redis for sharding)
3. **Text Length**: Hard limit of 2000 characters after sanitization
4. **Queue Size**: No maximum queue size limit (potential memory issue)
5. **Voice Timeout**: Fixed timeout per guild, no per-user tracking
6. **No Persistence**: TTS queue and voice state lost on restart (in-memory only)

### Migration Notes
- Legacy `discord-tts-bot/` directory exists (old JavaScript codebase)
- Current codebase is TypeScript rewrite in `/src`
- Database migration handled via try/catch ALTER TABLE (backward compatible)

---

**Generated**: 2024
**Codebase Version**: 1.0.0
**Last Analyzed**: Current state as of context dump generation

