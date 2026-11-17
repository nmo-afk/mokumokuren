import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const source=readFileSync(new URL('../app.js',import.meta.url),'utf8');
const helpers=source.slice(source.indexOf('const transientReadStatuses='),source.indexOf('const tmdbReadCache=new Map();'));
const responseReader=helpers+'\n'+source.slice(source.indexOf('async function readTraktResponse('),source.indexOf('let animeLibraryToken'));
const store=new Map();
let cacheClears=0;
const state={trakt:'old-access'};
const calls=[];
const ctx={
 state,TRAKT_ID:'public-test-id',location:{hostname:'mokumokuren.netlify.app'},
 sessionStorage:{getItem:k=>store.get(k)??null,setItem:(k,v)=>store.set(k,String(v)),removeItem:k=>store.delete(k)},
 clearTrackingCache:()=>{cacheClears++},
 fetch:async()=>{throw Error('Fetch is not configured')},
 URL,Date,Error,JSON,Number,String,setTimeout,
};
vm.createContext(ctx);
vm.runInContext('let traktAccountRevision=0,anilistAccountRevision=0;'+responseReader+'\n globalThis.api={saveTraktCredentials,refreshTraktToken,trakt};globalThis.revision=()=>traktAccountRevision;',ctx);
const api=ctx.api;
const json=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json'}});
const reset=()=>{store.clear();cacheClears=0;calls.length=0;state.trakt='old-access';vm.runInContext('traktAccountRevision=0',ctx)};

reset();
api.saveTraktCredentials({access_token:'first',refresh_token:'first-refresh',expires_in:100});
assert.equal(store.get('trakt_token'),'first');
assert.equal(store.get('trakt_refresh_token'),'first-refresh');
assert.equal(Number(store.get('trakt_expires_at'))>Date.now(),true);
assert.equal(cacheClears,1);
assert.equal(ctx.revision(),1,'explicit login advances account revision');
let done=1;

reset();
api.saveTraktCredentials({access_token:'old-access',refresh_token:'single-use-old',expires_in:10});
ctx.fetch=async(url,opts)=>{
 calls.push({url,authorization:opts.headers?.authorization,body:opts.body?JSON.parse(opts.body):null});
 if(url==='/api/trakt-token')return json({access_token:'fresh',refresh_token:'single-use-new',expires_in:604800});
 return json({user:{username:'ok'}});
};
await Promise.all([api.trakt('/users/settings'),api.trakt('/sync/watchlist/movies')]);
assert.equal(calls.filter(x=>x.url==='/api/trakt-token').length,1,'must not replay refresh token');
assert.deepEqual(calls.filter(x=>x.url==='/api/trakt-token')[0].body,{grant_type:'refresh_token',refresh_token:'single-use-old'});
assert.equal(store.get('trakt_refresh_token'),'single-use-new');
assert.equal(calls.filter(x=>x.url.startsWith('https://api.trakt.tv')).every(x=>x.authorization==='Bearer fresh'),true);
assert.equal(cacheClears,2);
assert.equal(ctx.revision(),1,'automatic refresh must not change account revision');
done++;

reset();
api.saveTraktCredentials({access_token:'old-access',refresh_token:'rotate-me',expires_in:604800});
let requests=0;
ctx.fetch=async(url,opts)=>{
 if(url==='/api/trakt-token')return json({access_token:'new-access',refresh_token:'new-refresh',expires_in:604800});
 requests++;
 return requests===1?json({error:'unauthorized'},401):json({ok:true});
};
assert.equal((await api.trakt('/users/settings')).ok,true);
assert.equal(requests,2);
assert.equal(store.get('trakt_refresh_token'),'new-refresh');
done++;

reset();
api.saveTraktCredentials({access_token:'legacy-no-refresh'});
ctx.fetch=async()=>json({error:'unauthorized'},401);
await assert.rejects(()=>api.trakt('/users/settings'),/Reconnect Trakt/);
done++;

reset();
api.saveTraktCredentials({access_token:'old-access',refresh_token:'single-use-old',expires_in:1});
ctx.fetch=async(url)=>url==='/api/trakt-token'?json({error:'invalid_grant'},400):json({ok:true});
await assert.rejects(()=>api.trakt('/users/settings'),/Trakt renewal failed/);
assert.equal(store.get('trakt_refresh_token'),'single-use-old');
assert.equal(state.trakt,'old-access');
done++;

reset();
api.saveTraktCredentials({access_token:'old-access',refresh_token:'single-use-old',expires_in:1});
let resolve;
ctx.fetch=async()=>new Promise(r=>{resolve=r});
const renewing=api.refreshTraktToken();
await Promise.resolve();
state.trakt='';store.clear();
resolve(json({access_token:'unexpected',refresh_token:'unexpected-refresh',expires_in:100}));
await assert.rejects(()=>renewing,/account changed/);
assert.equal(state.trakt,'');
assert.equal(store.has('trakt_refresh_token'),false);
done++;

console.log('Trakt refresh browser contract: '+done+'/'+done+' scenarios passed');
