const express = require('express');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { db, shopNow, shopStatus, getSetting, setSetting, DEFAULT_HOURS, toMin } = require('./db');

const app = express();
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'limon123';
if (!process.env.ADMIN_PASSWORD && !getSetting('admin_pw', null)) console.warn('!! Using default admin password "limon123". Change it in /admin > Settings.');
const UPLOADS = path.join(__dirname, 'public', 'img', 'uploads');
fs.mkdirSync(UPLOADS, { recursive: true });

// ---- Auth helpers
const sha = s => crypto.createHash('sha256').update(String(s)).digest();
const scrypt = (pw, salt) => crypto.scryptSync(String(pw), salt, 64);
function checkPassword(pw) {
  const rec = getSetting('admin_pw', null); // ila tbddel mn /admin kaykhdem hada, o ADMIN_PASSWORD kay-t-ignora
  if (rec) return crypto.timingSafeEqual(scrypt(pw, Buffer.from(rec.salt, 'hex')), Buffer.from(rec.hash, 'hex'));
  return crypto.timingSafeEqual(sha(pw), sha(ADMIN_PASSWORD));
}
function savePassword(pw) { const salt = crypto.randomBytes(16); setSetting('admin_pw', { salt: salt.toString('hex'), hash: scrypt(pw, salt).toString('hex') }); }
const locked = k => (attempts.get(k) || { until: 0 }).until > Date.now();
const fail = k => { const a = attempts.get(k) || { n: 0, until: 0 }; if (++a.n >= 5) { a.n = 0; a.until = Date.now() + 900000; } attempts.set(k, a); };
const sessions = new Map(), attempts = new Map(), orderHits = new Map();
function readCookie(req, name) {
  const p = (req.headers.cookie || '').split(';').map(c => c.trim()).find(c => c.startsWith(name + '='));
  return p ? p.slice(name.length + 1) : null;
}
function isAdmin(req) {
  const t = readCookie(req, 'lm_admin'), exp = t && sessions.get(t);
  if (exp && exp > Date.now()) return true;
  if (t) sessions.delete(t);
  return false;
}
const requireAdmin = (req, res, next) => isAdmin(req) ? next() : res.status(401).json({ error: 'auth' });
const noStore = (req, res, next) => { res.set('Cache-Control', 'no-store'); next(); };

// Upload (parser dyalo 9bel l'parser l'3am 7it tswira kbira)
app.post('/api/admin/upload', requireAdmin, express.json({ limit: '6mb' }), (req, res) => {
  const m = /^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/=]+)$/.exec((req.body && req.body.data) || '');
  if (!m) return res.status(400).json({ error: 'bad_image' });
  const buf = Buffer.from(m[2], 'base64');
  if (buf.length > 4 * 1024 * 1024) return res.status(400).json({ error: 'bad_image' });
  const name = crypto.randomBytes(8).toString('hex') + '.' + (m[1] === 'jpeg' ? 'jpg' : m[1]);
  fs.writeFileSync(path.join(UPLOADS, name), buf);
  res.json({ img: 'uploads/' + name });
});

app.use(express.json({ limit: '20kb' }));
app.use(express.static(path.join(__dirname, 'public')));

// ---- Pages
const safeJson = o => JSON.stringify(o).replace(/</g, '\\u003c');
const shopInfo = () => ({ ...shopStatus(), geo: getSetting('geo', null) });
const distanceM = (a, b) => { const R = 6371000, rad = x => x * Math.PI / 180, dLat = rad(b.lat - a.lat), dLng = rad(b.lng - a.lng); const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2; return 2 * R * Math.asin(Math.sqrt(h)); };
const categories = () => db.prepare('SELECT * FROM categories ORDER BY sort').all();
const dishes = () => db.prepare('SELECT * FROM dishes ORDER BY sort, id').all();
app.get('/', (req, res) => res.render('index'));
app.get('/order', (req, res) => res.render('order', { data: safeJson({ categories: categories(), dishes: dishes(), shop: shopInfo() }) }));
app.get('/admin', noStore, (req, res) => res.render('admin'));
app.get('/api/status', noStore, (req, res) => res.json(shopInfo()));

