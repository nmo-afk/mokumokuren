import assert from 'node:assert/strict';
import {mkdtemp,cp,readFile,writeFile,rm,unlink} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {auditReleaseBundle} from '../scripts/audit-release-bundle.mjs';
const root=resolve(import.meta.dirname,'..');
const staging=await mkdtemp(join(tmpdir(),'mokumokuren-bundle-'));
let checks=0;
async function reset(){await rm(join(staging,'dist'),{recursive:true,force:true});await cp(join(root,'dist'),join(staging,'dist'),{recursive:true});}
try{
 await reset();
 let result=await auditReleaseBundle({dist:join(staging,'dist'),sourceRoot:root});
 assert.equal(result.ok,true,result.findings.join('\n'));checks++;
 const app=join(staging,'dist','app.js');
 await writeFile(app,(await readFile(app,'utf8'))+'\n// injected change');
 result=await auditReleaseBundle({dist:join(staging,'dist'),sourceRoot:root});
 assert(!result.ok&&result.findings.some(x=>x.includes('SHA-256 mismatch: app.js')));checks++;
 await reset();
 await unlink(join(staging,'dist','assets','icon-512.png'));
 result=await auditReleaseBundle({dist:join(staging,'dist'),sourceRoot:root});
 assert(!result.ok&&result.findings.some(x=>x.includes('Missing listed file: assets/icon-512.png')));checks++;
 await reset();
 await writeFile(join(staging,'dist','local-login.html'),'SHOULD NOT SHIP');
 result=await auditReleaseBundle({dist:join(staging,'dist'),sourceRoot:root});
 assert(!result.ok&&result.findings.some(x=>x.includes('Unexpected public file: local-login.html')));checks++;
 await reset();
 const html=join(staging,'dist','index.html');
 await writeFile(html,(await readFile(html,'utf8')).replace('href="/style.css"','href="/missing.css"'));
 result=await auditReleaseBundle({dist:join(staging,'dist'),sourceRoot:root});
 assert(!result.ok&&result.findings.some(x=>x.includes('Broken local reference in index.html: /missing.css')));checks++;
}finally{await rm(staging,{recursive:true,force:true});}
console.log(`PASS release artifact audit: ${checks}/${checks} positive/tamper/exclusion/reference checks`);
