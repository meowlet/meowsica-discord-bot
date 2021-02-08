const Discord = require('discord.js');

const client = new Discord.Client();

client.once('ready', () => {
  console.log(`logged in as ${client.user.tag}`);
});

module.exports = client;
