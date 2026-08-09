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
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers
  ]
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
const welcomeFile = "./welcome.json";

let warnings = {};
let logsChannels = {};
let welcomeChannels = {};

// ==================== LOAD JSON ====================

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

// ==================== SAVE JSON ====================

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
welcomeChannels = loadJSON(welcomeFile);

// ==================== LOG FUNCTION ====================

async function sendLog(guild, embed) {
  try {
    if (!guild) return;

    const channelId = logsChannels[guild.id];

    if (!channelId) return;

    const channel =
      guild.channels.cache.get(channelId);

    if (!channel) {
      console.error("❌ Logs channel not found.");
      return;
    }

    if (!channel.isTextBased()) {
      console.error(
        "❌ Logs channel is not text based."
      );
      return;
    }

    await channel.send({
      embeds: [embed]
    });

  } catch (error) {
    console.error(
      "❌ Failed to send log:",
      error
    );
  }
}

// ==================================================
// ==================== TIMEOUT =====================
// ==================================================

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

// ==================================================
// ================= REMOVE TIMEOUT =================
// ==================================================

const removeTimeoutCommand =
  new SlashCommandBuilder()
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

// ==================================================
// ====================== WARN ======================
// ==================================================

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

// ==================================================
// ===================== UNWARN =====================
// ==================================================

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

// ==================================================
// ==================== WARNINGS ====================
// ==================================================

const warningsCommand =
  new SlashCommandBuilder()
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

// ==================================================
// ===================== SETLOGS ====================
// ==================================================

const setLogsCommand =
  new SlashCommandBuilder()
    .setName("setlogs")
    .setDescription("تحديد قناة Logs")
    .addChannelOption(option =>
      option
        .setName("channel")
        .setDescription("قناة استقبال Logs")
        .addChannelTypes(
          ChannelType.GuildText
        )
        .setRequired(true)
    )
    .setDefaultMemberPermissions(
      PermissionFlagsBits.Administrator
    );

// ==================================================
// ====================== LOCK ======================
// ==================================================

const lockCommand = new SlashCommandBuilder()
  .setName("lock")
  .setDescription("قفل القناة الحالية")
  .setDefaultMemberPermissions(
    PermissionFlagsBits.ManageChannels
  );

// ==================================================
// ===================== UNLOCK =====================
// ==================================================

const unlockCommand =
  new SlashCommandBuilder()
    .setName("unlock")
    .setDescription("فتح القناة الحالية")
    .setDefaultMemberPermissions(
      PermissionFlagsBits.ManageChannels
    );

// ==================================================
// ==================== SETWELCOME ==================
// ==================================================

const setWelcomeCommand =
  new SlashCommandBuilder()
    .setName("setwelcome")
    .setDescription("تحديد قناة الترحيب")
    .addChannelOption(option =>
      option
        .setName("channel")
        .setDescription("قناة الترحيب")
        .addChannelTypes(
          ChannelType.GuildText
        )
        .setRequired(true)
    )
    .setDefaultMemberPermissions(
      PermissionFlagsBits.Administrator
    );

// ==================================================
// ===================== COMMANDS ===================
// ==================================================

const commands = [
  timeoutCommand,
  removeTimeoutCommand,
  warnCommand,
  unwarnCommand,
  warningsCommand,
  setLogsCommand,
  lockCommand,
  unlockCommand,
  setWelcomeCommand
];

// ==================================================
// ======================= READY ====================
// ==================================================

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

// ==================================================
// ================= MEMBER JOIN ====================
// ==================================================

client.on("guildMemberAdd", async member => {

  try {

    const channelId =
      welcomeChannels[member.guild.id];

    if (!channelId) {
      return;
    }

    const channel =
      member.guild.channels.cache.get(
        channelId
      );

    if (
      !channel ||
      !channel.isTextBased()
    ) {
      return;
    }

    const embed =
      new EmbedBuilder()
        .setTitle("👋 عضو جديد!")
        .setDescription(
          `أهلًا وسهلًا ${member} في **${member.guild.name}** 🎉\n` +
          `نتمنى لك وقتًا ممتعًا معنا!`
        )
        .setThumbnail(
          member.user.displayAvatarURL({
            dynamic: true,
            size: 256
          })
        )
        .setTimestamp();

    await channel.send({
      content: `${member}`,
      embeds: [embed]
    });

  } catch (error) {

    console.error(
      "❌ WELCOME ERROR:",
      error
    );

  }
});

// ==================================================
// ==================== INTERACTIONS =================
// ==================================================

