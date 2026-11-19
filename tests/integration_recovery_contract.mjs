import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import traktHandler from '../netlify/functions/trakt.mjs';
import aniHandler from '../netlify/functions/anilist.mjs';
import tmdbHandler from '../netlify/functions/tmdb.mjs';
const source=readFileSync(new URL('../app.js',import.meta.url),'utf8');
const snippet=source.slice(source.indexOf('const transientReadStatuses='),source.indexOf('let animeLibraryToken'));
const state={trakt:'test-access',anilist:'anilist-access'};
const storage=new Map();
const calls=[];
const ctx={state,TRAKT_ID:'public-id',location:{hostname:'example.net'},navigator:{onLine:true},
 sessionStorage:{getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,String(v)),removeItem:k=>storage.delete(k)},
 clearTrackingCache:()=>{},fetch:async()=>{throw Error('mock missing')},URLSearchParams,Response,Date,Error,JSON,String,Number,Set,
 setTimeout:fn=>fn()};
vm.createContext(ctx);
vm.runInContext('let traktAccountRevision=0,anilistAccountRevision=0;\n'+snippet+'\nglobalThis.library={tmdb,ani,trakt};',ctx);
const api=ctx.library;
const json=(body,status=200,headers={})=>new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json',...headers}});
let completed=0;
const done=()=>completed++;
ctx.fetch=async(url)=>{calls.push(url);return calls.length===1?json({error:'temporary'},503):json({results:[{id:7}]})};
assert.equal((await api.tmdb('/discover/movie')).results[0].id,7);assert.equal(calls.length,2);done();
calls.length=0;
ctx.fetch=async(url)=>{calls.push(url);return json({error:'throttled'},429,{'retry-after':'30'})};
await assert.rejects(()=>api.tmdb('/discover/movie'),/30 seconds/);assert.equal(calls.length,1);done();
calls.length=0;
ctx.fetch=async(url)=>{calls.push(url);return json({error:'throttled'},429)};
await assert.rejects(()=>api.tmdb('/discover/movie'),/try again later/i);assert.equal(calls.length,1);done();
calls.length=0;
ctx.fetch=async(url)=>{calls.push(url);return calls.length===1?json({error:'temporary'},503):json({data:{Viewer:{id:8}}})};
assert.equal((await api.ani('query{Viewer{id}}')).Viewer.id,8);assert.equal(calls.length,2);done();
calls.length=0;
ctx.fetch=async(url)=>{calls.push(url);return json({error:'temporary'},503)};
await assert.rejects(()=>api.ani('mutation{SaveMediaListEntry(mediaId:1){id}}'),/temporary/);assert.equal(calls.length,1);done();
calls.length=0;
ctx.fetch=async(url)=>{calls.push(url);throw Error('connection reset')};
await assert.rejects(()=>api.ani('mutation{SaveMediaListEntry(mediaId:1){id}}'),/outcome is unknown/);assert.equal(calls.length,1);done();
calls.length=0;
ctx.fetch=async(url)=>{calls.push(url);return calls.length===1?json({error:'temporary'},503):json({user:{username:'test'}})};
assert.equal((await api.trakt('/users/settings')).user.username,'test');assert.equal(calls.length,2);done();
calls.length=0;
ctx.fetch=async(url)=>{calls.push(url);return json({error:'temporary'},503)};
await assert.rejects(()=>api.trakt('/sync/watchlist',{method:'POST',body:'{}'}),/503/);assert.equal(calls.length,1);done();
calls.length=0;
ctx.fetch=async(url)=>{calls.push(url);throw Error('connection reset')};
await assert.rejects(()=>api.trakt('/sync/watchlist',{method:'POST',body:'{}'}),/outcome unknown/);assert.equal(calls.length,1);assert.equal(calls[0].startsWith('https://api.trakt.tv'),true);done();
calls.length=0;
ctx.fetch=async(url)=>{calls.push(url);if(url.startsWith('https://'))throw Error('CORS');return json({user:{username:'fallback'}})};
assert.equal((await api.trakt('/users/settings')).user.username,'fallback');assert.equal(calls.length,2);assert.equal(calls[1].startsWith('/api/trakt?'),true);done();
calls.length=0;
ctx.fetch=async(url)=>{calls.push(url);return calls.length===1?json({error:'rate'},429,{'retry-after':'0'}):json({user:{username:'ok'}})};
await assert.rejects(()=>api.trakt('/users/settings'),/rate limit/);assert.equal(calls.length,1);done();
calls.length=0;
ctx.fetch=async(url)=>{calls.push(url);return json({error:'rate'},429,{'retry-after':'28'})};
await assert.rejects(()=>api.trakt('/users/settings'),/28 seconds/);assert.equal(calls.length,1);done();
calls.length=0;
ctx.fetch=async(url)=>{calls.push(url);return json({error:'unauthorized'},401)};
await assert.rejects(()=>api.ani('query{Viewer{id}}'),/Reconnect AniList/);assert.equal(calls.length,1);done();
// Proxies must preserve trustworthy retry hints and HTTP 429 even when an
// upstream gateway sends HTML rather than JSON.
const originalFetch=globalThis.fetch,originalNetlify=globalThis.Netlify;
try{
 globalThis.Netlify={env:{get:name=>name==='MOKUMOKUREN_ORIGIN'?undefined:'test-credential'}};
 globalThis.fetch=async()=>json({error:'slow down'},429,{'retry-after':'21'});
 let response=await traktHandler(new Request('https://example.net/.netlify/functions/trakt?path=%2Fusers%2Fsettings', {headers:{authorization:'Bearer test-access'}}));
 assert.equal(response.status,429);assert.equal(response.headers.get('retry-after'),'21');done();
 globalThis.fetch=async()=>json({error:'slow down'},429,{'retry-after':'99999'});
 response=await traktHandler(new Request('https://example.net/.netlify/functions/trakt?path=%2Fusers%2Fsettings', {headers:{authorization:'Bearer test-access'}}));
 assert.equal(response.headers.get('retry-after'),null);done();
 globalThis.fetch=async()=>new Response('<html>slow down</html>',{status:429,headers:{'content-type':'text/html','retry-after':'17'}});
 response=await aniHandler(new Request('https://example.net/.netlify/functions/anilist',{method:'POST',body:'{"query":"query{Viewer{id}}"}'}));
 assert.equal(response.status,429);assert.equal(response.headers.get('retry-after'),'17');done();
 response=await tmdbHandler(new Request('https://example.net/.netlify/functions/tmdb?path=%2Fmovie%2F7'));
 assert.equal(response.status,429);assert.equal(response.headers.get('retry-after'),'17');done();
} finally{globalThis.fetch=originalFetch;globalThis.Netlify=originalNetlify;}
console.log(`Integration recovery contract: ${completed}/${completed} scenarios passed`);
