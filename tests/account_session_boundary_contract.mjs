/** Step 5: account isolation, independent verification, and AniList read coalescing.
 * No network calls; every HTTP response and token is synthetic.
 */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const src=readFileSync(new URL('../app.js',import.meta.url),'utf8');
const httpSource=src.slice(src.indexOf('const transientReadStatuses='),src.indexOf('let animeLibraryToken'));
assert(httpSource.startsWith('const transientReadStatuses='),'API code missing');
const delay=()=>{let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no});return {promise,resolve,reject};};
const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json'}});
const harness=()=>{
 const memory=new Map();const calls=[];
 const state={trakt:'trakt-A',anilist:'ani-A'};
 const ctx={state,TRAKT_ID:'public-test-id',location:{hostname:'example.test'},navigator:{onLine:true},
  sessionStorage:{getItem:key=>memory.get(key)??null,setItem:(k,v)=>memory.set(k,String(v)),removeItem:key=>memory.delete(key)},
  clearTrackingCache:()=>{},fetch:async()=>{throw Error('Unmocked fetch')},
  URLSearchParams,Response,AbortController,Date,setTimeout,clearTimeout,console};
 vm.createContext(ctx);
 vm.runInContext('let traktAccountRevision=0,anilistAccountRevision=0;'+httpSource+`\n globalThis.api={trakt,ani};
  globalThis.switchTrakt=(token)=>{state.trakt=token;traktAccountRevision++};
  globalThis.switchAni=(token)=>{state.anilist=token;anilistAccountRevision++};`,ctx);
 return {ctx,api:ctx.api,state,calls,memory};
};
let checks=0;
// Old Trakt requests must not deliver old data to a new login.
{
 const h=harness(),pending=delay();
 h.ctx.fetch=async(url,opts)=>{h.calls.push({url,auth:opts.headers.authorization});return pending.promise};
 const old=h.api.trakt('/users/settings');
 assert.equal(h.calls.length,1);
 h.ctx.switchTrakt('trakt-B');pending.resolve(json({user:{username:'private-A'}}));
 await assert.rejects(old,/Trakt account changed/);
 assert.deepEqual(h.calls.map(x=>x.auth),['Bearer trakt-A']);checks++;
}
// A browser CORS failure from the OLD session must not proxy-retry with NEW credentials.
{
 const h=harness(),pending=delay();
 h.ctx.fetch=async(url,opts)=>{h.calls.push({url,auth:opts.headers.authorization});return pending.promise};
 const old=h.api.trakt('/users/settings');h.ctx.switchTrakt('trakt-B');pending.reject(Error('CORS'));
 await assert.rejects(old,/Trakt account changed/);
 assert.equal(h.calls.length,1);checks++;
}
// Definitive 401 from the OLD login must not trigger a token refresh for the NEW login.
{
 const h=harness(),pending=delay();h.memory.set('trakt_refresh_token','new-refresh-token');
 h.ctx.fetch=async(url,opts)=>{h.calls.push(url);return pending.promise};
 const old=h.api.trakt('/users/settings');h.ctx.switchTrakt('trakt-B');pending.resolve(json({error:'unauthorized'},401));
 await assert.rejects(old,/Trakt account changed/);
 assert.deepEqual(h.calls,['https://api.trakt.tv/users/settings']);checks++;
}
// Even the response-body parsing boundary is protected.
{
 const h=harness(),pending=delay();
 h.ctx.fetch=async()=>({ok:true,status:200,text:()=>pending.promise});
 const old=h.api.trakt('/users/settings');
 // Let the request reach body parsing before the session switch.
 await Promise.resolve();await Promise.resolve();
 h.ctx.switchTrakt('trakt-B');pending.resolve(JSON.stringify({user:{username:'private-A'}}));
 await assert.rejects(old,/Trakt account changed/);checks++;
}
// A Trakt token ROTATION for the same account is not an account switch.
{
 const h=harness(),pending=delay();h.ctx.fetch=async()=>pending.promise;
 const current=h.api.trakt('/users/settings');h.state.trakt='rotated-access-same-account';
 pending.resolve(json({user:{username:'current'}}));
 assert.equal((await current).user.username,'current');checks++;
}
// AniList retries must not silently cross to the new account.
{
 const h=harness(),calls=[];
 h.ctx.fetch=async(url,opts)=>{calls.push(opts.headers.authorization);h.ctx.switchAni('ani-B');return json({error:'temporary'},503)};
 await assert.rejects(h.api.ani('query{Viewer{id}}'),/AniList account changed/);
 assert.deepEqual(calls,['Bearer ani-A']);checks++;
}
// AniList mutations must never be replayed or displayed as successful after a switch.
{
 const h=harness(),pending=delay(),calls=[];
 h.ctx.fetch=async(url,opts)=>{calls.push(opts.headers.authorization);return pending.promise};
 const old=h.api.ani('mutation{SaveMediaListEntry(mediaId:1){id}}');
 h.ctx.switchAni('ani-B');pending.resolve(json({data:{SaveMediaListEntry:{id:1}}}));
 await assert.rejects(old,/AniList account changed/);
 assert.deepEqual(calls,['Bearer ani-A']);checks++;
}
// Explicit AniList 403 and proxy edge 403 are distinct, not both "expired login".
{
 const h=harness();h.ctx.fetch=async()=>json({error:'permission_denied'},403);
 await assert.rejects(h.api.ani('query{Viewer{id}}'),/denied this request \(403\)/);
 h.ctx.fetch=async()=>json({error:'non-JSON upstream',upstream_status:403},502);
 await assert.rejects(h.api.ani('query{Viewer{id}}'),/blocked the server connection/);checks++;
}
// Trakt identity verification must not wait for AniList verification to finish.
{
 const start=src.indexOf('async function verifyAccounts(){');const end=src.indexOf('\nfunction traktListId(',start);
 const pending=delay(),state={anilist:'anime',trakt:'trakt',aniUser:null,traktUser:null,traktVerifyError:''};
 const ctx={state,ani:async()=>pending.promise,trakt:async()=>({user:{username:'trakt-user'}}),toast:()=>{},Promise};
 vm.createContext(ctx);vm.runInContext('let traktAccountRevision=0,anilistAccountRevision=0;'+src.slice(start,end)+'\nglobalThis.verify=verifyAccounts;',ctx);
 const verification=ctx.verify();
 for(let i=0;i<16 && !state.traktUser;i++)await Promise.resolve();
 assert.equal(state.traktUser,'trakt-user','Trakt should verify independently');
 pending.resolve({Viewer:{id:1,name:'anime-user'}});await verification;
 assert.equal(state.aniUser,'anime-user');checks++;
}
// Multiple components requesting AniList data simultaneously must share one read.
{
 const start=src.indexOf('let animeLibraryToken = state.anilist;');const end=src.indexOf('\nfunction rankRecommendations',start);
 const pending=delay(),state={anilist:'token-A',animeLibrary:[],animeLibraryLoaded:false,animeLibraryError:''};let calls=0;
 const ctx={state,ani:async query=>{calls++;return query.includes('Viewer')?{Viewer:{id:1}}:pending.promise},Promise};
 vm.createContext(ctx);
 vm.runInContext(src.slice(start,end)+'\nglobalThis.get=fetchAnimeLibrary;',ctx);
 const first=ctx.get(),second=ctx.get();
 for(let i=0;i<8;i++)await Promise.resolve();
 assert.equal(calls,2,'one Viewer and one list query, not duplicated');
 pending.resolve({MediaListCollection:{lists:[{entries:[{media:{id:12},status:'CURRENT',progress:3}]}]}});
 const [a,b]=await Promise.all([first,second]);
 assert.equal(a[0].media.id,12);assert.equal(b[0].media.id,12);
 assert.equal((await ctx.get())[0].media.id,12);assert.equal(calls,2,'cached read should not refetch');checks++;
}
console.log(`PASS Step 5 account/session boundary: ${checks}/${checks} scenarios`);
