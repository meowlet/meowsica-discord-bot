require('dotenv').config();
const client = require('./bot');

client.login(process.env.DISCORD_TOKEN);
