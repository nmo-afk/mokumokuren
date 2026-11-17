/** Release gate: no stale personal-library/discovery response can commit across
 * a new navigation or account session. Pure offline VM; no API calls. */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const src=readFileSync(new URL('../app.js', import.meta.url),'utf8');
const start=src.indexOf('async function load(){');
const end=src.indexOf('async function verifyAccounts(){',start);
assert(start>=0&&end>start,'load() extraction markers unavailable');
const loadCode=src.slice(start,end);
function deferred(){let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no});return {promise,resolve,reject}}
function harness(overrides={}){
 const state={section:'Movies',tab:'Watchlist',trakt:'accountA',anilist:'',items:[],demo:false,feedback:{},query:'',sort:'popularity.desc',genre:'',year:'',...overrides};
 const renders=[],toasts=[],dashboards=[];
 const context={state,renderMain:()=>renders.push([...state.items]),toast:(s)=>toasts.push(String(s)),
  renderHomeDashboard:()=>dashboards.push(state.section),
  normalizeTraktLibraryItem:x=>({...x}),enrichTraktCollection:async x=>x,
  fetchAnimeLibrary:async()=>[],ani:async()=>({Page:{media:[]}}),
  tmdb:async()=>({results:[]}),trakt:async()=>[],traktPagedRead:(path)=>context.trakt(path),uniqueTraktEntries:x=>x,rankRecommendations:p=>p,
  sortAnimeItems:p=>p,animeSortOptions:{},sample:[{id:'sample'}],Promise,
  normaliseAnimeMedia:(media,entry)=>({...media,status:entry.status,progress:entry.progress}),
  queryAnimeBrowse:page=>context.ani('query', {page}),
  mergeAnimeBrowseMedia:(media,library,excludeOnList)=>media.map(x=>({...x,name:x.title?.english||x.title?.romaji}))};
 vm.createContext(context);
 vm.runInContext('let loadGeneration=0,traktAccountRevision=0,anilistAccountRevision=0;'+loadCode+';globalThis.runLoad=load;globalThis.changeTrakt=()=>traktAccountRevision++;globalThis.changeAni=()=>anilistAccountRevision++;',context);
 return {context,state,runLoad:context.runLoad,renders,toasts,dashboards};
}
let checks=0;
function ok(condition,message){assert(condition,message);checks++}

// A normal, current Trakt library request commits the expected entry.
{
 const h=harness();h.context.trakt=async()=>[{id:'current'}];
 await h.runLoad();
 ok(h.state.items.map(x=>x.id).join()==='current','current Trakt library load lost');
 ok(h.state.loading===false,'current load remains loading');
}

// When an older account read finishes AFTER a newer account read, it must not
// replace the new user's list, even transiently via a render.
{
 const h=harness(), old=deferred(),current=deferred();
 h.context.trakt=()=>h.state.trakt==='accountA'?old.promise:current.promise;
 const prior=h.runLoad();h.state.trakt='accountB';h.context.changeTrakt();const next=h.runLoad();
 current.resolve([{id:'accountB-title'}]);await next;
 old.resolve([{id:'accountA-private-title'}]);await prior;
 ok(h.state.items.map(x=>x.id).join()==='accountB-title','stale Trakt account overwrote new list');
 ok(!h.renders.some(r=>r.some(x=>x.id==='accountA-private-title')),'stale account data rendered');
}

// The intermediate enrichment step must not leak un-enriched previous account data.
{
 const h=harness(),enrichA=deferred();
 h.context.trakt=async()=>h.state.trakt==='accountA'?[{id:'old'}]:[{id:'new'}];
 h.context.enrichTraktCollection=(items)=>items[0]?.id==='old'?enrichA.promise:Promise.resolve(items);
 const prior=h.runLoad();
 await Promise.resolve();await Promise.resolve();
 ok(!h.state.items.some(x=>x.id==='old'),'old Trakt data committed before enrichment');
 h.state.trakt='accountB';h.context.changeTrakt();const next=h.runLoad();await next;
 enrichA.resolve([{id:'old-enriched'}]);await prior;
 ok(h.state.items.map(x=>x.id).join()==='new','old enrichment overwrote newer data');
}

// AniList library data must not survive an account change while fetching.
{
 const h=harness({section:'Anime',tab:'Watchlist',trakt:'',anilist:'animeA'}),old=deferred(),current=deferred();
 h.context.fetchAnimeLibrary=()=>h.state.anilist==='animeA'?old.promise:current.promise;
 const prior=h.runLoad();h.state.anilist='animeB';h.context.changeAni();const next=h.runLoad();
 current.resolve([{id:22,status:'PLANNING',progress:0,media:{id:22,title:{english:'B'},coverImage:{large:'b.png'}}}]);await next;
 old.resolve([{id:11,status:'PLANNING',progress:0,media:{id:11,title:{english:'A'},coverImage:{large:'a.png'}}}]);await prior;
 ok(h.state.items.map(x=>x.id).join()==='22','stale AniList data overwrote new account');
 ok(!h.renders.some(r=>r.some(x=>x.id===11)),'stale AniList account rendered');
}

