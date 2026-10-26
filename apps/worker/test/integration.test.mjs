import {test} from 'node:test';
import {strict as assert} from 'node:assert';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync,readdirSync} from 'node:fs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
const apiSource=resolve('src/index.ts');
function createDb(){const sqlite=new DatabaseSync(':memory:');for(const file of readdirSync(resolve('migrations')).filter(x=>x.endsWith('.sql')).sort())sqlite.exec(readFileSync(resolve('migrations',file),'utf8'));const DB={prepare(sql){let args=[];return {bind(...values){args=values;return this},async first(){return sqlite.prepare(sql).get(...args)??null},async all(){return {results:sqlite.prepare(sql).all(...args)}},async run(){return sqlite.prepare(sql).run(...args)}}},async batch(statements){sqlite.exec('BEGIN');try{const results=[];for(const statement of statements)results.push(await statement.run());sqlite.exec('COMMIT');return results}catch(error){sqlite.exec('ROLLBACK');throw error}}};return {sqlite,DB}}
function req(path,method='GET',body,headers={}){return new Request('http://localhost:8787'+path,{method,headers:{...(body?{'Content-Type':'application/json'}:{}),...headers},...(body?{body:JSON.stringify(body)}:{})})}
const asJson=async r=>({status:r.status,data:await r.json(),cookie:r.headers.get('Set-Cookie')});
async function createWorker(){return {worker:(await import(pathToFileURL(apiSource).href)).default,cleanup:()=>{}}}

