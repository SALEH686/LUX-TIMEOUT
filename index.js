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

function loadJSON(path) {
  try {
    if (!fs.existsSync(path)) {
      fs.writeFileSync(path, "{}");
      return {};
    }

    return JSON.parse(
      fs.readFileSync(path, "utf8")
    );
  } catch {
    return {};
  }
}

function saveJSON(path, data) {
  fs.writeFileSync(
    path,
    JSON.stringify(data, null, 2)
  );
}

let warnings = loadJSON("./warnings.json");
let logsChannels = loadJSON("./logs.json");
let welcomeChannels = loadJSON("./welcome.json");

async function sendLog(guild, embed) {
  try {
    const channelId =
      logsChannels[guild.id];

    if (!channelId) return;

    const channel =
      guild.channels.cache.get(channelId);

    if (!channel) return;

    await channel.send({
      embeds: [embed]
    });

  } catch (error) {
    console.error(
      "LOG ERROR:",
      error
    );
  }
}
const commands = [

new SlashCommandBuilder()
.setName("timeout")
.setDescription("إعطاء Timeout لعضو")
.addUserOption(option =>
option
.setName("user")
.setDescription("العضو")
.setRequired(true))
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
{ name: "60 دقيقة", value: 60 }
))
.setDefaultMemberPermissions(
PermissionFlagsBits.ModerateMembers
),

new SlashCommandBuilder()
.setName("removetimeout")
.setDescription("إزالة Timeout")
.addUserOption(option =>
option
.setName("user")
.setDescription("العضو")
.setRequired(true))
.setDefaultMemberPermissions(
PermissionFlagsBits.ModerateMembers
),

new SlashCommandBuilder()
.setName("warn")
.setDescription("تحذير عضو")
.addUserOption(option =>
option
.setName("user")
.setDescription("العضو")
.setRequired(true))
.addStringOption(option =>
option
.setName("reason")
.setDescription("سبب التحذير")
.setRequired(true))
.setDefaultMemberPermissions(
PermissionFlagsBits.ModerateMembers
),

new SlashCommandBuilder()
.setName("unwarn")
.setDescription("إزالة آخر تحذير")
.addUserOption(option =>
option
.setName("user")
.setDescription("العضو")
.setRequired(true))
.setDefaultMemberPermissions(
PermissionFlagsBits.ModerateMembers
),

new SlashCommandBuilder()
.setName("warnings")
.setDescription("عرض تحذيرات العضو")
.addUserOption(option =>
option
.setName("user")
.setDescription("العضو")
.setRequired(true))
.setDefaultMemberPermissions(
PermissionFlagsBits.ModerateMembers
),

new SlashCommandBuilder()
.setName("setlogs")
.setDescription("تحديد قناة الـ Logs")
.addChannelOption(option =>
option
.setName("channel")
.setDescription("قناة اللوق")
.addChannelTypes(
ChannelType.GuildText
)
.setRequired(true))
.setDefaultMemberPermissions(
PermissionFlagsBits.Administrator
),

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
.setRequired(true))
.setDefaultMemberPermissions(
PermissionFlagsBits.Administrator
),

new SlashCommandBuilder()
.setName("lock")
.setDescription("قفل الشات الحالي")
.setDefaultMemberPermissions(
PermissionFlagsBits.ManageChannels
),

new SlashCommandBuilder()
.setName("unlock")
.setDescription("فتح الشات الحالي")
.setDefaultMemberPermissions(
PermissionFlagsBits.ManageChannels
)

];

client.once("ready", async () => {

console.log(
`✅ Logged in as ${client.user.tag}`
);

const rest = new REST({
version: "10"
}).setToken(TOKEN);

try {

await rest.put(
Routes.applicationCommands(
CLIENT_ID
),
{
body: commands.map(
cmd => cmd.toJSON()
)
}
);

console.log(
"✅ All slash commands registered successfully!"
);

} catch (error) {

console.error(
"❌ REGISTER ERROR:",
error
);

}

});
// =========================
// WELCOME SYSTEM
// =========================