// ---- Customer order
const err = (res, code, status = 400) => res.status(status).json({ error: code });
app.post('/api/order', (req, res) => {
  const now = Date.now();
  const hits = (orderHits.get(req.ip) || []).filter(t => now - t < 600000);
  if (hits.length >= 10) return err(res, 'rate', 429);
  orderHits.set(req.ip, [...hits, now]);
  if (!shopStatus().open) return err(res, 'closed', 403);

  const b = req.body || {};
  const str = (v, n) => String(v == null ? '' : v).trim().slice(0, n);
  const mode = b.mode === 'delivery' || b.mode === 'dine-in' ? b.mode : null;
  const name = str(b.name, 60);
  if (!mode) return err(res, 'mode');
  if (!name) return err(res, 'name');

  let phone = null, table = null, lat = null, lng = null, acc = null;
  if (mode === 'delivery') {
    phone = str(b.phone, 20);
    lat = Number(b.loc && b.loc.lat); lng = Number(b.loc && b.loc.lng); acc = Math.round(Number(b.loc && b.loc.acc) || 0);
    if (!/^\+?[\d\s-]{6,20}$/.test(phone)) return err(res, 'phone');
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) return err(res, 'loc');
  } else {
    table = str(b.table, 10);
    if (!table) return err(res, 'table');
    const geo = getSetting('geo', null); // ila l'admin 7dded moqa3 l'mat3am, l'client khass ykoun 9rib
    if (geo) {
      lat = Number(b.loc && b.loc.lat); lng = Number(b.loc && b.loc.lng); acc = Math.round(Number(b.loc && b.loc.acc) || 0);
      if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) return err(res, 'loc_dine');
      if (distanceM(geo, { lat, lng }) - Math.min(acc, 150) > geo.radius) return err(res, 'far', 403);
    }
  }

  const getDish = db.prepare('SELECT id, name_en, price, available FROM dishes WHERE id = ?');
  const lines = [];
  for (const it of Array.isArray(b.items) ? b.items.slice(0, 50) : []) {
    const d = getDish.get(Number(it.id));
    const qty = Math.min(Math.max(parseInt(it.qty, 10) || 0, 0), 20);
    if (!d || !qty) continue;
    if (!d.available) return err(res, 'unavailable');
    lines.push({ d, qty });
  }
  if (!lines.length) return err(res, 'empty');
  const total = lines.reduce((s, l) => s + l.qty * l.d.price, 0);

  let id;
  db.exec('BEGIN');
  try {
    id = db.prepare('INSERT INTO orders (created_at,day,mode,name,phone,table_no,lat,lng,acc,note,total) VALUES (?,?,?,?,?,?,?,?,?,?,?)')
      .run(new Date().toISOString(), shopNow().day, mode, name, phone, table, lat, lng, acc, str(b.note, 300), total).lastInsertRowid;
    const ins = db.prepare('INSERT INTO order_items (order_id,dish_id,name,price,qty) VALUES (?,?,?,?,?)');
    lines.forEach(l => ins.run(id, l.d.id, l.d.name_en, l.d.price, l.qty));
    db.exec('COMMIT');
  } catch (e) { db.exec('ROLLBACK'); console.error(e); return err(res, 'server', 500); }
  res.json({ num: Number(id), total });
});

// ---- Admin: login
app.post('/api/admin/login', noStore, (req, res) => {
  const now = Date.now();
  if (locked(req.ip)) return err(res, 'locked', 429);
  if (!checkPassword(req.body && req.body.password)) { fail(req.ip); return err(res, 'wrong', 401); }
  attempts.delete(req.ip);
  const token = crypto.randomBytes(32).toString('hex');
  sessions.set(token, now + 12 * 3600 * 1000);
  res.set('Set-Cookie', `lm_admin=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=43200${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`);
  res.json({ ok: true });
});
app.post('/api/admin/logout', (req, res) => {
  sessions.delete(readCookie(req, 'lm_admin'));
  res.set('Set-Cookie', 'lm_admin=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0');
  res.json({ ok: true });
});

// ---- Admin: password (kat-t7fed hashed f database, o l'env ka-ykoun ghir l'bdaya)
app.post('/api/admin/password', noStore, requireAdmin, (req, res) => {
  const b = req.body || {}, key = 'pw:' + req.ip;
  if (locked(key)) return err(res, 'locked', 429);
  if (!checkPassword(b.current)) { fail(key); return err(res, 'pw_current', 403); }
  const next = String(b.next || '');
  if (next.length < 8 || next.length > 200) return err(res, 'pw_short');
  attempts.delete(key);
  savePassword(next);
  const me = readCookie(req, 'lm_admin');
  for (const k of [...sessions.keys()]) if (k !== me) sessions.delete(k); // kol l'appareils lokhrin kaytkhrjo
  res.json({ ok: true });
});

// ---- Admin: moqa3 l'mat3am (l'check dyal Dine-in)
app.put('/api/admin/geo', requireAdmin, (req, res) => {
  const b = req.body || {};
  if (b.clear) { setSetting('geo', null); return res.json({ ok: true }); }
  const lat = Number(b.lat), lng = Number(b.lng), radius = Math.round(Number(b.radius) || 150);
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180 || radius < 20 || radius > 5000) return err(res, 'bad');
  setSetting('geo', { lat, lng, radius });
  res.json({ ok: true });
});

// ---- Admin: orders
const withItems = rows => { const q = db.prepare('SELECT name, price, qty FROM order_items WHERE order_id = ?'); return rows.map(r => ({ ...r, items: q.all(r.id) })); };
app.get('/api/admin/orders', noStore, requireAdmin, (req, res) => {
  const rows = db.prepare(`SELECT * FROM orders WHERE status != 'done'
    OR id IN (SELECT id FROM orders WHERE status = 'done' ORDER BY id DESC LIMIT 30) ORDER BY id DESC`).all();
  res.json(withItems(rows));
});
app.post('/api/admin/orders/:id/status', noStore, requireAdmin, (req, res) => {
  const status = req.body && req.body.status;
  if (!['new', 'preparing', 'done'].includes(status)) return err(res, 'bad');
  const r = db.prepare('UPDATE orders SET status = ? WHERE id = ?').run(status, Number(req.params.id));
  r.changes ? res.json({ ok: true }) : err(res, 'bad', 404);
});

