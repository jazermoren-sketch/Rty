const { PermissionFlagsBits, ChannelType, AttachmentBuilder } = require("discord.js");
const manager = require("./manager");

const originalOn = require("discord.js").Client.prototype.on;
const originalSet = require("discord.js").Client.prototype.application;

function isAdmin(interaction) {
  return interaction.memberPermissions?.has(PermissionFlagsBits.Administrator);
}

function promotionCommands() {
  return {
    type: 1,
    name: "promotions",
    description: "إدارة الإعلانات الدورية",
    options: [
      { type: 1, name: "add", description: "إضافة إعلان دوري", options: [
        { type: 3, name: "text", description: "نص الإعلان", required: false },
        { type: 11, name: "image", description: "صورة الإعلان", required: false },
        { type: 4, name: "every", description: "كل كم عرض يظهر الإعلان؟", required: true, min_value: 1 }
      ]},
      { type: 1, name: "list", description: "عرض الإعلانات" },
      { type: 1, name: "remove", description: "حذف إعلان", options: [
        { type: 3, name: "id", description: "معرف الإعلان مثل PROMO-001", required: true }
      ]},
      { type: 1, name: "toggle", description: "تفعيل أو تعطيل إعلان", options: [
        { type: 3, name: "id", description: "معرف الإعلان", required: true }
      ]}
    ]
  };
}

const originalPrototypeOn = originalOn;
require("discord.js").Client.prototype.on = function (event, listener) {
  if (event === "messageCreate") {
    const wrapped = async message => {
      await listener(message);
      if (message.author?.bot || !message.guild) return;
      const config = require("../config/config.json");
      if (!Array.isArray(config.marketplaceChannelIds) || !config.marketplaceChannelIds.includes(message.channel.id)) return;
      const count = manager.incrementChannelCounter(message.guild.id, message.channel.id);
      const due = manager.getDuePromotions(message.guild.id, message.channel.id, count);
      for (const promotion of due) {
        const payload = {};
        if (promotion.text) payload.content = promotion.text;
        if (promotion.attachmentUrl) {
          payload.files = [{ attachment: promotion.attachmentUrl, name: promotion.attachmentName || "promotion" }];
        }
        if (payload.content || payload.files) await message.channel.send(payload).catch(() => {});
      }
    };
    return originalPrototypeOn.call(this, event, wrapped);
  }
  return originalPrototypeOn.call(this, event, listener);
};

const ApplicationCommandManager = Object.getPrototypeOf(require("discord.js").Client.prototype.application || {});

const originalClientLogin = require("discord.js").Client.prototype.login;
require("discord.js").Client.prototype.login = async function (...args) {
  const result = await originalClientLogin.apply(this, args);
  const managerSet = this.application?.commands?.set;
  if (managerSet && !managerSet.__promotionsPatched) {
    const original = managerSet.bind(this.application.commands);
    const patched = async commands => {
      const list = Array.isArray(commands) ? [...commands] : [];
      if (!list.some(command => command?.name === "promotions")) list.push(promotionCommands());
      return original(list);
    };
    patched.__promotionsPatched = true;
    this.application.commands.set = patched;
  }
  return result;
};

module.exports = { manager };
