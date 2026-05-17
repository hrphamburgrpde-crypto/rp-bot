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

async function getOrCreateAkteThread(interaction, db, setup, user) {
  if (!setup.akten) setup.akten = {};

  const savedThreadId = setup.akten[user.id];

  if (savedThreadId) {
    const oldThread = await interaction.guild.channels.fetch(savedThreadId).catch(() => null);
    if (oldThread) return oldThread;
  }

  const forum = await interaction.guild.channels.fetch(setup.forumChannelId);
  const username = user.username.replace(/[^a-zA-Z0-9-_äöüÄÖÜß]/g, "");

  const thread = await forum.threads.create({
    name: `Akte-${username}`,
    message: {
      embeds: [
        new EmbedBuilder()
          .setTitle(`📁 Akte von ${user.username}`)
          .setDescription(`Gemeinsame Akte für Einträge von ${user}.`)
          .setColor("Blue")
      ]
    }
  });

  setup.akten[user.id] = thread.id;
  db[interaction.guild.id] = setup;
  saveDb(db);

  return thread;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("akten-eintrag")
    .setDescription("Erstellt einen Eintrag in einer Akte")

    .addUserOption(option =>
      option
        .setName("person")
        .setDescription("Person")
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

    const person = interaction.options.getUser("person");
    const typ = interaction.options.getString("typ");
    const beschreibung = interaction.options.getString("beschreibung");
    const strafe = interaction.options.getString("strafe");

    const allowedTypes = setup.typen || [];

    const typeExists = allowedTypes.some(
      type => type.toLowerCase() === typ.toLowerCase()
    );

    if (!typeExists) {
      return interaction.reply({
        content: `❌ Diesen Typ gibt es nicht.\nErlaubte Typen: ${allowedTypes.join(", ")}`,
        ephemeral: true
      });
    }

    const finalTyp = allowedTypes.find(
      type => type.toLowerCase() === typ.toLowerCase()
    );

    const timestamp = Math.floor(Date.now() / 1000);
    const thread = await getOrCreateAkteThread(interaction, db, setup, person);

    const embed = new EmbedBuilder()
      .setTitle(`📄 ${finalTyp}`)
      .setColor("Orange")
      .addFields(
        { name: "Person", value: `${person}`, inline: true },
        { name: "Eingetragen von", value: `${interaction.user}`, inline: true },
        { name: "Zeitpunkt", value: `<t:${timestamp}:F>`, inline: false },
        { name: "Beschreibung", value: beschreibung, inline: false },
        { name: "Strafe / Maßnahme", value: strafe, inline: false }
      );

    await thread.send({ embeds: [embed] });

    return interaction.reply({
      content: `✅ Eintrag wurde erstellt: ${thread}`,
      ephemeral: true
    });
  }
};