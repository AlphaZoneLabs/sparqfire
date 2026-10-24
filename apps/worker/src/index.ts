import { normalizeEmail, validateDomain, boundedText, strongPassword } from './validation.mjs';

interface Env {
  DB: D1Database;
  ASSETS: Fetcher;
  ENVIRONMENT: 'preview'|'production';
  APP_ORIGIN: string;
  BOOTSTRAP_KEY?: string;
}
type Actor={id:string;email:string;role:'owner'|'member';tokenHash:string;viaBearer:boolean};
type Row=Record<string,string|number|null>;
const json=(data:unknown,status=200,extra?:HeadersInit)=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff',...(extra||{})}});
const fail=(message:string,status=400)=>json({error:message},status);
const today=()=>new Date().toISOString();
const randomToken=()=>b64url(crypto.getRandomValues(new Uint8Array(32)));
function b64url(bytes:Uint8Array){let value='';for(const b of bytes)value+=String.fromCharCode(b);return btoa(value).replace(/\+/g,'-').replace(/\//g,'_').replace(/=/g,'')}
function fromB64url(data:string){const binary=atob(data.replace(/-/g,'+').replace(/_/g,'/'));return Uint8Array.from(binary,c=>c.charCodeAt(0))}
async function sha256(value:string){return b64url(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value))))}
async function hashPassword(password:string,salt:string){const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(password),'PBKDF2',false,['deriveBits']);const bits=await crypto.subtle.deriveBits({name:'PBKDF2',hash:'SHA-256',salt:fromB64url(salt),iterations:600000},key,256);return b64url(new Uint8Array(bits))}
function equalTime(a:string,b:string){if(a.length!==b.length)return false;let n=0;for(let i=0;i<a.length;i++)n|=a.charCodeAt(i)^b.charCodeAt(i);return n===0}
function cookieValue(req:Request,key:string){const v=req.headers.get('Cookie')??'';return v.split(';').map(s=>s.trim()).find(s=>s.startsWith(key+'='))?.slice(key.length+1)??null}
async function actor(req:Request,env:Env):Promise<Actor|null>{const bearer=req.headers.get('Authorization')?.match(/^Bearer\s+([\w-]{30,})$/i)?.[1]??null;const token=bearer??cookieValue(req,'sparqfire_session');if(!token)return null;const tokenHash=await sha256(token);const row=await env.DB.prepare("SELECT u.id,u.email,u.role FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=? AND s.expires_at>?").bind(tokenHash,today()).first<{id:string;email:string;role:'owner'|'member'}>();return row?{...row,tokenHash,viaBearer:!!bearer}:null}
function originAllowed(req:Request,env:Env){const origin=req.headers.get('Origin');return !origin||origin===new URL(req.url).origin||origin===env.APP_ORIGIN}
function cors(req:Request,env:Env,response:Response){const origin=req.headers.get('Origin');if(!origin||!originAllowed(req,env))return response;const h=new Headers(response.headers);h.set('Access-Control-Allow-Origin',origin);h.set('Access-Control-Allow-Credentials','true');h.set('Vary','Origin');return new Response(response.body,{status:response.status,statusText:response.statusText,headers:h})}
async function body(req:Request):Promise<Record<string,unknown>|null>{if((Number(req.headers.get('Content-Length')||'0'))>16384)return null;try{const raw=await req.text();if(new TextEncoder().encode(raw).byteLength>16384)return null;const x=JSON.parse(raw);return x&&typeof x==='object'&&!Array.isArray(x)?x as Record<string,unknown>:null}catch{return null}}
async function audit(env:Env,userId:string,workspaceId:string|null,action:string,entityId:string|null){await env.DB.prepare('INSERT INTO audit_events(id,actor_user_id,workspace_id,action,entity_id) VALUES(?,?,?,?,?)').bind(crypto.randomUUID(),userId,workspaceId,action,entityId).run()}
async function membership(env:Env,user:Actor,id:string,write=false){if(user.role==='owner')return true;const row=await env.DB.prepare('SELECT role FROM workspace_members WHERE user_id=? AND workspace_id=?').bind(user.id,id).first<{role:string}>();return !!row&&(!write||row.role==='admin'||row.role==='editor')}
async function route(req:Request,env:Env){
 const url=new URL(req.url),path=url.pathname,method=req.method;
 if(method==='OPTIONS')return new Response(null,{status:204,headers:{'Access-Control-Allow-Methods':'GET, POST, OPTIONS','Access-Control-Allow-Headers':'Content-Type, Authorization, X-Bootstrap-Key','Access-Control-Max-Age':'7200'}});
 if(!originAllowed(req,env))return fail('Origin is not allowed',403);
 if(path==='/api/v1/health'&&method==='GET')return json({status:'ok',service:'sparqfire-api',environment:env.ENVIRONMENT});
 if(!env.DB)return fail('Database is not configured',503);
 if(path==='/api/v1/setup/owner'&&method==='POST'){
  const key=req.headers.get('X-Bootstrap-Key')??'';
  if(!env.BOOTSTRAP_KEY||env.BOOTSTRAP_KEY.length<32||!equalTime(key,env.BOOTSTRAP_KEY))return fail('Setup is unavailable',403);
  const exists=await env.DB.prepare("SELECT id FROM users WHERE role='owner' LIMIT 1").first();if(exists)return fail('Owner already exists',409);
  const data=await body(req),email=normalizeEmail(data?.email),password=data?.password;
  if(!email||!strongPassword(password))return fail('Provide a valid email and password of at least 14 characters');
  const salt=b64url(crypto.getRandomValues(new Uint8Array(16))),hash=await hashPassword(password as string,salt),id=crypto.randomUUID();
  await env.DB.prepare("INSERT INTO users(id,email,password_salt,password_hash,role) VALUES(?,?,?,?,'owner')").bind(id,email,salt,hash).run();
  return json({message:'Owner account created. Remove BOOTSTRAP_KEY after setup.'},201);
 }
 if(path==='/api/v1/auth/login'&&method==='POST'){
  const data=await body(req),email=normalizeEmail(data?.email),password=data?.password;
  if(!email||typeof password!=='string')return fail('Invalid email or password',401);
  const attempt=await env.DB.prepare('SELECT failures,window_start FROM login_attempts WHERE email=?').bind(email).first<{failures:number;window_start:string}>();
  if(attempt&&Date.now()-new Date(attempt.window_start).getTime()<900000&&attempt.failures>=5)return fail('Too many attempts. Try again later.',429);
  const u=await env.DB.prepare('SELECT id,email,password_hash,password_salt,role FROM users WHERE email=?').bind(email).first<{id:string;email:string;password_hash:string;password_salt:string;role:string}>();
  const computed=await hashPassword(password,u?.password_salt??b64url(new Uint8Array(16)));
  if(!u||!equalTime(computed,u.password_hash)){
   const failures=attempt&&Date.now()-new Date(attempt.window_start).getTime()<900000?attempt.failures+1:1;
   await env.DB.prepare('INSERT INTO login_attempts(email,failures,window_start) VALUES(?,?,?) ON CONFLICT(email) DO UPDATE SET failures=excluded.failures,window_start=excluded.window_start').bind(email,failures,failures===1?today():attempt!.window_start).run();
   return fail('Invalid email or password',401);
  }
  await env.DB.prepare('DELETE FROM login_attempts WHERE email=?').bind(email).run();
  const token=randomToken(),expires=new Date(Date.now()+7*86400000).toISOString();
  await env.DB.prepare('INSERT INTO sessions(token_hash,user_id,expires_at) VALUES(?,?,?)').bind(await sha256(token),u.id,expires).run();
  const cookie=`sparqfire_session=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=604800${url.protocol==='https:'?'; Secure':''}`;
  const native=data?.client==='native';
  return json({user:{id:u.id,email:u.email,role:u.role},...(native?{token}:{})},200,native?undefined:{'Set-Cookie':cookie});
 }
 const a=await actor(req,env);if(!a)return fail('Sign in is required',401);
 if(method!=='GET'&&!a.viaBearer){const origin=req.headers.get('Origin');if(!origin||!originAllowed(req,env))return fail('Request origin required',403)}
 if(path==='/api/v1/session'&&method==='GET')return json({user:{id:a.id,email:a.email,role:a.role}});
 if(path==='/api/v1/auth/logout'&&method==='POST'){await env.DB.prepare('DELETE FROM sessions WHERE token_hash=?').bind(a.tokenHash).run();return json({ok:true},200,{'Set-Cookie':`sparqfire_session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0${url.protocol==='https:'?'; Secure':''}`})}
 if(path==='/api/v1/workspaces'){
  if(method==='GET'){
   const rows=a.role==='owner'?await env.DB.prepare('SELECT * FROM workspaces ORDER BY created_at DESC LIMIT 100').all():await env.DB.prepare('SELECT w.* FROM workspaces w JOIN workspace_members m ON m.workspace_id=w.id WHERE m.user_id=? ORDER BY w.created_at DESC LIMIT 100').bind(a.id).all();
   return json({items:rows.results});
  }
  if(method==='POST'){
   if(a.role!=='owner')return fail('Only an agency owner can create clients',403);
   const data=await body(req),name=boundedText(data?.name,120),sender=boundedText(data?.sender_name,120);
   if(name.length<2||sender.length<2)return fail('Client and sender names must be at least two characters');
   const id=crypto.randomUUID();await env.DB.prepare('INSERT INTO workspaces(id,name,sender_name) VALUES(?,?,?)').bind(id,name,sender).run();await audit(env,a.id,id,'workspace.created',id);
   return json({item:{id,name,sender_name:sender,sender_email:null,brand_color:'#f97316',status:'active'}},201);
  }
 }
 const match=path.match(/^\/api\/v1\/workspaces\/([0-9a-f-]{36})\/(contacts|campaigns|domains)$/);
 if(match){
  const workspaceId=match[1],resource=match[2];
  if(!await membership(env,a,workspaceId,method!=='GET'))return fail('Workspace not found or access denied',404);
  const exists=await env.DB.prepare('SELECT id FROM workspaces WHERE id=?').bind(workspaceId).first();if(!exists)return fail('Workspace not found',404);
  if(method==='GET'){
   const table=resource==='domains'?'sender_domains':resource;
   const rows=await env.DB.prepare(`SELECT * FROM ${table} WHERE workspace_id=? ORDER BY created_at DESC LIMIT 100`).bind(workspaceId).all();
   return json({items:rows.results});
  }
  if(method==='POST'){
   const data=await body(req);if(!data)return fail('Invalid request body');const id=crypto.randomUUID();
   if(resource==='contacts'){
    const email=normalizeEmail(data.email),first=boundedText(data.first_name,80),last=boundedText(data.last_name,80),consent=boundedText(data.consent_source,300);
    if(!email||!consent||!first&&!last)return fail('Name, valid email and genuine consent source are required');
    try{await env.DB.prepare('INSERT INTO contacts(id,workspace_id,email,first_name,last_name,consent_source,consent_at) VALUES(?,?,?,?,?,?,?)').bind(id,workspaceId,email,first,last,consent,today()).run()}catch{return fail('Contact already exists in this workspace or could not be saved',409)}
    await audit(env,a.id,workspaceId,'contact.created',id);return json({item:{id,workspace_id:workspaceId,email,first_name:first,last_name:last,status:'subscribed',consent_source:consent}},201);
   }
   if(resource==='campaigns'){
    const name=boundedText(data.name,140),subject=boundedText(data.subject,200);if(name.length<2||subject.length<2)return fail('Campaign name and subject are required');
    await env.DB.prepare("INSERT INTO campaigns(id,workspace_id,name,subject,status) VALUES(?,?,?,?,'draft')").bind(id,workspaceId,name,subject).run();await audit(env,a.id,workspaceId,'campaign.draft.created',id);
    return json({item:{id,workspace_id:workspaceId,name,subject,status:'draft',created_at:today()}},201);
   }
   if(resource==='domains'){
    const hostname=validateDomain(data.hostname);if(!hostname)return fail('Enter a valid domain without https:// or a path');
    try{await env.DB.prepare("INSERT INTO sender_domains(id,workspace_id,hostname,status) VALUES(?,?,?,'pending')").bind(id,workspaceId,hostname).run()}catch{return fail('Domain already added to this workspace',409)}
    await audit(env,a.id,workspaceId,'domain.pending.created',id);
    return json({item:{id,workspace_id:workspaceId,hostname,status:'pending'}},201);
   }
  }
 }
 return fail('API endpoint not found',404);
}
export default {async fetch(req:Request,env:Env):Promise<Response>{try{return cors(req,env,await route(req,env))}catch(error){console.error('SparQFire API error',error instanceof Error?error.name:'Unknown');return cors(req,env,fail('A server error occurred. Please try again.',500))}}} satisfies ExportedHandler<Env>;
