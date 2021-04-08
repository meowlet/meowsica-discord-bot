import { Client, Intents } from 'discord.js';

export const client = new Client({
  intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES],
});

client.once('ready', () => {
  console.log(`logged in as ${client.user?.tag}`);
});
