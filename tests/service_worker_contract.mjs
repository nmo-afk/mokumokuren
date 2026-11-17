/* Deterministic offline PWA contract; no real account credentials or network. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
const root = path.resolve(import.meta.dirname, '..');
// Exercise the generated production worker, not just the source template.
const code = fs.readFileSync(path.join(root, 'dist/service-worker.js'),'utf8');
assert(!code.includes('__MOKUMOKUREN_SHELL_HASH__'),'Release worker must have an asset-derived cache version');
const events = {};
const cacheData = new Map();
let offline=false, networkCount=0, skipped=false, claimed=false;
const fakeResponse = url => ({ok:true,url,clone(){return this}});
const cacheObj = key => ({
 addAll:async urls=>{
   assert(!urls.some(u=>u.startsWith('/api/') || u.startsWith('/callback')));
   const bucket=cacheData.get(key);
   urls.forEach(u=>{assert(fs.existsSync(path.join(root,u.replace(/^\//,''))) || u === '/');bucket.set(u,fakeResponse('cached:'+u));});
 },
 match:async req=>cacheData.get(key).get(typeof req==='string'?req:new URL(req.url).pathname)
});
const caches = {
 open:async key=>{if(!cacheData.has(key))cacheData.set(key,new Map());return cacheObj(key)},
 keys:async()=>[...cacheData.keys()],
 delete:async key=>cacheData.delete(key),
 match:async req=>{for(const bucket of cacheData.values()){const r=bucket.get(typeof req==='string'?req:new URL(req.url).pathname);if(r)return r;}return undefined}
};
const self = {location:{origin:'https://mokumokuren.example'},addEventListener:(name,handler)=>{events[name]=handler},skipWaiting:async()=>{skipped=true},clients:{claim:async()=>{claimed=true}}};
const fetch=async request=>{networkCount++;if(offline)throw Error('offline');return fakeResponse(typeof request==='string'?request:request.url)};
vm.runInNewContext(code,{self,caches,fetch,URL,Set,Promise,Error,console});
async function lifecycle(name){let p;events[name]({waitUntil(value){p=value}});assert(p);await p;}
async function route(url,mode='cors',method='GET'){
 let reply;events.fetch({request:{url,mode,method},respondWith(value){reply=value}});
 return reply===undefined ? null:await reply;
}
await caches.open('mokumokuren-shell-old');
await caches.open('unrelated-application');
await lifecycle('install');
await lifecycle('activate');
assert(!skipped&&claimed,'updated worker should not force immediate activation');
assert(events.message,'service worker must support user-initiated update activation');
let activationTask;events.message({data:{type:'NOT_AN_UPDATE'},waitUntil(v){activationTask=v}});
assert(!skipped,'unrelated messages may not activate updates');
events.message({data:{type:'ACTIVATE_UPDATE'},waitUntil(v){activationTask=v}});
await activationTask;assert(skipped,'user-approved activation must call skipWaiting');
assert((await caches.keys()).some(k=>k.startsWith('mokumokuren-shell-')));
assert(!(await caches.keys()).includes('mokumokuren-shell-old'));
assert((await caches.keys()).includes('unrelated-application'));
let previous=networkCount;
let cached=await route('https://mokumokuren.example/style.css');
assert.equal(cached.url,'cached:/style.css');assert.equal(networkCount,previous);
offline=true;
let nav=await route('https://mokumokuren.example/discover','navigate');
assert.equal(nav.url,'cached:/index.html');
for(const path of ['/assets/trakt-icons.svg','/assets/ui-icons/mask.png']){
 const icon=await route(`https://mokumokuren.example${path}`);
 assert.equal(icon.url,`cached:${path}`);
}
for(const [url,mode,method] of [
 ['https://mokumokuren.example/api/trakt?path=/users/me/lists','cors','GET'],
 ['https://mokumokuren.example/.netlify/functions/anilist','cors','POST'],
 ['https://mokumokuren.example/callback?code=supersecret','navigate','GET'],
 ['https://mokumokuren.example/service-worker.js','cors','GET'],
 ['https://mokumokuren.example/local-login.html','navigate','GET'],
 ['https://api.trakt.tv/users/me/lists','cors','GET'],
 ['https://mokumokuren.example/api/trakt','cors','POST'],
 ['https://mokumokuren.example/unknown.json','cors','GET']
 ])assert.equal(await route(url,mode,method),null,`must bypass ${url}`);
// Never quietly return a cache for an API route while offline.
assert.equal(networkCount,previous,'A cached navigation needs no network, including offline');
console.log('PASS service-worker staged updates, precached shell, offline navigation & icon, network-only API/auth, cross-origin, POST and cache isolation');
