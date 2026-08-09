const {
  Client,
  GatewayIntentBits,
  REST,
  Routes,
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder
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

// ==================== WARNINGS DATABASE ====================

const warnings = new Map();

// ==================== TIMEOUT ====================

const timeoutCommand = new SlashCommandBuilder()
  .setName("timeout")
  .setDescription("إعطاء عضو Timeout")
  .addUserOption(option =>
    option
      .setName("user")
      .setDescription("العضو الذي تريد إعطاؤه Timeout")
      .setRequired(true)
  )
  .addIntegerOption(option =>
    option
      .setName("duration")
      .setDescription("مدة الـ Timeout بالدقائق")
      .setRequired(false)
      .addChoices(
        { name: "1 دقيقة", value: 1 },
        { name: "5 دقائق", value: 5 },
        { name: "10 دقائق", value: 10 },
        { name: "30 دقيقة", value: 30 },
        { name: "ساعة", value: 60 }
      )
  )
  .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers);

// ==================== REMOVE TIMEOUT ====================

const removeTimeoutCommand = new SlashCommandBuilder()
  .setName("removetimeout")
  .setDescription("إزالة Timeout من عضو")
  .addUserOption(option =>
    option
      .setName("user")
      .setDescription("العضو الذي تريد إزالة Timeout عنه")
      .setRequired(true)
  )
  .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers);

// ==================== WARN ====================

const warnCommand = new SlashCommandBuilder()
  .setName("warn")
  .setDescription("تحذير عضو")
  .addUserOption(option =>
    option
      .setName("user")
      .setDescription("العضو الذي تريد تحذيره")
      .setRequired(true)
  )
  .addStringOption(option =>
    option
      .setName("reason")
      .setDescription("سبب التحذير")
      .setRequired(true)
  )
  .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers);

// ==================== REMOVE WARN ====================

const unwarnCommand = new SlashCommandBuilder()
  .setName("unwarn")
  .setDescription("إزالة آخر تحذير من عضو")
  .addUserOption(option =>
    option
      .setName("user")
      .setDescription("العضو")
      .setRequired(true)
  )
  .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers);

// ==================== SHOW WARNINGS ====================

const warningsCommand = new SlashCommandBuilder()
  .setName("warnings")
  .setDescription("عرض تحذيرات عضو")
  .addUserOption(option =>
    option
      .setName("user")
      .setDescription("العضو")
      .setRequired(true)
  )
  .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers);

// ==================== REGISTER COMMANDS ====================

client.once("ready", async () => {
  console.log(`✅ LUX TIMEOUT logged in as ${client.user.tag}`);

  const rest = new REST({ version: "10" }).setToken(TOKEN);

  try {
    await rest.put(
      Routes.applicationCommands(CLIENT_ID),
      {
        body: [
          timeoutCommand.toJSON(),
          removeTimeoutCommand.toJSON(),
          warnCommand.toJSON(),
          unwarnCommand.toJSON(),
          warningsCommand.toJSON()
        ]
      }
    );

    console.log("✅ All commands registered successfully!");
  } catch (error) {
    console.error("❌ Failed to register commands:", error);
  }
});

// ==================== INTERACTIONS ====================

