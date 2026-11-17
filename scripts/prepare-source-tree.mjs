/** Build a minimal, reproducible GitHub upload tree without pushing or deploying.
 * Copies source, tests, runtime assets and essential release documentation.
 * Live account/device acceptance and publication remain owner-controlled.
 */
import {readFile, readdir, lstat, mkdir, rm, cp, writeFile} from 'node:fs/promises';
import {resolve, join, dirname, relative, sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {auditReleaseBundle} from './audit-release-bundle.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const output=resolve(root,'release-github-source');
const topFiles=[
 '.gitignore','.env.example','.nvmrc','README.md','netlify.toml',
 'index.html','app.js','style.css','trakt-rebuild.css','service-worker.js','manifest.webmanifest',
 'ARCTIC-FUSE-LICENSE.txt','local-login.html','local_server.py','START-MOKUMOKUREN-WINDOWS.bat',
 'V1-RELEASE-ROADMAP.md','RELEASE-V1-ACCEPTANCE.md','RELEASE-ACCESS-AND-ACCEPTANCE.md',
 'RELEASE-GATE-STATUS.md','LATEST-CHECKPOINT.md','RELEASE-PROGRESS.md','CONFIRMED-DESIGN-SPEC.md','OWNER-RELEASE-HANDOFF.md',
 'checks/candidate-integrity.json','checks/release-step5.json','checks/browser-evidence.json',
 'checks/trakt-step2.json','checks/anilist-step3.json','checks/pwa-step4.json',
 'DEVELOPMENT-RELEASE-HARDENING.md','DEVELOPMENT-PREPUBLICATION-AUDIT.md',
 'DEVELOPMENT-PRIVATE-USE-LOGIN-RECOVERY.md','DEVELOPMENT-TRAKT-READ-GATEWAY-RECOVERY.md',
 'DEVELOPMENT-ACCOUNT-SESSION-ISOLATION.md'
];
const allowedDirs={
 assets: f=>/\.(png|svg)$/.test(f),
 netlify: f=>/\.mjs$/.test(f),
 scripts: f=>/\.(mjs|py)$/.test(f),
 tests: f=>/\.(mjs|py)$/.test(f)||/^tests\/visual-fixtures\/[-a-z0-9]+\.(jpg|png)$/.test(f),
};
async function copyOne(path){
 const src=resolve(root,path),dest=resolve(output,path);
 if(!src.startsWith(root+sep)||!dest.startsWith(output+sep))throw Error('Unsafe source path');
 const stat=await lstat(src);
 if(!stat.isFile()||stat.isSymbolicLink())throw Error(`Unapproved file: ${path}`);
 await mkdir(dirname(dest),{recursive:true});await cp(src,dest,{dereference:false});
}
async function recursive(dir,allow){
 const entries=await readdir(join(root,dir),{withFileTypes:true});
 for(const entry of entries){
  const rel=join(dir,entry.name).split(sep).join('/');
  if(entry.isDirectory()){
   if(['__pycache__','.pytest_cache','node_modules'].includes(entry.name))continue;
   if(entry.name.startsWith('.'))throw Error(`Unexpected hidden directory ${rel}`);
   await recursive(rel,allow);
  }
  else if(entry.isFile()&&allow(rel))await copyOne(rel);
  else if(entry.isFile()&&(/\.(pyc|pyo)$/.test(rel)||entry.name==='.DS_Store'))continue;
  else throw Error(`Unexpected/unapproved source item ${rel}`);
 }
}
const audit=await auditReleaseBundle();
if(!audit.ok){console.error('BLOCKED: fix the production bundle audit before preparing upload source',audit.findings);process.exitCode=1;}
else{
 // This directory is ignored by Git and must never be uploaded from the original dev folder.
 await rm(output,{recursive:true,force:true});await mkdir(output,{recursive:true});
 for(const f of topFiles)await copyOne(f);
 for(const [dir,allow] of Object.entries(allowedDirs))await recursive(dir,allow);
 const note=`# Mokumokuren — GitHub source staging (UNPUBLISHED)\n\nThis is the source for the owner's deliberate release-candidate publication. This script performs no push or deployment. Follow OWNER-RELEASE-HANDOFF.md. Live account/device acceptance remains pending until recorded against the deployed candidate.\n\nKeep netlify.toml at the repository root. Netlify builds dist/ with Node and also deploys netlify/functions; a static-only dist upload cannot supply the backend.\n\nKeep provider secrets in Netlify, and stop automatic builds before uploading source. Preserve the included attribution and private-use scope.\n\nThe local login/server helpers, test artwork, source checks and documentation remain outside the public dist allowlist.\n\nReproducible developer checks: node scripts/build-release.mjs, node scripts/audit-release-bundle.mjs, python tests/run_release_regression.py --group core.\n`;
 await writeFile(join(output,'GITHUB-STAGING-NOT-PUBLISHED.md'),note);
 const count=async dir=>(await readdir(dir,{withFileTypes:true})).reduce(async (p,e)=>{
  const n=await p;return n+(e.isDirectory()?await count(join(dir,e.name)):1);
 },Promise.resolve(0));
 console.log(`PASS prepared clean GitHub source staging: ${await count(output)} files. No private environment files, previous release ZIPs or generated dist copied. No deployment performed.`);
}
