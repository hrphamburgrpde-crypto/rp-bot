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

const eventFiles = [
  "./events/interactionCreate.js"
];

for (const file of eventFiles) {
  const event = require(file);

  if (event.once) {
    client.once(event.name, (...args) => event.execute(...args));
  } else {
    client.on(event.name, (...args) => event.execute(...args));
  }
}

const dutyDbPath = path.join(__dirname, "database/dutySetups.json");

client.on("presenceUpdate", async (oldPresence, newPresence) => {
  try {
    if (!newPresence || newPresence.status !== "offline") return;
    if (!fs.existsSync(dutyDbPath)) return;

    const db = JSON.parse(fs.readFileSync(dutyDbPath, "utf8"));
    const setup = db[newPresence.guild.id];

    if (!setup || !setup.activeUsers?.[newPresence.userId]) return;

    const member = await newPresence.guild.members
      .fetch(newPresence.userId)
      .catch(() => null);

    const now = Math.floor(Date.now() / 1000);
    const since = setup.activeUsers[newPresence.userId].since;

    if (member) {
      await member.roles.remove(setup.onDutyRoleId).catch(() => {});

      if (setup.offDutyRoleId) {
        await member.roles.add(setup.offDutyRoleId).catch(() => {});
      }
    }

    delete setup.activeUsers[newPresence.userId];

    db[newPresence.guild.id] = setup;

    fs.writeFileSync(dutyDbPath, JSON.stringify(db, null, 2));

    const logChannel = await newPresence.guild.channels
      .fetch(setup.logChannelId)
      .catch(() => null);

    if (logChannel) {
      await logChannel.send({
        embeds: [
          new EmbedBuilder()
            .setTitle("⚫ Automatisch ausgecheckt")
            .setDescription(
              `<@${newPresence.userId}> ist offline gegangen und wurde automatisch ausgecheckt.`
            )
            .addFields(
              {
                name: "Eingecheckt seit",
                value: `<t:${since}:F>`,
                inline: false
              },
              {
                name: "Ausgecheckt um",
                value: `<t:${now}:F>`,
                inline: false
              }
            )
            .setColor("DarkGrey")
        ]
      });
    }
  } catch (err) {
    console.error(err);
  }
});

client.once("ready", () => {
  console.log(`✅ Eingeloggt als ${client.user.tag}`);
});

client.login(process.env.TOKEN);