client.on("interactionCreate", async interaction => {
  if (!interaction.isChatInputCommand()) return;

  // ==================== TIMEOUT ====================

  if (interaction.commandName === "timeout") {
    const target = interaction.options.getMember("user");
    const duration =
      interaction.options.getInteger("duration") || 10;

    if (!target) {
      return interaction.reply({
        content: "❌ لم أستطع العثور على هذا العضو.",
        ephemeral: true
      });
    }

    if (
      !interaction.memberPermissions.has(
        PermissionFlagsBits.ModerateMembers
      )
    ) {
      return interaction.reply({
        content: "❌ ليس لديك صلاحية استخدام الأمر.",
        ephemeral: true
      });
    }

    if (!target.moderatable) {
      return interaction.reply({
        content:
          "❌ لا أستطيع إعطاء هذا العضو Timeout. تأكد من ترتيب الرتب والصلاحيات.",
        ephemeral: true
      });
    }

    if (target.id === interaction.user.id) {
      return interaction.reply({
        content: "❌ لا يمكنك إعطاء نفسك Timeout.",
        ephemeral: true
      });
    }

    const milliseconds = duration * 60 * 1000;

    try {
      await target.timeout(
        milliseconds,
        `Timeout بواسطة ${interaction.user.tag}`
      );

      await interaction.reply({
        content:
          `🔇 تم إعطاء <@${target.id}> Timeout لمدة **${duration} دقيقة**.\n` +
          `👮 بواسطة: <@${interaction.user.id}>`
      });
    } catch (error) {
      console.error(error);

      await interaction.reply({
        content: "❌ حدث خطأ أثناء إعطاء Timeout.",
        ephemeral: true
      });
    }
  }

  // ==================== REMOVE TIMEOUT ====================

  if (interaction.commandName === "removetimeout") {
    const target = interaction.options.getMember("user");

    if (!target) {
      return interaction.reply({
        content: "❌ لم أستطع العثور على هذا العضو.",
        ephemeral: true
      });
    }

    if (
      !interaction.memberPermissions.has(
        PermissionFlagsBits.ModerateMembers
      )
    ) {
      return interaction.reply({
        content: "❌ ليس لديك صلاحية استخدام الأمر.",
        ephemeral: true
      });
    }

    try {
      await target.timeout(
        null,
        `إزالة Timeout بواسطة ${interaction.user.tag}`
      );

      await interaction.reply({
        content:
          `🔊 تم إزالة Timeout عن <@${target.id}> بنجاح.\n` +
          `👮 بواسطة: <@${interaction.user.id}>`
      });
    } catch (error) {
      console.error(error);

      await interaction.reply({
        content:
          "❌ لم أستطع إزالة Timeout عن هذا العضو.",
        ephemeral: true
      });
    }
  }

  // ==================== WARN ====================

  if (interaction.commandName === "warn") {
    const target = interaction.options.getUser("user");
    const reason = interaction.options.getString("reason");

    if (!target) {
      return interaction.reply({
        content: "❌ لم أستطع العثور على العضو.",
        ephemeral: true
      });
    }

    if (
      !interaction.memberPermissions.has(
        PermissionFlagsBits.ModerateMembers
      )
    ) {
      return interaction.reply({
        content: "❌ ليس لديك صلاحية استخدام الأمر.",
        ephemeral: true
      });
    }

    const key = `${interaction.guild.id}-${target.id}`;

    if (!warnings.has(key)) {
      warnings.set(key, []);
    }

    const userWarnings = warnings.get(key);

    userWarnings.push({
      reason: reason,
      moderator: interaction.user.tag,
      moderatorId: interaction.user.id,
      date: new Date()
    });

    await interaction.reply({
      content:
        `⚠️ تم تحذير <@${target.id}> بنجاح.\n` +
        `📝 السبب: **${reason}**\n` +
        `📊 عدد التحذيرات: **${userWarnings.length}**\n` +
        `👮 بواسطة: <@${interaction.user.id}>`
    });
  }

  // ==================== REMOVE WARN ====================

  if (interaction.commandName === "unwarn") {
    const target = interaction.options.getUser("user");

    if (!target) {
      return interaction.reply({
        content: "❌ لم أستطع العثور على العضو.",
        ephemeral: true
      });
    }

    if (
      !interaction.memberPermissions.has(
        PermissionFlagsBits.ModerateMembers
      )
    ) {
      return interaction.reply({
        content: "❌ ليس لديك صلاحية استخدام الأمر.",
        ephemeral: true
      });
    }

    const key = `${interaction.guild.id}-${target.id}`;
    const userWarnings = warnings.get(key);

    if (!userWarnings || userWarnings.length === 0) {
      return interaction.reply({
        content: `✅ <@${target.id}> ليس لديه أي تحذيرات.`,
        ephemeral: true
      });
    }

    const removed = userWarnings.pop();

    await interaction.reply({
      content:
        `✅ تم إزالة آخر تحذير عن <@${target.id}>.\n` +
        `📝 التحذير الذي تمت إزالته: **${removed.reason}**\n` +
        `📊 التحذيرات المتبقية: **${userWarnings.length}**`
    });
  }

  // ==================== SHOW WARNINGS ====================

  if (interaction.commandName === "warnings") {
    const target = interaction.options.getUser("user");

    if (!target) {
      return interaction.reply({
        content: "❌ لم أستطع العثور على العضو.",
        ephemeral: true
      });
    }

    const key = `${interaction.guild.id}-${target.id}`;
    const userWarnings = warnings.get(key);

    if (!userWarnings || userWarnings.length === 0) {
      return interaction.reply({
        content: `📋 <@${target.id}> لا يملك أي تحذيرات.`,
        ephemeral: true
      });
    }

    const embed = new EmbedBuilder()
      .setTitle("⚠️ تحذيرات العضو")
      .setDescription(
        `العضو: <@${target.id}>\n` +
        `عدد التحذيرات: **${userWarnings.length}**`
      )
      .setTimestamp();

    userWarnings.forEach((warning, index) => {
      embed.addFields({
        name: `تحذير #${index + 1}`,
        value:
          `📝 السبب: ${warning.reason}\n` +
          `👮 المشرف: <@${warning.moderatorId}>\n` +
          `📅 التاريخ: <t:${Math.floor(
            warning.date.getTime() / 1000
          )}:F>`
      });
    });

    await interaction.reply({
      embeds: [embed],
      ephemeral: true
    });
  }
});

