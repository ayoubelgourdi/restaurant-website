const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const fs = require('fs');
const seed = require('./data/seed');

const TZ = process.env.SHOP_TZ || 'Europe/Oslo';
fs.mkdirSync(path.join(__dirname, 'data'), { recursive: true });
const db = new DatabaseSync(process.env.DB_FILE || path.join(__dirname, 'data', 'limon.db'));

db.exec(`
PRAGMA journal_mode = WAL;
CREATE TABLE IF NOT EXISTS categories (
  id TEXT PRIMARY KEY, sort INTEGER NOT NULL,
  name_en TEXT NOT NULL, name_fr TEXT NOT NULL, name_ar TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS dishes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  category TEXT NOT NULL REFERENCES categories(id),
  sort INTEGER NOT NULL DEFAULT 0, price INTEGER NOT NULL, img TEXT,
  is_new INTEGER NOT NULL DEFAULT 0, available INTEGER NOT NULL DEFAULT 1,
  name_en TEXT NOT NULL, name_fr TEXT NOT NULL DEFAULT '', name_ar TEXT NOT NULL DEFAULT '',
  desc_en TEXT NOT NULL DEFAULT '', desc_fr TEXT NOT NULL DEFAULT '', desc_ar TEXT NOT NULL DEFAULT '');
CREATE TABLE IF NOT EXISTS orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at TEXT NOT NULL, day TEXT NOT NULL,
  mode TEXT NOT NULL CHECK (mode IN ('dine-in','delivery')),
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new','preparing','done')),
  name TEXT NOT NULL, phone TEXT, table_no TEXT,
  lat REAL, lng REAL, acc INTEGER, note TEXT, total INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS order_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  dish_id INTEGER, name TEXT NOT NULL, price INTEGER NOT NULL, qty INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);
CREATE INDEX IF NOT EXISTS idx_orders_day ON orders(day);
CREATE INDEX IF NOT EXISTS idx_items_order ON order_items(order_id);
`);
db.exec('PRAGMA foreign_keys = ON');

// ---- Seed (mra wa7da)
if (!db.prepare('SELECT COUNT(*) n FROM categories').get().n) {
  const c = db.prepare('INSERT INTO categories VALUES (?,?,?,?,?)');
  seed.categories.forEach(([id, n], i) => c.run(id, i, n[0], n[1], n[2]));
  const d = db.prepare('INSERT INTO dishes (category,sort,price,img,is_new,name_en,name_fr,name_ar,desc_en,desc_fr,desc_ar) VALUES (?,?,?,?,?,?,?,?,?,?,?)');
  seed.dishes.forEach(([cat, price, img, isNew, n, s], i) => d.run(cat, i, price, img, isNew, n[0], n[1], n[2], s[0], s[1], s[2]));
}

// ---- Settings
const getSetting = (k, def) => { const r = db.prepare('SELECT value FROM settings WHERE key=?').get(k); return r ? JSON.parse(r.value) : def; };
const setSetting = (k, v) => db.prepare('INSERT INTO settings(key,value) VALUES (?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value').run(k, JSON.stringify(v));
const DEFAULT_HOURS = [0, 1, 2, 3, 4, 5, 6].map(d => ({ closed: false, open: d === 0 || d === 6 ? '12:00' : '10:30', close: '20:00' })); // 0 = Sunday

// ---- Time (f wa9t dyal l'mat3am)
function shopNow(d = new Date()) {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-GB', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', weekday: 'short', hourCycle: 'h23' })
    .formatToParts(d).map(x => [x.type, x.value]));
  return { dow: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(p.weekday), min: +p.hour * 60 + +p.minute, day: `${p.year}-${p.month}-${p.day}` };
}
const toMin = s => { const [h, m] = s.split(':').map(Number); return h * 60 + m; };

function shopStatus() {
  const { dow, min } = shopNow();
  const hours = getSetting('hours', DEFAULT_HOURS);
  const override = getSetting('override', 'auto');
  const t = hours[dow];
  let open = !t.closed && min >= toMin(t.open) && min < toMin(t.close);
  let closes = open ? t.close : null;
  if (override === 'open') open = true;
  if (override === 'closed') { open = false; closes = null; }
  let opens = null, opensDow = null;
  if (!open) {
    for (let i = 0; i < 8; i++) {
      const d = (dow + i) % 7, h = hours[d];
      if (h.closed || (i === 0 && min >= toMin(h.open))) continue;
      opens = h.open; opensDow = d; break;
    }
  }
  return { open, override, closes, opens, opensDow, today: dow, hours };
}

module.exports = { db, shopNow, shopStatus, getSetting, setSetting, DEFAULT_HOURS, toMin };
