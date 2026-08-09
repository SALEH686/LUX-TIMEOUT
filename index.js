const fs = require("fs");

const {
  Client,
  GatewayIntentBits,
  REST,
  Routes,
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
  ChannelType
} = require("discord.js");

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

const TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;

if (!TOKEN) {
  console.error("❌ DISCORD_TOKEN is missing!");
  process.exit(1);
}

if (!CLIENT_ID) {
  console.error("❌ CLIENT_ID is missing!");
  process.exit(1);
}

// ==================== FILES ====================

const warningsFile = "./warnings.json";
const logsFile = "./logs.json";

let warnings = {};
let logsChannels = {};

function loadJSON(file) {
  try {
    if (!fs.existsSync(file)) {
      fs.writeFileSync(file, "{}");
      return {};
    }

    const data = fs.readFileSync(file, "utf8");

    if (!data.trim()) {
      return {};
    }

    return JSON.parse(data);
  } catch (error) {
    console.error(`❌ Failed to load ${file}:`, error);
    return {};
  }
}

function saveJSON(file, data) {
  try {
    fs.writeFileSync(
      file,
      JSON.stringify(data, null, 2)
    );
  } catch (error) {
    console.error(`❌ Failed to save ${file}:`, error);
  }
}

warnings = loadJSON(warningsFile);
logsChannels = loadJSON(logsFile);

// ==================== LOG FUNCTION ====================

async function sendLog(guild, embed) {
  try {
    const channelId = logsChannels[guild.id];

    if (!channelId) {
      return;
    }

    const channel = guild.channels.cache.get(channelId);

    if (!channel) {
      console.error("❌ Logs channel not found.");
      return;
    }

    if (!channel.isTextBased()) {
      console.error("❌ Logs channel is not text based.");
      return;
    }

    await channel.send({
      embeds: [embed]
    });
  } catch (error) {
    console.error("❌ Failed to send log:", error);
  }
}

// ==================== TIMEOUT ====================

const timeoutCommand = new SlashCommandBuilder()
  .setName("timeout")
  .setDescription("إعطاء عضو Timeout")
  .addUserOption(option =>
    option
      .setName("user")
      .setDescription("العضو")
      .setRequired(true)
  )
  .addIntegerOption(option =>
    option
      .setName("duration")
      .setDescription("المدة بالدقائق")
      .setRequired(false)
      .addChoices(
        { name: "1 دقيقة", value: 1 },
        { name: "5 دقائق", value: 5 },
        { name: "10 دقائق", value: 10 },
        { name: "30 دقيقة", value: 30 },
        { name: "ساعة", value: 60 }
      )
  )
  .setDefaultMemberPermissions(
    PermissionFlagsBits.ModerateMembers
  );

// ==================== REMOVE TIMEOUT ====================

const removeTimeoutCommand = new SlashCommandBuilder()
  .setName("removetimeout")
  .setDescription("إزالة Timeout من عضو")
  .addUserOption(option =>
    option
      .setName("user")
      .setDescription("العضو")
      .setRequired(true)
  )
  .setDefaultMemberPermissions(
    PermissionFlagsBits.ModerateMembers
  );

// ==================== WARN ====================

const warnCommand = new SlashCommandBuilder()
  .setName("warn")
  .setDescription("تحذير عضو")
  .addUserOption(option =>
    option
      .setName("user")
      .setDescription("العضو")
      .setRequired(true)
  )
  .addStringOption(option =>
    option
      .setName("reason")
      .setDescription("سبب التحذير")
      .setRequired(true)
  )
  .setDefaultMemberPermissions(
    PermissionFlagsBits.ModerateMembers
  );

// ==================== UNWARN ====================

const unwarnCommand = new SlashCommandBuilder()
  .setName("unwarn")
  .setDescription("إزالة آخر تحذير")
  .addUserOption(option =>
    option
      .setName("user")
      .setDescription("العضو")
      .setRequired(true)
  )
  .setDefaultMemberPermissions(
    PermissionFlagsBits.ModerateMembers
  );

// ==================== WARNINGS ====================

const warningsCommand = new SlashCommandBuilder()
  .setName("warnings")
  .setDescription("عرض تحذيرات عضو")
  .addUserOption(option =>
    option
      .setName("user")
      .setDescription("العضو")
      .setRequired(true)
  )
  .setDefaultMemberPermissions(
    PermissionFlagsBits.ModerateMembers
  );

