/* PWA version, first-install and in-flight-write regressions; no network. */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const source=readFileSync(new URL('../app.js',import.meta.url),'utf8');
const workerSource=readFileSync(new URL('../dist/service-worker.js',import.meta.url),'utf8');
const updateSource=source.slice(source.indexOf('function setupPwaUpdates('),source.indexOf('// Mobile and desktop offline support'));
const httpSource=source.slice(source.indexOf('const transientReadStatuses='),source.indexOf('let animeLibraryToken'));
const deferred=()=>{let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});return {promise,resolve,reject};};

function workerHarness(){
 const events={},buckets=new Map([['unrelated-cache',new Map([
  ['/index.html',{version:'foreign-html'}],['/style.css',{version:'foreign-style'}],
 ])]]);
 let requests=0;
 const path=request=>typeof request==='string'?request:new URL(request.url).pathname;
 const caches={
  open:async name=>{
   if(!buckets.has(name))buckets.set(name,new Map());
   return {addAll:async paths=>paths.forEach(p=>buckets.get(name).set(p,{version:'current:'+p}))};
  },
  match:async(request,options={})=>{
   const stores=options.cacheName?[buckets.get(options.cacheName)]:[...buckets.values()];
   for(const bucket of stores){const found=bucket?.get(path(request));if(found)return found;}
  },
  keys:async()=>[...buckets.keys()],delete:async name=>buckets.delete(name),
 };
 const ctx={URL,Set,Promise,Error,console,caches,
  self:{location:{origin:'https://mokumokuren.example'},clients:{claim:async()=>{}},
   skipWaiting:async()=>{},addEventListener:(name,fn)=>{events[name]=fn;}},
  fetch:async()=>{requests++;return {version:'new-deployment'};},
 };
 vm.runInNewContext(workerSource,ctx);
 const route=async(path,mode='cors',method='GET')=>{
  let response;
  events.fetch({request:{url:'https://mokumokuren.example'+path,mode,method},respondWith:value=>{response=value;}});
  return response===undefined?null:await response;
 };
 return {events,buckets,route,requests:()=>requests,
  install:async()=>{let task;events.install({waitUntil:value=>{task=value;}});await task;}};
}
function uiHarness({controlled=true,busy=false}={}){
 const elements=[],listeners={},writeListeners=new Set();
 let reloads=0,activeWrite=busy;
 const document={visibilityState:'visible',createElement:tag=>{
  const el={tag,hidden:false,disabled:false,textContent:'',children:[],handlers:{},
   setAttribute(){},append(...nodes){this.children.push(...nodes);},
   addEventListener(name,fn){this.handlers[name]=fn;}};
  elements.push(el);return el;
 },body:{append(){}},addEventListener(){}};
 const reg={waiting:null,installing:null,addEventListener:(name,fn)=>{listeners['reg:'+name]=fn;},update:async()=>{}};
 const sw={controller:controlled?{}:null,addEventListener:(name,fn)=>{listeners[name]=fn;}};
 const activity={isBusy:()=>activeWrite,subscribe:fn=>writeListeners.add(fn)};
 const ctx={document,navigator:{onLine:true},window:{addEventListener(){}},Date,console};
 vm.runInNewContext(updateSource,ctx);
 ctx.setupPwaUpdates(reg,sw,()=>{reloads++;},activity);
 const notice=elements[0],message=elements[1],button=elements[2];
 return {ctx,reg,sw,listeners,notice,message,button,reloads:()=>reloads,
  setBusy(value){activeWrite=value;for(const fn of writeListeners)fn();},
  ready(){reg.waiting={postMessage:()=>{}};reg.installing={state:'installed',addEventListener:(_name,fn)=>fn()};listeners['reg:updatefound']();},
  click(){button.handlers.click();},
 };
}
async function versionCase(){
 const h=workerHarness();await h.install();
 assert.equal((await h.route('/style.css')).version,'current:/style.css','Read only the active version cache, even when another cache was created first');
 assert.equal(h.requests(),0);
 const navigation=await h.route('/','navigate');
 assert.equal(navigation.version,'current:/index.html','HTML and static assets must share the same version until explicit update');
 assert.equal(h.requests(),0,'A controlled shell navigation does not fetch a mismatched newer HTML');
 for(const path of ['/api/trakt','/callback?code=sample','/local-login.html','/service-worker.js'])
  assert.equal(await h.route(path,'navigate'),null,'Auth and API requests stay outside the shell cache');
 const own=[...h.buckets.keys()].find(k=>k.startsWith('mokumokuren-shell-'));
 h.buckets.get(own).delete('/index.html');
 assert.equal((await h.route('/','navigate')).version,'new-deployment','An evicted shell can still recover online');
}
async function firstInstallCase(){
 const h=uiHarness({controlled:false});
 h.sw.controller={};h.listeners.controllerchange();
 assert.equal(h.notice.hidden,true,'First installation is not an update in another tab');
 assert.equal(h.reloads(),0);
 h.ready();assert.equal(h.notice.hidden,false,'A later staged update still offers explicit reload');
}
async function busyConsentCase(){
 const h=uiHarness({busy:true});h.ready();
 assert.equal(h.button.disabled,true,'A tracking save prevents accepting reload');
 h.click();assert.equal(h.reloads(),0);
 h.setBusy(false);assert.equal(h.button.disabled,false);
 let messages=0;h.reg.waiting.postMessage=()=>{messages++;};
 h.click();h.click();assert.equal(messages,1,'One accepted update sends one activation');
 h.setBusy(true);h.listeners.controllerchange();
 assert.equal(h.reloads(),0,'A save started during activation must settle before reload');
 h.setBusy(false);assert.equal(h.reloads(),1);
 h.listeners.controllerchange();assert.equal(h.reloads(),1);
}
async function otherTabCase(){
 const h=uiHarness();h.listeners.controllerchange();
 assert.equal(h.notice.hidden,false);assert.equal(h.reloads(),0);
 h.setBusy(true);assert.equal(h.button.disabled,true);
 h.setBusy(false);h.click();assert.equal(h.reloads(),1);
}
async function activationFailureCase(){
 const h=uiHarness();h.ready();
 h.reg.waiting.postMessage=()=>{throw Error('Worker was replaced');};
 assert.doesNotThrow(()=>h.click(),'Activation errors should restore a usable update action');
 assert.equal(h.button.disabled,false);assert.equal(h.reloads(),0);
 let messages=0;h.reg.waiting.postMessage=()=>{messages++;};
 h.click();assert.equal(messages,1);
}
async function providerWriteCase(){
 const body=deferred();
 const ctx={state:{trakt:'sample',anilist:'sample'},TRAKT_ID:'public',location:{hostname:'example.test'},
  navigator:{onLine:true},sessionStorage:{getItem:()=>null,setItem(){},removeItem(){}},
  clearTrackingCache(){},URLSearchParams,Response,AbortController,Date,console,setTimeout,clearTimeout,
  fetch:async()=>({ok:true,status:200,json:()=>body.promise}),
 };
 vm.createContext(ctx);
 vm.runInContext('let traktAccountRevision=0,anilistAccountRevision=0;'+httpSource+'\nglobalThis.api={ani,trakt};',ctx);
 assert.equal(vm.runInContext('typeof activeProviderWrites',ctx),'number','Provider writes expose activity to the update controller');
 const request=ctx.api.ani('mutation{SaveMediaListEntry(mediaId:501){id}}');
 await Promise.resolve();assert.equal(vm.runInContext('activeProviderWrites',ctx),1);
 body.resolve({data:{SaveMediaListEntry:{id:61}}});await request;
 assert.equal(vm.runInContext('activeProviderWrites',ctx),0,'Activity ends after the mutation response is consumed');
 const fail=deferred();ctx.fetch=async()=>fail.promise;
 const pending=ctx.api.trakt('/sync/history',{method:'POST',body:'{}'});
 assert.equal(vm.runInContext('activeProviderWrites',ctx),1);
 fail.reject(Error('Disconnected'));
 await assert.rejects(pending,/outcome unknown/);
 assert.equal(vm.runInContext('activeProviderWrites',ctx),0,'Unknown write outcome still releases the update wait');
 let reads=0;ctx.fetch=async()=>{reads++;return new Response('{"data":{"Viewer":{"id":7}}}',{status:200});};
 await ctx.api.ani('query{Viewer{id}}');
 assert.equal(vm.runInContext('activeProviderWrites',ctx),0,'Queries do not hold a mutation activity lock');
 assert.equal(reads,1);
}
let failures=0;
for(const check of [versionCase,firstInstallCase,busyConsentCase,otherTabCase,activationFailureCase,providerWriteCase]){
 try{await check();console.log('PASS '+check.name);}
 catch(error){failures++;console.error('FAIL '+check.name+': '+error.message);}
}
assert.equal(failures,0,'PWA lifecycle regression');
