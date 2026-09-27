import { readFile, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';

const token = process.env.CLOUDFLARE_API_TOKEN;
const account = process.env.CLOUDFLARE_ACCOUNT_ID;
const adminHash = process.env.ADMIN_PASSWORD_HASH;
const username = process.env.ADMIN_USERNAME || 'admin';
const domains = process.env.TOKKMA_CUSTOM_DOMAINS === 'true';
if (!token || !account) {
  console.error('Deployment not started: add CLOUDFLARE_API_TOKEN and CLOUDFLARE_ACCOUNT_ID as environment variables or GitHub Actions secrets. See CLOUDFLARE.md.');
  process.exit(1);
}
if (!/^[a-f0-9]{32}$/i.test(account)) throw new Error('Invalid Cloudflare account ID.');
if (!adminHash) { console.error('Deployment not started: set ADMIN_PASSWORD_HASH with npm run admin:password.'); process.exit(1); }
if (adminHash && !/^pbkdf2-sha256\$100000\$[a-f0-9]{32}\$[a-f0-9]{64}$/.test(adminHash)) throw new Error('Invalid ADMIN_PASSWORD_HASH. Use npm run admin:password.');
const cf = async (path, options = {}) => {
  const r = await fetch('https://api.cloudflare.com/client/v4/accounts/' + account + path, { ...options, headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' } });
  const body = await r.json();
  if (!r.ok || !body.success) throw new Error('Cloudflare request failed: ' + (body.errors?.map(e => e.message).join('; ') || r.status));
  return body.result;
};
const run = (args, input) => execFileSync('npx', ['wrangler', ...args], { env: { ...process.env, CI: 'true', WRANGLER_SEND_METRICS: 'false' }, encoding: 'utf8', ...(input ? { input } : {}), stdio: ['pipe', 'pipe', 'pipe'] });
try {
  await readFile('frontend/build/index.html');
  const config = JSON.parse(await readFile('wrangler.jsonc', 'utf8'));
  const list = await cf('/d1/database?name=' + encodeURIComponent(config.d1_databases[0].database_name));
  let db = list.find(d => d.name === config.d1_databases[0].database_name);
  if (!db) { db = await cf('/d1/database', { method: 'POST', body: JSON.stringify({ name: config.d1_databases[0].database_name }) }); console.log('Created persistent store database.'); }
  config.d1_databases[0].database_id = db.uuid;
  config.vars.ADMIN_USERNAME = username;
  const generated = 'wrangler.deploy.json';
  // Reuse every existing custom domain on this worker through the preflight deploy.
  const attached = await cf('/workers/domains?service=' + encodeURIComponent(config.name));
  const existingRoutes = attached.filter(d => d.service === config.name).map(d => ({ pattern: d.hostname, custom_domain: true }));
  config.routes = existingRoutes;
  const targetRoutes = domains ? [...existingRoutes.filter(d => !['tokkma.com', 'www.tokkma.com'].includes(d.pattern)), { pattern: 'tokkma.com', custom_domain: true }, { pattern: 'www.tokkma.com', custom_domain: true }] : existingRoutes;
  config.keep_vars = true;
  await writeFile(generated, JSON.stringify(config, null, 2) + '\n', { mode: 0o600 });
  console.log(run(['d1', 'migrations', 'apply', 'DB', '--remote', '--config', generated]));
  const deployment = run(['deploy', '--config', generated, '--keep-vars']);
  console.log(deployment);
  if (adminHash) console.log(run(['secret', 'put', 'ADMIN_PASSWORD_HASH', '--config', generated], adminHash));
  const origin = deployment.match(/https:\/\/[a-zA-Z0-9.-]+\.workers\.dev/)?.[0];
  if (!origin) throw new Error('Worker deployed. Could not determine its URL; verify /api/health before connecting the custom domain.');
  let healthy = false;
  for (let attempt = 0; attempt < 5; attempt++) {
    try { const r = await fetch(origin + '/api/health'); const health = await r.json(); healthy = r.ok && health.ok && health.admin_configured; } catch {}
    if (healthy) break;
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  if (!healthy) throw new Error('Worker deployed but admin/database health is not ready. Set ADMIN_PASSWORD_HASH, then redeploy. Domains were not changed.');
  if (domains) { config.routes = targetRoutes; await writeFile(generated, JSON.stringify(config, null, 2) + '\n'); console.log(run(['deploy', '--config', generated, '--keep-vars'])); }
  console.log('Verified store: ' + origin + '\nAdmin: ' + origin + '/#/admin');
  if (targetRoutes.length) {
    for (const route of targetRoutes) {
      const response = await fetch('https://' + route.pattern + '/api/health');
      const health = await response.json().catch(() => ({}));
      if (!response.ok || !health.ok) throw new Error('Worker deployed; custom domain verification is still pending: ' + route.pattern);
      console.log('Verified custom domain: https://' + route.pattern);
    }
  }
} catch (e) {
  // Never log subprocess environment, authentication values, or full thrown process objects.
  console.error(e.stderr?.toString() || e.message);
  process.exitCode = 1;
}
