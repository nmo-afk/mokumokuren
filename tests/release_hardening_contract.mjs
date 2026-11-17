import assert from 'node:assert/strict';
import {readFile, readdir, stat} from 'node:fs/promises';
import {join, resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {approvedCallbackUri} from '../netlify/lib/oauth-origin.mjs';
import traktTokenHandler from '../netlify/functions/trakt-token.mjs';
import aniTokenHandler from '../netlify/functions/anilist-token.mjs';
const root=resolve(import.meta.dirname,'..');
const origin='https://mokumokuren.netlify.app';
let checks=0;
const env=originValue=>({get(name){return name==='MOKUMOKUREN_ORIGIN'?originValue:undefined}});
assert.equal(approvedCallbackUri(env()),null,'Missing origin must fail closed');checks++;
assert.equal(approvedCallbackUri(env('https://custom.example')), 'https://custom.example/callback');checks++;
for(const value of ['http://custom.example','https://custom.example/path','https://custom.example/','https://custom.example?key=123','https://user:pass@custom.example','https://custom.example:8443','https://custom.example#fragment','https://custom.example@evil.example/callback','javascript:alert(1)','https://custom.example/\n']){
 assert.equal(approvedCallbackUri(env(value)),null,value);checks++;
}
const oldNetlify=globalThis.Netlify,oldFetch=globalThis.fetch;
try {
 globalThis.Netlify={env:{get:name=>({TRAKT_CLIENT_ID:'public-test',ANILIST_CLIENT_ID:'test-id',ANILIST_CLIENT_SECRET:'test-secret',MOKUMOKUREN_ORIGIN:'https://production.example'}[name])}};
 let upstreamCalls=0;
 globalThis.fetch=async()=>{upstreamCalls++;throw Error('Should not call upstream');};
 for(const [handler,endpoint,body] of [
   [traktTokenHandler,'trakt-token',{code:'valid',code_verifier:'x'.repeat(43),redirect_uri:origin+'/callback'}],
   [aniTokenHandler,'anilist-token',{code:'valid',redirect_uri:origin+'/callback'}],
 ]) {
  const result=await handler(new Request('https://production.example/api/'+endpoint,{method:'POST',body:JSON.stringify(body)}));
  assert.equal(result.status,400,'Only configured callback origin is accepted');
  checks++;
 }
 assert.equal(upstreamCalls,0,'Rejected redirect URIs must not contact token providers');checks++;
 globalThis.Netlify={env:{get:name=>name==='MOKUMOKUREN_ORIGIN'?'http://not-secure.example':'some-test-secret'}};
 const blocked=await traktTokenHandler(new Request(origin+'/api/trakt-token',{method:'POST',body:JSON.stringify({grant_type:'refresh_token',refresh_token:'valid'})}));
 assert.equal(blocked.status,503);checks++;
 globalThis.Netlify={env:{get:name=>name==='MOKUMOKUREN_ORIGIN'?undefined:'some-test-secret'}};
 const missing=await traktTokenHandler(new Request(origin+'/api/trakt-token',{method:'POST',body:JSON.stringify({grant_type:'refresh_token',refresh_token:'valid'})}));
 assert.equal(missing.status,503,'Missing canonical origin must block token refresh');checks++;
 const missingAni=await aniTokenHandler(new Request(origin+'/api/anilist-token',{method:'POST',body:JSON.stringify({code:'valid',redirect_uri:origin+'/callback'})}));
 assert.equal(missingAni.status,503,'Missing canonical origin must block AniList exchange');checks++;
 assert.equal(upstreamCalls,0,'No token provider called without a configured origin');checks++;
}finally{globalThis.Netlify=oldNetlify;globalThis.fetch=oldFetch;}
const dist=join(root,'dist');
const integrity=JSON.parse(await readFile(join(dist,'release-integrity.json'),'utf8'));
assert.equal(integrity.release,'v1.0.0-candidate');checks++;
for(const icon of ['assets/trakt-icons.svg','assets/ui-icons/mask.png'])
 assert.ok(integrity.files.some(entry=>entry.path===icon),`${icon} must ship in the production allowlist`);
checks++;
for(const {path,size,sha256} of integrity.files){
 const bytes=await readFile(join(dist,path));
 assert.equal(bytes.length,size,path);
 assert.equal(createHash('sha256').update(bytes).digest('hex'),sha256,path);
}
checks++;
for(const forbidden of ['local-login.html','README-LOCAL-TEST.txt','local_server.py','tests','scripts','netlify','V1-RELEASE-ROADMAP.md']){
 await assert.rejects(stat(join(dist,forbidden)),{code:'ENOENT'},forbidden);
 checks++;
}
const allFiles=async(dir)=>{
 const found=[];
 for(const e of await readdir(dir,{withFileTypes:true})){
  const p=join(dir,e.name);
  if(e.isDirectory())found.push(...await allFiles(p));else found.push(p);
 }
 return found;
};
assert.equal((await allFiles(dist)).length,integrity.files.length+1);checks++;
const sourceConfig=await readFile(join(root,'netlify.toml'),'utf8');
assert.match(sourceConfig,/publish\s*=\s*"dist"/);checks++;
assert.match(sourceConfig,/command\s*=\s*"node scripts\/build-release\.mjs"/);checks++;
assert.match(sourceConfig,/Content-Security-Policy = .*script-src 'self'/);checks++;
assert.match(sourceConfig,/X-Frame-Options = "DENY"/);checks++;
for(const name of ['app.js','style.css','service-worker.js','index.html','manifest.webmanifest']){
 assert.match(sourceConfig,new RegExp('for = "\\/'+name.replace('.','\\.')+'"'));checks++;
}
const sourceHtml=await readFile(join(dist,'index.html'),'utf8');
assert.doesNotMatch(sourceHtml,/<script(?![^>]*\bsrc=)/i);checks++;
console.log(`Release hardening contract: ${checks}/${checks} checks passed, plus ${integrity.files.length} digest validations`);