test('API foundation: owner bootstrap, auth, tenant isolation and no send endpoint',{timeout:30000},async()=>{
 const {worker,cleanup}=await createWorker();const {sqlite,DB}=createDb();
 const env={DB,APP_ORIGIN:'http://localhost:8081',ENVIRONMENT:'preview',BOOTSTRAP_KEY:'a'.repeat(64)};
 const run=async (path,method,body,headers)=>asJson(await worker.fetch(req(path,method,body,headers),env));
 try{
  const health=await run('/api/v1/health');assert.equal(health.status,200);
  assert.equal((await run('/api/v1/ready')).status,200);
  assert.equal((await run('/api/v1/workspaces')).status,401);
  assert.equal((await run('/api/v1/setup/owner','POST',{email:'owner@example.test',password:'a long testing password'})).status,403);
  assert.equal((await run('/api/v1/setup/owner','POST',{email:'OWNER@example.test',password:'a long testing password'},{'X-Bootstrap-Key':env.BOOTSTRAP_KEY})).status,201);
  const stored=sqlite.prepare('SELECT password_salt,password_hash FROM users LIMIT 1').get();
  const nativeKey=await crypto.subtle.importKey('raw',new TextEncoder().encode('a long testing password'),'PBKDF2',false,['deriveBits']);
  const expected=await crypto.subtle.deriveBits({name:'PBKDF2',hash:'SHA-256',salt:Buffer.from(stored.password_salt,'base64url'),iterations:600000},nativeKey,256);
  assert.equal(stored.password_hash,Buffer.from(expected).toString('base64url'),'Preserve the existing PBKDF2 hash format');
  assert.equal((await run('/api/v1/setup/owner','POST',{email:'other@example.test',password:'a long testing password'},{'X-Bootstrap-Key':env.BOOTSTRAP_KEY})).status,409);
  const login=await run('/api/v1/auth/login','POST',{email:'owner@example.test',password:'a long testing password',client:'web'},{Origin:'http://localhost:8081'});assert.equal(login.status,200);assert.match(login.cookie,/HttpOnly/);
  const cookie=login.cookie.split(';')[0];const h={Cookie:cookie,Origin:'http://localhost:8081'};
  const a=await run('/api/v1/workspaces','POST',{name:'Tenant One',sender_name:'Team One'},h);assert.equal(a.status,201);
  const b=await run('/api/v1/workspaces','POST',{name:'Tenant Two',sender_name:'Team Two'},h);assert.equal(b.status,201);
  const id1=a.data.item.id,id2=b.data.item.id;
  const add=await run(`/api/v1/workspaces/${id1}/contacts`,'POST',{email:'A@Example.com',first_name:'A',last_name:'Customer',consent_source:'Voluntary online signup'},h);assert.equal(add.status,201);
  assert.equal((await run(`/api/v1/workspaces/${id1}/contacts`,'POST',{email:'a@example.com',first_name:'A',last_name:'Customer',consent_source:'Second import'},h)).status,409);
  assert.equal((await run(`/api/v1/workspaces/${id2}/contacts`,'GET',undefined,h)).data.items.length,0);
  assert.equal((await run(`/api/v1/workspaces/${id1}/contacts`,'GET',undefined,h)).data.items.length,1);
  assert.equal((await run(`/api/v1/workspaces/${id1}/domains`,'POST',{hostname:'news.example.com'},h)).data.item.status,'pending');
  assert.equal((await run(`/api/v1/workspaces/${id1}/campaigns`,'POST',{name:'Draft One',subject:'Hello'},h)).data.item.status,'draft');
  const before=sqlite.prepare('SELECT count(*) AS n FROM workspaces').get().n;
  sqlite.exec("CREATE TRIGGER reject_audit BEFORE INSERT ON audit_events BEGIN SELECT RAISE(ABORT,'simulated audit failure'); END;");
  assert.equal((await run('/api/v1/workspaces','POST',{name:'Must roll back',sender_name:'Atomic write'},h)).status,500);
  assert.equal(sqlite.prepare('SELECT count(*) AS n FROM workspaces').get().n,before);
  sqlite.exec('DROP TRIGGER reject_audit');
  assert.equal((await run('/api/v1/send','POST',{workspace_id:id1},h)).status,404);
  // A member assigned to tenant one cannot read tenant two even with its UUID.
  const userId=crypto.randomUUID();sqlite.prepare("INSERT INTO users(id,email,password_salt,password_hash,role) VALUES(?,'member@example.test','x','x','member')").run(userId);
  sqlite.prepare("INSERT INTO workspace_members(user_id,workspace_id,role) VALUES(?,?,'analyst')").run(userId,id1);
  const token='b'.repeat(48);const digest=Buffer.from(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(token))).toString('base64url');
  sqlite.prepare('INSERT INTO sessions(token_hash,user_id,expires_at) VALUES(?,?,?)').run(digest,userId,'2099-01-01T00:00:00.000Z');
  const memberHeaders={Authorization:'Bearer '+token};
  const ws=(await run('/api/v1/workspaces','GET',undefined,memberHeaders)).data.items;assert.equal(ws.length,1);assert.equal(ws[0].id,id1);
  assert.equal((await run(`/api/v1/workspaces/${id2}/contacts`,'GET',undefined,memberHeaders)).status,404);
  assert.equal((await run(`/api/v1/workspaces/${id1}/campaigns`,'POST',{name:'Nope',subject:'Nope'},memberHeaders)).status,404);
  assert.equal((await run('/api/v1/auth/logout','POST',undefined,h)).status,200);
  assert.equal((await run('/api/v1/workspaces','GET',undefined,h)).status,401);
 }finally{sqlite.close();cleanup()}
});

