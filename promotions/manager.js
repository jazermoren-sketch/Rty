const { load, save } = require("./storage");

function nextId(data) {
  const max = data.promotions.reduce((highest, item) => {
    const number = Number(String(item.id || "").replace("PROMO-", ""));
    return Number.isFinite(number) ? Math.max(highest, number) : highest;
  }, 0);
  return `PROMO-${String(max + 1).padStart(3, "0")}`;
}

function normalizeType({ text, attachmentUrl }) {
  if (text && attachmentUrl) return "both";
  if (attachmentUrl) return "image";
  return "text";
}

function addPromotion({ guildId, text = "", attachmentUrl = null, attachmentName = null, every }) {
  const data = load();
  const interval = Math.max(1, Number(every) || 1);
  const promotion = {
    id: nextId(data),
    guildId,
    type: normalizeType({ text, attachmentUrl }),
    text: String(text || ""),
    attachmentUrl,
    attachmentName,
    every: interval,
    enabled: true,
    createdAt: new Date().toISOString()
  };
  data.promotions.push(promotion);
  save(data);
  return promotion;
}

function listPromotions(guildId) {
  return load().promotions.filter(item => item.guildId === guildId);
}

function getPromotion(guildId, id) {
  return listPromotions(guildId).find(item => item.id === id) || null;
}

function removePromotion(guildId, id) {
  const data = load();
  const before = data.promotions.length;
  data.promotions = data.promotions.filter(item => !(item.guildId === guildId && item.id === id));
  if (data.promotions.length === before) return false;
  save(data);
  return true;
}

function updatePromotion(guildId, id, changes) {
  const data = load();
  const promotion = data.promotions.find(item => item.guildId === guildId && item.id === id);
  if (!promotion) return null;
  Object.assign(promotion, changes);
  if (changes.every !== undefined) promotion.every = Math.max(1, Number(changes.every) || 1);
  promotion.type = normalizeType(promotion);
  save(data);
  return promotion;
}

function incrementChannelCounter(guildId, channelId) {
  const data = load();
  const key = `${guildId}:${channelId}`;
  data.counters[key] = Number(data.counters[key] || 0) + 1;
  save(data);
  return data.counters[key];
}

function getDuePromotions(guildId, channelId, count) {
  return listPromotions(guildId).filter(item => item.enabled && count % item.every === 0);
}

module.exports = {
  addPromotion,
  listPromotions,
  getPromotion,
  removePromotion,
  updatePromotion,
  incrementChannelCounter,
  getDuePromotions
};
