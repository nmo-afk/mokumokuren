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
console.log(`Trakt pagination proxy: ${done}/${done} allowed/blocked cases passed`);
