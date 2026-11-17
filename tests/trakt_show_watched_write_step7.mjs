import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const source=readFileSync(new URL('../app.js',import.meta.url),'utf8');
const code=source.slice(source.indexOf('async function changeStatus(x,status){'),source.indexOf('// mokumokuren_rc2_enrichment'));
let answer={added:{episodes:8}},requests=[],messages=[],loadCalls=0;
const context={state:{section:'TV Shows',trakt:'fixture'},trackingCache:{shows:null,movies:null},
 trakt:async(path,opts)=>{requests.push({path,body:opts?.body});return answer;},
 toast:msg=>messages.push(msg),clearShowProgressCache:()=>{},load:async()=>{loadCalls++},
 Number,Error,JSON};
vm.createContext(context);
vm.runInContext(code+'\nglobalThis.change=changeStatus;',context);
const item={trakt_id:123,title:'Example Show'};
assert.equal(await context.change(item,'watched'),true);
assert.equal(requests.at(-1).path,'/sync/history');
assert.equal(JSON.parse(requests.at(-1).body).shows[0].ids.trakt,123);
assert.equal(loadCalls,1);
answer={added:{shows:1,episodes:0}};
assert.equal(await context.change(item,'watched'),false,'A show count does not verify Trakt history added episodes');
answer={added:{episodes:10},not_found:{shows:[{ids:{trakt:123}}]}};
assert.equal(await context.change(item,'watched'),false,'Not-found result must fail');
context.state.section='Movies';answer={added:{movies:1}};
assert.equal(await context.change({tmdb_id:456},'watched'),true);
console.log('Trakt watched show/movie write: 4/4 confirmation scenarios passed');
