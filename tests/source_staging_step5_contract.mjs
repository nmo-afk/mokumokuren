/* The exact GitHub staging tree must remain complete and independently buildable. */
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {readFileSync,existsSync,readdirSync,lstatSync} from 'node:fs';
import {resolve,join} from 'node:path';

const root=resolve(import.meta.dirname,'..');
execFileSync(process.execPath,['scripts/prepare-source-tree.mjs'],{cwd:root,stdio:'pipe'});
const stage=join(root,'release-github-source');
for(const name of ['CONFIRMED-DESIGN-SPEC.md','RELEASE-PROGRESS.md','LATEST-CHECKPOINT.md',
 'OWNER-RELEASE-HANDOFF.md','.nvmrc','START-MOKUMOKUREN-WINDOWS.bat','checks/candidate-integrity.json']){
 assert(existsSync(join(stage,name)),'GitHub source is missing '+name);
 assert.deepEqual(readFileSync(join(stage,name)),readFileSync(join(root,name)),name);
}
for(const filename of readdirSync(join(root,'tests/visual-fixtures'))){
 assert.deepEqual(readFileSync(join(stage,'tests/visual-fixtures',filename)),
  readFileSync(join(root,'tests/visual-fixtures',filename)),'Preserve the supplied test artwork: '+filename);
}
const walk=(directory,prefix='')=>readdirSync(directory).flatMap(name=>{
 const path=join(directory,name),relative=prefix+name,stat=lstatSync(path);
 assert(!stat.isSymbolicLink(),'Source staging may not contain symlinks');
 return stat.isDirectory()?walk(path,relative+'/'):[relative];
});
const staged=walk(stage);
assert(!staged.some(path=>path.split('/').some(part=>['.git','dist','node_modules','__pycache__','release-github-source'].includes(part))));
assert(!staged.some(path=>/(?:^|\/)\.env(?:$|\.(?!example$))|\.(?:zip|pem|p12|key)$/.test(path)),'Private/generated files must not be staged');
for(const directory of ['netlify/functions','netlify/lib']){
 for(const filename of readdirSync(join(root,directory)).filter(name=>name.endsWith('.mjs')))
  assert.deepEqual(readFileSync(join(stage,directory,filename)),readFileSync(join(root,directory,filename)),directory+'/'+filename);
}
execFileSync(process.execPath,['scripts/build-release.mjs'],{cwd:stage,stdio:'pipe'});
execFileSync(process.execPath,['scripts/audit-release-bundle.mjs'],{cwd:stage,stdio:'pipe'});
assert.deepEqual(readFileSync(join(stage,'dist/release-integrity.json')),readFileSync(join(root,'dist/release-integrity.json')));
console.log('PASS source staging: complete docs, test artwork, backend modules, safe paths and identical clean build');
