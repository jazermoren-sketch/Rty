const fs = require("fs");
const path = require("path");

const DATA_PATH = path.join(__dirname, "promotions.json");

function ensureDataFile() {
  fs.mkdirSync(__dirname, { recursive: true });
  if (!fs.existsSync(DATA_PATH)) {
    fs.writeFileSync(
      DATA_PATH,
      JSON.stringify({ promotions: [], counters: {} }, null, 2),
      "utf8"
    );
  }
}

function load() {
  ensureDataFile();
  try {
    const data = JSON.parse(fs.readFileSync(DATA_PATH, "utf8"));
    return {
      promotions: Array.isArray(data.promotions) ? data.promotions : [],
      counters: data.counters && typeof data.counters === "object" ? data.counters : {}
    };
  } catch {
    return { promotions: [], counters: {} };
  }
}

function save(data) {
  ensureDataFile();
  fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2), "utf8");
}

module.exports = { load, save, DATA_PATH };
