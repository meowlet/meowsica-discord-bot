import { Client, Events, GatewayIntentBits } from "discord.js";
import { handleCommand } from "./handlers/commandHandler.ts";
import { botLogger } from "./utils/logger.ts";

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates],
});

client.once(Events.ClientReady, (readyClient) => {
  botLogger.box(`Logged in as ${readyClient.user.tag}`);
});

client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) return;
  await handleCommand(interaction);
});

const token = Bun.env["DISCORD_TOKEN"];

if (!token) {
  throw new Error("DISCORD_TOKEN is not set in environment variables");
}

client.login(token);
