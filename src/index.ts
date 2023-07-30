import 'dotenv/config';
import { buildBot } from './bot';

async function main(): Promise<void> {
  const client = buildBot();
  await client.login(process.env.DISCORD_TOKEN);
}

main().catch((err) => {
  console.error('fatal', err);
  process.exit(1);
});
