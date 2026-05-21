const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder
} = require("discord.js");

const GuildSetup = require("../models/GuildSetup");

function cleanName(name) {
  return String(name || "Unbekannt").replace(/[^a-zA-Z0-9-_äöüÄÖÜß]/g, "");
}

async function getOrCreateAkteThread(interaction, setup, robloxUsername) {
  if (!setup.akte.akten) setup.akte.akten = {};

  const safeRoblox = String(robloxUsername).trim();
  const akteKey = `roblox_${safeRoblox.toLowerCase()}`;
  const savedThreadId = setup.akte.akten[akteKey];

  if (savedThreadId) {
    const oldThread = await interaction.guild.channels
      .fetch(savedThreadId)
      .catch(() => null);

    if (oldThread) return oldThread;
  }

  const forum = await interaction.guild.channels.fetch(setup.akte.forumChannelId);
  const safeName = cleanName(safeRoblox) || "Unbekannt";

  const thread = await forum.threads.create({
    name: `Akte-${safeName}`,
    message: {
      embeds: [
        new EmbedBuilder()
          .setTitle(`📁 Akte von ${safeRoblox}`)
          .setDescription(`Gemeinsame Akte für Roblox-User **${safeRoblox}**.`)
          .setColor("Blue")
      ]
    }
  });

  setup.akte.akten[akteKey] = thread.id;

  await GuildSetup.collection.updateOne(
    { guildId: interaction.guild.id },
    {
      $set: {
        [`akte.akten.${akteKey}`]: thread.id
      }
    }
  );

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
    const setup = await GuildSetup.collection.findOne({
      guildId: interaction.guild.id
    });

    if (!setup || !setup.akte || !setup.akte.typen) {
      return interaction.respond([]);
    }

    const focused = interaction.options.getFocused().toLowerCase();

    const choices = setup.akte.typen
      .filter(type => type.toLowerCase().includes(focused))
      .slice(0, 25)
      .map(type => ({
        name: type,
        value: type
      }));

    return interaction.respond(choices);
  },

  async execute(interaction) {
    const setup = await GuildSetup.collection.findOne({
      guildId: interaction.guild.id
    });

    if (!setup || !setup.akte) {
      return interaction.reply({
        content: "❌ Akten-System wurde nicht eingerichtet.",
        ephemeral: true
      });
    }

    const requiredRoleId = setup.akte.entryRoleId;

    const hasPermission =
      interaction.member.permissions.has(PermissionFlagsBits.Administrator) ||
      interaction.member.roles.cache.has(requiredRoleId);

    if (!hasPermission) {
      return interaction.reply({
        content: "❌ Du hast keine Rechte für Akten-Einträge.",
        ephemeral: true
      });
    }

    const robloxUsername = interaction.options
      .getString("roblox_username")
      .trim();

    const typ = interaction.options.getString("typ");
    const beschreibung = interaction.options.getString("beschreibung");
    const strafe = interaction.options.getString("strafe");
    const discordUser = interaction.options.getUser("discord_user");

    const finalTyp = setup.akte.typen.find(
      type => type.toLowerCase() === typ.toLowerCase()
    );

    if (!finalTyp) {
      return interaction.reply({
        content:
          `❌ Diesen Typ gibt es nicht.\n` +
          `Erlaubte Typen: ${setup.akte.typen.join(", ")}`,
        ephemeral: true
      });
    }

    const thread = await getOrCreateAkteThread(
      interaction,
      setup,
      robloxUsername
    );

    const timestamp = Math.floor(Date.now() / 1000);

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

    const robloxKey = robloxUsername.toLowerCase();

    const oldEntries =
      setup.akteEintraege && setup.akteEintraege[robloxKey]
        ? setup.akteEintraege[robloxKey]
        : [];

    oldEntries.push({
      typ: finalTyp,
      beschreibung,
      strafe,
      discordUserId: discordUser ? discordUser.id : null,
      discordUserTag: discordUser ? discordUser.tag : null,
      beamterId: interaction.user.id,
      beamterTag: interaction.user.tag,
      timestamp
    });

    await GuildSetup.collection.updateOne(
      {
        guildId: interaction.guild.id
      },
      {
        $set: {
          [`akteEintraege.${robloxKey}`]: oldEntries
        }
      }
    );

    return interaction.reply({
      content: `✅ Eintrag wurde erstellt: ${thread}`,
      ephemeral: true
    });
  }
};
