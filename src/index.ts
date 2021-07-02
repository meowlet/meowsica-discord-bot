import 'dotenv/config';
import { client } from './bot';

client.login(process.env.DISCORD_TOKEN);