client.on("guildMemberAdd", async member => {
  try {
    const channelId =
      welcomeChannels[member.guild.id];

    if (!channelId) return;

    const channel =
      member.guild.channels.cache.get(channelId);

    if (!channel || !channel.isTextBased()) {
      return;
    }

    const embed = new EmbedBuilder()
      .setTitle("👋 عضو جديد!")
      .setDescription(
        `أهلًا وسهلًا ${member} في **${member.guild.name}** 🎉\n\n` +
        `نتمنى لك وقتًا ممتعًا معنا ❤️`
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


// =========================
// INTERACTION SYSTEM
// =========================

client.on("interactionCreate", async interaction => {

  if (!interaction.isChatInputCommand()) {
    return;
  }

  const command =
    interaction.commandName;


  // =========================
  // SET LOGS
  // =========================

  if (command === "setlogs") {

    try {

      if (
        !interaction.memberPermissions?.has(
          PermissionFlagsBits.Administrator
        )
      ) {
        return interaction.reply({
          content:
            "❌ تحتاج صلاحية Administrator.",
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
            "❌ لم يتم العثور على القناة.",
          ephemeral: true
        });
      }

      logsChannels[
        interaction.guild.id
      ] = channel.id;

      saveJSON(
        "./logs.json",
        logsChannels
      );

      return interaction.reply({
        content:
          `✅ تم تحديد قناة الـLogs: ${channel}`
      });

    } catch (error) {

      console.error(
        "❌ SETLOGS ERROR:",
        error
      );

      return interaction.reply({
        content:
          "❌ حدث خطأ أثناء تحديد قناة الـLogs.",
        ephemeral: true
      });

    }
  }


  // =========================
  // SET WELCOME
  // =========================

  if (command === "setwelcome") {

    try {

      if (
        !interaction.memberPermissions?.has(
          PermissionFlagsBits.Administrator
        )
      ) {
        return interaction.reply({
          content:
            "❌ تحتاج صلاحية Administrator.",
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
            "❌ لم يتم العثور على القناة.",
          ephemeral: true
        });
      }

      welcomeChannels[
        interaction.guild.id
      ] = channel.id;

      saveJSON(
        "./welcome.json",
        welcomeChannels
      );

      return interaction.reply({
        content:
          `👋 تم تحديد قناة الترحيب: ${channel}`
      });

    } catch (error) {

      console.error(
        "❌ SETWELCOME ERROR:",
        error
      );

      return interaction.reply({
        content:
          "❌ حدث خطأ أثناء تحديد قناة الترحيب.",
        ephemeral: true
      });

    }
  }


  // =========================
  // LOCK
  // =========================

  if (command === "lock") {

    try {

      if (
        !interaction.memberPermissions?.has(
          PermissionFlagsBits.ManageChannels
        )
      ) {
        return interaction.reply({
          content:
            "❌ تحتاج صلاحية Manage Channels.",
          ephemeral: true
        });
      }

      const channel =
        interaction.channel;

      if (!channel) {
        return interaction.reply({
          content:
            "❌ لم أستطع العثور على القناة.",
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
        .setTitle("🔒 تم قفل قناة")
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

      return interaction.reply({
        content:
          "❌ حدث خطأ أثناء قفل القناة.",
        ephemeral: true
      });

    }
  }


  // =========================
  // UNLOCK
  // =========================

  if (command === "unlock") {

    try {

      if (
        !interaction.memberPermissions?.has(
          PermissionFlagsBits.ManageChannels
        )
      ) {
        return interaction.reply({
          content:
            "❌ تحتاج صلاحية Manage Channels.",
          ephemeral: true
        });
      }

      const channel =
        interaction.channel;

      if (!channel) {
        return interaction.reply({
          content:
            "❌ لم أستطع العثور على القناة.",
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
        .setTitle("🔓 تم فتح قناة")
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

      return interaction.reply({
        content:
          "❌ حدث خطأ أثناء فتح القناة.",
        ephemeral: true
      });

    }
  }


  // =========================
  // MODERATION PERMISSION
  // =========================

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


  // =========================
  // GET TARGET
  // =========================

  const target =
    interaction.options.getMember(
      "user"
    );

  if (!target) {

    return interaction.reply({
      content:
        "❌ لم أستطع العثور على هذا العضو.",
      ephemeral: true
    });

  }


  // =========================
  // TIMEOUT
  // =========================

  if (command === "timeout") {

    try {

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
            "❌ لا أستطيع إعطاء هذا العضو Timeout. تأكد من ترتيب الرتب.",
          ephemeral: true
        });
      }

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
            name: "👮 بواسطة",
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


  // =========================
  // REMOVE TIMEOUT
  // =========================

  if (
    command === "removetimeout"
  ) {

    try {

      await target.timeout(
        null,
        `إزالة Timeout بواسطة ${interaction.user.tag}`
      );

      const embed =
        new EmbedBuilder()
        .setTitle("🔊 إزالة Timeout")
        .addFields(
          {
            name: "👤 العضو",
            value:
              `<@${target.id}>`,
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
          `🔊 تم إزالة Timeout عن <@${target.id}>.`
      });

    } catch (error) {

      console.error(
        "❌ REMOVE TIMEOUT ERROR:",
        error
      );

      return interaction.reply({
        content:
          "❌ حدث خطأ أثناء إزالة Timeout.",
        ephemeral: true
      });

    }
  }
  // =========================
  // WARN
  // =========================

  if (command === "warn") {

    try {

      const reason =
        interaction.options.getString(
          "reason"
        );

      const key =
        `${interaction.guild.id}-${target.id}`;

      if (!warnings[key]) {
        warnings[key] = [];
      }

      warnings[key].push({
        reason: reason,
        moderator:
          interaction.user.id,
        date:
          new Date().toISOString()
      });

      saveJSON(
        "./warnings.json",
        warnings
      );

      const embed =
        new EmbedBuilder()
        .setTitle("⚠️ تحذير")
        .addFields(
          {
            name: "👤 العضو",
            value:
              `<@${target.id}>`,
            inline: true
          },
          {
            name: "👮 بواسطة",
            value:
              `<@${interaction.user.id}>`,
            inline: true
          },
          {
            name: "📝 السبب",
            value: reason
          },
          {
            name: "📊 عدد التحذيرات",
            value:
              `${warnings[key].length}`,
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
          `⚠️ تم تحذير <@${target.id}>.\n` +
          `📝 السبب: **${reason}**\n` +
          `📊 عدد التحذيرات: **${warnings[key].length}**`
      });

    } catch (error) {

      console.error(
        "❌ WARN ERROR:",
        error
      );

      return interaction.reply({
        content:
          "❌ حدث خطأ أثناء التحذير.",
        ephemeral: true
      });

    }
  }


  // =========================
  // UNWARN
  // =========================

  if (command === "unwarn") {

    try {

      const key =
        `${interaction.guild.id}-${target.id}`;

      if (
        !warnings[key] ||
        warnings[key].length === 0
      ) {

        return interaction.reply({
          content:
            `✅ <@${target.id}> لا يملك أي تحذيرات.`,
          ephemeral: true
        });

      }

      const removed =
        warnings[key].pop();

      saveJSON(
        "./warnings.json",
        warnings
      );

      const embed =
        new EmbedBuilder()
        .setTitle("✅ إزالة تحذير")
        .addFields(
          {
            name: "👤 العضو",
            value:
              `<@${target.id}>`,
            inline: true
          },
          {
            name: "👮 بواسطة",
            value:
              `<@${interaction.user.id}>`,
            inline: true
          },
          {
            name: "📝 التحذير المحذوف",
            value:
              removed.reason
          },
          {
            name: "📊 المتبقي",
            value:
              `${warnings[key].length}`,
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
          `📊 التحذيرات المتبقية: **${warnings[key].length}**`
      });

    } catch (error) {

      console.error(
        "❌ UNWARN ERROR:",
        error
      );

      return interaction.reply({
        content:
          "❌ حدث خطأ أثناء إزالة التحذير.",
        ephemeral: true
      });

    }
  }


  // =========================
  // WARNINGS
  // =========================

  if (command === "warnings") {

    try {

      const key =
        `${interaction.guild.id}-${target.id}`;

      const list =
        warnings[key];

      if (!list || list.length === 0) {

        return interaction.reply({
          content:
            `📋 <@${target.id}> لا يملك أي تحذيرات.`,
          ephemeral: true
        });

      }

      const embed =
        new EmbedBuilder()
        .setTitle("⚠️ تحذيرات العضو")
        .setDescription(
          `👤 العضو: <@${target.id}>\n` +
          `📊 عدد التحذيرات: **${list.length}**`
        )
        .setTimestamp();

      list.forEach((warning, index) => {

        const timestamp =
          Math.floor(
            new Date(
              warning.date
            ).getTime() / 1000
          );

        embed.addFields({
          name:
            `⚠️ تحذير #${index + 1}`,
          value:
            `📝 السبب: ${warning.reason}\n` +
            `👮 بواسطة: <@${warning.moderator}>\n` +
            `📅 <t:${timestamp}:F>`
        });

      });

      return interaction.reply({
        embeds: [embed],
        ephemeral: true
      });

    } catch (error) {

      console.error(
        "❌ WARNINGS ERROR:",
        error
      );

      return interaction.reply({
        content:
          "❌ حدث خطأ أثناء عرض التحذيرات.",
        ephemeral: true
      });

    }
  }

});

// =========================
// LOGIN
// =========================

client.login(TOKEN);
