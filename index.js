const {
  Client,
  GatewayIntentBits,
  REST,
  Routes,
  SlashCommandBuilder,
  PermissionFlagsBits
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

// ==================== TIMEOUT COMMAND ====================

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
