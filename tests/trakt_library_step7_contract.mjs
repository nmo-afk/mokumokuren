import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const js=readFileSync(new URL('../app.js',import.meta.url),'utf8');
const between=(a,b)=>js.slice(js.indexOf(a),js.indexOf(b,js.indexOf(a)));
const code=between('function normalizeTraktLibraryItem(', 'async function renderHomeDashboard()')+
  '\n'+between('function traktListPayload(', 'function showPersonalLists(')+
  '\n'+between('const watchlistSortOptions=', 'function wireWatchlistSort(');
const calls=[];let reply=async()=>[];
const context={
 state:{section:'TV Shows'},Date,Promise,Number,String,Set,Map,Array,Math,JSON,
 title:item=>item.title,
 trakt:(path,options)=>{calls.push(path);return reply(path,options)},traktAccountRevision:0,
};
vm.createContext(context);
vm.runInContext(code+'\nglobalThis.helpers={traktPagedRead, classifyTraktShowProgress,trackedTraktShows,uniqueTraktEntries,normalizeTraktLibraryItem,clearShowProgressCache,traktListPayload,traktListContains,sortedWatchlist};',context);
const h=context.helpers;
let done=0;
reply=async path=>{
 const page=Number(new URL(path,'https://test.example').searchParams.get('page'));
 return page===1?Array.from({length:100},(_,i)=>({movie:{title:'Film '+i,ids:{trakt:i+1}}})):page===2?[{movie:{title:'Last film',ids:{trakt:101}}}]:[];
};
assert.equal((await h.traktPagedRead('/sync/watched/movies')).length,101);
assert.deepEqual(calls.slice(-3),['/sync/watched/movies?page=1&limit=100','/sync/watched/movies?page=2&limit=100','/sync/watched/movies?page=3&limit=100']);done++;
reply=async(path,{onResponse})=>{
 const page=new URL(path,'https://test.example').searchParams.get('page');
 onResponse({headers:new Headers({'x-pagination-page':page,'x-pagination-page-count':'2','x-pagination-limit':'2'})});
 return page==='1'?[1,2]:[3];
};
assert.deepEqual(Array.from(await h.traktPagedRead('/sync/watchlist/shows')),[1,2,3]);
assert.deepEqual(calls.slice(-2),['/sync/watchlist/shows?page=1&limit=100','/sync/watchlist/shows?page=2&limit=100']);done++;
reply=async()=>[{id:1}];
await assert.rejects(()=>h.traktPagedRead('/sync/watchlist/shows'),/repeated a library page/);done++;
assert.equal((await h.traktPagedRead('/sync/watched/shows')).length,1);done++;
reply=async path=>[{id:new URL(path,'https://test.example').searchParams.get('page')}];
await assert.rejects(()=>h.traktPagedRead('/users/me/lists',{maxPages:2}),/pagination limit/);done++;
reply=async()=>({not:'an array'});
await assert.rejects(()=>h.traktPagedRead('/sync/watched/shows'),/invalid paginated/);done++;
assert.equal(h.classifyTraktShowProgress({completed:false,completed_episodes:3,aired:10,next_episode:{season:1,number:4}}).status,'In Progress');done++;
assert.equal(h.classifyTraktShowProgress({completed:true,completed_episodes:8,aired:8}).status,'Completed');done++;
assert.equal(h.classifyTraktShowProgress({completed:false,completed_episodes:0,aired:10}).status,'Unstarted');done++;
assert.equal(h.classifyTraktShowProgress({completed:false,seasons:[{episodes:[{completed:true},{completed:false}]}]}).watchedCount,1);done++;
assert.equal(h.classifyTraktShowProgress({completed:false,completed_episodes:7,aired:10}).progress,'70%');done++;
assert.equal(h.classifyTraktShowProgress({completed:0,aired:0}).status,'Unstarted');done++;
assert.deepEqual({...h.classifyTraktShowProgress({completed:8,aired:8,next_episode:null})},
 {status:'Completed',watchedCount:8,nextEpisode:null,progress:'100%'});done++;