test('web assets, readiness, origins, method handling and response headers',async()=>{
 const {worker,cleanup}=await createWorker();const {sqlite,DB}=createDb();
 const env={DB,APP_ORIGIN:'https://sparqfire.getsparqd.com',ENVIRONMENT:'production',ASSETS:{fetch:async()=>new Response('<html>App</html>',{headers:{'Content-Type':'text/html'}})}};
 try{
  const page=await worker.fetch(new Request('https://sparqfire.getsparqd.com/settings'),env);
  assert.equal(page.status,200);assert.match(await page.text(),/App/);assert.equal(page.headers.get('X-Frame-Options'),'DENY');assert.match(page.headers.get('Strict-Transport-Security'),/31536000/);
  assert.equal((await worker.fetch(req('/settings','POST',{}),env)).status,405);
  assert.equal((await worker.fetch(req('/api/v1/health','DELETE'),env)).status,405);
  assert.equal((await worker.fetch(req('/api/v1/health','OPTIONS',undefined,{Origin:'https://evil.test'}),env)).status,403);
  const cors=await worker.fetch(req('/api/v1/health','OPTIONS',undefined,{Origin:env.APP_ORIGIN}),env);
  assert.equal(cors.status,204);assert.equal(cors.headers.get('Access-Control-Allow-Origin'),env.APP_ORIGIN);
  assert.equal((await worker.fetch(req('/api/v1/ready'),{...env,DB:undefined})).status,503);
  assert.equal((await worker.fetch(req('/api/v1/ready'),{...env,DB:{prepare(){throw new Error('private database error')}}})).status,503);
  assert.equal((await worker.fetch(req('/api/v1/auth/login','POST',{}),env)).status,503);
  const limited=await worker.fetch(req('/api/v1/auth/login','POST',{}),{...env,AUTH_LIMITER:{limit:async()=>({success:false})}});
  assert.equal(limited.status,429);assert.equal(limited.headers.get('Retry-After'),'60');
 }finally{sqlite.close();cleanup()}
});

test('native tokens, session expiry, CSRF, login lockout, owner uniqueness and cleanup',{timeout:90000},async()=>{
 const {worker,cleanup}=await createWorker();const {sqlite,DB}=createDb();
 const env={DB,APP_ORIGIN:'https://sparqfire.getsparqd.com',ENVIRONMENT:'production',BOOTSTRAP_KEY:'a'.repeat(64),AUTH_LIMITER:{limit:async()=>({success:true})}};
 const run=async(path,method,body,headers)=>asJson(await worker.fetch(req(path,method,body,headers),env));
 try{
  await run('/api/v1/setup/owner','POST',{email:'owner@example.test',password:'a long testing password'},{'X-Bootstrap-Key':env.BOOTSTRAP_KEY});
  assert.throws(()=>sqlite.prepare("INSERT INTO users(id,email,password_salt,password_hash,role) VALUES('other','other@example.test','x','x','owner')").run(),/UNIQUE/);
  const login=await run('/api/v1/auth/login','POST',{email:'owner@example.test',password:'a long testing password',client:'native'});
  assert.equal(login.status,200);assert.equal(login.cookie,null);assert.ok(login.data.token);
  const auth={Authorization:'Bearer '+login.data.token};
  assert.equal((await run('/api/v1/session','GET',undefined,auth)).status,200);
  assert.equal((await run('/api/v1/workspaces','POST',{name:'Allowed',sender_name:'Allowed'},auth)).status,201);
  const cookie={Cookie:'sparqfire_session='+login.data.token};
  assert.equal((await run('/api/v1/workspaces','POST',{name:'Denied',sender_name:'Denied'},cookie)).status,403);
  assert.equal((await run('/api/v1/workspaces','POST',{name:'Denied',sender_name:'Denied'},{...cookie,Origin:'https://evil.test'})).status,403);
  const large=await worker.fetch(new Request('http://localhost:8787/api/v1/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({padding:'x'.repeat(20000)})}),env);assert.equal(large.status,401);
  for(let i=0;i<5;i++)assert.equal((await run('/api/v1/auth/login','POST',{email:'owner@example.test',password:'wrong'})).status,401);
  assert.equal((await run('/api/v1/auth/login','POST',{email:'owner@example.test',password:'a long testing password'})).status,429);
  sqlite.prepare("UPDATE sessions SET expires_at='2000-01-01T00:00:00.000Z'").run();
  assert.equal((await run('/api/v1/session','GET',undefined,auth)).status,401);
  sqlite.prepare("UPDATE login_attempts SET window_start='2000-01-01T00:00:00.000Z'").run();
  await worker.scheduled({},env);
  assert.equal(sqlite.prepare('SELECT count(*) AS n FROM sessions').get().n,0);
  assert.equal(sqlite.prepare('SELECT count(*) AS n FROM login_attempts').get().n,0);
 }finally{sqlite.close();cleanup()}
});
