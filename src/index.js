require("dotenv").config();

const fs = require("fs");
const path = require("path");

const {
  Client,
  Collection,
  GatewayIntentBits,
  Partials
} = require("discord.js");

const connectMongo = require("./database/mongo");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.MessageContent
  ],

  partials: [
    Partials.Channel,
    Partials.Message,
    Partials.User,
    Partials.GuildMember
  ]
});

client.commands = new Collection();

// =========================
// COMMANDS LADEN
// =========================

const commandsPath = path.join(__dirname, "commands");

if (fs.existsSync(commandsPath)) {

  const commandFiles = fs
    .readdirSync(commandsPath)
    .filter(file => file.endsWith(".js"));

  for (const file of commandFiles) {

    const filePath = path.join(commandsPath, file);
    const command = require(filePath);

    if ("data" in command && "execute" in command) {

      client.commands.set(command.data.name, command);

      console.log(`✅ Command geladen: ${command.data.name}`);

    } else {

      console.log(`❌ Fehler bei Command: ${file}`);
    }
  }
}

// =========================
// EVENTS LADEN
// =========================

const eventsPath = path.join(__dirname, "events");

if (fs.existsSync(eventsPath)) {

  const eventFiles = fs
    .readdirSync(eventsPath)
    .filter(file => file.endsWith(".js"));

  for (const file of eventFiles) {

    const filePath = path.join(eventsPath, file);
    const event = require(filePath);

    if (event.once) {

      client.once(event.name, (...args) =>
        event.execute(...args)
      );

    } else {

      client.on(event.name, (...args) =>
        event.execute(...args)
      );
    }
  }
}

// =========================
// READY
// =========================

client.once("clientReady", () => {
  console.log(`✅ Eingeloggt als ${client.user.tag}`);
});

// =========================
// ERROR HANDLER
// =========================

process.on("unhandledRejection", error => {
  console.error("UNHANDLED REJECTION:", error);
});

process.on("uncaughtException", error => {
  console.error("UNCAUGHT EXCEPTION:", error);
});

// =========================
// MONGODB CONNECT
// =========================

connectMongo();

// =========================
// LOGIN
// =========================

client.login(process.env.TOKEN);