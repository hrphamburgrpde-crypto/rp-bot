const {
  SlashCommandBuilder,
  ChannelType,
  PermissionFlagsBits,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} = require("discord.js");

const GuildSetup = require("../models/GuildSetup");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("setup-notruf")
    .setDescription("Erstellt ein Notruf-System")
    .setDefaultMemberPermissions(
      PermissionFlagsBits.Administrator |
      PermissionFlagsBits.KickMembers |
      PermissionFlagsBits.BanMembers
    )
    .addChannelOption(option =>
      option
        .setName("kanal")
        .setDescription("Kanal für das Notruf-Panel")
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(true)
    )
    .addRoleOption(option =>
      option
        .setName("leitstellen-rolle")
        .setDescription("Rolle, die Notruf-Kanäle sehen und schreiben darf")
        .setRequired(true)
    )
    .addRoleOption(option =>
      option
        .setName("einsatz-rolle")
        .setDescription("Rolle, die Ausrücken darf")
        .setRequired(true)
    )
    .addChannelOption(option =>
      option
        .setName("kategorie-notrufe")
        .setDescription("Kategorie für Notruf-Kanäle")
        .addChannelTypes(ChannelType.GuildCategory)
        .setRequired(true)
    )
    .addChannelOption(option =>
      option
        .setName("benachrichtigungs-kanal")
        .setDescription("Kanal für Einsatz-Benachrichtigungen")
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(true)
    )
    .addStringOption(option =>
      option
        .setName("buttons")
        .setDescription("Buttons getrennt mit Komma, z.B. Notruf,Feuerwehr")
        .setRequired(true)
    ),

  async execute(interaction) {
    const kanal = interaction.options.getChannel("kanal");
    const leitstellenRole = interaction.options.getRole("leitstellen-rolle");
    const einsatzRole = interaction.options.getRole("einsatz-rolle");
    const kategorie = interaction.options.getChannel("kategorie-notrufe");
    const notifyChannel = interaction.options.getChannel("benachrichtigungs-kanal");
    const buttonsInput = interaction.options.getString("buttons");

    const buttons = [...new Set(
      buttonsInput.split(",").map(b => b.trim()).filter(Boolean)
    )].slice(0, 5);

    if (!buttons.length) {
      return interaction.reply({
        content: "❌ Bitte gib mindestens einen Button an.",
        ephemeral: true
      });
    }

    const embed = new EmbedBuilder()
      .setTitle("📞 Notruf-System")
      .setDescription("Wähle unten den passenden Notruf aus.")
      .setColor("Red");

    const row = new ActionRowBuilder();

    buttons.forEach((button, index) => {
      row.addComponents(
        new ButtonBuilder()
          .setCustomId(`notruf_create_${index}`)
          .setLabel(button)
          .setStyle(ButtonStyle.Danger)
      );
    });

    const message = await kanal.send({
      embeds: [embed],
      components: [row]
    });

    await GuildSetup.findOneAndUpdate(
      { guildId: interaction.guild.id },
      {
        $set: {
          guildId: interaction.guild.id,
          notruf: {
            channelId: kanal.id,
            leitstellenRoleId: leitstellenRole.id,
            einsatzRoleId: einsatzRole.id,
            roleId: leitstellenRole.id,
            pingRoleId: einsatzRole.id,
            categoryId: kategorie.id,
            notifyChannelId: notifyChannel.id,
            messageId: message.id,
            buttons
          }
        }
      },
      { upsert: true }
    );

    return interaction.reply({
      content: "✅ Notruf-System wurde gespeichert.",
      ephemeral: true
    });
  }
};