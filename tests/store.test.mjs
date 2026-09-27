import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { pbkdf2Sync, randomBytes, randomUUID } from 'node:crypto';
import { readFile, readdir, mkdir, rm } from 'node:fs/promises';
import { build } from 'esbuild';
import { Miniflare } from 'miniflare';

const root = new URL('../', import.meta.url).pathname;
const temp = root + '.test-state/' + randomUUID();
let mf, db, cookie;
const password = 'Test-only-' + randomBytes(16).toString('hex');
const salt = randomBytes(16);
const adminHash = 'pbkdf2-sha256$100000$' + salt.toString('hex') + '$' + pbkdf2Sync(password, salt, 100000, 32, 'sha256').toString('hex');
async function start() {
  mf = new Miniflare({ modules: true, scriptPath: temp + '/worker.mjs', compatibilityDate: '2026-08-01', d1Databases: { DB: 'test-db' }, d1Persist: temp + '/db', bindings: { ADMIN_PASSWORD_HASH: adminHash } });
  db = await mf.getD1Database('DB');
}
async function call(path, method = 'GET', body, auth = false, extra = {}) {
  const response = await mf.dispatchFetch('https://store.test/api' + path, { method, headers: { 'Content-Type': 'application/json', Origin: 'https://store.test', 'X-Tokkma-Request': '1', ...(auth ? { Cookie: cookie } : {}), ...extra }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
  const data = await response.json(); return { response, status: response.status, data };
}
before(async () => {
  await mkdir(temp, { recursive: true });
  await build({ entryPoints: [root + 'cloudflare/worker.mjs'], bundle: true, format: 'esm', platform: 'browser', outfile: temp + '/worker.mjs' });
  await start();
  for (const file of (await readdir(root + 'cloudflare/migrations')).sort()) {
    const sql = await readFile(root + 'cloudflare/migrations/' + file, 'utf8');
    for (const statement of sql.split(/;\s*\n/).filter(s => s.trim())) await db.prepare(statement).run();
  }
});
after(async () => { await mf?.dispose(); await rm(temp, { recursive: true, force: true }); });

test('public catalog and settings are served from D1', async () => {
  const result = await call('/products'); assert.equal(result.status, 200); assert.equal(result.data.length, 8);
  const categories = await call('/categories'); assert.equal(categories.data.find(c => c.slug === 'best-selling').product_count > 0, true);
  const cfg = await call('/settings'); assert.equal(cfg.data.delivery_fee, 5000); assert.equal(cfg.data.ADMIN_PASSWORD_HASH, undefined);
});
test('admin routes reject visitors, forged cookies, and cross-origin mutations', async () => {
  for (const [path, method, body] of [['/admin/catalog','GET'], ['/admin/products','POST',{}], ['/admin/orders','GET'], ['/admin/settings','PUT',{}], ['/admin/images','POST',{}]]) assert.equal((await call(path, method, body)).status, 401);
  assert.equal((await call('/admin/catalog', 'GET', undefined, false, { Cookie: 'tokkma_admin=' + 'f'.repeat(64) })).status, 401);
  assert.equal((await call('/admin/login','POST',{ username: 'admin', password },false,{Origin:'https://evil.test'})).status,403);
  assert.equal((await call('/orders','POST',{},false,{Origin:'https://evil.test'})).status,403);
});
test('admin login uses secure HttpOnly cookie and never exposes credentials', async () => {
  const wrong = await call('/admin/login','POST',{username:'admin',password:'wrong'}); assert.equal(wrong.status,401);
  const valid = await call('/admin/login','POST',{username:'admin',password}); assert.equal(valid.status,200);
  const header = valid.response.headers.get('set-cookie'); assert.match(header,/HttpOnly/); assert.match(header,/Secure/); assert.match(header,/SameSite=Strict/);
  cookie = header.split(';')[0]; assert.equal((await call('/admin/session','GET',undefined,true)).status,200);
});
let category, product;
test('category and product create/edit/hide/delete are durable and validated', async () => {
  category = (await call('/admin/categories','POST',{name:'أجهزة الاختبار',sort_order:0},true)).data;
  const created = await call('/admin/products','POST',{name:'منتج اختبار',price:12000,category:category.slug,description:'وصف',image:'/images/trend-80.webp',active:true},true);
  assert.equal(created.status,201); product = created.data;
  assert.equal((await call('/products?category='+category.slug)).data.length,1);
  assert.equal((await call('/admin/categories/'+category.id,'DELETE',{},true)).status,409);
  assert.equal((await call('/admin/products/'+product.id,'PUT',{...product,price:-1},true)).status,400);
  assert.equal((await call('/admin/products/'+product.id,'PUT',{...product,image:'javascript:alert(1)'},true)).status,400);
  assert.equal((await call('/admin/products/'+product.id,'PUT',{...product,active:false},true)).status,200);
  assert.equal((await call('/products/'+product.id)).status,404);
  assert.equal((await call('/admin/products/'+product.id,'PUT',{...product,price:15000},true)).status,200);
  product.price=15000;
});
test('orders use trusted server prices, optional location and idempotency', async () => {
  const input={id:randomUUID(),name:'زبون اختبار',phone:'07000000000',city:'بغداد',address:'عنوان اختبار',items:[{id:product.id,qty:2,price:1}],total:2};
  const created=await call('/orders','POST',input); assert.equal(created.status,201); assert.equal(created.data.subtotal,30000); assert.equal(created.data.total,35000);
  assert.equal((await call('/orders','POST',input)).data.id,created.data.id);
  assert.equal((await call('/orders','POST',{...input,items:[{id:product.id,qty:1}]})).status,409);
  const stored=(await call('/admin/orders','GET',undefined,true)).data.orders.find(x=>x.id===input.id); assert.equal(stored.location,null); assert.equal(stored.maps_url,'');
  const withLocation=await call('/orders','POST',{...input,id:randomUUID(),location:{lat:33.3152,lng:44.3661}}); assert.equal(withLocation.status,201);
  assert.equal((await call('/orders','POST',{...input,id:randomUUID(),location:{lat:999,lng:0}})).status,400);
  assert.equal((await call('/orders','POST',{...input,id:randomUUID(),maps_url:'https://www.google.com.evil.test/maps'})).status,400);
  assert.equal((await call('/orders','POST',{...input,id:randomUUID(),maps_url:'https://maps.app.goo.gl/example'})).status,201);
  assert.equal((await call('/admin/orders/'+input.id,'PATCH',{status:'confirmed'},true)).status,200);
  assert.equal((await call('/admin/orders/'+input.id,'PATCH',{status:'invalid'},true)).status,400);
});
test('image upload requires admin, rejects HTML, and returns durable images', async () => {
  const headers={Origin:'https://store.test','X-Tokkma-Request':'1',Cookie:cookie,'Content-Type':'image/png'};
  const bad=await mf.dispatchFetch('https://store.test/api/admin/images',{method:'POST',headers,body:'<script>alert(1)</script>'}); assert.equal(bad.status,400);
  const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a3ioAAAAASUVORK5CYII=','base64');
  const upload=await mf.dispatchFetch('https://store.test/api/admin/images',{method:'POST',headers,body:png}); assert.equal(upload.status,201);
  const image=await mf.dispatchFetch('https://store.test'+(await upload.json()).url); assert.equal(image.status,200); assert.equal(image.headers.get('content-type'),'image/png'); assert.deepEqual(Buffer.from(await image.arrayBuffer()),png);
});
test('settings persist and cannot contain invalid WhatsApp destinations', async () => {
  const cfg=(await call('/settings')).data;
  assert.equal((await call('/admin/settings','PUT',{...cfg,whatsapp_number:'javascript:bad'},true)).status,400);
  assert.equal((await call('/admin/settings','PUT',{...cfg,store_name:'متجر الاختبار',delivery_fee:7000},true)).status,200);
});
test('deletions and edits survive worker restart without restoring seed products', async () => {
  assert.equal((await call('/admin/products/'+product.id,'DELETE',{},true)).status,200);
  assert.equal((await call('/admin/categories/'+category.id,'DELETE',{},true)).status,200);
  const catalog=(await call('/admin/catalog','GET',undefined,true)).data;
  for(const p of catalog.products) assert.equal((await call('/admin/products/'+p.id,'DELETE',{},true)).status,200);
  await mf.dispose(); await start();
  assert.equal((await call('/products')).data.length,0);
  assert.equal((await call('/settings')).data.store_name,'متجر الاختبار');
  assert.ok((await call('/admin/orders','GET',undefined,true)).data.orders.length>=3);
});
test('login attempts are throttled and logout revokes session', async () => {
  let last;
  for(let i=0;i<7;i++) last=await call('/admin/login','POST',{username:'admin',password:'wrong'},false,{'cf-connecting-ip':'192.0.2.123'});
  assert.equal(last.status,429);
  assert.equal((await call('/admin/logout','POST',{},true)).status,200);
  assert.equal((await call('/admin/catalog','GET',undefined,true)).status,401);
});