// ==================== SET LOGS ====================

const setLogsCommand = new SlashCommandBuilder()
  .setName("setlogs")
  .setDescription("تحديد قناة Logs")
  .addChannelOption(option =>
    option
      .setName("channel")
      .setDescription("قناة استقبال Logs")
      .addChannelTypes(ChannelType.GuildText)
      .setRequired(true)
  )
  .setDefaultMemberPermissions(
    PermissionFlagsBits.Administrator
  );

// ==================== COMMANDS ====================

const commands = [
  timeoutCommand,
  removeTimeoutCommand,
  warnCommand,
  unwarnCommand,
  warningsCommand,
  setLogsCommand
];

// ==================== READY ====================

client.once("ready", async () => {
  console.log(
    `✅ LUX TIMEOUT logged in as ${client.user.tag}`
  );

  const rest = new REST({
    version: "10"
  }).setToken(TOKEN);

  try {
    await rest.put(
      Routes.applicationCommands(CLIENT_ID),
      {
        body: commands.map(command =>
          command.toJSON()
        )
      }
    );

    console.log(
      "✅ All slash commands registered successfully!"
    );
  } catch (error) {
    console.error(
      "❌ Failed to register commands:",
      error
    );
  }
});

// ==================== INTERACTIONS ====================

client.on("interactionCreate", async interaction => {
  if (!interaction.isChatInputCommand()) {
    return;
  }

  // ==================== SET LOGS ====================

  if (interaction.commandName === "setlogs") {
    try {
      if (
        !interaction.memberPermissions.has(
          PermissionFlagsBits.Administrator
        )
      ) {
        return interaction.reply({
          content:
            "❌ تحتاج صلاحية Administrator لاستخدام هذا الأمر.",
          ephemeral: true
        });
      }

      const channel =
        interaction.options.getChannel("channel");

      if (!channel) {
        return interaction.reply({
          content: "❌ لم يتم اختيار قناة.",
          ephemeral: true
        });
      }

      if (channel.type !== ChannelType.GuildText) {
        return interaction.reply({
          content: "❌ يجب اختيار قناة نصية.",
          ephemeral: true
        });
      }

      logsChannels[interaction.guild.id] = channel.id;

      saveJSON(logsFile, logsChannels);

      return interaction.reply({
        content:
          `✅ تم تحديد قناة الـLogs: <#${channel.id}>`
      });
    } catch (error) {
      console.error("❌ SETLOGS ERROR:", error);

      if (!interaction.replied) {
        return interaction.reply({
          content:
            "❌ حدث خطأ أثناء تحديد قناة الـLogs.",
          ephemeral: true
        });
      }
    }
  }

  // ==================== MODERATION PERMISSION ====================

  if (
    !interaction.memberPermissions.has(
      PermissionFlagsBits.ModerateMembers
    )
  ) {
    return interaction.reply({
      content:
        "❌ ليس لديك صلاحية استخدام هذا الأمر.",
      ephemeral: true
    });
  }

  const target =
    interaction.options.getMember("user");

  if (!target) {
    return interaction.reply({
      content:
        "❌ لم أستطع العثور على العضو.",
      ephemeral: true
    });
  }

  // ==================== TIMEOUT ====================

  if (interaction.commandName === "timeout") {
    const duration =
      interaction.options.getInteger("duration") || 10;

    if (target.id === interaction.user.id) {
      return interaction.reply({
        content:
          "❌ لا يمكنك إعطاء نفسك Timeout.",
        ephemeral: true
      });
    }

    if (!target.moderatable) {
      return interaction.reply({
        content:
          "❌ لا أستطيع إعطاء هذا العضو Timeout. تأكد من ترتيب الرتب.",
        ephemeral: true
      });
    }

    try {
      await target.timeout(
        duration * 60 * 1000,
        `Timeout بواسطة ${interaction.user.tag}`
      );

      const embed = new EmbedBuilder()
        .setTitle("🔇 Timeout")
        .addFields(
          {
            name: "👤 العضو",
            value: `<@${target.id}>`,
            inline: true
          },
          {
            name: "👮 المشرف",
            value: `<@${interaction.user.id}>`,
            inline: true
          },
          {
            name: "⏱️ المدة",
            value: `${duration} دقيقة`,
            inline: true
          }
        )
        .setTimestamp();

      await sendLog(
        interaction.guild,
        embed
      );

      return interaction.reply({
        content:
          `🔇 تم إعطاء <@${target.id}> Timeout لمدة **${duration} دقيقة**.\n` +
          `👮 بواسطة: <@${interaction.user.id}>`
      });
    } catch (error) {
      console.error(
        "❌ TIMEOUT ERROR:",
        error
      );

      return interaction.reply({
        content:
          "❌ حدث خطأ أثناء إعطاء Timeout.",
        ephemeral: true
      });
    }
  }

  // ==================== REMOVE TIMEOUT ====================

  if (
    interaction.commandName === "removetimeout"
  ) {
    try {
      await target.timeout(
        null,
        `إزالة Timeout بواسطة ${interaction.user.tag}`
      );

      const embed = new EmbedBuilder()
        .setTitle("🔊 إزالة Timeout")
        .addFields(
          {
            name: "👤 العضو",
            value: `<@${target.id}>`,
            inline: true
          },
          {
            name: "👮 المشرف",
            value: `<@${interaction.user.id}>`,
            inline: true
          }
        )
        .setTimestamp();

      await sendLog(
        interaction.guild,
        embed
      );

      return interaction.reply({
        content:
          `🔊 تم إزالة Timeout عن <@${target.id}> بنجاح.`
      });
    } catch (error) {
      console.error(
        "❌ REMOVE TIMEOUT ERROR:",
        error
      );

      return interaction.reply({
        content:
          "❌ لم أستطع إزالة Timeout.",
        ephemeral: true
      });
    }
  }

  // ==================== WARN ====================

  if (interaction.commandName === "warn") {
    const reason =
      interaction.options.getString("reason");

    const key =
      `${interaction.guild.id}-${target.id}`;

    if (!warnings[key]) {
      warnings[key] = [];
    }

    warnings[key].push({
      reason: reason,
      moderator: interaction.user.id,
      date: new Date().toISOString()
    });

    saveJSON(
      warningsFile,
      warnings
    );

    const embed = new EmbedBuilder()
      .setTitle("⚠️ Warn")
      .addFields(
        {
          name: "👤 العضو",
          value: `<@${target.id}>`,
          inline: true
        },
        {
          name: "👮 المشرف",
          value: `<@${interaction.user.id}>`,
          inline: true
        },
        {
          name: "📝 السبب",
          value: reason
        },
        {
          name: "📊 عدد التحذيرات",
          value: `${warnings[key].length}`,
          inline: true
        }
      )
      .setTimestamp();

    await sendLog(
      interaction.guild,
      embed
    );

    return interaction.reply({
      content:
        `⚠️ تم تحذير <@${target.id}> بنجاح.\n` +
        `📝 السبب: **${reason}**\n` +
        `📊 عدد التحذيرات: **${warnings[key].length}**`
    });
  }

  // ==================== UNWARN ====================

  if (
    interaction.commandName === "unwarn"
  ) {
    const key =
      `${interaction.guild.id}-${target.id}`;

    const list = warnings[key];

    if (!list || list.length === 0) {
      return interaction.reply({
        content:
          `✅ <@${target.id}> لا يملك أي تحذيرات.`,
        ephemeral: true
      });
    }

    const removed = list.pop();

    saveJSON(
      warningsFile,
      warnings
    );

    const embed = new EmbedBuilder()
      .setTitle("✅ إزالة Warn")
      .addFields(
        {
          name: "👤 العضو",
          value: `<@${target.id}>`,
          inline: true
        },
        {
          name: "👮 المشرف",
          value: `<@${interaction.user.id}>`,
          inline: true
        },
        {
          name: "📝 التحذير المحذوف",
          value: removed.reason
        },
        {
          name: "📊 المتبقي",
          value: `${list.length}`,
          inline: true
        }
      )
      .setTimestamp();

    await sendLog(
      interaction.guild,
      embed
    );

    return interaction.reply({
      content:
        `✅ تم إزالة آخر تحذير عن <@${target.id}>.\n` +
        `📝 السبب: **${removed.reason}**\n` +
        `📊 التحذيرات المتبقية: **${list.length}**`
    });
  }

  // ==================== WARNINGS ====================

  if (
    interaction.commandName === "warnings"
  ) {
    const key =
      `${interaction.guild.id}-${target.id}`;

    const list = warnings[key];

    if (!list || list.length === 0) {
      return interaction.reply({
        content:
          `📋 <@${target.id}> لا يملك أي تحذيرات.`,
        ephemeral: true
      });
    }

    const embed = new EmbedBuilder()
      .setTitle("⚠️ تحذيرات العضو")
      .setDescription(
        `العضو: <@${target.id}>\n` +
        `عدد التحذيرات: **${list.length}**`
      )
      .setTimestamp();

    list.forEach((warning, index) => {
      embed.addFields({
        name: `تحذير #${index + 1}`,
        value:
          `📝 السبب: ${warning.reason}\n` +
          `👮 المشرف: <@${warning.moderator}>\n` +
          `📅 <t:${Math.floor(
            new Date(warning.date).getTime() / 1000
          )}:F>`
      });
    });

    return interaction.reply({
      embeds: [embed],
      ephemeral: true
    });
  }
});

