import 'dotenv/config';

export const config = {
  token: process.env.DISCORD_TOKEN ?? '',
  prefix: process.env.BOT_PREFIX ?? '!',
};