client.login(TOKEN);  )
  .addIntegerOption(option =>
    option
      .setName("duration")
      .setDescription("مدة الـ Timeout بالدقائق")
      .setRequired(false)
      .addChoices(
        { name: "1 دقيقة", value: 1 },
        { name: "5 دقائق", value: 5 },
        { name: "10 دقائق", value: 10 },
        { name: "30 دقيقة", value: 30 },
        { name: "ساعة", value: 60 }
      )
  )
  .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers);

// ==================== REMOVE TIMEOUT COMMAND ====================

const removeTimeoutCommand = new SlashCommandBuilder()
  .setName("removetimeout")
  .setDescription("إزالة Timeout من عضو")
  .addUserOption(option =>
    option
      .setName("user")
      .setDescription("العضو الذي تريد إزالة Timeout عنه")
      .setRequired(true)
  )
  .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers);

// ==================== REGISTER COMMANDS ====================

client.once("ready", async () => {
  console.log(`✅ LUX TIMEOUT logged in as ${client.user.tag}`);

  const rest = new REST({ version: "10" }).setToken(TOKEN);

  try {
    await rest.put(
      Routes.applicationCommands(CLIENT_ID),
      {
        body: [
          timeoutCommand.toJSON(),
          removeTimeoutCommand.toJSON()
        ]
      }
    );

    console.log("✅ /timeout registered!");
    console.log("✅ /removetimeout registered!");
  } catch (error) {
    console.error("❌ Failed to register commands:", error);
  }
});

// ==================== INTERACTIONS ====================

client.on("interactionCreate", async interaction => {
  if (!interaction.isChatInputCommand()) return;

  // ==================== TIMEOUT ====================

  if (interaction.commandName === "timeout") {
    const target = interaction.options.getMember("user");
    const duration =
      interaction.options.getInteger("duration") || 10;

    if (!target) {
      return interaction.reply({
        content: "❌ لم أستطع العثور على هذا العضو.",
        ephemeral: true
      });
    }

    if (
      !interaction.memberPermissions.has(
        PermissionFlagsBits.ModerateMembers
      )
    ) {
      return interaction.reply({
        content: "❌ ليس لديك صلاحية استخدام الأمر.",
        ephemeral: true
      });
    }

    if (!target.moderatable) {
      return interaction.reply({
        content:
          "❌ لا أستطيع إعطاء هذا العضو Timeout. تأكد من ترتيب الرتب والصلاحيات.",
        ephemeral: true
      });
    }

    if (target.id === interaction.user.id) {
      return interaction.reply({
        content: "❌ لا يمكنك إعطاء نفسك Timeout.",
        ephemeral: true
      });
    }

    const milliseconds = duration * 60 * 1000;

    try {
      await target.timeout(
        milliseconds,
        `Timeout بواسطة ${interaction.user.tag}`
      );

      await interaction.reply({
        content:
          `🔇 تم إعطاء <@${target.id}> Timeout لمدة **${duration} دقيقة**.\n` +
          `👮 بواسطة: <@${interaction.user.id}>`
      });
    } catch (error) {
      console.error(error);

      await interaction.reply({
        content: "❌ حدث خطأ أثناء إعطاء Timeout.",
        ephemeral: true
      });
    }
  }

  // ==================== REMOVE TIMEOUT ====================

  if (interaction.commandName === "removetimeout") {
    const target = interaction.options.getMember("user");

    if (!target) {
      return interaction.reply({
        content: "❌ لم أستطع العثور على هذا العضو.",
        ephemeral: true
      });
    }

    if (
      !interaction.memberPermissions.has(
        PermissionFlagsBits.ModerateMembers
      )
    ) {
      return interaction.reply({
        content: "❌ ليس لديك صلاحية استخدام الأمر.",
        ephemeral: true
      });
    }

    try {
      await target.timeout(null, `إزالة Timeout بواسطة ${interaction.user.tag}`);

      await interaction.reply({
        content:
          `🔊 تم إزالة Timeout عن <@${target.id}> بنجاح.\n` +
          `👮 بواسطة: <@${interaction.user.id}>`
      });
    } catch (error) {
      console.error(error);

      await interaction.reply({
        content:
          "❌ لم أستطع إزالة Timeout عن هذا العضو. تأكد من صلاحيات البوت وترتيب الرتب.",
        ephemeral: true
      });
    }
  }
});

client.login(TOKEN);
