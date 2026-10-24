export function normalizeEmail(value){if(typeof value!=='string')return null;const email=value.trim().toLowerCase();return email.length<=254&&/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)?email:null}
export function validateDomain(value){if(typeof value!=='string')return null;const name=value.trim().toLowerCase().replace(/\.$/,'');if(name.length>253||!name.includes('.')||name.includes('..')||!name.split('.').every(part=>part.length>=1&&part.length<=63&&/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(part)))return null;return name}
export function boundedText(value,max=120){return typeof value==='string'?value.trim().slice(0,max):''}
export function strongPassword(password){return typeof password==='string'&&password.length>=14&&password.length<=256}
