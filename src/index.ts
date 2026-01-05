import { Client, Events, GatewayIntentBits } from "discord.js";
import { handleCommand, handleAutocomplete } from "./handlers/commandHandler.ts";
import { botLogger } from "./utils/logger.ts";

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates],
});

client.once(Events.ClientReady, (readyClient) => {
  botLogger.box(`Logged in as ${readyClient.user.tag}`);
});

client.on(Events.InteractionCreate, async (interaction) => {
  if (interaction.isChatInputCommand()) {
    await handleCommand(interaction);
  } else if (interaction.isAutocomplete()) {
    await handleAutocomplete(interaction);
  }
});

const token = Bun.env["DISCORD_TOKEN"];

if (!token) {
  throw new Error("DISCORD_TOKEN is not set in environment variables");
}

client.login(token);
