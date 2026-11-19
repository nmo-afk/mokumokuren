import assert from 'node:assert/strict';
import handler from '../netlify/functions/trakt.mjs';
let lastUrl='';
globalThis.Netlify={env:{get:key=>key==='TRAKT_CLIENT_ID'?'fixture-client':''}};
globalThis.fetch=async url=>{lastUrl=String(url);return new Response(JSON.stringify([{ids:{trakt:1}}]),{status:200,headers:{'content-type':'application/json'}})};
const call=async(path,method='GET')=>handler(new Request('https://mokumokuren.example/api/trakt?path='+encodeURIComponent(path),{method,headers:{authorization:'Bearer fixture-token'}}));
let done=0;
for(const path of [
 '/sync/watched/shows?page=2&limit=100',
 '/sync/watched/movies?page=13&limit=100',
 '/sync/progress/watched',
 '/sync/progress/watched?page=2&limit=100',
 '/sync/watchlist/shows?page=2&limit=50',
 '/users/me/lists?page=2&limit=100',
 '/users/me/lists/123/items?page=8&limit=100',
 '/shows/12/progress/watched',
 '/shows/12/seasons?extended=full',
 '/sync/history?limit=15',
]){
 const r=await call(path);assert.equal(r.status,200,path);assert.ok(lastUrl.endsWith(path),path);done++;
}
for(const path of [
 '/sync/watched/shows?page=0&limit=100',
 '/sync/watched/shows?page=-1&limit=100',
 '/sync/watched/shows?page=1&limit=999',
 '/sync/watched/shows?page=2&page=3',
 '/sync/watched/shows?token=secret',
 '/users/me/lists?evil=1',
 '/users/settings?page=1',
 '/shows/12/progress/watched?extended=bad',
 '/sync/watched/shows?extended=min',
 '/sync/progress/watched?page=0&limit=100',
 '/sync/progress/watched?page=1&limit=101',
 '/sync/progress/watched?page=1&page=2',
 '/sync/progress/watched?extended=full',
 '/sync/progress/watched?hide_completed=true',
 '/sync/history?limit=21',
 '/sync/history?limit=10&limit=15',
 '/sync/history?page=2',
 '/private/data?page=1',
]){
 const previous=lastUrl,r=await call(path);
 assert.equal(r.status,400,path);assert.equal(lastUrl,previous,path);done++;
}
assert.equal((await call('/users/me/lists?page=1&limit=100','DELETE')).status,405);done++;
const previous=lastUrl;
assert.equal((await call('/sync/history?limit=15','POST')).status,405);done++;
assert.equal(lastUrl,previous);
for(const method of ['POST','DELETE']){
 assert.equal((await call('/sync/progress/watched?page=1&limit=100',method)).status,405);
 assert.equal(lastUrl,previous);done++;
}

const pageHeaders={
 'x-pagination-page':'2','x-pagination-limit':'10','x-pagination-page-count':'3','x-pagination-item-count':'23',
};
globalThis.fetch=async (url,init)=>{
 assert.equal(new Headers(init.headers).get('user-agent'),'Mokumokuren/1.0.0-rc.1');
 return Response.json([],{headers:{...pageHeaders,'x-upstream-internal':'not-forwarded'}});
};
const page=await call('/sync/progress/watched?page=2&limit=100');
for(const [name,value] of Object.entries(pageHeaders))assert.equal(page.headers.get(name),value);
assert.equal(page.headers.get('x-upstream-internal'),null);done++;

globalThis.fetch=async()=>Response.json([],{
 headers:{'x-pagination-page':'2, 3','x-pagination-limit':'1e2','x-pagination-page-count':'9007199254740992','x-pagination-item-count':'0'},
});
const vetted=await call('/sync/watched/shows');
for(const name of ['x-pagination-page','x-pagination-limit','x-pagination-page-count'])assert.equal(vetted.headers.get(name),null);
assert.equal(vetted.headers.get('x-pagination-item-count'),'0');done++;

globalThis.fetch=async()=>Response.json({error:'denied'},{status:403,headers:pageHeaders});
const rejected=await call('/sync/watched/shows');
for(const name of Object.keys(pageHeaders))assert.equal(rejected.headers.get(name),null);
assert.equal(rejected.headers.get('x-mokumokuren-trakt-blocked'),null);done++;

const ray='9c58576879d02bd9-LHR';
for(const id of [ray,'untrusted debug data']){
 globalThis.fetch=async()=>new Response('<html>Sorry, you have been blocked</html>',{status:403,headers:{'cf-ray':id}});
 const blocked=await call('/sync/watched/shows');
 assert.equal(blocked.status,502);
 assert.equal(blocked.headers.get('x-mokumokuren-trakt-blocked'),'1');
 const body=await blocked.json();
 assert.equal(body.error,'Trakt upstream blocked by Cloudflare');
 assert.equal(body.upstream_status,403);
 assert.equal(body.cf_ray,id===ray?ray:undefined);done++;
}
globalThis.fetch=async()=>new Response('<html>Cloudflare gateway error</html>',{status:503,headers:{'cf-ray':ray}});
const transient=await call('/sync/watched/shows');
assert.equal(transient.headers.get('x-mokumokuren-trakt-blocked'),null);
const transientBody=await transient.json();
assert.equal(transientBody.error,'Trakt upstream Cloudflare error');
assert.equal(transientBody.cf_ray,undefined);done++;
console.log(`Trakt pagination proxy: ${done}/${done} allowed/blocked cases passed`);
