import { REST, Routes } from "discord.js";
import { commands } from "./commands.ts";
import { botLogger } from "./utils/logger.ts";

function getConfig() {
  const token = Bun.env["DISCORD_TOKEN"];
  const clientId = Bun.env["DISCORD_CLIENT_ID"];
  const guildId = Bun.env["DISCORD_GUILD_ID"];

  if (!token || !clientId) {
    throw new Error("DISCORD_TOKEN and DISCORD_CLIENT_ID are required");
  }

  return { token, clientId, guildId };
}

const { token, clientId, guildId } = getConfig();

const rest = new REST().setToken(token);

const commandData = commands.map((cmd) => cmd.data.toJSON());

async function deployCommands() {
  try {
    if (guildId) {
      await rest.put(Routes.applicationGuildCommands(clientId, guildId), {
        body: commandData,
      });
    } else {
      await rest.put(Routes.applicationCommands(clientId), {
        body: commandData,
      });
    }
  } catch (error) {
    botLogger.error("Error deploying commands:", error);
    process.exit(1);
  }
}

deployCommands();