// ==================== LOGIN ====================

client.login(TOKEN);let logsChannels = {};

function loadJSON(file) {
  try {
    if (!fs.existsSync(file)) {
      fs.writeFileSync(file, "{}");
      return {};
    }

    const data = fs.readFileSync(file, "utf8");

    if (!data.trim()) {
      return {};
    }

    return JSON.parse(data);
  } catch (error) {
    console.error(`❌ Failed to load ${file}:`, error);
    return {};
  }
}

function saveJSON(file, data) {
  try {
    fs.writeFileSync(
      file,
      JSON.stringify(data, null, 2)
    );
  } catch (error) {
    console.error(`❌ Failed to save ${file}:`, error);
  }
}

warnings = loadJSON(warningsFile);
logsChannels = loadJSON(logsFile);

// ==================== LOG FUNCTION ====================

async function sendLog(guild, embed) {
  try {
    const channelId = logsChannels[guild.id];

    if (!channelId) {
      return;
    }

    const channel = guild.channels.cache.get(channelId);

    if (!channel) {
      return;
    }

    await channel.send({
      embeds: [embed]
    });
  } catch (error) {
    console.error("❌ Failed to send log:", error);
  }
}

// ==================== TIMEOUT ====================

const timeoutCommand = new SlashCommandBuilder()
  .setName("timeout")
  .setDescription("إعطاء عضو Timeout")
  .addUserOption(option =>
    option
      .setName("user")
      .setDescription("العضو")
      .setRequired(true)
  )
  .addIntegerOption(option =>
    option
      .setName("duration")
      .setDescription("المدة بالدقائق")
      .setRequired(false)
      .addChoices(
        { name: "1 دقيقة", value: 1 },
        { name: "5 دقائق", value: 5 },
        { name: "10 دقائق", value: 10 },
        { name: "30 دقيقة", value: 30 },
        { name: "ساعة", value: 60 }
      )
  )
  .setDefaultMemberPermissions(
    PermissionFlagsBits.ModerateMembers
  );

