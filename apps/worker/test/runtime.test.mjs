import test from 'node:test';
import assert from 'node:assert/strict';
import { Miniflare } from 'miniflare';
import { build } from 'esbuild';
import { createRequire } from 'node:module';
import { readFileSync, readdirSync, writeFileSync, copyFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';

test('Cloudflare runtime: migrated D1, owner bootstrap and native authentication', { timeout: 60000 }, async () => {
  const temp = mkdtempSync(join(tmpdir(), 'sparqfire-runtime-'));
  // Resolve/read source in Node: native compiler directory traversal is restricted
  // in Windows sandboxes even when the project itself is readable.
  const require = createRequire(import.meta.url);
  const bundle = await build({entryPoints:[resolve('src/index.ts')],bundle:true,write:false,format:'esm',platform:'browser',target:'es2022',plugins:[{
    name:'node-source-loader',setup(builder){
      builder.onResolve({filter:/.*/},args=>({path:args.kind==='entry-point'?args.path:args.path.startsWith('.')?resolve(dirname(args.importer),args.path):require.resolve(args.path),namespace:'source'}));
      builder.onLoad({filter:/.*/,namespace:'source'},args=>({contents:readFileSync(args.path,'utf8'),loader:args.path.endsWith('.ts')?'ts':'js'}));
    },
  }]});
  const script = bundle.outputFiles[0].text;
  writeFileSync(join(temp, 'index.mjs'), script);
  copyFileSync(resolve('src/validation.mjs'), join(temp, 'validation.mjs'));
  const mf = new Miniflare({
    modules: true, script, compatibilityDate: '2026-07-30',
    d1Databases: { DB: 'runtime-test' },
    bindings: { ENVIRONMENT: 'preview', APP_ORIGIN: 'http://localhost:8081', BOOTSTRAP_KEY: 'a'.repeat(64) },
  });
  try {
    const db = await mf.getD1Database('DB');
    for (const file of readdirSync(resolve('migrations')).filter(file => file.endsWith('.sql')).sort()) {
      for (const statement of readFileSync(resolve('migrations', file), 'utf8').replace(/--[^\n]*/g, '').split(';').filter(sql => sql.trim())) {
        await db.prepare(statement).run();
      }
    }
    assert.equal((await mf.dispatchFetch('http://localhost/api/v1/ready')).status, 200);
    const post = (path, body, headers = {}) => mf.dispatchFetch('http://localhost' + path, {
      method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(body),
    });
    const setup = await post('/api/v1/setup/owner', { email: 'owner@example.test', password: 'a long testing password' }, { 'X-Bootstrap-Key': 'a'.repeat(64) });
    assert.equal(setup.status, 201, await setup.text());
    const login = await post('/api/v1/auth/login', { email: 'owner@example.test', password: 'a long testing password', client: 'native' });
    assert.equal(login.status, 200);
    const { token } = await login.json();
    const session = await mf.dispatchFetch('http://localhost/api/v1/session', { headers: { Authorization: `Bearer ${token}` } });
    assert.equal(session.status, 200);
    assert.equal((await session.json()).user.email, 'owner@example.test');
    const workspace = await post('/api/v1/workspaces', {name:'Runtime workspace',sender_name:'Runtime team'}, {Authorization:`Bearer ${token}`});
    assert.equal(workspace.status,201,await workspace.text());
    assert.equal((await db.prepare('SELECT count(*) AS n FROM audit_events').first()).n,1);
  } finally {
    await mf.dispose();
    rmSync(temp, { recursive: true, force: true });
  }
});
