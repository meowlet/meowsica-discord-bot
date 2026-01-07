/**
 * Command Deployment Script
 *
 * Supports two deployment modes:
 * - Development (default): Deploy to Guild + Clear Global zombie commands
 * - Production (NODE_ENV=production): Deploy to Global + Clear Guild commands
 *
 * This ensures "What is on Disk = What is on Discord"
 */

import { REST, Routes } from "discord.js";
import { commands } from "./commands.ts";
import { botLogger } from "./utils/logger.ts";

function getConfig() {
  const token = Bun.env["DISCORD_TOKEN"];
  const clientId = Bun.env["DISCORD_CLIENT_ID"];
  const guildId = Bun.env["DISCORD_GUILD_ID"];
  const isProduction = Bun.env["NODE_ENV"] === "production";

  if (!token || !clientId) {
    throw new Error("DISCORD_TOKEN and DISCORD_CLIENT_ID are required");
  }

  if (!isProduction && !guildId) {
    throw new Error("DISCORD_GUILD_ID is required for development mode");
  }

  return { token, clientId, guildId, isProduction };
}

async function deployCommands() {
  const { token, clientId, guildId, isProduction } = getConfig();
  const rest = new REST().setToken(token);
  const commandData = commands.map((cmd) => cmd.data.toJSON());

  botLogger.info(`Found ${commandData.length} commands to deploy`);
  botLogger.info(`Commands: ${commands.map((c) => c.data.name).join(", ")}`);

  try {
    if (isProduction) {
      // Production: Deploy to Global
      botLogger.info("[PRODUCTION] Deploying commands GLOBALLY...");
      await rest.put(Routes.applicationCommands(clientId), {
        body: commandData,
      });
      botLogger.info(`[PRODUCTION] Successfully deployed ${commandData.length} global commands`);

      // Optional: Clear guild-specific commands to prevent duplicates
      if (guildId) {
        botLogger.info("[PRODUCTION] Clearing guild-specific commands...");
        await rest.put(Routes.applicationGuildCommands(clientId, guildId), {
          body: [],
        });
        botLogger.info("[PRODUCTION] Guild commands cleared");
      }
    } else {
      // Development: Deploy to Guild ONLY
      botLogger.info(`[DEVELOPMENT] Deploying commands to Guild: ${guildId}...`);
      await rest.put(Routes.applicationGuildCommands(clientId, guildId!), {
        body: commandData,
      });
      botLogger.info(`[DEVELOPMENT] Successfully deployed ${commandData.length} guild commands`);

      // CRITICAL: Wipe Global commands to remove zombie/ghost commands
      botLogger.info("[DEVELOPMENT] Clearing potential Global zombie commands...");
      await rest.put(Routes.applicationCommands(clientId), {
        body: [],
      });
      botLogger.info("[DEVELOPMENT] Global commands cleared");
    }

    botLogger.info("Command deployment completed successfully!");
  } catch (error) {
    botLogger.error("Error deploying commands:", error);
    process.exit(1);
  }
}

deployCommands();