// ==================== REMOVE TIMEOUT ====================

const removeTimeoutCommand = new SlashCommandBuilder()
  .setName("removetimeout")
  .setDescription("إزالة Timeout من عضو")
  .addUserOption(option =>
    option
      .setName("user")
      .setDescription("العضو")
      .setRequired(true)
  )
  .setDefaultMemberPermissions(
    PermissionFlagsBits.ModerateMembers
  );

// ==================== WARN ====================

const warnCommand = new SlashCommandBuilder()
  .setName("warn")
  .setDescription("تحذير عضو")
  .addUserOption(option =>
    option
      .setName("user")
      .setDescription("العضو")
      .setRequired(true)
  )
  .addStringOption(option =>
    option
      .setName("reason")
      .setDescription("سبب التحذير")
      .setRequired(true)
  )
  .setDefaultMemberPermissions(
    PermissionFlagsBits.ModerateMembers
  );

// ==================== UNWARN ====================

const unwarnCommand = new SlashCommandBuilder()
  .setName("unwarn")
  .setDescription("إزالة آخر تحذير")
  .addUserOption(option =>
    option
      .setName("user")
      .setDescription("العضو")
      .setRequired(true)
  )
  .setDefaultMemberPermissions(
    PermissionFlagsBits.ModerateMembers
  );

// ==================== WARNINGS ====================

const warningsCommand = new SlashCommandBuilder()
  .setName("warnings")
  .setDescription("عرض تحذيرات عضو")
  .addUserOption(option =>
    option
      .setName("user")
      .setDescription("العضو")
      .setRequired(true)
  )
  .setDefaultMemberPermissions(
    PermissionFlagsBits.ModerateMembers
  );

// ==================== SET LOGS ====================

