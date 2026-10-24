import {test} from 'node:test';
import {strict as assert} from 'node:assert';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync,writeFileSync,copyFileSync,mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const ts=require('typescript');
const apiSource=resolve('src/index.ts');
const validationSource=resolve('src/validation.mjs');
const migrationSource=resolve('migrations/0001_foundation.sql');
function createDb(){const sqlite=new DatabaseSync(':memory:');sqlite.exec(readFileSync(migrationSource,'utf8'));return {sqlite,DB:{prepare(sql){let args=[];return {bind(...values){args=values;return this},async first(){return sqlite.prepare(sql).get(...args)??null},async all(){return {results:sqlite.prepare(sql).all(...args)}},async run(){return sqlite.prepare(sql).run(...args)}}}}}}
function req(path,method='GET',body,headers={}){return new Request('http://localhost:8787'+path,{method,headers:{...(body?{'Content-Type':'application/json'}:{}),...headers},...(body?{body:JSON.stringify(body)}:{})})}
const asJson=async r=>({status:r.status,data:await r.json(),cookie:r.headers.get('Set-Cookie')});
async function createWorker(){const temp=mkdtempSync(join(tmpdir(),'sparqfire-worker-'));copyFileSync(validationSource,join(temp,'validation.mjs'));const js=ts.transpileModule(readFileSync(apiSource,'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText;writeFileSync(join(temp,'index.mjs'),js);return {worker:(await import(pathToFileURL(join(temp,'index.mjs')).href)).default,cleanup:()=>rmSync(temp,{recursive:true,force:true})}}

test('API foundation: owner bootstrap, auth, tenant isolation and no send endpoint',{timeout:30000},async()=>{
 const {worker,cleanup}=await createWorker();const {sqlite,DB}=createDb();
 const env={DB,APP_ORIGIN:'http://localhost:8081',ENVIRONMENT:'preview',BOOTSTRAP_KEY:'a'.repeat(64)};
 const run=async (path,method,body,headers)=>asJson(await worker.fetch(req(path,method,body,headers),env));
 try{
  const health=await run('/api/v1/health');assert.equal(health.status,200);
  assert.equal((await run('/api/v1/workspaces')).status,401);
  assert.equal((await run('/api/v1/setup/owner','POST',{email:'owner@example.test',password:'a long testing password'})).status,403);
  assert.equal((await run('/api/v1/setup/owner','POST',{email:'OWNER@example.test',password:'a long testing password'},{'X-Bootstrap-Key':env.BOOTSTRAP_KEY})).status,201);
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
