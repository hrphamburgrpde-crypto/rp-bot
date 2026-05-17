require("dotenv").config();

const {
  Client,
  Collection,
  GatewayIntentBits,
  EmbedBuilder
} = require("discord.js");

const fs = require("fs");
const path = require("path");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildPresences
  ]
});

client.commands = new Collection();

const commandFiles = [
  "./commands/setup-notruf.js",
  "./commands/setup-verify.js",
  "./commands/setup-duty.js",
  "./commands/setup-akte.js",
  "./commands/akten-eintrag.js"
];

for (const file of commandFiles) {
  const command = require(file);
  client.commands.set(command.data.name, command);
}

const event = require("./events/interactionCreate.js");

client.on(event.name, (...args) => event.execute(...args));

client.once("ready", () => {
  console.log(`✅ Eingeloggt als ${client.user.tag}`);
});

client.login(process.env.TOKEN);