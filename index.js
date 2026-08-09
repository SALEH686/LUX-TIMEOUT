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

const durations = {
  "1": 1,
  "5": 5,
  "10": 10,
  "30": 30,
  "60": 60
};

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

client.once("ready", async () => {
  console.log(`✅ LUX TIMEOUT logged in as ${client.user.tag}`);

  const rest = new REST({ version: "10" }).setToken(TOKEN);

  try {
    await rest.put(
      Routes.applicationCommands(CLIENT_ID),
      {
        body: [timeoutCommand.toJSON()]
      }
    );

    console.log("✅ /timeout command registered successfully!");
  } catch (error) {
    console.error("❌ Failed to register command:", error);
  }
});

client.on("interactionCreate", async interaction => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName !== "timeout") return;

  const target = interaction.options.getMember("user");
  const duration = interaction.options.getInteger("duration") || 10;

  if (!target) {
    return interaction.reply({
      content: "❌ لم أستطع العثور على هذا العضو.",
      ephemeral: true
    });
  }

  if (!interaction.memberPermissions.has(PermissionFlagsBits.ModerateMembers)) {
    return interaction.reply({
      content: "❌ ليس لديك صلاحية استخدام الأمر.",
      ephemeral: true
    });
  }

  if (!target.moderatable) {
    return interaction.reply({
      content: "❌ لا أستطيع إعطاء هذا العضو Timeout. تأكد من ترتيب الرتب والصلاحيات.",
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
});

client.login(TOKEN);
