const fs = require("fs");
const path = require("path");
const { PermissionFlagsBits } = require("discord.js");
const { Client } = require("discord.js");
const manager = require("./manager");

function loadConfig() {
  try {
    return JSON.parse(
      fs.readFileSync(path.join(__dirname, "..", "config", "config.json"), "utf8")
    );
  } catch {
    return {};
  }
}

function isAdmin(interaction) {
  return Boolean(
    interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)
  );
}

function promotionCommands() {
  return {
    type: 1,
    name: "promotions",
    description: "إدارة الإعلانات الدورية",
    options: [
      {
        type: 1,
        name: "add",
        description: "إضافة إعلان دوري",
        options: [
          { type: 3, name: "text", description: "نص الإعلان", required: false },
          { type: 11, name: "image", description: "صورة الإعلان", required: false },
          { type: 4, name: "every", description: "كل كم عرض يظهر الإعلان؟", required: true, min_value: 1 }
        ]
      },
      { type: 1, name: "list", description: "عرض الإعلانات" },
      {
        type: 1,
        name: "remove",
        description: "حذف إعلان",
        options: [{ type: 3, name: "id", description: "معرف الإعلان مثل PROMO-001", required: true }]
      },
      {
        type: 1,
        name: "toggle",
        description: "تفعيل أو تعطيل إعلان",
        options: [{ type: 3, name: "id", description: "معرف الإعلان", required: true }]
      }
    ]
  };
}

async function handlePromotionInteraction(interaction) {
  if (!interaction.isChatInputCommand() || interaction.commandName !== "promotions") return;

  if (!isAdmin(interaction)) {
    return interaction.reply({ content: "❌ هذا الأمر مخصص للإدارة فقط.", ephemeral: true });
  }

  const subcommand = interaction.options.getSubcommand();

  if (subcommand === "add") {
    const text = interaction.options.getString("text") || "";
    const attachment = interaction.options.getAttachment("image");
    const every = interaction.options.getInteger("every");

    if (!text && !attachment) {
      return interaction.reply({ content: "❌ خاصك تضيف نص أو صورة على الأقل.", ephemeral: true });
    }

    const promotion = manager.addPromotion({
      guildId: interaction.guildId,
      text,
      attachmentUrl: attachment?.url || null,
      attachmentName: attachment?.name || null,
      every
    });

    return interaction.reply({
      content: `✅ تمت إضافة الإعلان **${promotion.id}**. سيظهر كل **${promotion.every}** عروض.`,
      ephemeral: true
    });
  }

  if (subcommand === "list") {
    const promotions = manager.listPromotions(interaction.guildId);
    if (!promotions.length) {
      return interaction.reply({ content: "📭 لا توجد إعلانات مضافة حالياً.", ephemeral: true });
    }

    const lines = promotions.map(item => {
      const type = item.type === "both" ? "🖼️💬" : item.type === "image" ? "🖼️" : "💬";
      return `${type} **${item.id}** • كل **${item.every}** عروض • ${item.enabled ? "🟢 مفعّل" : "🔴 متوقف"}`;
    });

    return interaction.reply({ content: `📢 **الإعلانات الدورية:**\n${lines.join("\n")}`, ephemeral: true });
  }

  const id = interaction.options.getString("id");
  const promotion = manager.getPromotion(interaction.guildId, id);

  if (!promotion) {
    return interaction.reply({ content: "❌ لم يتم العثور على هذا الإعلان.", ephemeral: true });
  }

  if (subcommand === "remove") {
    manager.removePromotion(interaction.guildId, id);
    return interaction.reply({ content: `🗑️ تم حذف الإعلان **${id}**.`, ephemeral: true });
  }

  if (subcommand === "toggle") {
    manager.updatePromotion(interaction.guildId, id, { enabled: !promotion.enabled });
    return interaction.reply({
      content: `${!promotion.enabled ? "🟢 تم تفعيل" : "🔴 تم تعطيل"} الإعلان **${id}**.`,
      ephemeral: true
    });
  }
}

const originalOn = Client.prototype.on;
Client.prototype.on = function (event, listener) {
  if (event === "interactionCreate") {
    originalOn.call(this, event, interaction => {
      handlePromotionInteraction(interaction).catch(error => {
        console.error("❌ Promotions interaction error:", error);
      });
    });
    return originalOn.call(this, event, listener);
  }

  if (event === "messageCreate") {
    const wrapped = async message => {
      await listener(message);

      if (message.author?.bot || !message.guild) return;
      const config = loadConfig();
      if (!Array.isArray(config.marketplaceChannelIds)) return;
      if (!config.marketplaceChannelIds.includes(message.channel.id)) return;

      const count = manager.incrementChannelCounter(message.guild.id, message.channel.id);
      const due = manager.getDuePromotions(message.guild.id, message.channel.id, count);

      for (const promotion of due) {
        const payload = {};
        if (promotion.text) payload.content = promotion.text;
        if (promotion.attachmentUrl) {
          payload.files = [{
            attachment: promotion.attachmentUrl,
            name: promotion.attachmentName || "promotion"
          }];
        }
        if (payload.content || payload.files) {
          await message.channel.send(payload).catch(() => {});
        }
      }
    };

    return originalOn.call(this, event, wrapped);
  }

  if (event === "ready") {
    const wrappedReady = async (...args) => {
      const commands = this.application?.commands;
      if (commands && !commands.__promotionsPatched) {
        const originalSet = commands.set.bind(commands);
        commands.set = async commandList => {
          const list = Array.isArray(commandList) ? [...commandList] : [];
          if (!list.some(command => command?.name === "promotions")) {
            list.push(promotionCommands());
          }
          return originalSet(list);
        };
        commands.__promotionsPatched = true;
      }
      return listener(...args);
    };
    return originalOn.call(this, event, wrappedReady);
  }

  return originalOn.call(this, event, listener);
};

module.exports = { manager };
