import { Client, Collection, Intents } from 'discord.js';
import type { SlashCommand } from './shared/command';
import { pingCommand } from './features/misc/ping-command';
import { helpCommand } from './features/misc/help-command';
import { joinCommand } from './features/voice/join-command';
import { leaveCommand } from './features/voice/leave-command';

export const commands = new Collection<string, SlashCommand>([
  [pingCommand.data.name, pingCommand],
  [helpCommand.data.name, helpCommand],
  [joinCommand.data.name, joinCommand],
  [leaveCommand.data.name, leaveCommand],
]);

export const client = new Client({
  intents: [
    Intents.FLAGS.GUILDS,
    Intents.FLAGS.GUILD_MESSAGES,
    Intents.FLAGS.GUILD_VOICE_STATES,
  ],
});

client.on('interactionCreate', async (interaction) => {
  if (!interaction.isCommand()) return;
  const command = commands.get(interaction.commandName);
  if (!command) return;
  try {
    await command.execute(interaction);
  } catch (err) {
    console.error('command error', err);
  }
});

client.once('ready', () => {
  console.log(`logged in as ${client.user?.tag}`);
});
