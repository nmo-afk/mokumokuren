import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {verifyLiveDeploy} from '../scripts/verify-live-deploy.mjs';
const origin='https://mokumokuren.example';
const routes={
 '/': [200,'<html><title>Mokumokuren</title></html>',{'content-security-policy':"default-src 'self'; script-src 'self'"}],
 '/manifest.webmanifest':[200,JSON.stringify({name:'Mokumokuren'})],
 '/service-worker.js':[200,'const STATIC_SHELL = [];'],
 '/api/release-health':[200,JSON.stringify({configured:true}),{'cache-control':'no-store'}],
 '/api/tmdb?path=%2Fmovie%2F550':[200,JSON.stringify({id:550,poster_path:'/poster.jpg'})],
 '/api/anilist':[200,JSON.stringify({data:{Media:{id:1}}})],
 '/api/trakt?path=%2Fusers%2Fsettings':[200,JSON.stringify({user:{username:'test-user'}})],
};
const response=([status,body,headers={}])=>new Response(body,{status,headers});
const mock=(overrides={},seen=[])=>async(url,options)=>{
 const path=url.slice(origin.length);
 seen.push({path,method:options.method||'GET',redirect:options.redirect});
 return response(overrides[path]||routes[path]||[404,'not found']);
};
const good=await verifyLiveDeploy(origin,mock());
assert.equal(good.total,5);assert.equal(good.passed,5);
const withToken=await verifyLiveDeploy(origin,mock(),{traktToken:'test-token'});
assert.equal(withToken.total,6);assert.equal(withToken.passed,6);
for(const [path,bad] of [
 ['/api/release-health',[200,'<html>index fallback</html>',{'content-type':'text/html'}]],
 ['/api/tmdb?path=%2Fmovie%2F550',[200,'<html>index fallback</html>']],
 ['/api/anilist',[200,JSON.stringify({errors:[{message:'blocked'}]})]],
 ['/service-worker.js',[200,'not a worker']],
 ['/',[200,'Mokumokuren',{}]],
]){
 const result=await verifyLiveDeploy(origin,mock({[path]:bad}));
 assert.equal(result.passed,4,`Expected exactly one failure for ${path}`);
 assert.equal(result.total,5);
}
const seen=[];
await verifyLiveDeploy(origin,mock({},seen));
assert.ok(seen.every(x=>x.redirect==='manual'));
assert.ok(seen.some(x=>x.path==='/api/anilist'&&x.method==='POST'));
for(const bad of ['http://mokumokuren.example','https://mokumokuren.example/','https://mokumokuren.example/path']){
 await assert.rejects(()=>verifyLiveDeploy(bad,mock()));
}
const candidateAssets={
 'index.html':routes['/'][1],
 'app.js':'// current candidate app',
 'style.css':'body{background:#960012}',
 'trakt-rebuild.css':'.active{color:#FBD242}',
 'service-worker.js':routes['/service-worker.js'][1],
 'manifest.webmanifest':routes['/manifest.webmanifest'][1],
};
const expectedIntegrity={release:'v1.0.0-candidate',files:Object.entries(candidateAssets).map(([path,body])=>({
 path,size:Buffer.byteLength(body),sha256:createHash('sha256').update(body).digest('hex'),
}))};
const candidateRoutes=Object.fromEntries(Object.entries(candidateAssets).map(([path,body])=>['/'+path,[200,body]]));
candidateRoutes['/release-integrity.json']=[200,JSON.stringify(expectedIntegrity)];
const verified=await verifyLiveDeploy(origin,mock(candidateRoutes),{expectedIntegrity});
assert.equal(verified.results.find(check=>check.name==='candidate static asset identity')?.ok,true,'The verifier must identify this candidate, rather than accepting any Mokumokuren build');
for(const override of [
 {'/app.js':[200,'// older build with the same app name']},
 {'/release-integrity.json':[200,JSON.stringify({...expectedIntegrity,files:expectedIntegrity.files.slice(1)})]},
 {'/style.css':[302,'redirected asset',{location:'https://other.example/style.css'}]},
]){
 const mismatch=await verifyLiveDeploy(origin,mock({...candidateRoutes,...override}),{expectedIntegrity});
 assert.equal(mismatch.results.find(check=>check.name==='candidate static asset identity').ok,false);
}
const malformed={...expectedIntegrity,files:[...expectedIntegrity.files,{...expectedIntegrity.files[0],path:'../private'}]};
const privateSeen=[];
const unsafe=await verifyLiveDeploy(origin,mock(candidateRoutes,privateSeen),{expectedIntegrity:malformed});
assert.equal(unsafe.results.find(check=>check.name==='candidate static asset identity').ok,false);
assert(!privateSeen.some(request=>request.path.includes('private')),'Invalid inventory paths cannot become network requests');
console.log('PASS live-deploy verifier: success, auth, strict origins, expected candidate hashes and stale/tampered asset rejection');
