const {
  SlashCommandBuilder,
  ChannelType,
  PermissionFlagsBits,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} = require("discord.js");

const fs = require("fs");
const path = require("path");

const dbPath = path.join(__dirname, "../database/notrufSetups.json");

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
        .setDescription("Buttons getrennt mit Komma, z.B. 110,112")
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

    let db = {};
    if (fs.existsSync(dbPath)) {
      db = JSON.parse(fs.readFileSync(dbPath, "utf8"));
    }

    db[interaction.guild.id] = {
      channelId: kanal.id,
      leitstellenRoleId: leitstellenRole.id,
      einsatzRoleId: einsatzRole.id,
      roleId: leitstellenRole.id,
      pingRoleId: einsatzRole.id,
      categoryId: kategorie.id,
      notifyChannelId: notifyChannel.id,
      messageId: message.id,
      buttons
    };

    fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));

    return interaction.reply({
      content: "✅ Notruf-System wurde eingerichtet.",
      ephemeral: true
    });
  }
};