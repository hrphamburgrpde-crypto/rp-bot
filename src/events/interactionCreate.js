const {
  ChannelType,
  PermissionFlagsBits,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder
} = require("discord.js");

const fs = require("fs");
const path = require("path");

const notrufDbPath = path.join(__dirname, "../database/notrufSetups.json");
const verifyDbPath = path.join(__dirname, "../database/verifySetups.json");
const akteDbPath = path.join(__dirname, "../database/akteSetups.json");
const dutyDbPath = path.join(__dirname, "../database/dutySetups.json");

function saveDb(db, dbPath) {
  fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));
}

function cleanName(name) {
  return String(name || "Unbekannt").replace(/[^a-zA-Z0-9-_äöüÄÖÜß]/g, "");
}

function generateCaptcha() {
  return Math.floor(10000 + Math.random() * 90000).toString();
}

function getTicketButtons() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("notruf_close")
      .setLabel("Close")
      .setStyle(ButtonStyle.Danger)
  );
}

function getNotifyButton(ticketChannelId) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`notruf_notify_ausruecken_${ticketChannelId}`)
      .setLabel("Ausrücken")
      .setStyle(ButtonStyle.Primary)
  );
}

function buildTopic(data) {
  return [
    `owner=${data.owner}`,
    `type=${data.type}`,
    `roblox=${data.roblox || "none"}`,
    `notifyChannelId=${data.notifyChannelId || "none"}`,
    `notifyMessageId=${data.notifyMessageId || "none"}`,
    `ticketMessageId=${data.ticketMessageId || "none"}`,
    `akteThreadId=${data.akteThreadId || "none"}`,
    `akteMessageId=${data.akteMessageId || "none"}`,
    `dispatched=${data.dispatched || "false"}`
  ].join(";");
}

function parseTopic(topic = "") {
  const data = {};

  topic.split(";").forEach(part => {
    const [key, value] = part.split("=");
    if (key && value) data[key] = value;
  });

  return {
    owner: data.owner,
    type: data.type || "Notruf",
    roblox: data.roblox || "none",
    notifyChannelId: data.notifyChannelId || "none",
    notifyMessageId: data.notifyMessageId || "none",
    ticketMessageId: data.ticketMessageId || "none",
    akteThreadId: data.akteThreadId || "none",
    akteMessageId: data.akteMessageId || "none",
    dispatched: data.dispatched || "false"
  };
}

function setStatusField(embed, value) {
  const fields = embed.data.fields || [];
  const index = fields.findIndex(field => field.name === "Status");

  if (index === -1) {
    embed.addFields({ name: "Status", value, inline: true });
  } else {
    embed.spliceFields(index, 1, { name: "Status", value, inline: true });
  }

  return embed;
}

async function hasActiveNotruf(guild, userId, categoryId) {
  return guild.channels.cache.find(channel =>
    channel.type === ChannelType.GuildText &&
    channel.parentId === categoryId &&
    channel.topic?.includes(`owner=${userId}`)
  );
}

async function getOrCreateAkteThreadByRoblox(interaction, robloxUsername) {
  if (!fs.existsSync(akteDbPath)) return null;

  const akteDb = JSON.parse(fs.readFileSync(akteDbPath, "utf8"));
  const akteSetup = akteDb[interaction.guild.id];

  if (!akteSetup) return null;
  if (!akteSetup.akten) akteSetup.akten = {};

  const safeRoblox = String(robloxUsername || "Unbekannt");
  const akteKey = `roblox_${safeRoblox.toLowerCase()}`;
  const savedThreadId = akteSetup.akten[akteKey];

  if (savedThreadId) {
    const oldThread = await interaction.guild.channels.fetch(savedThreadId).catch(() => null);
    if (oldThread) return oldThread;
  }

  const forum = await interaction.guild.channels.fetch(akteSetup.forumChannelId);
  const safeName = cleanName(safeRoblox) || "Unbekannt";

  const thread = await forum.threads.create({
    name: `Akte-${safeName}`,
    message: {
      embeds: [
        new EmbedBuilder()
          .setTitle(`📁 Akte von ${safeRoblox}`)
          .setDescription(`Gemeinsame Akte für Notrufe und Einträge von Roblox-User **${safeRoblox}**.`)
          .setColor("Blue")
      ]
    }
  });

  akteSetup.akten[akteKey] = thread.id;
  akteDb[interaction.guild.id] = akteSetup;
  saveDb(akteDb, akteDbPath);

  return thread;
}

