const {
  SlashCommandBuilder,
  ChannelType,
  PermissionFlagsBits
} = require("discord.js");

const GuildSetup = require("../models/GuildSetup");

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
        .setDescription("Eigene Typen mit Komma trennen")
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

    let setup = await GuildSetup.findOne({
      guildId: interaction.guild.id
    });

    if (!setup) {
      setup = new GuildSetup({
        guildId: interaction.guild.id
      });
    }

    const oldAkten =
      setup.akte && setup.akte.akten
        ? setup.akte.akten
        : {};

    setup.akte = {
      forumChannelId: forum.id,
      entryRoleId: role.id,
      typen,
      akten: oldAkten
    };

    setup.markModified("akte");
    await setup.save();

    return interaction.reply({
      content:
        `✅ Akten-System wurde gespeichert.\n` +
        `Forum: ${forum}\n` +
        `Eintrag-Rechte-Rolle: ${role}\n` +
        `Typen: ${typen.join(", ")}`,
      ephemeral: true
    });
  }
};