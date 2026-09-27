import seed from '../frontend/src/staticData.json';

const encoder = new TextEncoder();
const ID = /^[a-zA-Z0-9_-]{1,100}$/;
const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
const statuses = ['new', 'confirmed', 'completed', 'cancelled'];
const now = () => Math.floor(Date.now() / 1000);
const fail = (status, message) => { throw Object.assign(new Error(message), { status }); };
const json = (data, status = 200, extra = {}) => new Response(JSON.stringify(data), {
  status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...extra },
});
const hex = bytes => Array.from(new Uint8Array(bytes), b => b.toString(16).padStart(2, '0')).join('');
const hash = async text => hex(await crypto.subtle.digest('SHA-256', encoder.encode(text)));
const text = (value, name, max, required = false) => {
  if (typeof value !== 'string') { if (required) fail(400, 'أدخل ' + name); return ''; }
  value = value.trim();
  if (value.length > max || (required && !value)) fail(400, 'تحقق من ' + name);
  return value;
};
const number = (value, name, max = 1000000000) => {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0 || value > max) fail(400, 'تحقق من ' + name);
  return value;
};
const imageUrl = value => {
  const result = text(value, 'رابط الصورة', 2000);
  if (!result) return '';
  if (/^\/(images|media)\/[a-zA-Z0-9_./-]+$/.test(result) && !result.includes('..')) return result;
  try { if (new URL(result).protocol === 'https:') return result; } catch {}
  fail(400, 'الصورة يجب أن تكون رابط HTTPS أو صورة مرفوعة');
};
export const mapsUrl = value => {
  const result = text(value, 'رابط خرائط Google', 2000);
  if (!result) return '';
  let u; try { u = new URL(result); } catch { fail(400, 'رابط الخريطة غير صحيح'); }
  const allowed = ['maps.app.goo.gl', 'goo.gl', 'maps.google.com', 'www.google.com', 'google.com'];
  if (u.protocol !== 'https:' || !allowed.includes(u.hostname) || u.username || u.password || u.port) fail(400, 'استخدم رابط مشاركة من خرائط Google');
  if (u.hostname === 'goo.gl' && !u.pathname.startsWith('/maps/')) fail(400, 'استخدم رابط خرائط Google');
  if (['www.google.com', 'google.com'].includes(u.hostname) && !/^\/maps(?:\/|$)/.test(u.pathname)) fail(400, 'استخدم رابط خرائط Google');
  return u.href;
};
const readJson = async req => {
  if (!req.headers.get('content-type')?.includes('application/json')) fail(415, 'صيغة الطلب غير صحيحة');
  const raw = await readBytes(req, 100000);
  try {
    const value = JSON.parse(new TextDecoder().decode(raw));
    if (!value || typeof value !== 'object' || Array.isArray(value)) fail(400, 'طلب غير صحيح');
    return value;
  } catch { fail(400, 'طلب غير صحيح'); }
};
async function readBytes(req, max) {
  if (Number(req.headers.get('content-length')) > max) fail(413, 'حجم البيانات كبير');
  const reader = req.body?.getReader();
  if (!reader) return new Uint8Array();
  const chunks = []; let length = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    length += value.length;
    if (length > max) { await reader.cancel(); fail(413, 'حجم البيانات كبير'); }
    chunks.push(value);
  }
  const bytes = new Uint8Array(length); let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  return bytes;
}
function sameOrigin(req) {
  if (req.headers.get('origin') !== new URL(req.url).origin || req.headers.get('x-tokkma-request') !== '1') fail(403, 'طلب غير مسموح');
}
async function rateLimit(db, key, limit, seconds) {
  const at = now();
  const row = await db.prepare('INSERT INTO rate_limits(key,attempts,expires_at) VALUES(?,1,?) ON CONFLICT(key) DO UPDATE SET attempts=CASE WHEN expires_at<=? THEN 1 ELSE attempts+1 END, expires_at=CASE WHEN expires_at<=? THEN excluded.expires_at ELSE expires_at END RETURNING attempts').bind(key, at + seconds, at, at).first();
  if (row.attempts > limit) fail(429, 'محاولات كثيرة. حاول لاحقاً');
}
async function verifyPassword(password, encoded) {
  const [version, rounds, salt, expected] = String(encoded || '').split('$');
  if (version !== 'pbkdf2-sha256' || Number(rounds) !== 100000 || !/^[a-f0-9]{32}$/.test(salt) || !/^[a-f0-9]{64}$/.test(expected)) return false;
  const key = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits']);
  const result = hex(await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: Uint8Array.from(salt.match(/../g), x => parseInt(x, 16)), iterations: Number(rounds) }, key, 256));
  let diff = 0; for (let i = 0; i < result.length; i++) diff |= result.charCodeAt(i) ^ expected.charCodeAt(i);
  return diff === 0;
}
function cookie(req, token, age) {
  const secure = new URL(req.url).protocol === 'https:' ? '; Secure' : '';
  return 'tokkma_admin=' + token + '; HttpOnly; SameSite=Strict; Path=/; Max-Age=' + age + secure;
}
function sessionToken(req) {
  const token = req.headers.get('cookie')?.match(/(?:^|;\s*)tokkma_admin=([a-f0-9]{64})(?:;|$)/)?.[1];
  return token || '';
}
async function requireAdmin(req, db) {
  const token = sessionToken(req);
  if (!token) fail(401, 'سجل الدخول أولاً');
  const row = await db.prepare('SELECT expires_at FROM admin_sessions WHERE token_hash=? AND expires_at>?').bind(await hash(token), now()).first();
  if (!row) fail(401, 'انتهت الجلسة. سجل الدخول من جديد');
}
async function settings(db) {
  const row = await db.prepare('SELECT payload FROM settings WHERE id=1').first();
  if (!row) fail(503, 'المتجر قيد الإعداد');
  return JSON.parse(row.payload);
}
async function products(db, includeHidden = false) {
  const { results } = await db.prepare('SELECT payload FROM products ORDER BY rowid').all();
  return results.map(x => JSON.parse(x.payload)).filter(x => includeHidden || x.active !== false);
}
async function categories(db) {
  return (await db.prepare("SELECT c.*, (SELECT COUNT(*) FROM products p WHERE json_extract(p.payload, '$.category')=c.slug AND json_extract(p.payload, '$.active')!=0) AS product_count FROM categories c ORDER BY c.sort_order, c.rowid").all()).results;
}
async function saveProduct(req, db, id, creating) {
  const b = await readJson(req);
  if (!ID.test(id)) fail(400, 'معرّف المنتج غير صحيح');
  const cat = text(b.category, 'القسم', 100, true);
  if (!await db.prepare('SELECT id FROM categories WHERE slug=?').bind(cat).first()) fail(400, 'اختر قسماً موجوداً');
  const p = { id, name: text(b.name, 'اسم المنتج', 200, true), name_en: text(b.name_en, 'الاسم الإنكليزي', 200), description: text(b.description, 'الوصف', 30000), price: number(b.price, 'السعر'), sale_price: b.sale_price === null || b.sale_price === '' || b.sale_price === undefined ? null : number(b.sale_price, 'السعر القديم'), image: imageUrl(b.image), category: cat, brand: text(b.brand, 'العلامة', 100), badge: text(b.badge, 'الشارة', 60), free_delivery: b.free_delivery === true, no_whatsapp: b.no_whatsapp === true, active: b.active !== false, skin_type: Array.isArray(b.skin_type) ? b.skin_type.filter(x => seed.skinTypes.some(t => t.id === x)) : [] };
  if (p.no_whatsapp && p.price !== 0) fail(400, 'الوصف المجاني يجب أن يكون سعره صفراً');
  const existing = await db.prepare('SELECT id FROM products WHERE id=?').bind(id).first();
  if (creating && existing) fail(409, 'معرّف المنتج مستخدم');
  if (!creating && !existing) fail(404, 'المنتج غير موجود');
  const saved = await db.prepare('INSERT INTO products(id,payload) SELECT ?,? WHERE EXISTS(SELECT 1 FROM categories WHERE slug=?) ON CONFLICT(id) DO UPDATE SET payload=excluded.payload').bind(id, JSON.stringify(p), cat).run();
  if (!saved.meta.changes) fail(409, 'القسم لم يعد موجوداً؛ اختر قسماً آخر');
  return json(p, creating ? 201 : 200);
}
async function createOrder(req, db) {
  await rateLimit(db, 'order:' + await hash(req.headers.get('cf-connecting-ip') || 'local'), 30, 3600);
  const b = await readJson(req);
  if (!UUID.test(b.id || '')) fail(400, 'معرّف الطلب غير صحيح');
  if (!Array.isArray(b.items) || !b.items.length || b.items.length > 50) fail(400, 'تحقق من سلة الشراء');
  const normalizedItems = b.items.map(x => ({ id: text(x.id, 'المنتج', 100, true), qty: number(x.qty, 'الكمية', 99) }));
  if (normalizedItems.some(x => x.qty === 0) || new Set(normalizedItems.map(x => x.id)).size !== normalizedItems.length) fail(400, 'تحقق من الكميات');
  const location = b.location == null ? null : { lat: b.location.lat, lng: b.location.lng };
  if (location && (!Number.isFinite(location.lat) || !Number.isFinite(location.lng) || Math.abs(location.lat) > 90 || Math.abs(location.lng) > 180)) fail(400, 'الموقع غير صحيح');
  const googleMapsUrl = mapsUrl(b.maps_url);
  const customer = { name: text(b.name, 'الاسم', 100), phone: text(b.phone, 'الهاتف', 40), city: text(b.city, 'المحافظة', 100), address: text(b.address, 'العنوان', 500), notes: text(b.notes, 'الملاحظات', 2000), location, maps_url: googleMapsUrl };
  const requestHash = await hash(JSON.stringify({ customer, items: normalizedItems }));
  const existing = await db.prepare('SELECT request_hash,payload FROM orders WHERE id=?').bind(b.id).first();
  if (existing) {
    if (existing.request_hash !== requestHash) fail(409, 'الطلب تغيّر؛ أعد المحاولة');
    return json(receipt(JSON.parse(existing.payload)));
  }
  const catalog = await products(db);
  const items = normalizedItems.map(x => {
    const p = catalog.find(p => p.id === x.id);
    if (!p || p.no_whatsapp) fail(409, 'أحد المنتجات لم يعد متاحاً. حدّث السلة');
    return { id: p.id, name: p.name, qty: x.qty, price: p.price, free_delivery: p.free_delivery };
  });
  if (!items.every(x => x.id === 'kids-video-design') && (!customer.name || !customer.phone || !customer.city || !customer.address)) fail(400, 'أكمل معلومات التوصيل');
  const config = await settings(db);
  const subtotal = items.reduce((sum, x) => sum + x.price * x.qty, 0);
  const delivery_fee = items.every(x => x.free_delivery) ? 0 : config.delivery_fee;
  const order = { id: b.id, ...customer, items, subtotal, delivery_fee, total: subtotal + delivery_fee, whatsapp_number: config.whatsapp_number, store_name: config.store_name, created_at: new Date().toISOString() };
  const inserted = await db.prepare('INSERT OR IGNORE INTO orders(id,request_hash,payload,status,created_at) VALUES(?,?,?,\'new\',?)').bind(order.id, requestHash, JSON.stringify(order), order.created_at).run();
  if (!inserted.meta.changes) {
    const saved = await db.prepare('SELECT request_hash,payload FROM orders WHERE id=?').bind(order.id).first();
    if (saved.request_hash !== requestHash) fail(409, 'الطلب تغيّر؛ أعد المحاولة');
    return json(receipt(JSON.parse(saved.payload)));
  }
  return json(receipt(order), 201);
}
function receipt(order) {
  const { id, items, subtotal, delivery_fee, total, whatsapp_number, store_name } = order;
  return { id, items, subtotal, delivery_fee, total, whatsapp_number, store_name };
}
async function handle(req, env) {
  const url = new URL(req.url); const path = url.pathname;
  const method = req.method; const db = env.DB;
  if (path === '/admin') return Response.redirect(url.origin + '/#/admin', 302);
  if (!path.startsWith('/api/') && !path.startsWith('/media/')) return env.ASSETS ? env.ASSETS.fetch(req) : new Response('Not found', { status: 404 });
  if (!db) fail(503, 'قاعدة بيانات المتجر غير متصلة');
  if (path.startsWith('/media/') && method === 'GET') {
    const id = path.slice(7); if (!UUID.test(id)) fail(404, 'الصورة غير موجودة');
    const row = await db.prepare('SELECT mime,data FROM images WHERE id=?').bind(id).first();
    if (!row) fail(404, 'الصورة غير موجودة');
    return new Response(new Uint8Array(row.data), { headers: { 'Content-Type': row.mime, 'Cache-Control': 'public, max-age=31536000, immutable', 'Content-Security-Policy': "default-src 'none'" } });
  }
  if (!['GET', 'HEAD'].includes(method)) sameOrigin(req);
  if (path === '/api/health' && method === 'GET') {
    await db.prepare('SELECT 1 FROM settings WHERE id=1').first();
    return json({ ok: true, storage: 'D1', admin_configured: Boolean(env.ADMIN_PASSWORD_HASH) });
  }
  if (path === '/api/settings' && method === 'GET') return json(await settings(db));
  if (path === '/api/categories' && method === 'GET') return json(await categories(db));
  if (path === '/api/skin-types' && method === 'GET') return json(seed.skinTypes);
  if (path === '/api/products' && method === 'GET') {
    let list = await products(db);
    const q = url.searchParams; const search = (q.get('search') || '').toLowerCase();
    if (q.get('category')) list = list.filter(p => p.category === q.get('category'));
    if (q.get('skin_type')) list = list.filter(p => p.skin_type?.includes(q.get('skin_type')));
    if (search) list = list.filter(p => [p.name, p.name_en, p.description, p.brand].some(x => String(x || '').toLowerCase().includes(search)));
    const limit = Math.min(1000, Math.max(1, Number(q.get('limit')) || 1000));
    return json(list.slice(0, limit));
  }
  if (path.startsWith('/api/products/') && method === 'GET') {
    const p = (await products(db)).find(p => p.id === path.slice('/api/products/'.length));
    if (!p) fail(404, 'المنتج غير موجود');
    return json(p);
  }
  if (path === '/api/orders' && method === 'POST') return createOrder(req, db);
  if (path === '/api/admin/login' && method === 'POST') {
    if (!env.ADMIN_PASSWORD_HASH) fail(503, 'لم يتم إعداد حساب الأدمن بعد');
    await rateLimit(db, 'login:' + await hash(req.headers.get('cf-connecting-ip') || 'local'), 6, 900);
    const b = await readJson(req);
    const valid = await verifyPassword(text(b.password, 'كلمة المرور', 256, true), env.ADMIN_PASSWORD_HASH);
    if (!valid || b.username !== (env.ADMIN_USERNAME || 'admin')) fail(401, 'اسم المستخدم أو كلمة المرور غير صحيحة');
    const token = hex(crypto.getRandomValues(new Uint8Array(32)));
    await db.batch([
      db.prepare('DELETE FROM admin_sessions WHERE expires_at<=?').bind(now()),
      db.prepare('DELETE FROM rate_limits WHERE expires_at<=?').bind(now()),
      db.prepare('INSERT INTO admin_sessions(token_hash,expires_at) VALUES(?,?)').bind(await hash(token), now() + 43200),
    ]);
    return json({ ok: true }, 200, { 'Set-Cookie': cookie(req, token, 43200) });
  }
  if (!path.startsWith('/api/admin/')) fail(404, 'الصفحة غير موجودة');
  await requireAdmin(req, db);
  if (path === '/api/admin/session' && method === 'GET') return json({ username: env.ADMIN_USERNAME || 'admin' });
  if (path === '/api/admin/logout' && method === 'POST') {
    await db.prepare('DELETE FROM admin_sessions WHERE token_hash=?').bind(await hash(sessionToken(req))).run();
    return json({ ok: true }, 200, { 'Set-Cookie': cookie(req, '', 0) });
  }
  if (path === '/api/admin/catalog' && method === 'GET') return json({ products: await products(db, true), categories: await categories(db), settings: await settings(db) });
  if (path === '/api/admin/products' && method === 'POST') return saveProduct(req, db, crypto.randomUUID(), true);
  const productMatch = path.match(/^\/api\/admin\/products\/([a-zA-Z0-9_-]+)$/);
  if (productMatch && method === 'PUT') return saveProduct(req, db, productMatch[1], false);
  if (productMatch && method === 'DELETE') {
    await db.prepare('DELETE FROM products WHERE id=?').bind(productMatch[1]).run();
    return json({ ok: true });
  }
  if (path === '/api/admin/categories' && method === 'POST') {
    const b = await readJson(req); const id = crypto.randomUUID();
    const name = text(b.name, 'اسم القسم', 100, true);
    const sort = number(b.sort_order ?? 10, 'الترتيب', 10000);
    const cat = { id, slug: id, name, image: imageUrl(b.image), sort_order: sort };
    await db.prepare('INSERT INTO categories(id,slug,name,image,sort_order) VALUES(?,?,?,?,?)').bind(id, id, name, cat.image, sort).run();
    return json(cat, 201);
  }
  const categoryMatch = path.match(/^\/api\/admin\/categories\/([a-zA-Z0-9_-]+)$/);
  if (categoryMatch && ['PUT', 'DELETE'].includes(method)) {
    const cat = await db.prepare('SELECT * FROM categories WHERE id=?').bind(categoryMatch[1]).first();
    if (!cat) fail(404, 'القسم غير موجود');
    if (method === 'DELETE') {
      // Conditional deletion is atomic: never leave products with a deleted category.
      const r = await db.prepare("DELETE FROM categories WHERE id=? AND NOT EXISTS(SELECT 1 FROM products WHERE json_extract(payload,'$.category')=?)").bind(cat.id, cat.slug).run();
      if (!r.meta.changes) fail(409, 'انقل أو احذف منتجات هذا القسم أولاً');
    } else {
      const b = await readJson(req);
      await db.prepare('UPDATE categories SET name=?,image=?,sort_order=? WHERE id=?').bind(text(b.name, 'اسم القسم', 100, true), imageUrl(b.image), number(b.sort_order ?? 10, 'الترتيب', 10000), cat.id).run();
    }
    return json({ ok: true });
  }
  if (path === '/api/admin/settings' && method === 'PUT') {
    const b = await readJson(req); const phone = text(b.whatsapp_number, 'رقم واتساب', 15, true).replace(/^\+/, '');
    if (!/^[1-9]\d{7,14}$/.test(phone)) fail(400, 'أدخل رقم واتساب مع رمز البلد، مثل 964');
    const config = { store_name: text(b.store_name, 'اسم المتجر', 80, true), whatsapp_number: phone, delivery_fee: number(b.delivery_fee, 'رسوم التوصيل', 1000000), announcement: text(b.announcement, 'شريط الإعلان', 300), google_maps_api_key: text(b.google_maps_api_key, 'مفتاح خرائط Google', 200) };
    if (config.google_maps_api_key && !/^[a-zA-Z0-9_-]+$/.test(config.google_maps_api_key)) fail(400, 'مفتاح خرائط Google غير صحيح');
    await db.prepare('UPDATE settings SET payload=? WHERE id=1').bind(JSON.stringify(config)).run();
    return json(config);
  }
  if (path === '/api/admin/images' && method === 'POST') {
    const bytes = await readBytes(req, 800000);
    const signature = String.fromCharCode(...bytes.slice(0, 12));
    let mime;
    if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) mime = 'image/jpeg';
    else if (hex(bytes.slice(0, 8)) === '89504e470d0a1a0a') mime = 'image/png';
    else if (signature.startsWith('RIFF') && signature.slice(8, 12) === 'WEBP') mime = 'image/webp';
    else fail(400, 'ارفع صورة JPEG أو PNG أو WebP');
    const id = crypto.randomUUID();
    await db.prepare('INSERT INTO images(id,mime,data) VALUES(?,?,?)').bind(id, mime, bytes).run();
    return json({ url: '/media/' + id }, 201);
  }
  if (path === '/api/admin/orders' && method === 'GET') {
    const page = Math.max(0, Math.floor(Number(url.searchParams.get('page')) || 0));
    const { results } = await db.prepare('SELECT payload,status FROM orders ORDER BY created_at DESC LIMIT 51 OFFSET ?').bind(page * 50).all();
    return json({ orders: results.slice(0, 50).map(x => ({ ...JSON.parse(x.payload), status: x.status })), has_more: results.length > 50 });
  }
  const orderMatch = path.match(/^\/api\/admin\/orders\/([a-f0-9-]+)$/);
  if (orderMatch && method === 'PATCH') {
    const b = await readJson(req); if (!statuses.includes(b.status)) fail(400, 'حالة غير صحيحة');
    const result = await db.prepare('UPDATE orders SET status=? WHERE id=?').bind(b.status, orderMatch[1]).run();
    if (!result.meta.changes) fail(404, 'الطلب غير موجود');
    return json({ ok: true });
  }
  fail(404, 'الصفحة غير موجودة');
}
export default {
  async fetch(req, env) {
    let response;
    try { response = await handle(req, env); }
    catch (error) { response = json({ error: error.status ? error.message : 'تعذر إتمام العملية. حاول مرة أخرى' }, error.status || 500); }
    response = new Response(response.body, response);
    response.headers.set('X-Content-Type-Options', 'nosniff');
    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
    response.headers.set('X-Frame-Options', 'DENY');
    return response;
  },
};
