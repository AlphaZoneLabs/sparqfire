import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
const TOKEN_KEY='sparqfire_session_token';
const configuredBase=process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/,'')??'';
// Production web uses the Worker on its own origin, even if a local .env was present at build time.
const base=Platform.OS==='web' && typeof window!=='undefined' && !['localhost','127.0.0.1'].includes(window.location.hostname)?'':configuredBase;
export type User={id:string;email:string;role:string};
export type Workspace={id:string;name:string;sender_name:string;sender_email:string|null;brand_color:string;status:string};
export type Contact={id:string;workspace_id:string;email:string;first_name:string;last_name:string;status:string;consent_source:string};
export type Campaign={id:string;workspace_id:string;name:string;subject:string;status:string;created_at:string};
export type SenderDomain={id:string;workspace_id:string;hostname:string;status:string};
let nativeToken: string|null=null;
async function getToken(){if(Platform.OS==='web')return null;if(nativeToken)return nativeToken;nativeToken=await SecureStore.getItemAsync(TOKEN_KEY);return nativeToken;}
export async function request<T>(path:string,opts:RequestInit={}):Promise<T>{
  if(Platform.OS!=='web'&&!base)throw new Error('Set EXPO_PUBLIC_API_URL to your Worker URL for native devices.');
  const token=await getToken();
  const headers=new Headers(opts.headers);
  if(opts.body)headers.set('Content-Type','application/json');
  if(token)headers.set('Authorization',`Bearer ${token}`);
  const res=await fetch(`${base}${path}`,{...opts,headers,credentials:Platform.OS==='web'?'include':'omit'});
  const result=await res.json().catch(()=>({error:'Unexpected response'}));
  if(!res.ok)throw new Error(result.error??`Request failed (${res.status})`);
  return result as T;
}
export async function login(email:string,password:string){
  const result=await request<{user:User;token?:string}>('/api/v1/auth/login',{method:'POST',body:JSON.stringify({email,password,client:Platform.OS==='web'?'web':'native'})});
  if(Platform.OS!=='web'&&result.token){nativeToken=result.token;await SecureStore.setItemAsync(TOKEN_KEY,result.token)}
  return result.user;
}
export async function logout(){try{await request('/api/v1/auth/logout',{method:'POST'})}finally{nativeToken=null;if(Platform.OS!=='web')await SecureStore.deleteItemAsync(TOKEN_KEY)}}
export async function me(){return request<{user:User}>('/api/v1/session')}
export async function getWorkspaces(){return request<{items:Workspace[]}>('/api/v1/workspaces')}
export async function createWorkspace(input:{name:string;sender_name:string}){return request<{item:Workspace}>('/api/v1/workspaces',{method:'POST',body:JSON.stringify(input)})}
export async function getContacts(id:string){return request<{items:Contact[]}>(`/api/v1/workspaces/${encodeURIComponent(id)}/contacts`)}
export async function createContact(id:string,input:{email:string;first_name:string;last_name:string;consent_source:string}){return request<{item:Contact}>(`/api/v1/workspaces/${encodeURIComponent(id)}/contacts`,{method:'POST',body:JSON.stringify(input)})}
export async function getCampaigns(id:string){return request<{items:Campaign[]}>(`/api/v1/workspaces/${encodeURIComponent(id)}/campaigns`)}
export async function createCampaign(id:string,input:{name:string;subject:string}){return request<{item:Campaign}>(`/api/v1/workspaces/${encodeURIComponent(id)}/campaigns`,{method:'POST',body:JSON.stringify(input)})}
export async function getDomains(id:string){return request<{items:SenderDomain[]}>(`/api/v1/workspaces/${encodeURIComponent(id)}/domains`)}
export async function createDomain(id:string,hostname:string){return request<{item:SenderDomain}>(`/api/v1/workspaces/${encodeURIComponent(id)}/domains`,{method:'POST',body:JSON.stringify({hostname})})}
