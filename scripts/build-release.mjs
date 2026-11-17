/**
 * Mokumokuren release build: dependency-free and deliberately allowlist based.
 * Run with `node scripts/build-release.mjs` (also used by Netlify).
 * Never publish development helpers, account test pages or source test fixtures.
 */
import {readFile, mkdir, rm, cp, writeFile, readdir, lstat} from 'node:fs/promises';
import {resolve, join, relative, dirname, sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const dist=join(root,'dist');
const requiredFiles=[
 'index.html','app.js','style.css','service-worker.js','manifest.webmanifest','trakt-rebuild.css','ARCTIC-FUSE-LICENSE.txt',
 'assets/icon-512.png','assets/favicon-32.png','assets/favicon-180.png',
 'assets/icon.svg','assets/shoji-eyes.svg','assets/trakt-icons.svg',
];
const digest=content=>createHash('sha256').update(content).digest('hex');
async function safeCopy(relativePath, generatedBytes=null){
 const src=resolve(root,relativePath);
 if(!src.startsWith(root+sep))throw Error(`Unsafe release path: ${relativePath}`);
 const meta=await lstat(src);
 if(!meta.isFile()||meta.isSymbolicLink())throw Error(`Not a regular asset: ${relativePath}`);
 const dest=join(dist,relativePath);
 await mkdir(dirname(dest),{recursive:true});
 if(generatedBytes!==null) await writeFile(dest,generatedBytes);
 else await cp(src,dest,{dereference:false});
 const bytes=generatedBytes===null?await readFile(src):generatedBytes;
 return {path:relativePath,size:bytes.length,sha256:digest(bytes)};
}
async function main(){
 // Validate everything before deleting a previous successful build.
 const icons=(await readdir(join(root,'assets/arctic-icons'))).sort();
 if(!icons.includes('mask.png') || icons.some(f=>!/^[-a-z0-9]+\.png$/.test(f)))
  throw Error('Arctic Fuse fallback PNGs must include the Anime mask');
 const uiIcons=(await readdir(join(root,'assets/ui-icons'))).sort();
 if(uiIcons.length!==icons.length || uiIcons.some(f=>!icons.includes(f)))
  throw Error('Normalized UI icon PNGs must match the Arctic originals');
 const files=[...requiredFiles,...icons.map(f=>`assets/arctic-icons/${f}`),...uiIcons.map(f=>`assets/ui-icons/${f}`)];
 const contents=await Promise.all(files.map(f=>readFile(join(root,f))));
 const html=contents[0].toString();
 if(/<script\b[^>]*>(?!\s*<\/script>)/i.test(html))throw Error('Unexpected inline application script');
 const manifest=JSON.parse(contents[4].toString());
 if(manifest.name!=='Mokumokuren'||!manifest.icons?.every(icon=>files.includes(icon.src.replace(/^\//,''))))
  throw Error('Release manifest icon missing or misconfigured');
 const sw=contents[3].toString();
 const marker='__MOKUMOKUREN_SHELL_HASH__';
 if(!sw.includes(marker)||sw.split(marker).length!==2)throw Error('Worker release hash marker missing or repeated');
 const releaseHash=createHash('sha256');
 for(let i=0;i<files.length;i++){releaseHash.update(files[i]+'\0');releaseHash.update(contents[i]);releaseHash.update('\0');}
 const generatedWorker=Buffer.from(sw.replace(marker,releaseHash.digest('hex').slice(0,20)));
 const match=sw.match(/const STATIC_SHELL = \[([\s\S]*?)\];/);
 if(!match)throw Error('Static shell list not found');
 const shell=[...match[1].matchAll(/'([^']+)'/g)].map(m=>m[1]);
 if(!shell.includes('/')||!shell.includes('/index.html')||shell.some(p=>p!=='/'&&!files.includes(p.slice(1))))
  throw Error('Offline shell references an unavailable asset');
 const app=contents[1].toString();
 const registry=app.match(/const TRAKT_ICONS = new Set\((\[[\s\S]*?\])\);/);
 if(!registry)throw Error('Trakt icon registry missing');
 const sprite=contents[files.indexOf('assets/trakt-icons.svg')].toString();
 const symbols=new Set([...sprite.matchAll(/<symbol id="([-a-z0-9]+)"/g)].map(m=>m[1]));
 const traktNames=JSON.parse(registry[1]);
 if(new Set(traktNames).size!==symbols.size || traktNames.some(name=>!symbols.has(name)))
  throw Error('Trakt icon registry and SVG symbols differ');
 const iconNames=new Set([...symbols,...uiIcons.map(f=>f.slice(0,-4))]);
 for(const match of app.matchAll(/\buiIcon\(['"]([-a-z0-9]+)['"]\)/g))
  if(!iconNames.has(match[1]))throw Error('Referenced interface icon missing: '+match[1]);
 if(!shell.includes('/assets/trakt-icons.svg') || !shell.includes('/assets/ui-icons/mask.png'))
  throw Error('Offline shell is missing the Trakt icons or Anime mask');
 await rm(dist,{recursive:true,force:true});
 await mkdir(dist,{recursive:true});
 const output=[];
 for(const file of files)output.push(await safeCopy(file,file==='service-worker.js'?generatedWorker:null));
 // A reproducible inventory for audit; no private env values are used by this build.
 const report={release:'v1.0.0-candidate',files:output};
 await writeFile(join(dist,'release-integrity.json'),JSON.stringify(report,null,2)+'\n');
 const actual=(await readdir(dist,{recursive:true,withFileTypes:true})).filter(x=>x.isFile());
 if(actual.length!==files.length+1)throw Error('Build contains an unexpected file');
 console.log(`Mokumokuren release build: ${output.length} allowlisted runtime files + integrity manifest; no tests, local-login.html or server tools`);
}
main().catch(error=>{console.error('Release build failed:',error.message);process.exitCode=1});
