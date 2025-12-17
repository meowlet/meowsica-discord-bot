import { REST, Routes } from "discord.js";
import { commands } from "./commands/index.ts";

function getConfig() {
  const token = process.env.DISCORD_TOKEN;
  const clientId = process.env.DISCORD_CLIENT_ID;
  const guildId = process.env.DISCORD_GUILD_ID;

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
    console.log(
      `Started refreshing ${commandData.length} application commands.`
    );

    if (guildId) {
      // Guild commands (instant update, good for development)
      const data = await rest.put(
        Routes.applicationGuildCommands(clientId, guildId),
        { body: commandData }
      );
      console.log(
        `Successfully reloaded ${(data as unknown[]).length} guild commands.`
      );
    } else {
      // Global commands (takes up to 1 hour to update)
      const data = await rest.put(Routes.applicationCommands(clientId), {
        body: commandData,
      });
      console.log(
        `Successfully reloaded ${(data as unknown[]).length} global commands.`
      );
    }
  } catch (error) {
    console.error("Error deploying commands:", error);
    process.exit(1);
  }
}

deployCommands();
