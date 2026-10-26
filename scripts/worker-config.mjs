import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const file = resolve(root, 'apps/worker/wrangler.jsonc');
const [action, environment, databaseId] = process.argv.slice(2);
if (!['configure', 'check'].includes(action) || !['preview', 'production'].includes(environment)) {
  throw new Error('Usage: node scripts/worker-config.mjs configure|check preview|production [database UUID]');
}
const config = JSON.parse(readFileSync(file, 'utf8'));
const selected = config.env[environment];
const other = config.env[environment === 'production' ? 'preview' : 'production'];
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const id = action === 'configure' ? databaseId : selected.d1_databases[0].database_id;
if (!uuid.test(id || '')) throw new Error(`Configure the real ${environment} D1 UUID first: npm run configure:worker -- ${environment} <UUID>`);
if (id.toLowerCase() === other.d1_databases[0].database_id.toLowerCase()) throw new Error('Preview and production must use different D1 databases.');
const origin = new URL(selected.vars.APP_ORIGIN);
if (environment === 'production' && (origin.origin !== 'https://sparqfire.getsparqd.com' || !selected.routes.some(route => route.pattern === origin.hostname && route.custom_domain))) {
  throw new Error('Production must use the configured sparqfire.getsparqd.com custom domain and HTTPS origin.');
}
if (!selected.ratelimits.some(limit => limit.name === 'AUTH_LIMITER')) throw new Error('Configure AUTH_LIMITER before deploying.');
if (action === 'configure') {
  selected.d1_databases[0].database_id = id;
  writeFileSync(file, JSON.stringify(config, null, 2) + '\n');
}
console.log(`${environment} Worker configuration ${action === 'configure' ? 'saved' : 'validated'}.`);