const setLogsCommand = new SlashCommandBuilder()
  .setName("setlogs")
  .setDescription("تحديد قناة Logs")
  .addChannelOption(option =>
    option
      .setName("channel")
      .setDescription("قناة استقبال Logs")
      .addChannelTypes(ChannelType.GuildText)
      .setRequired(true)
  )
  .setDefaultMemberPermissions(
    PermissionFlagsBits.ManageGuild
  );

// ==================== COMMANDS ====================

const commands = [
  timeoutCommand,
  removeTimeoutCommand,
  warnCommand,
  unwarnCommand,
  warningsCommand,
  setLogsCommand
];

// ==================== READY ====================

client.once("ready", async () => {
  console.log(
    `✅ LUX TIMEOUT logged in as ${client.user.tag}`
  );

  const rest = new REST({
    version: "10"
  }).setToken(TOKEN);

  try {
    await rest.put(
      Routes.applicationCommands(CLIENT_ID),
      {
        body: commands.map(command =>
          command.toJSON()
        )
      }
    );

    console.log(
      "✅ All slash commands registered!"
    );
  } catch (error) {
    console.error(
      "❌ Failed to register commands:",
      error
    );
  }
});

// ==================== INTERACTIONS ====================

client.on("interactionCreate", async interaction => {
  if (!interaction.isChatInputCommand()) {
    return;
  }

  // ==================== SET LOGS ====================

  if (interaction.commandName === "setlogs") {
    if (
      !interaction.memberPermissions.has(
        PermissionFlagsBits.ManageGuild
      )
    ) {
      return interaction.reply({
        content:
          "❌ تحتاج صلاحية Manage Server لاستخدام هذا الأمر.",
        ephemeral: true
      });
    }

    const channel =
      interaction.options.getChannel("channel");

    logsChannels[interaction.guild.id] = channel.id;

    saveJSON(logsFile, logsChannels);

    return interaction.reply({
      content:
        `✅ تم تحديد قناة الـLogs: <#${channel.id}>`
    });
  }

  // ==================== MODERATION PERMISSION ====================

  if (
    !interaction.memberPermissions.has(
      PermissionFlagsBits.ModerateMembers
    )
  ) {
    return interaction.reply({
      content:
        "❌ ليس لديك صلاحية استخدام هذا الأمر.",
      ephemeral: true
    });
  }

  const target =
    interaction.options.getMember("user");

  if (!target) {
    return interaction.reply({
      content:
        "❌ لم أستطع العثور على العضو.",
      ephemeral: true
    });
  }

  // ==================== TIMEOUT ====================

  if (interaction.commandName === "timeout") {
    const duration =
      interaction.options.getInteger("duration") || 10;

    if (target.id === interaction.user.id) {
      return interaction.reply({
        content:
          "❌ لا يمكنك إعطاء نفسك Timeout.",
        ephemeral: true
      });
    }

    if (!target.moderatable) {
      return interaction.reply({
        content:
          "❌ لا أستطيع إعطاء هذا العضو Timeout. تأكد من ترتيب الرتب.",
        ephemeral: true
      });
    }

    try {
      await target.timeout(
        duration * 60 * 1000,
        `Timeout بواسطة ${interaction.user.tag}`
      );

      const embed = new EmbedBuilder()
        .setTitle("🔇 Timeout")
        .addFields(
          {
            name: "👤 العضو",
            value: `<@${target.id}>`,
            inline: true
          },
          {
            name: "👮 المشرف",
            value: `<@${interaction.user.id}>`,
            inline: true
          },
          {
            name: "⏱️ المدة",
            value: `${duration} دقيقة`,
            inline: true
          }
        )
        .setTimestamp();

      await sendLog(
        interaction.guild,
        embed
      );

      return interaction.reply({
        content:
          `🔇 تم إعطاء <@${target.id}> Timeout لمدة **${duration} دقيقة**.\n` +
          `👮 بواسطة: <@${interaction.user.id}>`
      });
    } catch (error) {
      console.error(error);

      return interaction.reply({
        content:
          "❌ حدث خطأ أثناء إعطاء Timeout.",
        ephemeral: true
      });
    }
  }

  // ==================== REMOVE TIMEOUT ====================

  if (
    interaction.commandName ===
    "removetimeout"
  ) {
    try {
      await target.timeout(
        null,
        `إزالة Timeout بواسطة ${interaction.user.tag}`
      );

      const embed = new EmbedBuilder()
        .setTitle("🔊 إزالة Timeout")
        .addFields(
          {
            name: "👤 العضو",
            value: `<@${target.id}>`,
            inline: true
          },
          {
            name: "👮 المشرف",
            value: `<@${interaction.user.id}>`,
            inline: true
          }
        )
        .setTimestamp();

      await sendLog(
        interaction.guild,
        embed
      );

      return interaction.reply({
        content:
          `🔊 تم إزالة Timeout عن <@${target.id}> بنجاح.`
      });
    } catch (error) {
      console.error(error);

      return interaction.reply({
        content:
          "❌ لم أستطع إزالة Timeout.",
        ephemeral: true
      });
    }
  }

  // ==================== WARN ====================

  if (interaction.commandName === "warn") {
    const reason =
      interaction.options.getString("reason");

    const key =
      `${interaction.guild.id}-${target.id}`;

    if (!warnings[key]) {
      warnings[key] = [];
    }

    warnings[key].push({
      reason: reason,
      moderator: interaction.user.id,
      date: new Date().toISOString()
    });

    saveJSON(warningsFile, warnings);

    const embed = new EmbedBuilder()
      .setTitle("⚠️ Warn")
      .addFields(
        {
          name: "👤 العضو",
          value: `<@${target.id}>`,
          inline: true
        },
        {
          name: "👮 المشرف",
          value: `<@${interaction.user.id}>`,
          inline: true
        },
        {
          name: "📝 السبب",
          value: reason
        },
        {
          name: "📊 عدد التحذيرات",
          value: `${warnings[key].length}`,
          inline: true
        }
      )
      .setTimestamp();

    await sendLog(
      interaction.guild,
      embed
    );

    return interaction.reply({
      content:
        `⚠️ تم تحذير <@${target.id}> بنجاح.\n` +
        `📝 السبب: **${reason}**\n` +
        `📊 عدد التحذيرات: **${warnings[key].length}**`
    });
  }

  // ==================== UNWARN ====================

  if (
    interaction.commandName === "unwarn"
  ) {
    const key =
      `${interaction.guild.id}-${target.id}`;

    const list = warnings[key];

    if (!list || list.length === 0) {
      return interaction.reply({
        content:
          `✅ <@${target.id}> لا يملك أي تحذيرات.`,
        ephemeral: true
      });
    }

    const removed = list.pop();

    saveJSON(warningsFile, warnings);

    const embed = new EmbedBuilder()
      .setTitle("✅ إزالة Warn")
      .addFields(
        {
          name: "👤 العضو",
          value: `<@${target.id}>`,
          inline: true
        },
        {
          name: "👮 المشرف",
          value: `<@${interaction.user.id}>`,
          inline: true
        },
        {
          name: "📝 التحذير المحذوف",
          value: removed.reason
        },
        {
          name: "📊 المتبقي",
          value: `${list.length}`,
          inline: true
        }
      )
      .setTimestamp();

    await sendLog(
      interaction.guild,
      embed
    );

    return interaction.reply({
      content:
        `✅ تم إزالة آخر تحذير عن <@${target.id}>.\n` +
        `📝 السبب: **${removed.reason}**\n` +
        `📊 التحذيرات المتبقية: **${list.length}**`
    });
  }

  // ==================== WARNINGS ====================

  if (
    interaction.commandName === "warnings"
  ) {
    const key =
      `${interaction.guild.id}-${target.id}`;

    const list = warnings[key];

    if (!list || list.length === 0) {
      return interaction.reply({
        content:
          `📋 <@${target.id}> لا يملك أي تحذيرات.`,
        ephemeral: true
      });
    }

    const embed = new EmbedBuilder()
      .setTitle("⚠️ تحذيرات العضو")
      .setDescription(
        `العضو: <@${target.id}>\n` +
        `عدد التحذيرات: **${list.length}**`
      )
      .setTimestamp();

    list.forEach((warning, index) => {
      embed.addFields({
        name: `تحذير #${index + 1}`,
        value:
          `📝 السبب: ${warning.reason}\n` +
          `👮 المشرف: <@${warning.moderator}>\n` +
          `📅 <t:${Math.floor(
            new Date(warning.date).getTime() / 1000
          )}:F>`
      });
    });

    return interaction.reply({
      embeds: [embed],
      ephemeral: true
    });
  }
});

// ==================== LOGIN ====================

client.login(TOKEN);