// ---- Admin: dishes
function cleanDish(b) {
  const s = (v, n) => String(v == null ? '' : v).trim().slice(0, n);
  const price = parseInt(b.price, 10);
  const cat = db.prepare('SELECT id FROM categories WHERE id = ?').get(s(b.category, 30));
  const img = b.img ? s(b.img, 80) : null;
  if (!cat || !s(b.name_en, 80) || !(price >= 0 && price <= 100000)) return null;
  if (img && (!/^[\w./-]+$/.test(img) || img.includes('..'))) return null;
  const en = s(b.name_en, 80), dEn = s(b.desc_en, 300);
  return [cat.id, price, img, b.is_new ? 1 : 0, b.available === false ? 0 : 1, en, s(b.name_fr, 80) || en, s(b.name_ar, 80) || en, dEn, s(b.desc_fr, 300) || dEn, s(b.desc_ar, 300) || dEn];
}
app.get('/api/admin/dishes', noStore, requireAdmin, (req, res) => res.json({ categories: categories(), dishes: dishes() }));
app.post('/api/admin/dishes', requireAdmin, (req, res) => {
  const v = cleanDish(req.body || {});
  if (!v) return err(res, 'bad');
  const sort = db.prepare('SELECT COALESCE(MAX(sort),0)+1 n FROM dishes').get().n;
  const r = db.prepare('INSERT INTO dishes (category,price,img,is_new,available,name_en,name_fr,name_ar,desc_en,desc_fr,desc_ar,sort) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)').run(...v, sort);
  res.json({ id: Number(r.lastInsertRowid) });
});
app.put('/api/admin/dishes/:id', requireAdmin, (req, res) => {
  const v = cleanDish(req.body || {});
  if (!v) return err(res, 'bad');
  const r = db.prepare('UPDATE dishes SET category=?,price=?,img=?,is_new=?,available=?,name_en=?,name_fr=?,name_ar=?,desc_en=?,desc_fr=?,desc_ar=? WHERE id=?').run(...v, Number(req.params.id));
  r.changes ? res.json({ ok: true }) : err(res, 'bad', 404);
});
app.patch('/api/admin/dishes/:id/available', requireAdmin, (req, res) => {
  db.prepare('UPDATE dishes SET available=? WHERE id=?').run(req.body && req.body.available ? 1 : 0, Number(req.params.id));
  res.json({ ok: true });
});
app.delete('/api/admin/dishes/:id', requireAdmin, (req, res) => {
  db.prepare('DELETE FROM dishes WHERE id=?').run(Number(req.params.id));
  res.json({ ok: true });
});

// ---- Admin: hours
app.put('/api/admin/hours', requireAdmin, (req, res) => {
  const { hours, override } = req.body || {};
  const ok = Array.isArray(hours) && hours.length === 7 && hours.every(h => /^([01]\d|2[0-3]):[0-5]\d$/.test(h.open) && /^([01]\d|2[0-3]):[0-5]\d$/.test(h.close) && toMin(h.open) < toMin(h.close));
  if (!ok || !['auto', 'open', 'closed'].includes(override)) return err(res, 'bad');
  setSetting('hours', hours.map(h => ({ closed: !!h.closed, open: h.open, close: h.close })));
  setSetting('override', override);
  res.json({ ok: true });
});

// ---- Admin: statistics
app.get('/api/admin/stats', noStore, requireAdmin, (req, res) => {
  const re = /^\d{4}-\d{2}-\d{2}$/, today = shopNow().day;
  const from = re.test(req.query.from) ? req.query.from : today, to = re.test(req.query.to) ? req.query.to : today;
  const one = sql => db.prepare(sql).get(from, to), all = sql => db.prepare(sql).all(from, to);
  res.json({
    from, to,
    total: one('SELECT COUNT(*) n, COALESCE(SUM(total),0) revenue FROM orders WHERE day BETWEEN ? AND ?'),
    byMode: all('SELECT mode, COUNT(*) n, SUM(total) revenue FROM orders WHERE day BETWEEN ? AND ? GROUP BY mode'),
    byDay: all('SELECT day, COUNT(*) n, SUM(total) revenue FROM orders WHERE day BETWEEN ? AND ? GROUP BY day ORDER BY day'),
    top: all(`SELECT oi.name, SUM(oi.qty) qty, SUM(oi.qty * oi.price) revenue FROM order_items oi JOIN orders o ON o.id = oi.order_id
              WHERE o.day BETWEEN ? AND ? GROUP BY oi.name ORDER BY qty DESC LIMIT 10`)
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Limón: http://localhost:${PORT}   Admin: http://localhost:${PORT}/admin`));
