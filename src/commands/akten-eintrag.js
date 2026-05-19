const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder
} = require("discord.js");

const fs = require("fs");
const path = require("path");

const dbPath = path.join(__dirname, "../database/akteSetups.json");

function saveDb(db) {
  fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));
}

function cleanName(name) {
  return String(name || "Unbekannt")
    .replace(/[^a-zA-Z0-9-_äöüÄÖÜß]/g, "");
}

async function getOrCreateAkteThread(
  interaction,
  db,
  setup,
  robloxUsername,
  discordUser = null
) {
  if (!setup.akten) setup.akten = {};

  const safeRoblox = String(robloxUsername || "Unbekannt");

  const akteKey = `roblox_${safeRoblox.toLowerCase()}`;

  const savedThreadId = setup.akten[akteKey];

  if (savedThreadId) {
    const oldThread = await interaction.guild.channels
      .fetch(savedThreadId)
      .catch(() => null);

    if (oldThread) return oldThread;
  }

  const forum = await interaction.guild.channels.fetch(setup.forumChannelId);

  const safeName = cleanName(safeRoblox);

  const thread = await forum.threads.create({
    name: `Akte-${safeName}`,
    message: {
      embeds: [
        new EmbedBuilder()
          .setTitle(`📁 Akte von ${safeRoblox}`)
          .setDescription(
            discordUser
              ? `Akte für Roblox-User **${safeRoblox}** / Discord: ${discordUser}`
              : `Akte für Roblox-User **${safeRoblox}**`
          )
          .setColor("Blue")
      ]
    }
  });

  setup.akten[akteKey] = thread.id;

  db[interaction.guild.id] = setup;

  saveDb(db);

  return thread;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("akten-eintrag")
    .setDescription("Erstellt einen Eintrag in einer Akte")

    .addStringOption(option =>
      option
        .setName("roblox_username")
        .setDescription("Roblox Username")
        .setRequired(true)
    )

    .addStringOption(option =>
      option
        .setName("typ")
        .setDescription("Typ auswählen")
        .setAutocomplete(true)
        .setRequired(true)
    )

    .addStringOption(option =>
      option
        .setName("beschreibung")
        .setDescription("Beschreibung")
        .setRequired(true)
    )

    .addStringOption(option =>
      option
        .setName("strafe")
        .setDescription("Strafe / Maßnahme")
        .setRequired(true)
    )

    .addUserOption(option =>
      option
        .setName("discord_user")
        .setDescription("Discord User optional")
        .setRequired(false)
    ),

  async autocomplete(interaction) {
    if (!fs.existsSync(dbPath)) {
      return interaction.respond([]);
    }

    const db = JSON.parse(fs.readFileSync(dbPath, "utf8"));

    const setup = db[interaction.guild.id];

    if (!setup || !setup.typen) {
      return interaction.respond([]);
    }

    const focused = interaction.options.getFocused().toLowerCase();

    const choices = setup.typen
      .filter(type => type.toLowerCase().includes(focused))
      .slice(0, 25)
      .map(type => ({
        name: type,
        value: type
      }));

    return interaction.respond(choices);
  },

  async execute(interaction) {
    if (!fs.existsSync(dbPath)) {
      return interaction.reply({
        content: "❌ Akten-System wurde nicht eingerichtet.",
        ephemeral: true
      });
    }

    const db = JSON.parse(fs.readFileSync(dbPath, "utf8"));

    const setup = db[interaction.guild.id];

    if (!setup) {
      return interaction.reply({
        content: "❌ Akten-System wurde nicht eingerichtet.",
        ephemeral: true
      });
    }

    const hasPermission =
      interaction.member.permissions.has(PermissionFlagsBits.Administrator) ||
      interaction.member.roles.cache.has(setup.entryRoleId);

    if (!hasPermission) {
      return interaction.reply({
        content: "❌ Keine Rechte.",
        ephemeral: true
      });
    }

    const robloxUsername =
      interaction.options.getString("roblox_username") ||
      interaction.options.getString("roblox-user") ||
      interaction.options.getString("roblox") ||
      "Unbekannt";

    const typ = interaction.options.getString("typ");
    const beschreibung = interaction.options.getString("beschreibung");
    const strafe = interaction.options.getString("strafe");
    const discordUser = interaction.options.getUser("discord_user");

    const allowedTypes = setup.typen || [];

    const finalTyp = allowedTypes.find(
      type => type.toLowerCase() === typ.toLowerCase()
    );

    if (!finalTyp) {
      return interaction.reply({
        content:
          `❌ Diesen Typ gibt es nicht.\n\n` +
          `Erlaubte Typen:\n${allowedTypes.join(", ")}`,
        ephemeral: true
      });
    }

    const timestamp = Math.floor(Date.now() / 1000);

    const thread = await getOrCreateAkteThread(
      interaction,
      db,
      setup,
      robloxUsername,
      discordUser
    );

    const embed = new EmbedBuilder()
      .setTitle(`📄 ${finalTyp}`)
      .setColor("Orange")
      .addFields(
        {
          name: "Roblox Username",
          value: robloxUsername,
          inline: true
        },
        {
          name: "Discord User",
          value: discordUser ? `${discordUser}` : "Nicht angegeben",
          inline: true
        },
        {
          name: "Eingetragen von",
          value: `${interaction.user}`,
          inline: true
        },
        {
          name: "Zeitpunkt",
          value: `<t:${timestamp}:F>`,
          inline: false
        },
        {
          name: "Beschreibung",
          value: beschreibung,
          inline: false
        },
        {
          name: "Strafe / Maßnahme",
          value: strafe,
          inline: false
        }
      );

    await thread.send({
      embeds: [embed]
    });

    return interaction.reply({
      content: `✅ Eintrag wurde erstellt: ${thread}`,
      ephemeral: true
    });
  }
};