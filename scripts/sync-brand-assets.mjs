import {copyFileSync,existsSync,mkdirSync,readFileSync} from 'node:fs';
import {dirname,join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const target=join(root,'apps','app','assets','brand');
mkdirSync(target,{recursive:true});
for(const filename of ['sparqfireIcon.png','sparqfireLogo.png']){
 const source=join(root,filename),dest=join(target,filename);
 if(!existsSync(source))throw new Error(`Missing ${filename} at repo root. Extract this overlay into the original AlphaZoneLabs/sparqfire checkout so the existing artwork can be reused.`);
 const sum=path=>createHash('sha256').update(readFileSync(path)).digest('hex');
 if(!existsSync(dest)||sum(source)!==sum(dest))copyFileSync(source,dest);
 console.log(`Verified original brand asset: ${filename}`);
}
