const {
  SlashCommandBuilder,
  ChannelType,
  PermissionFlagsBits
} = require("discord.js");

const GuildSetup = require("../models/GuildSetup");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("setup-strafe-nachtragen")
    .setDescription("Richtet das Strafe-Nachtragen-System ein")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)

    .addChannelOption(option =>
      option
        .setName("erinnerungs_forum")
        .setDescription("Forum für offene Nachzahlungen")
        .addChannelTypes(ChannelType.GuildForum)
        .setRequired(true)
    )

    .addRoleOption(option =>
      option
        .setName("ping_rolle")
        .setDescription("Rolle, die bei neuer Nachzahlung gepingt wird")
        .setRequired(true)
    )

    .addRoleOption(option =>
      option
        .setName("teamrolle")
        .setDescription("Rolle, die Strafen nachtragen und bestätigen darf")
        .setRequired(true)
    ),

  async execute(interaction) {
    const forum = interaction.options.getChannel("erinnerungs_forum");
    const pingRole = interaction.options.getRole("ping_rolle");
    const teamRole = interaction.options.getRole("teamrolle");

    await GuildSetup.collection.updateOne(
      { guildId: interaction.guild.id },
      {
        $set: {
          guildId: interaction.guild.id,
          strafeNachtragen: {
            forumChannelId: forum.id,
            pingRoleId: pingRole.id,
            teamRoleId: teamRole.id,
            offene: {}
          }
        }
      },
      { upsert: true }
    );

    return interaction.reply({
      content:
        `✅ Strafe-Nachtragen-System eingerichtet.\n` +
        `Forum: ${forum}\n` +
        `Ping-Rolle: ${pingRole}\n` +
        `Teamrolle: ${teamRole}`,
      ephemeral: true
    });
  }
};