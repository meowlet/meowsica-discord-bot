import { Client, Collection, Intents } from 'discord.js';
import type { SlashCommand } from './shared/command';
import { pingCommand } from './features/misc/ping-command';
import { helpCommand } from './features/misc/help-command';

export const commands = new Collection<string, SlashCommand>([
  [pingCommand.data.name, pingCommand],
  [helpCommand.data.name, helpCommand],
]);

export const client = new Client({
  intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES],
});

client.once('ready', () => {
  console.log(`logged in as ${client.user?.tag}`);
});