client.on(
  "interactionCreate",
  async interaction => {

    if (!interaction.isChatInputCommand()) {
      return;
    }

    // ==================================================
    // ===================== SETLOGS =====================
    // ==================================================

    if (
      interaction.commandName === "setlogs"
    ) {

      try {

        if (!interaction.guildId) {
          return interaction.reply({
            content:
              "❌ هذا الأمر يمكن استخدامه داخل السيرفر فقط.",
            ephemeral: true
          });
        }

        if (
          !interaction.memberPermissions?.has(
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
          interaction.options.getChannel(
            "channel"
          );

        if (!channel) {
          return interaction.reply({
            content:
              "❌ لم يتم اختيار قناة.",
            ephemeral: true
          });
        }

        logsChannels[
          interaction.guildId
        ] = channel.id;

        saveJSON(
          logsFile,
          logsChannels
        );

        return interaction.reply({
          content:
            `✅ تم تحديد قناة الـLogs بنجاح: <#${channel.id}>`
        });

      } catch (error) {

        console.error(
          "❌ SETLOGS ERROR:",
          error
        );

        if (
          !interaction.replied &&
          !interaction.deferred
        ) {
          return interaction.reply({
            content:
              "❌ حدث خطأ أثناء تحديد قناة الـLogs.",
            ephemeral: true
          });
        }
      }
    }

    // ==================================================
    // ================== SETWELCOME =====================
    // ==================================================

    if (
      interaction.commandName === "setwelcome"
    ) {

      try {

        if (!interaction.guildId) {
          return interaction.reply({
            content:
              "❌ هذا الأمر يمكن استخدامه داخل السيرفر فقط.",
            ephemeral: true
          });
        }

        if (
          !interaction.memberPermissions?.has(
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
          interaction.options.getChannel(
            "channel"
          );

        if (!channel) {
          return interaction.reply({
            content:
              "❌ لم يتم اختيار قناة.",
            ephemeral: true
          });
        }

        if (
          channel.type !==
          ChannelType.GuildText
        ) {
          return interaction.reply({
            content:
              "❌ يجب اختيار قناة نصية.",
            ephemeral: true
          });
        }

        welcomeChannels[
          interaction.guildId
        ] = channel.id;

        saveJSON(
          welcomeFile,
          welcomeChannels
        );

        return interaction.reply({
          content:
            `👋 تم تحديد قناة الترحيب بنجاح: <#${channel.id}>`
        });

      } catch (error) {

        console.error(
          "❌ SETWELCOME ERROR:",
          error
        );

        if (
          !interaction.replied &&
          !interaction.deferred
        ) {
          return interaction.reply({
            content:
              "❌ حدث خطأ أثناء تحديد قناة الترحيب.",
            ephemeral: true
          });
        }
      }
    }

    // ==================================================
    // ======================= LOCK ======================
    // ==================================================

    if (
      interaction.commandName === "lock"
    ) {

      try {

        if (
          !interaction.memberPermissions?.has(
            PermissionFlagsBits.ManageChannels
          )
        ) {
          return interaction.reply({
            content:
              "❌ تحتاج صلاحية Manage Channels لاستخدام هذا الأمر.",
            ephemeral: true
          });
        }

        const channel =
          interaction.channel;

        if (
          !channel ||
          !channel.isTextBased()
        ) {
          return interaction.reply({
            content:
              "❌ لا يمكن قفل هذه القناة.",
            ephemeral: true
          });
        }

        await channel.permissionOverwrites.edit(
          interaction.guild.roles.everyone,
          {
            SendMessages: false
          }
        );

        const embed =
          new EmbedBuilder()
            .setTitle("🔒 تم قفل القناة")
            .addFields(
              {
                name: "📢 القناة",
                value: `${channel}`,
                inline: true
              },
              {
                name: "👮 بواسطة",
                value:
                  `<@${interaction.user.id}>`,
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
            `🔒 تم قفل ${channel} بنجاح.`
        });

      } catch (error) {

        console.error(
          "❌ LOCK ERROR:",
          error
        );

        if (!interaction.replied) {
          return interaction.reply({
            content:
              "❌ حدث خطأ أثناء قفل القناة.",
            ephemeral: true
          });
        }
      }
    }

    // ==================================================
    // ====================== UNLOCK =====================
    // ==================================================

    if (
      interaction.commandName === "unlock"
    ) {

      try {

        if (
          !interaction.memberPermissions?.has(
            PermissionFlagsBits.ManageChannels
          )
        ) {
          return interaction.reply({
            content:
              "❌ تحتاج صلاحية Manage Channels لاستخدام هذا الأمر.",
            ephemeral: true
          });
        }

        const channel =
          interaction.channel;

        if (
          !channel ||
          !channel.isTextBased()
        ) {
          return interaction.reply({
            content:
              "❌ لا يمكن فتح هذه القناة.",
            ephemeral: true
          });
        }

        await channel.permissionOverwrites.edit(
          interaction.guild.roles.everyone,
          {
            SendMessages: null
          }
        );

        const embed =
          new EmbedBuilder()
            .setTitle("🔓 تم فتح القناة")
            .addFields(
              {
                name: "📢 القناة",
                value: `${channel}`,
                inline: true
              },
              {
                name: "👮 بواسطة",
                value:
                  `<@${interaction.user.id}>`,
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
            `🔓 تم فتح ${channel} بنجاح.`
        });

      } catch (error) {

        console.error(
          "❌ UNLOCK ERROR:",
          error
        );

        if (!interaction.replied) {
          return interaction.reply({
            content:
              "❌ حدث خطأ أثناء فتح القناة.",
            ephemeral: true
          });
        }
      }
    }

    // ==================================================
    // ============== MODERATION PERMISSION =============
    // ==================================================

    if (
      !interaction.memberPermissions?.has(
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

    // ==================================================
    // ===================== TIMEOUT ====================
    // ==================================================

    if (
      interaction.commandName === "timeout"
    ) {

      const duration =
        interaction.options.getInteger(
          "duration"
        ) || 10;

      if (
        target.id ===
        interaction.user.id
      ) {
        return interaction.reply({
          content:
            "❌ لا يمكنك إعطاء نفسك Timeout.",
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

      try {

        await target.timeout(
          duration * 60 * 1000,
          `Timeout بواسطة ${interaction.user.tag}`
        );

        const embed =
          new EmbedBuilder()
            .setTitle("🔇 Timeout")
            .addFields(
              {
                name: "👤 العضو",
                value:
                  `<@${target.id}>`,
                inline: true
              },
              {
                name: "👮 المشرف",
                value:
                  `<@${interaction.user.id}>`,
                inline: true
              },
              {
                name: "⏱️ المدة",
                value:
                  `${duration} دقيقة`,
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

    // ==================================================
    // ================ REMOVE TIMEOUT ==================
    // ==================================================

    if (
      interaction.commandName ===
      "removetimeout"
    ) {

      try {

        await target.timeout(
          null,
          `إز