async function updateDutyPanel(guild, setup) {
  const channel = await guild.channels.fetch(setup.channelId).catch(() => null);
  if (!channel) return;

  const message = await channel.messages.fetch(setup.messageId).catch(() => null);
  if (!message) return;

  const users = Object.entries(setup.activeUsers || {});

  const description = users.length
    ? users
        .map(([userId, data], index) => `${index + 1}. <@${userId}> — seit <t:${data.since}:R>`)
        .join("\n")
    : "Keine Personen im Dienst.";

  const embed = new EmbedBuilder()
    .setTitle("🟢 Dienst-System")
    .setDescription(`Aktuell im Dienst:\n\n${description}`)
    .setColor("Green");

  await message.edit({ embeds: [embed] }).catch(() => {});
}

async function sendDutyLog(guild, setup, embed) {
  const logChannel = await guild.channels.fetch(setup.logChannelId).catch(() => null);
  if (!logChannel) return;

  await logChannel.send({ embeds: [embed] }).catch(() => {});
}

module.exports = {
  name: "interactionCreate",

  async execute(interaction) {
    try {
      console.log(
        "INTERACTION:",
        interaction.type,
        interaction.commandName || interaction.customId || "unknown"
      );

      if (interaction.isAutocomplete()) {
        const command = interaction.client.commands.get(interaction.commandName);
        if (!command || !command.autocomplete) return;
        return command.autocomplete(interaction);
      }

      if (interaction.isChatInputCommand()) {
        const command = interaction.client.commands.get(interaction.commandName);
        if (!command) return;
        return command.execute(interaction);
      }

      // VERIFY BUTTON
      if (interaction.isButton() && interaction.customId === "verify_start") {
        if (!fs.existsSync(verifyDbPath)) {
          fs.writeFileSync(verifyDbPath, JSON.stringify({}, null, 2));
        }

        const verifyDb = JSON.parse(fs.readFileSync(verifyDbPath, "utf8"));
        const verifySetup = verifyDb[interaction.guild.id];

        if (!verifySetup) {
          return interaction.reply({
            content: "❌ Verify-System wurde nicht eingerichtet. Bitte führe `/setup-verify` neu aus.",
            ephemeral: true
          });
        }

        if (!verifySetup.captchaEnabled && !verifySetup.robloxUsernameEnabled) {
          const member = await interaction.guild.members.fetch(interaction.user.id);

          if (verifySetup.roleAddId) await member.roles.add(verifySetup.roleAddId).catch(() => {});
          if (verifySetup.roleRemoveId) await member.roles.remove(verifySetup.roleRemoveId).catch(() => {});

          return interaction.reply({
            content: "✅ Du wurdest erfolgreich verifiziert.",
            ephemeral: true
          });
        }

        const captchaCode = generateCaptcha();

        const modal = new ModalBuilder()
          .setCustomId(`verify_modal_${captchaCode}`)
          .setTitle("Verifizierung");

        if (verifySetup.captchaEnabled) {
          modal.addComponents(
            new ActionRowBuilder().addComponents(
              new TextInputBuilder()
                .setCustomId("captcha")
                .setLabel(`Captcha: ${captchaCode}`)
                .setPlaceholder("Captcha eingeben")
                .setStyle(TextInputStyle.Short)
                .setRequired(true)
            )
          );
        }

        if (verifySetup.robloxUsernameEnabled) {
          modal.addComponents(
            new ActionRowBuilder().addComponents(
              new TextInputBuilder()
                .setCustomId("roblox_username")
                .setLabel("Roblox Username")
                .setPlaceholder("Dein Roblox Username")
                .setStyle(TextInputStyle.Short)
                .setRequired(true)
            )
          );
        }

        return interaction.showModal(modal);
      }

      // VERIFY MODAL
      if (interaction.isModalSubmit() && interaction.customId.startsWith("verify_modal_")) {
        await interaction.deferReply({ ephemeral: true });

        if (!fs.existsSync(verifyDbPath)) {
          return interaction.editReply({
            content: "❌ Verify-System wurde nicht eingerichtet."
          });
        }

        const verifyDb = JSON.parse(fs.readFileSync(verifyDbPath, "utf8"));
        const verifySetup = verifyDb[interaction.guild.id];

        if (!verifySetup) {
          return interaction.editReply({
            content: "❌ Verify-System wurde nicht eingerichtet."
          });
        }

        const captchaCode = interaction.customId.replace("verify_modal_", "");

        if (verifySetup.captchaEnabled) {
          const inputCaptcha = interaction.fields.getTextInputValue("captcha");

          if (inputCaptcha !== captchaCode) {
            return interaction.editReply({
              content: "❌ Captcha falsch."
            });
          }
        }

        const member = await interaction.guild.members.fetch(interaction.user.id);
        const botMember = await interaction.guild.members.fetchMe();

        if (verifySetup.roleAddId) await member.roles.add(verifySetup.roleAddId).catch(() => {});
        if (verifySetup.roleRemoveId) await member.roles.remove(verifySetup.roleRemoveId).catch(() => {});

        let robloxText = "";

        if (verifySetup.robloxUsernameEnabled) {
          const robloxUsername = interaction.fields
            .getTextInputValue("roblox_username")
            .slice(0, 32);

          if (
            botMember.permissions.has(PermissionFlagsBits.ManageNicknames) &&
            member.manageable &&
            member.id !== interaction.guild.ownerId
          ) {
            await member.setNickname(robloxUsername, "Verify Roblox Username").catch(() => {});
            robloxText = `\nRoblox Username / Nickname: **${robloxUsername}**`;
          } else {
            robloxText = "\n⚠️ Nickname konnte nicht geändert werden.";
          }
        }

        return interaction.editReply({
          content: `✅ Du wurdest erfolgreich verifiziert.${robloxText}`
        });
      }

      // DUTY SYSTEM
      if (
        interaction.isButton() &&
        ["duty_checkin", "duty_checkout"].includes(interaction.customId)
      ) {
        if (!fs.existsSync(dutyDbPath)) {
          fs.writeFileSync(dutyDbPath, JSON.stringify({}, null, 2));
        }

        const dutyDb = JSON.parse(fs.readFileSync(dutyDbPath, "utf8"));
        const dutySetup = dutyDb[interaction.guild.id];

        if (!dutySetup) {
          return interaction.reply({
            content: "❌ Duty-System wurde nicht eingerichtet.",
            ephemeral: true
          });
        }

        const member = await interaction.guild.members.fetch(interaction.user.id);
        const now = Math.floor(Date.now() / 1000);

        if (!dutySetup.activeUsers) dutySetup.activeUsers = {};

        if (interaction.customId === "duty_checkin") {
          if (dutySetup.activeUsers[interaction.user.id]) {
            return interaction.reply({
              content: "❌ Du bist bereits im Dienst.",
              ephemeral: true
            });
          }

          await member.roles.add(dutySetup.onDutyRoleId).catch(() => {});

          if (dutySetup.offDutyRoleId) {
            await member.roles.remove(dutySetup.offDutyRoleId).catch(() => {});
          }

          dutySetup.activeUsers[interaction.user.id] = { since: now };
          dutyDb[interaction.guild.id] = dutySetup;
          saveDb(dutyDb, dutyDbPath);

          await updateDutyPanel(interaction.guild, dutySetup);

          await sendDutyLog(
            interaction.guild,
            dutySetup,
            new EmbedBuilder()
              .setTitle("🟢 Eingecheckt")
              .setDescription(`${interaction.user} ist jetzt im Dienst.`)
              .addFields({ name: "Zeitpunkt", value: `<t:${now}:F>`, inline: false })
              .setColor("Green")
          );

          return interaction.reply({
            content: "✅ Du bist jetzt im Dienst.",
            ephemeral: true
          });
        }

        if (interaction.customId === "duty_checkout") {
          if (!dutySetup.activeUsers[interaction.user.id]) {
            return interaction.reply({
              content: "❌ Du bist aktuell nicht im Dienst.",
              ephemeral: true
            });
          }

          const since = dutySetup.activeUsers[interaction.user.id].since;

          await member.roles.remove(dutySetup.onDutyRoleId).catch(() => {});

          if (dutySetup.offDutyRoleId) {
            await member.roles.add(dutySetup.offDutyRoleId).catch(() => {});
          }

          delete dutySetup.activeUsers[interaction.user.id];

          dutyDb[interaction.guild.id] = dutySetup;
          saveDb(dutyDb, dutyDbPath);

          await updateDutyPanel(interaction.guild, dutySetup);

          await sendDutyLog(
            interaction.guild,
            dutySetup,
            new EmbedBuilder()
              .setTitle("🔴 Ausgecheckt")
              .setDescription(`${interaction.user} ist jetzt außer Dienst.`)
              .addFields(
                { name: "Eingecheckt seit", value: `<t:${since}:F>`, inline: false },
                { name: "Ausgecheckt um", value: `<t:${now}:F>`, inline: false }
              )
              .setColor("Red")
          );

          return interaction.reply({
            content: "✅ Du bist jetzt außer Dienst.",
            ephemeral: true
          });
        }
      }

      // NOTRUF PRIORITY SELECT
      if (interaction.isStringSelectMenu()) {
        if (!interaction.customId.startsWith("notruf_priority_")) return;

        const buttonIndex = Number(interaction.customId.replace("notruf_priority_", ""));
        const priority = interaction.values[0];

        let buttonText = "Notruf";

        if (fs.existsSync(notrufDbPath)) {
          const db = JSON.parse(fs.readFileSync(notrufDbPath, "utf8"));
          const setup = db[interaction.guild.id];

          if (setup && setup.buttons && setup.buttons[buttonIndex]) {
            buttonText = setup.buttons[buttonIndex];
          }
        }

        const modal = new ModalBuilder()
          .setCustomId(`notruf_modal_${buttonIndex}_${priority}`)
          .setTitle(`${buttonText}-Notruf`);

        const robloxInput = new TextInputBuilder()
          .setCustomId("notruf_roblox")
          .setLabel("Roblox Username")
          .setPlaceholder("Exakter Roblox Username - Groß/Kleinschreibung wichtig")
          .setStyle(TextInputStyle.Short)
          .setRequired(true);

        const woInput = new TextInputBuilder()
          .setCustomId("notruf_wo")
          .setLabel("Wo?")
          .setStyle(TextInputStyle.Short)
          .setRequired(true);

        const warumInput = new TextInputBuilder()
          .setCustomId("notruf_warum")
          .setLabel("Warum rufen Sie an?")
          .setStyle(TextInputStyle.Paragraph)
          .setRequired(true);

        const infoInput = new TextInputBuilder()
          .setCustomId("notruf_infos")
          .setLabel("Weitere Informationen?")
          .setStyle(TextInputStyle.Paragraph)
          .setRequired(false);

        modal.addComponents(
          new ActionRowBuilder().addComponents(robloxInput),
          new ActionRowBuilder().addComponents(woInput),
          new ActionRowBuilder().addComponents(warumInput),
          new ActionRowBuilder().addComponents(infoInput)
        );

        return interaction.showModal(modal);
      }

      // NOTRUF SYSTEM
      if (!fs.existsSync(notrufDbPath)) return;

      const db = JSON.parse(fs.readFileSync(notrufDbPath, "utf8"));
      const setup = db[interaction.guild.id];

      if (!setup) return;

      if (interaction.isButton() && interaction.customId.startsWith("notruf_create_")) {
        const buttonIndex = Number(interaction.customId.replace("notruf_create_", ""));

        const activeNotruf = await hasActiveNotruf(
          interaction.guild,
          interaction.user.id,
          setup.categoryId
        );

        if (activeNotruf) {
          return interaction.reply({
            content: `❌ Du hast bereits einen aktiven Notruf: ${activeNotruf}`,
            ephemeral: true
          });
        }

        const select = new StringSelectMenuBuilder()
          .setCustomId(`notruf_priority_${buttonIndex}`)
          .setPlaceholder("Priorität auswählen")
          .addOptions(
            new StringSelectMenuOptionBuilder()
              .setLabel("Normal")
              .setValue("Normal")
              .setEmoji("🟢"),
            new StringSelectMenuOptionBuilder()
              .setLabel("Wichtig")
              .setValue("Wichtig")
              .setEmoji("🟠"),
            new StringSelectMenuOptionBuilder()
              .setLabel("Extrem Wichtig")
              .setValue("Extrem Wichtig")
              .setEmoji("🔴")
          );

        return interaction.reply({
          content: "Bitte wähle die Priorität deines Notrufs aus:",
          components: [new ActionRowBuilder().addComponents(select)],
          ephemeral: true
        });
      }

      if (interaction.isModalSubmit() && interaction.customId.startsWith("notruf_modal_")) {
        await interaction.deferReply({ ephemeral: true });

        const parts = interaction.customId.replace("notruf_modal_", "").split("_");
        const buttonIndex = Number(parts[0]);
        const priority = parts.slice(1).join("_");
        const buttonText = setup.buttons[buttonIndex] || "Notruf";

        const activeNotruf = await hasActiveNotruf(
          interaction.guild,
          interaction.user.id,
          setup.categoryId
        );

        if (activeNotruf) {
          return interaction.editReply({
            content: `❌ Du hast bereits einen aktiven Notruf: ${activeNotruf}`
          });
        }

        const robloxUsername = interaction.fields.getTextInputValue("notruf_roblox");
        const wo = interaction.fields.getTextInputValue("notruf_wo");
        const warum = interaction.fields.getTextInputValue("notruf_warum");
        const infos =
          interaction.fields.getTextInputValue("notruf_infos") ||
          "Keine weiteren Informationen.";

        const randomId = Math.floor(1000 + Math.random() * 9000);
        const timestamp = Math.floor(Date.now() / 1000);

        const channel = await interaction.guild.channels.create({
          name: `${buttonText}-notruf-${randomId}`,
          type: ChannelType.GuildText,
          parent: setup.categoryId,
          topic: "loading",
          permissionOverwrites: [
            {
              id: interaction.guild.id,
              deny: [PermissionFlagsBits.ViewChannel]
            },
            {
              id: interaction.user.id,
              allow: [
                PermissionFlagsBits.ViewChannel,
                PermissionFlagsBits.SendMessages,
                PermissionFlagsBits.ReadMessageHistory
              ]
            },
            {
              id: setup.leitstellenRoleId || setup.roleId,
              allow: [
                PermissionFlagsBits.ViewChannel,
                PermissionFlagsBits.SendMessages,
                PermissionFlagsBits.ReadMessageHistory
              ]
            }
          ]
        });

        const ticketEmbed = new EmbedBuilder()
          .setTitle(`🚨 ${buttonText}-Notruf`)
          .setColor("Red")
          .addFields(
            { name: "Ersteller", value: `${interaction.user}`, inline: true },
            { name: "Roblox Username", value: robloxUsername, inline: true },
            { name: "Status", value: "Offen", inline: true },
            { name: "📍 Wo?", value: wo, inline: false },
            { name: "📞 Warum rufen Sie an?", value: warum, inline: false },
            { name: "⚠️ Priorität", value: priority, inline: false },
            { name: "ℹ️ Weitere Informationen", value: infos, inline: false }
          );

        const ticketMessage = await channel.send({
          content: `<@&${setup.leitstellenRoleId || setup.roleId}> ${interaction.user}`,
          embeds: [ticketEmbed],
          components: [getTicketButtons()]
        });

        const notifyChannel = await interaction.guild.channels.fetch(setup.notifyChannelId);

        const notifyEmbed = new EmbedBuilder()
          .setTitle(`🚨 Neuer ${buttonText}-Notruf`)
          .setColor("Red")
          .addFields(
            { name: "Ersteller", value: `${interaction.user}`, inline: true },
            { name: "Roblox Username", value: robloxUsername, inline: true },
            { name: "Status", value: "Nicht ausgerückt", inline: true },
            { name: "Notruf Kanal", value: `${channel}`, inline: true },
            { name: "📍 Wo?", value: wo, inline: false },
            { name: "📞 Warum rufen Sie an?", value: warum, inline: false },
            { name: "⚠️ Priorität", value: priority, inline: false },
            { name: "ℹ️ Weitere Informationen", value: infos, inline: false }
          );

        const notifyMessage = await notifyChannel.send({
          content: `<@&${setup.einsatzRoleId || setup.pingRoleId}>`,
          embeds: [notifyEmbed],
          components: [getNotifyButton(channel.id)]
        });

        let akteThread = null;
        let akteMessage = null;

        akteThread = await getOrCreateAkteThreadByRoblox(interaction, robloxUsername);

        if (akteThread) {
          const akteEmbed = new EmbedBuilder()
            .setTitle(`📄 Neuer Notruf: ${buttonText}`)
            .setColor("Red")
            .addFields(
              { name: "Roblox Username", value: robloxUsername, inline: true },
              { name: "Discord User", value: `${interaction.user}`, inline: true },
              { name: "Status", value: "Nicht ausgerückt", inline: true },
              { name: "Notruf Kanal", value: `${channel}`, inline: true },
              { name: "Zeitpunkt", value: `<t:${timestamp}:F>`, inline: false },
              { name: "📍 Wo?", value: wo, inline: false },
              { name: "📞 Warum rufen Sie an?", value: warum, inline: false },
              { name: "⚠️ Priorität", value: priority, inline: false },
              { name: "ℹ️ Weitere Informationen", value: infos, inline: false },
              { name: "🚓 Ausgerückt von", value: "Noch niemand", inline: false }
            );

          akteMessage = await akteThread.send({ embeds: [akteEmbed] });
        }

        await channel.setTopic(
          buildTopic({
            owner: interaction.user.id,
            type: buttonText,
            roblox: robloxUsername,
            notifyChannelId: notifyChannel.id,
            notifyMessageId: notifyMessage.id,
            ticketMessageId: ticketMessage.id,
            akteThreadId: akteThread ? akteThread.id : "none",
            akteMessageId: akteMessage ? akteMessage.id : "none",
            dispatched: "false"
          })
        );

        return interaction.editReply({
          content: `✅ Dein Notruf wurde erstellt: ${channel}`
        });
      }

      if (!interaction.isButton()) return;

      if (interaction.customId.startsWith("notruf_notify_ausruecken_")) {
        const hasEinsatzRole =
          interaction.member.roles.cache.has(setup.einsatzRoleId) ||
          interaction.member.roles.cache.has(setup.pingRoleId) ||
          interaction.member.roles.cache.has(setup.roleId);

        if (!hasEinsatzRole) {
          return interaction.reply({
            content: "❌ Keine Rechte.",
            ephemeral: true
          });
        }

        const ticketChannelId = interaction.customId.replace("notruf_notify_ausruecken_", "");
        const ticketChannel = await interaction.guild.channels.fetch(ticketChannelId).catch(() => null);

        if (!ticketChannel) {
          return interaction.reply({
            content: "❌ Notruf-Kanal wurde nicht gefunden.",
            ephemeral: true
          });
        }

        const topicData = parseTopic(ticketChannel.topic);
        const timestamp = Math.floor(Date.now() / 1000);

        const notifyEmbed = EmbedBuilder.from(interaction.message.embeds[0]).setColor("Green");

        setStatusField(
          notifyEmbed,
          `Einsatzkräfte unterwegs | ausgelöst von ${interaction.user}`
        );

        await interaction.update({
          embeds: [notifyEmbed],
          components: []
        });

        await ticketChannel.send({
          embeds: [
            new EmbedBuilder()
              .setTitle("🚨 Einsatzkräfte sind unterwegs")
              .setDescription(`Einsatzkräfte sind unterwegs zum **${topicData.type}-Notruf**.`)
              .setColor("Orange")
          ]
        });

        await ticketChannel.setTopic(
          buildTopic({
            ...topicData,
            dispatched: "true"
          })
        );

        if (topicData.akteThreadId !== "none" && topicData.akteMessageId !== "none") {
          const akteThread = await interaction.guild.channels.fetch(topicData.akteThreadId).catch(() => null);

          if (akteThread) {
            const akteMessage = await akteThread.messages.fetch(topicData.akteMessageId).catch(() => null);

            if (akteMessage) {
              const akteEmbed = EmbedBuilder.from(akteMessage.embeds[0]).setColor("Green");

              setStatusField(akteEmbed, "Einsatzkräfte unterwegs");

              const index = akteEmbed.data.fields.findIndex(
                f => f.name === "🚓 Ausgerückt von"
              );

              if (index !== -1) {
                akteEmbed.spliceFields(index, 1, {
                  name: "🚓 Ausgerückt von",
                  value: `${interaction.user}`,
                  inline: false
                });
              }

              akteEmbed.addFields({
                name: "Ausrück-Zeitpunkt",
                value: `<t:${timestamp}:F>`,
                inline: false
              });

              await akteMessage.edit({ embeds: [akteEmbed] });
            }
          }
        }

        return;
      }

      if (interaction.customId === "notruf_close") {
        const topicData = parseTopic(interaction.channel.topic);

        const hasLeitstelleRole =
          interaction.member.roles.cache.has(setup.leitstellenRoleId) ||
          interaction.member.roles.cache.has(setup.roleId);

        const isOwner = topicData.owner === interaction.user.id;

        if (!hasLeitstelleRole && !isOwner) {
          return interaction.reply({
            content: "❌ Du darfst diesen Notruf nicht schließen.",
            ephemeral: true
          });
        }

        return interaction.channel.delete().catch(() => {});
      }
    } catch (err) {
      console.error(err);
    }
  }
};