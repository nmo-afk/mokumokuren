/** Offline release-artifact audit. Zero network calls, API usage or Netlify credits.
 * Run after node scripts/build-release.mjs. Exits non-zero on any finding.
 * Exported for tamper/incomplete-build contract tests.
 */
import {readFile, readdir, lstat} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {resolve, join, relative, sep, dirname} from 'node:path';
import {fileURLToPath} from 'node:url';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const assert=(condition,message)=>{if(!condition)throw Error(message)};
const hash=data=>createHash('sha256').update(data).digest('hex');
async function filesUnder(dir,base=dir){
 const files=[];
 for(const e of await readdir(dir,{withFileTypes:true})){
  const full=join(dir,e.name);const stat=await lstat(full);
  assert(!stat.isSymbolicLink(),`Symlink in release: ${relative(base,full)}`);
  if(stat.isDirectory()) files.push(...await filesUnder(full,base));
  else {assert(stat.isFile(),`Non-file in release: ${relative(base,full)}`);files.push(relative(base,full).split(sep).join('/'));}
 }
 return files;
}
function staticPaths(content){
 const paths=[];
 for(const match of content.matchAll(/\b(?:href|src)=["'](\/[^"']+)["']/g))paths.push(match[1].split(/[?#]/,1)[0]);
 return paths;
}
function cssPaths(content){
 return [...content.matchAll(/url\(\s*['"]?(\/[^'"\)]+)['"]?\s*\)/g)].map(m=>m[1].split(/[?#]/,1)[0]);
}
export async function auditReleaseBundle({dist=join(root,'dist'),sourceRoot=root}={}){
 const findings=[];const check=(condition,message)=>{if(!condition)findings.push(message)};
 let manifest;
 try{manifest=JSON.parse(await readFile(join(dist,'release-integrity.json'),'utf8'));}
 catch(e){return {ok:false,findings:[`Missing/invalid integrity manifest: ${e.message}`],fileCount:0};}
 check(manifest.release==='v1.0.0-candidate','Unexpected release label');
 check(Array.isArray(manifest.files)&&manifest.files.length>0,'Empty/malformed integrity inventory');
 const records=Array.isArray(manifest.files)?manifest.files:[];
 const seen=new Set();
 for(const record of records){
  const rel=record?.path;
  if(typeof rel!=='string'||!/^[-a-zA-Z0-9./]+$/.test(rel)||rel.startsWith('/')||rel.split('/').includes('..')||rel==='release-integrity.json'){
   findings.push(`Unsafe inventory file path: ${String(rel)}`);continue;
  }
  check(!seen.has(rel),`Duplicate inventory path: ${rel}`);seen.add(rel);
  const absolute=resolve(dist,rel);
  if(!absolute.startsWith(resolve(dist)+sep)){findings.push(`Outside release directory: ${rel}`);continue;}
  try{
   const info=await lstat(absolute);
   check(info.isFile()&&!info.isSymbolicLink(),`Not a plain file: ${rel}`);
   const data=await readFile(absolute);
   check(data.byteLength===record.size,`Size mismatch: ${rel}`);
   check(hash(data)===record.sha256,`SHA-256 mismatch: ${rel}`);
  }catch(e){findings.push(`Missing listed file: ${rel}`);}
 }
 let actual=[];
 try{actual=await filesUnder(dist);}catch(e){findings.push(e.message);}
 for(const f of actual){
  if(f!=='release-integrity.json'&&!seen.has(f))findings.push(`Unexpected public file: ${f}`);
 }
 check(actual.length===seen.size+1,`Public file count mismatch: ${actual.length} actual, ${seen.size+1} listed/manifest`);
 for(const disallowed of ['local-login.html','local_server.py','START-TEST.bat']){
  check(!actual.includes(disallowed),`Development helper exposed: ${disallowed}`);
 }
 check(!actual.some(f=>f.startsWith('tests/')||f.startsWith('netlify/')||f.startsWith('scripts/')||f.startsWith('.env')), 'Source/tests/environment file exposed in static output');
 // Only same-origin local references are checked; external media artworks are dynamic.
 for(const name of ['index.html','style.css']){
  try{
   const content=await readFile(join(dist,name),'utf8');
   const references=name==='index.html'?staticPaths(content):cssPaths(content);
   for(const link of references)check(seen.has(link.slice(1)),`Broken local reference in ${name}: ${link}`);
  }catch(e){findings.push(`Cannot inspect ${name}: ${e.message}`);}
 }
 try{
  const sw=await readFile(join(dist,'service-worker.js'),'utf8');
  check(!sw.includes('__MOKUMOKUREN_SHELL_HASH__'),'Unreplaced service-worker version marker');
  check(/CACHE_NAME = CACHE_PREFIX \+ '[a-f0-9]{20}'/.test(sw),'Missing content-derived offline cache version');
  const match=sw.match(/const STATIC_SHELL = \[([\s\S]*?)\];/);
  check(!!match,'Offline shell list missing');
  if(match){
   const paths=[...match[1].matchAll(/'([^']+)'/g)].map(m=>m[1]);
   for(const path of paths)check(path==='/'||seen.has(path.slice(1)),`Offline cache points to missing file: ${path}`);
  }
 }catch(e){findings.push(`Cannot inspect PWA: ${e.message}`);}
 try{
  const config=await readFile(join(sourceRoot,'netlify.toml'),'utf8');
  check(/publish\s*=\s*"dist"/.test(config),'Netlify must publish only dist');
  check(/command\s*=\s*"node scripts\/build-release\.mjs"/.test(config),'Netlify must build its own verified release');
  check(/functions\s*=\s*"netlify\/functions"/.test(config),'Netlify Functions directory not configured');
  const api=config.indexOf('from = "/api/*"'),fallback=config.indexOf('from = "/*"');
  check(api>=0&&fallback>api,'API redirect must precede catch-all SPA redirect');
  check(/Content-Security-Policy = .*script-src 'self'/.test(config),'Static Content Security Policy missing');
 }catch(e){findings.push(`Cannot inspect deployment config: ${e.message}`);}
 return {ok:findings.length===0,findings,fileCount:records.length};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const result=await auditReleaseBundle();
 if(result.ok)console.log(`PASS offline prepublication audit: ${result.fileCount} integrity-verified runtime files; zero network calls`);
 else {for(const item of result.findings)console.error('BLOCKED',item);process.exitCode=1;}
}
