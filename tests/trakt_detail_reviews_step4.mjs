import assert from 'node:assert/strict';
import handler from '../netlify/functions/trakt.mjs';
let upstream='';
globalThis.Netlify={env:{get:key=>key==='TRAKT_CLIENT_ID'?'test-client':''}};
globalThis.fetch=async url=>{upstream=String(url);return Response.json([{id:1,comment:'Great film',user:{name:'Demo'}}])};
async function call(path,method='GET'){
 return handler(new Request('https://mock.example/api/trakt?path='+encodeURIComponent(path),{method,headers:{authorization:'Bearer test-token'}}));
}
let count=0;
for(const p of ['/movies/12/comments/popular?limit=8','/shows/456/comments/newest?limit=20']){
 const r=await call(p);assert.equal(r.status,200,p);assert.equal(upstream,'https://api.trakt.tv'+p);count++;
}
for(const p of ['/movies/12/comments/popular?limit=0','/movies/12/comments/popular?limit=21',
 '/movies/12/comments/popular?limit=2&limit=3','/movies/12/comments/popular?token=abc',
 '/movies/evil/comments/popular','/shows/12/comments/unknown','/movies/12/comments/popular?page=2']){
 const r=await call(p);assert.equal(r.status,400,p);count++;
}
assert.equal((await call('/movies/12/comments/popular','POST')).status,405);count++;
console.log(`Trakt read-only detail reviews gateway: ${count}/${count} checks passed`);