assert.equal(h.classifyTraktShowProgress({completed:3,aired:8,next_episode:null}).status,'In Progress');done++;
assert.equal(h.normalizeTraktLibraryItem({show:{title:'B',ids:{trakt:44}},progress:'70%',_nextEpisode:{season:2,number:3}},'tv').progress,'70%');done++;
assert.equal(h.uniqueTraktEntries([{show:{ids:{trakt:1}}},{show:{ids:{trakt:1}}},{show:{ids:{trakt:2}}}],'tv').length,2);done++;
calls.length=0;
reply=async(path,{onResponse})=>{
 const page=Number(new URL(path,'https://test.example').searchParams.get('page'));
 onResponse({headers:new Headers({'x-pagination-page':String(page),'x-pagination-page-count':'4'})});
 return Array.from({length:page===4?15:100},(_,i)=>({
  show:{ids:{trakt:(page-1)*100+i+1}},
  progress:{completed:i%2?10:3,aired:10,next_episode:i%2?null:{season:1,number:4}},
 }));
};
const bulk=await h.trackedTraktShows();
assert.equal(bulk.records.length,315);
assert.equal(bulk.failed,0);
assert.equal(bulk.records[0].status,'In Progress');
assert.equal(bulk.records[1].status,'Completed');
assert.deepEqual(calls,Array.from({length:4},(_,i)=>'/sync/progress/watched?page='+(i+1)+'&limit=100'));done++;
calls.length=0;
reply=async()=>{throw Object.assign(Error('rate limit'),{status:429})};
await assert.rejects(()=>h.trackedTraktShows(),/rate limit/);
assert.deepEqual(calls,['/sync/progress/watched?page=1&limit=100']);done++;
const unsupported=()=>Object.assign(Error('Unsupported endpoint'),{status:404});
reply=async path=>{
 if(path.startsWith('/sync/progress/watched'))throw unsupported();
 if(path.includes('/sync/watched/shows'))return [
  {show:{title:'First',ids:{trakt:11}}},
  {show:{title:'First again',ids:{trakt:11}}},
  {show:{title:'Second',ids:{trakt:22}}},
  {show:{title:'Broken',ids:{trakt:33}}},
 ];
 if(path.includes('/shows/11/'))return {completed:2,aired:8,next_episode:{season:1,number:3}};
 if(path.includes('/shows/22/'))return {completed:8,aired:8};
 throw Error('upstream temporarily blocked');
};
const list=await h.trackedTraktShows();
assert.equal(list.records.length,2);assert.equal(list.failed,1);
assert.equal(list.records[0].status,'In Progress');assert.equal(list.records[1].status,'Completed');done++;
h.clearShowProgressCache();
reply=async path=>{
 if(path.startsWith('/sync/progress/watched'))throw unsupported();
 if(path.startsWith('/sync/watched/shows'))return [{show:{title:'Broken',ids:{trakt:33}}}];
 throw Error('unavailable');
};
await assert.rejects(()=>h.trackedTraktShows(),/could not be verified/);done++;
h.clearShowProgressCache();
calls.length=0;
reply=async path=>{
 if(path.startsWith('/sync/progress/watched'))throw unsupported();
 if(path.startsWith('/sync/watched/shows'))return Array.from({length:40},(_,i)=>({show:{ids:{trakt:i+1}}}));
 if(path.includes('/shows/1/'))return {completed:2,aired:8};
 throw Object.assign(Error('Trakt blocked the connection'),{status:502,gatewayBlocked:true});
};
const partial=await h.trackedTraktShows();
assert.equal(partial.records.length,1);
assert.equal(partial.failed,39);
assert.ok(calls.filter(path=>path.startsWith('/shows/')).length<=5,'stop scheduling after gateway rejection');
done++;
context.state.section='Movies';
assert.equal(h.traktListPayload({trakt_id:321}).movies[0].ids.trakt,321);done++;
assert.equal(h.traktListPayload({ids:{trakt:321,tmdb:555}}).movies[0].ids.tmdb,555);done++;
assert.equal(h.traktListContains([{type:'movie',movie:{ids:{trakt:321}}}],{trakt_id:321}),true);done++;
assert.equal(h.traktListContains([{type:'movie',movie:{ids:{trakt:321}}}],{trakt_id:999}),false);done++;
context.state.section='Anime';assert.equal(h.traktListPayload({id:345}),null);done++;
const watchlist=[
 {movie:{title:'Zulu',runtime:105,rating:7,release_date:'2022-04-26'},listed_at:'2025-02-02T01:00:00Z',rank:1},
 {movie:{title:'Coda'}},
 {movie:{title:'Amber',runtime:121,rating:8.4,release_date:'2024-09-12'},listed_at:'2025-01-01T01:00:00Z',rank:2},
].map((entry,index)=>h.normalizeTraktLibraryItem(entry,'movie',index));
const watchlistNames=(order)=>Array.from(h.sortedWatchlist(watchlist,order,'Movies'),item=>item.title);
for(const [order,expected] of [
 ['default',['Zulu','Coda','Amber']],
 ['default:desc',['Amber','Coda','Zulu']],
 ['added',['Zulu','Amber','Coda']],
 ['added:asc',['Amber','Zulu','Coda']],
 ['runtime',['Amber','Zulu','Coda']],
 ['rating',['Amber','Zulu','Coda']],
 ['release',['Amber','Zulu','Coda']],
 ['title',['Amber','Coda','Zulu']],
 ['rank',['Zulu','Amber','Coda']],
 ['rank:desc',['Amber','Zulu','Coda']],
]){assert.deepEqual(watchlistNames(order),expected,order);done++;}
assert.deepEqual(watchlist.map(item=>item.title),['Zulu','Coda','Amber'],'sorting must not reorder the loaded Watchlist');done++;
const anime=[
 {title:'Spring show',startDate:{year:2025,month:4,day:1},duration:24,averageScore:91},
 {title:'Autumn film',startDate:{year:2025,month:10,day:1},duration:93,averageScore:83},
];
assert.deepEqual(Array.from(h.sortedWatchlist(anime,'release','Anime'),item=>item.title),['Autumn film','Spring show']);done++;
assert.deepEqual(Array.from(h.sortedWatchlist(anime,'rating','Anime'),item=>item.title),['Spring show','Autumn film']);done++;
assert.deepEqual(Array.from(h.sortedWatchlist(anime,'rank:desc','Anime'),item=>item.title),['Spring show','Autumn film']);done++;
console.log(`Trakt library Step 7: ${done}/${done} offline contract scenarios passed`);
