const { EmbedBuilder } = require("discord.js");
const GuildSetup = require("../models/GuildSetup");

module.exports = {
  name: "interactionCreate",

  async execute(interaction) {

    try {

      if (!interaction.isButton()) return;

      if (
        !interaction.customId.startsWith(
          "status_set_"
        )
      ) return;

      console.log(
        "STATUS BUTTON:",
        interaction.customId
      );

      const setup =
        await GuildSetup.collection.findOne({

          guildId:
            interaction.guild.id
        });

      console.log(
        "STATUS SETUP FOUND:",
        !!setup?.status
      );

      if (!setup || !setup.status) {

        return interaction.reply({

          content:
            "❌ Status-System wurde nicht eingerichtet.",

          ephemeral: true
        });
      }

      const statusSetup =
        setup.status;

      const statusId = Number(

        interaction.customId.replace(
          "status_set_",
          ""
        )
      );

      const selectedStatus =
        statusSetup.statuses.find(

          s =>
            Number(s.id) ===
            statusId
        );

      if (!selectedStatus) {

        return interaction.reply({

          content:
            "❌ Diesen Status gibt es nicht.",

          ephemeral: true
        });
      }

      const member =
        await interaction.guild.members.fetch(

          interaction.user.id
        );

      // ALLE STATUS ROLLEN ENTFERNEN

      for (
        const status of
        statusSetup.statuses
      ) {

        if (status.roleId) {

          await member.roles
            .remove(status.roleId)
            .catch(() => {});
        }
      }

      // NEUE ROLLE GEBEN

      await member.roles
        .add(selectedStatus.roleId)
        .catch(() => {});

      if (!statusSetup.users) {

        statusSetup.users = {};
      }

      statusSetup.users[
        interaction.user.id
      ] = {

        statusId:
          selectedStatus.id,

        statusName:
          selectedStatus.name,

        since:
          Math.floor(Date.now() / 1000)
      };

      // IN MONGO SPEICHERN

      await GuildSetup.collection.updateOne(

        {
          guildId:
            interaction.guild.id
        },

        {
          $set: {
            status:
              statusSetup
          }
        }
      );

      // LIVE PANEL

      const liveChannel =
        await interaction.guild.channels
          .fetch(
            statusSetup.livePanelChannelId
          )
          .catch(() => null);

      const liveMessage =
        liveChannel

          ? await liveChannel.messages
              .fetch(
                statusSetup.livePanelMessageId
              )
              .catch(() => null)

          : null;

      if (liveMessage) {

        const fields =
          statusSetup.statuses.map(

            status => {

              const users =
                Object.entries(

                  statusSetup.users || {}
                )

                  .filter(

                    ([, data]) =>

                      Number(
                        data.statusId
                      ) ===

                      Number(status.id)
                  )

                  .map(

                    ([userId, data]) =>

                      `• <@${userId}> seit <t:${data.since}:R>`
                  );

              return {

                name:
                  `📌 ${status.name}`,

                value:

                  users.length

                    ? users.join("\n")

                    : "Keine Einsatzkräfte",

                inline: false
              };
            }
          );

        const liveEmbed =
          new EmbedBuilder()

            .setTitle(
              "📡 LIVE STATUS PANEL"
            )

            .setDescription(
              "```diff\n+ Einsatzkräfte Übersicht Aktiv\n```"
            )

            .setColor("#00ff88")

            .addFields(fields)

            .setThumbnail(
              interaction.guild.iconURL()
            )

            .setFooter({
              text:
                "Roleplay-System • Live Panel"
            })

            .setTimestamp();

        await liveMessage.edit({

          embeds: [liveEmbed]

        }).catch(() => {});
      }

      return interaction.reply({

        content:
          `✅ Status gesetzt auf **${selectedStatus.name}**`,

        ephemeral: true
      });

    } catch (err) {

      console.error(
        "STATUS ERROR:",
        err
      );

      if (
        !interaction.replied &&
        !interaction.deferred
      ) {

        return interaction.reply({

          content:
            "❌ Fehler beim Status setzen.",

          ephemeral: true

        }).catch(() => {});
      }
    }
  }
};