// An old recommendation request must not update shared recommendationPool.
{
 const h=harness({section:'Anime',tab:'Recommended',trakt:'',anilist:'animeA'}),old=deferred(),current=deferred();
 h.context.ani=()=>h.state.anilist==='animeA'?old.promise:current.promise;
 const prior=h.runLoad();h.state.anilist='animeB';h.context.changeAni();const next=h.runLoad();
 const item=(id)=>({id,title:{english:'Title'},coverImage:{large:'poster.png'},description:''});
 current.resolve({Page:{media:[item(2)]}});await next;
 old.resolve({Page:{media:[item(1)]}});await prior;
 ok(h.state.recommendationPool.map(x=>x.id).join()==='2','stale recommendation pool committed');
 ok(h.state.items.map(x=>x.id).join()==='2','stale anime discovery committed');
}

// A navigation change with no second load must invalidate old TMDB results.
{
 const h=harness({section:'Movies',tab:'Discover'}),read=deferred();
 h.context.tmdb=()=>read.promise;
 const prior=h.runLoad();h.state.tab='Watchlist';
 read.resolve({results:[{id:7,title:'old screen'}]});await prior;
 ok(!h.state.items.some(x=>x.id===7),'old section data committed after navigation');
}


// Trakt rotates credentials during normal token refresh. This does not change
// the account and must not leave the screen in an infinite loading state.
{
 const h=harness(),read=deferred();
 h.context.trakt=()=>read.promise;
 const pending=h.runLoad();
 h.state.trakt='rotated-token-same-account'; // no account revision increment
 read.resolve([{id:'after-refresh'}]);await pending;
 ok(h.state.items.map(x=>x.id).join()==='after-refresh','Trakt refresh discarded current account data');
 ok(h.state.loading===false,'Trakt refresh left the screen loading');
}

// Old failures must not display errors during a newer successful session.
{
 const h=harness(),old=deferred(),current=deferred();
 h.context.trakt=()=>h.state.trakt==='accountA'?old.promise:current.promise;
 const prior=h.runLoad();h.state.trakt='accountB';h.context.changeTrakt();const next=h.runLoad();
 current.resolve([{id:'new'}]);await next;
 old.reject(Error('accountA request expired'));await prior;
 ok(h.state.loadError==='','outdated failure changed loadError');
 ok(h.toasts.length===0,'outdated failure displayed toast');
}

// Preview mode still renders sample cards if a valid current response is empty.
{
 const h=harness({tab:'Discover',demo:true});
 await h.runLoad();
 ok(h.state.items.map(x=>x.id).join()==='sample','preview fallback was lost');
}
// Account identity checks are also async: a late verification from a
// disconnected session must not restore the old account display name.
const verifyStart=src.indexOf('async function verifyAccounts(){');
const verifyCode=src.slice(verifyStart,src.indexOf('\nfunction traktListId(',verifyStart));
function verifyHarness(options={}){
 const state={trakt:options.trakt??'tokenA',anilist:options.anilist??'',traktUser:null,aniUser:null,traktVerifyError:''};
 const toasts=[];
 const context={state,toast:x=>toasts.push(String(x)),trakt:async()=>({user:{username:'current'}}),ani:async()=>({Viewer:{id:1,name:'Current'}})};
 vm.createContext(context);
 vm.runInContext('let traktAccountRevision=0,anilistAccountRevision=0;'+verifyCode+'\n;globalThis.verify=verifyAccounts;globalThis.changeTrakt=()=>traktAccountRevision++;globalThis.changeAni=()=>anilistAccountRevision++;',context);
 return {state,context,toasts,verify:context.verify};
}
{
 const h=verifyHarness(),response=deferred();
 h.context.trakt=()=>response.promise;
 const pending=h.verify();
 h.state.trakt='tokenB';h.context.changeTrakt();h.state.traktUser='New account';
 response.resolve({user:{username:'Old account'}});await pending;
 ok(h.state.traktUser==='New account','stale Trakt identity verification restored old account');
}
{
 const h=verifyHarness(),response=deferred();
 h.context.trakt=()=>response.promise;
 const pending=h.verify();
 h.state.trakt='rotated-token-same-account'; // session revision unchanged
 response.resolve({user:{username:'Current account'}});await pending;
 ok(h.state.traktUser==='Current account','token renewal invalidated current account verification');
}
{
 const h=verifyHarness({trakt:'',anilist:'animeA'}),response=deferred();
 h.context.ani=()=>response.promise;
 const pending=h.verify();
 h.state.anilist='animeB';h.context.changeAni();h.state.aniUser='Current anime account';
 response.reject(Error('old session failed'));await pending;
 ok(h.state.aniUser==='Current anime account','stale AniList error cleared current user');
 ok(!h.toasts.length,'stale AniList error displayed a toast');
}
console.log(`PASS stale-load isolation contract: ${checks}/${checks} assertions`);
