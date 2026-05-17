const {
  SlashCommandBuilder,
  ChannelType,
  PermissionFlagsBits
} = require("discord.js");

const fs = require("fs");
const path = require("path");

const dbPath = path.join(__dirname, "../database/akteSetups.json");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("setup-akte")
    .setDescription("Richtet das Akten-System ein")
    .setDefaultMemberPermissions(
      PermissionFlagsBits.Administrator |
      PermissionFlagsBits.KickMembers |
      PermissionFlagsBits.BanMembers
    )

    .addChannelOption(option =>
      option
        .setName("forum-kanal")
        .setDescription("Forum-Kanal für Akten")
        .addChannelTypes(ChannelType.GuildForum)
        .setRequired(true)
    )

    .addRoleOption(option =>
      option
        .setName("eintrag-rechte-rolle")
        .setDescription("Rolle, die Akten-Einträge erstellen darf")
        .setRequired(true)
    )

    .addStringOption(option =>
      option
        .setName("typen")
        .setDescription("Eintrags-Typen mit Komma trennen, z.B. Falsch Geschossen,Döner Party")
        .setRequired(true)
    ),

  async execute(interaction) {
    const forum = interaction.options.getChannel("forum-kanal");
    const role = interaction.options.getRole("eintrag-rechte-rolle");
    const typenInput = interaction.options.getString("typen");

    const typen = [...new Set(
      typenInput
        .split(",")
        .map(t => t.trim())
        .filter(Boolean)
    )];

    if (!typen.length) {
      return interaction.reply({
        content: "❌ Bitte gib mindestens einen Typ an.",
        ephemeral: true
      });
    }

    let db = {};

    if (fs.existsSync(dbPath)) {
      db = JSON.parse(fs.readFileSync(dbPath, "utf8"));
    }

    db[interaction.guild.id] = {
      forumChannelId: forum.id,
      entryRoleId: role.id,
      typen,
      akten: db[interaction.guild.id]?.akten || {}
    };

    fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));

    return interaction.reply({
      content: `✅ Akten-System eingerichtet.\nTypen: ${typen.join(", ")}`,
      ephemeral: true
    });
  }
};