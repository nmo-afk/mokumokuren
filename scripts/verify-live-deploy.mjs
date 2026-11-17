/** Read-only smoke test for the eventual v1.0.0 HTTPS publication.
 * No user mutations; optional user access token is used only to read identity.
 * Avoid logging any credentials, URLs with secrets, or provider error bodies.
 */
import {pathToFileURL} from 'node:url';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';

const candidateEntryPoints=['index.html','app.js','style.css','trakt-rebuild.css','service-worker.js','manifest.webmanifest'];
function integrityRecords(manifest){
  if(manifest?.release!=='v1.0.0-candidate'||!Array.isArray(manifest.files)||!manifest.files.length)
    throw Error('Invalid candidate inventory');
  const records=new Map();
  for(const record of manifest.files){
    const path=record?.path;
    if(typeof path!=='string'||!/^[-a-zA-Z0-9./]+$/.test(path)||
       path.split('/').some(part=>!part||part==='.'||part==='..')||records.has(path)||
       !Number.isSafeInteger(record.size)||record.size<0||!/^[a-f0-9]{64}$/.test(record.sha256))
      throw Error('Invalid candidate inventory entry');
    records.set(path,record);
  }
  if(candidateEntryPoints.some(path=>!records.has(path)))throw Error('Incomplete candidate inventory');
  return records;
}

export async function verifyLiveDeploy(origin,fetchImpl=fetch,{traktToken,expectedIntegrity}={}){
  const results=[];
  const check=async(name,fn)=>{
    try {await fn();results.push({name,ok:true});}
    catch {results.push({name,ok:false});}
  };
  if(typeof origin!=='string'||!/^https:\/\//.test(origin))throw Error('A production HTTPS origin is required');
  const normalized=new URL(origin);
  if(normalized.origin!==origin||normalized.pathname!=='/'||normalized.search||normalized.hash)
    throw Error('Provide the canonical HTTPS origin only (no path or trailing slash)');
  const call=async(path,options={})=>fetchImpl(origin+path,{
    redirect:'manual',cache:'no-store',signal:AbortSignal.timeout(20000),...options
  });
  await check('static application and CSP',async()=>{
    const r=await call('/');
    if(r.status!==200||!r.headers.get('content-security-policy')?.includes("script-src 'self'"))throw Error('Unexpected application response');
    if(!(await r.text()).includes('Mokumokuren'))throw Error('Missing application');
  });
  await check('PWA manifest and worker',async()=>{
    const manifest=await call('/manifest.webmanifest');
    const worker=await call('/service-worker.js');
    if(manifest.status!==200||worker.status!==200||(await manifest.json()).name!=='Mokumokuren')throw Error('Missing PWA files');
    if(!(await worker.text()).includes('STATIC_SHELL'))throw Error('Worker missing shell');
  });
  if(expectedIntegrity!==undefined){
    await check('candidate static asset identity',async()=>{
      const expected=integrityRecords(expectedIntegrity);
      const inventory=await call('/release-integrity.json');
      if(inventory.status!==200)throw Error('Candidate inventory not served');
      const actual=integrityRecords(await inventory.json());
      if(actual.size!==expected.size)throw Error('Different candidate inventory');
      for(const [path,record] of expected){
        const deployed=actual.get(path);
        if(deployed?.sha256!==record.sha256||deployed.size!==record.size)throw Error('Different candidate');
      }
      // Check actual entry-point bytes as well as the reported inventory.
      for(const path of candidateEntryPoints){
        const response=await call('/'+path);
        if(response.status!==200)throw Error('Candidate asset unavailable');
        const bytes=Buffer.from(await response.arrayBuffer());
        const record=expected.get(path);
        if(bytes.length!==record.size||createHash('sha256').update(bytes).digest('hex')!==record.sha256)
          throw Error('Stale or modified candidate asset');
      }
    });
  }
  await check('Netlify runtime configuration',async()=>{
    const r=await call('/api/release-health');
    const d=await r.json();
    if(r.status!==200||d.configured!==true||r.headers.get('cache-control')!=='no-store')throw Error('Runtime configuration not ready');
  });
  await check('TMDB live metadata read',async()=>{
    const r=await call('/api/tmdb?path=%2Fmovie%2F550');
    const d=await r.json();
    if(r.status!==200||Number(d.id)!==550||typeof d.poster_path!=='string')throw Error('TMDB read failed');
  });
  await check('AniList live anonymous read',async()=>{
    const r=await call('/api/anilist',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({query:'query { Media(id:1,type:ANIME) {id} }'})});
    const d=await r.json();
    if(r.status!==200||Number(d?.data?.Media?.id)!==1)throw Error('AniList read failed');
  });
  if(typeof traktToken==='string'&&traktToken.trim()){
    await check('Trakt authenticated read-only identity',async()=>{
      const r=await call('/api/trakt?path=%2Fusers%2Fsettings',{headers:{authorization:'Bearer '+traktToken}});
      const d=await r.json();
      if(r.status!==200||typeof d?.user?.username!=='string')throw Error('Trakt identity read failed');
    });
  }
  return {passed:results.filter(x=>x.ok).length,total:results.length,results};
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  try {
    const inventoryPath=process.argv[3]||new URL('../checks/candidate-integrity.json',import.meta.url);
    let expectedIntegrity;
    try{expectedIntegrity=JSON.parse(await readFile(inventoryPath,'utf8'))}
    catch{throw Error('Expected candidate inventory unavailable. Use checks/candidate-integrity.json from this source package.');}
    const report=await verifyLiveDeploy(process.argv[2],fetch,{traktToken:process.env.TRAKT_TEST_ACCESS_TOKEN,expectedIntegrity});
    for(const item of report.results)console.log(`${item.ok?'PASS':'FAIL'} ${item.name}`);
    console.log(`LIVE DEPLOY SMOKE: ${report.passed}/${report.total} checks`);
    if(report.passed!==report.total)process.exitCode=1;
  } catch(e){console.error('Deployment smoke could not run:',e.message);process.exitCode=2;}
}
