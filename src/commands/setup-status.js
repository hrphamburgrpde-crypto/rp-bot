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

    .setName("setup-status")

    .setDescription(
      "Erstellt ein Einsatzkräfte Status-System"
    )

    .setDefaultMemberPermissions(
      PermissionFlagsBits.Administrator
    )

    .addChannelOption(option =>
      option
        .setName("panel_kanal")
        .setDescription(
          "Kanal für das Status Panel"
        )
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(true)
    )

    .addChannelOption(option =>
      option
        .setName("live_panel")
        .setDescription(
          "Kanal für das Live Status Panel"
        )
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(true)
    )

    .addStringOption(option =>
      option
        .setName("status1")
        .setDescription("Status 1")
        .setRequired(true)
    )

    .addRoleOption(option =>
      option
        .setName("status1_rolle")
        .setDescription(
          "Rolle für Status 1"
        )
        .setRequired(true)
    )

    .addStringOption(option =>
      option
        .setName("status2")
        .setDescription("Status 2")
        .setRequired(false)
    )

    .addRoleOption(option =>
      option
        .setName("status2_rolle")
        .setDescription(
          "Rolle für Status 2"
        )
        .setRequired(false)
    )

    .addStringOption(option =>
      option
        .setName("status3")
        .setDescription("Status 3")
        .setRequired(false)
    )

    .addRoleOption(option =>
      option
        .setName("status3_rolle")
        .setDescription(
          "Rolle für Status 3"
        )
        .setRequired(false)
    )

    .addStringOption(option =>
      option
        .setName("status4")
        .setDescription("Status 4")
        .setRequired(false)
    )

    .addRoleOption(option =>
      option
        .setName("status4_rolle")
        .setDescription(
          "Rolle für Status 4"
        )
        .setRequired(false)
    )

    .addStringOption(option =>
      option
        .setName("status5")
        .setDescription("Status 5")
        .setRequired(false)
    )

    .addRoleOption(option =>
      option
        .setName("status5_rolle")
        .setDescription(
          "Rolle für Status 5"
        )
        .setRequired(false)
    )

    .addStringOption(option =>
      option
        .setName("status6")
        .setDescription("Status 6")
        .setRequired(false)
    )

    .addRoleOption(option =>
      option
        .setName("status6_rolle")
        .setDescription(
          "Rolle für Status 6"
        )
        .setRequired(false)
    )

    .addStringOption(option =>
      option
        .setName("status7")
        .setDescription("Status 7")
        .setRequired(false)
    )

    .addRoleOption(option =>
      option
        .setName("status7_rolle")
        .setDescription(
          "Rolle für Status 7"
        )
        .setRequired(false)
    ),

  async execute(interaction) {

    const panelKanal =
      interaction.options.getChannel(
        "panel_kanal"
      );

    const livePanel =
      interaction.options.getChannel(
        "live_panel"
      );

    const statuses = [];

    for (let i = 1; i <= 7; i++) {

      const name =
        interaction.options.getString(
          `status${i}`
        );

      const role =
        interaction.options.getRole(
          `status${i}_rolle`
        );

      if (name && role) {

        statuses.push({
          id: i,
          name,
          roleId: role.id
        });
      }
    }

    if (!statuses.length) {

      return interaction.reply({
        content:
          "❌ Du musst mindestens einen Status angeben.",
        ephemeral: true
      });
    }

    const panelEmbed = new EmbedBuilder()

      .setTitle(
        "📡 Einsatzkräfte Status-System"
      )

      .setDescription(
        [
          "Wähle unten deinen Status aus.",
          "",
          statuses
            .map(
              s =>
                `• **${s.name}** → <@&${s.roleId}>`
            )
            .join("\n")
        ].join("\n")
      )

      .setColor("#0099ff")

      .setThumbnail(
        interaction.guild.iconURL()
      )

      .setFooter({
        text:
          "Ordnungs AMT • Status Panel"
      })

      .setTimestamp();

    const rows = [];

    let row =
      new ActionRowBuilder();

    statuses.forEach((status, index) => {

      if (
        index > 0 &&
        index % 5 === 0
      ) {

        rows.push(row);

        row =
          new ActionRowBuilder();
      }

      row.addComponents(

        new ButtonBuilder()

          .setCustomId(
            `status_set_${status.id}`
          )

          .setLabel(status.name)

          .setStyle(
            ButtonStyle.Primary
          )
      );
    });

    rows.push(row);

    const panelMessage =
      await panelKanal.send({
        embeds: [panelEmbed],
        components: rows
      });

    const liveEmbed =
      new EmbedBuilder()

        .setTitle(
          "📡 LIVE STATUS PANEL"
        )

        .setDescription(
          "```diff\n+ Einsatzkräfte Übersicht Aktiv\n```"
        )

        .setColor("#00ff88")

        .addFields(

          statuses.map(status => ({
            name:
              `📌 ${status.name}`,

            value:
              "Keine Einsatzkräfte",

            inline: false
          }))
        )

        .setThumbnail(
          interaction.guild.iconURL()
        )

        .setFooter({
          text:
            "Roleplay-System • Live Panel"
        })

        .setTimestamp();

    const liveMessage =
      await livePanel.send({
        embeds: [liveEmbed]
      });

    // MONGO DIREKT

    await GuildSetup.collection.updateOne(

      {
        guildId:
          interaction.guild.id
      },

      {
        $set: {

          guildId:
            interaction.guild.id,

          status: {

            panelChannelId:
              panelKanal.id,

            panelMessageId:
              panelMessage.id,

            livePanelChannelId:
              livePanel.id,

            livePanelMessageId:
              liveMessage.id,

            statuses,

            users: {}
          }
        }
      },

      {
        upsert: true
      }
    );

    const testSetup =
      await GuildSetup.collection.findOne({

        guildId:
          interaction.guild.id
      });

    console.log(
      "STATUS SAVED:",
      testSetup.status
    );

    return interaction.reply({

      content:
        `✅ Status-System wurde eingerichtet.\n` +
        `Panel: ${panelKanal}\n` +
        `Live Panel: ${livePanel}`,

      ephemeral: true
    });
  }
};