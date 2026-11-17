/** Offline Trakt GET edge-recovery contract; no real accounts or API calls. */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const source=readFileSync(new URL('../app.js',import.meta.url),'utf8');
const start=source.indexOf('const transientReadStatuses=');
const end=source.indexOf('let animeLibraryToken');
assert(start>=0&&end>start,'Trakt helper block not found');
const credentials=new Map();
const state={trakt:'testing-access'};
const calls=[];
const context={
 state,TRAKT_ID:'testing-public-id',Response,URLSearchParams,
 location:{hostname:'example.net'},navigator:{onLine:true},
 sessionStorage:{getItem:k=>credentials.get(k)??null,setItem:(k,v)=>credentials.set(k,String(v)),removeItem:k=>credentials.delete(k)},
 clearTrackingCache:()=>{},fetch:async()=>{throw Error('Unmocked network call')},
 setTimeout:fn=>fn(),clearTimeout:()=>{},console,
};
vm.createContext(context);
vm.runInContext('let traktAccountRevision=0,anilistAccountRevision=0;\n'+source.slice(start,end)+'\nglobalThis.testApi={trakt};',context);
const json=(body,status=200,headers={})=>new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json',...headers}});
const html=(body,status=403)=>new Response(body,{status,headers:{'content-type':'text/html'}});
const direct='https://api.trakt.tv/users/settings';
const proxy='/api/trakt?path=%2Fusers%2Fsettings';
let passed=0;
async function caseRun(label,handler,expectedResult,expectedCalls){
 calls.length=0;
 context.fetch=async (url,opts={})=>{calls.push({url,method:opts.method||'GET'});return handler(url,calls.length,opts)};
 const result=await context.testApi.trakt('/users/settings');
 assert.equal(result.user.username,expectedResult,label+' result');
 assert.deepEqual(calls.map(c=>c.url),expectedCalls,label+' exact request route');
 passed++;
}
async function failingCase(label,handler,expectedError,expectedCalls,options){
 calls.length=0;
 context.fetch=async (url,opts={})=>{calls.push({url,method:opts.method||'GET'});return handler(url,calls.length,opts)};
 await assert.rejects(()=>context.testApi.trakt('/users/settings',options),expectedError,label);
 assert.deepEqual(calls.map(c=>c.url),expectedCalls,label+' exact request route');
 passed++;
}
const ok=()=>json({user:{username:'recovered'}});
await caseRun('Cloudflare 403 HTML', (url)=>url===direct?html('<html>Attention Required! Cloudflare</html>',403):ok(),'recovered',[direct,proxy]);
await caseRun('Cloudflare 502 HTML', (url)=>url===direct?html('<h1>Sorry, you have been blocked</h1>',502):ok(),'recovered',[direct,proxy]);
await caseRun('Gateway 503 HTML', (url)=>url===direct?html('<div>captcha challenge</div>',503):ok(),'recovered',[direct,proxy]);
await caseRun('Browser CORS rejection', url=>url===direct?Promise.reject(Error('CORS')):ok(),'recovered',[direct,proxy]);
await caseRun('Successful direct request', url=>json({user:{username:'direct'}}),'direct',[direct]);
await failingCase('403 JSON permission denial',()=>json({error:'permission_denied'},403),/403/, [direct]);
await failingCase('401 JSON auth failure',()=>json({error:'invalid_token'},401),/Reconnect Trakt/, [direct]);
await failingCase('429 HTML throttled',()=>html('Cloudflare throttle',429),/Trakt rate limit/, [direct]);
await failingCase('Unrecognized 403 HTML',()=>html('maintenance message',403),/non-JSON/, [direct]);
await failingCase('Ambiguous 200 HTML',()=>html('Cloudflare unexpected',200),/blocked this API request/, [direct]);
await failingCase('Write rejected by Cloudflare',()=>html('Cloudflare challenge',403),/blocked this API request/, [direct],{method:'POST',body:'{}'});
await failingCase('Write network error is never replayed',()=>Promise.reject(Error('socket closed')),/outcome unknown/, [direct],{method:'POST',body:'{}'});
await caseRun('Proxy 503 retry stays on proxy', (url,count)=>{
 if(url===direct)return html('Cloudflare blocked',403);
 return count===2?json({error:'temporary outage'},503):ok();
},'recovered',[direct,proxy,proxy]);
await failingCase('Proxy 429 retry hint stops read',url=>url===direct?html('Cloudflare blocked',403):json({error:'throttled'},429,{'retry-after':'25'}),/25 seconds/,[direct,proxy]);
console.log(`PASS Trakt read gateway recovery: ${passed}/${passed} simulated scenarios`);
