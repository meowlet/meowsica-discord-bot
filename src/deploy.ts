import 'dotenv/config';
import { REST } from '@discordjs/rest';
import { Routes } from 'discord-api-types/v9';

const rest = new REST({ version: '9' }).setToken(process.env.DISCORD_TOKEN ?? '');

async function run(): Promise<void> {
  await rest.put(Routes.applicationCommands(process.env.APP_ID ?? ''), { body: [] });
  console.log('commands deployed');
}

run().catch(console.error);
