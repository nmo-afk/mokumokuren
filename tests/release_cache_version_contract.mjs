/* Release asset changes must roll the PWA cache version automatically. */
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {resolve,join} from 'node:path';
const root=resolve(import.meta.dirname,'..');
const report=JSON.parse(await readFile(join(root,'dist/release-integrity.json'),'utf8'));
const template=(await readFile(join(root,'service-worker.js'),'utf8'));
const built=(await readFile(join(root,'dist/service-worker.js'),'utf8'));
const marker='__MOKUMOKUREN_SHELL_HASH__';
assert.equal(template.split(marker).length,2,'Exactly one build marker must exist');
assert(!built.includes(marker),'No build marker may be published');
const sourceFiles=await Promise.all(report.files.map(async item=>({path:item.path,bytes:await readFile(join(root,item.path))})));
function expectedHash(changed={}){
 const sha=createHash('sha256');
 for(const {path,bytes} of sourceFiles){
   sha.update(path+'\0');sha.update(changed[path]??bytes);sha.update('\0');
 }
 return sha.digest('hex').slice(0,20);
}
const current=expectedHash();
assert.match(current,/^[a-f0-9]{20}$/);
assert(built.includes("const CACHE_NAME = CACHE_PREFIX + '"+current+"'"),'Deployed worker must match complete source asset hashes');
const changedApp=Buffer.concat([sourceFiles.find(x=>x.path==='app.js').bytes,Buffer.from('\n// changed')]);
assert.notEqual(expectedHash({'app.js':changedApp}),current,'Changing app.js must produce a new cache version');
const changedIcon=Buffer.concat([sourceFiles.find(x=>x.path==='assets/arctic-icons/star.png').bytes,Buffer.from([0])]);
assert.notEqual(expectedHash({'assets/arctic-icons/star.png':changedIcon}),current,'Changing an icon must produce a new cache version');
console.log('PASS production cache version matches all shipped source assets and changes with code/artwork updates');
