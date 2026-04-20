# Meowsica Discord Bot

Lightweight Discord bot built with Bun + TypeScript, focused on voice/TTS flows and Postgres-backed settings/quota/log data.

## Disclaimer

This repository is published as-is.
I do not provide setup guides, troubleshooting, or self-host support.

## Requirements

- Bun (latest stable)
- Docker + Docker Compose (recommended)
- Discord application credentials

## Quick Start

```bash
cp .env.example .env
docker compose up --build
```

Set at least these environment variables:

- `DISCORD_TOKEN`
- `DISCORD_CLIENT_ID`

`DATABASE_URL` is injected automatically by `docker-compose.yml` for the `bot` service.

## Sharding

Sharding is disabled by default.

Enable it with env flags:

- `ENABLE_SHARDING=true`
- `SHARD_COUNT=auto` (or a positive integer)

Docker example:

```bash
ENABLE_SHARDING=true SHARD_COUNT=auto docker compose up --build
```

## Local (Non-Docker)

If you intentionally run outside Docker:

```bash
bun install
bun run dev
```

Non-Docker sharding example:

```bash
ENABLE_SHARDING=true SHARD_COUNT=2 bun run start
```

## Core Commands

```bash
bun run start        # normal startup
bun run deploy       # register/update slash commands
bun run start:direct # run single process bot entry
```

## Runtime Shape

- `src/index.ts`: app entrypoint, reads env config, boots app or sharding manager.
- `src/bootstrap/`: wiring, startup, shutdown lifecycle.
- `src/features/`: domain features (tts, logs, quota, settings, etc.).
- `drizzle/`: SQL migrations; `drizzle.config.ts` configures schema + output.

## Notes

- App config is loaded from `src/config/index.ts`.
- Sharding is controlled via env flags (`ENABLE_SHARDING`, `SHARD_COUNT`).
