import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import tmdbHandler from '../netlify/functions/tmdb.mjs';
import traktHandler from '../netlify/functions/trakt.mjs';
import aniHandler from '../netlify/functions/anilist.mjs';
import traktTokenHandler from '../netlify/functions/trakt-token.mjs';
import aniTokenHandler from '../netlify/functions/anilist-token.mjs';
const code=readFileSync(new URL('../app.js',import.meta.url),'utf8');
const helper=code.slice(code.indexOf('const transientReadStatuses='),code.indexOf('function retryAfterSeconds('));
let abortObserved=false;
const ctx={AbortController,AbortSignal,setTimeout,clearTimeout,fetch:(_url,{signal}={})=>new Promise((_resolve,reject)=>{
 signal.addEventListener('abort',()=>{abortObserved=true;reject(Error('aborted'))},{once:true});
})};
vm.createContext(ctx);
vm.runInContext(helper+'\nglobalThis.run=fetchWithDeadline;',ctx);
await assert.rejects(()=>ctx.run('/mock-unresponsive',{},5),/aborted/);
assert.equal(abortObserved,true);
let checks=1;
const before=globalThis.fetch,oldNetlify=globalThis.Netlify;
try{
 globalThis.Netlify={env:{get:(name)=>({TMDB_READ_TOKEN:'token',TRAKT_CLIENT_ID:'public',ANILIST_CLIENT_ID:'ani',ANILIST_CLIENT_SECRET:'secret',MOKUMOKUREN_ORIGIN:'https://mokumokuren.netlify.app'}[name])}};
 const upstream=[];
 globalThis.fetch=async(url,options)=>{
  upstream.push({url,options});
  assert.equal(options.signal instanceof AbortSignal,true,url);
  return new Response(JSON.stringify({access_token:'access',refresh_token:'refresh',results:[],data:{}}),{status:200,headers:{'content-type':'application/json'}});
 };
 const requests=[
  [tmdbHandler,new Request('https://example.net/api/tmdb?path=%2Fdiscover%2Fmovie')],
  [traktHandler,new Request('https://example.net/api/trakt?path=%2Fusers%2Fsettings',{headers:{authorization:'Bearer token'}})],
  [aniHandler,new Request('https://example.net/api/anilist',{method:'POST',body:JSON.stringify({query:'query { Viewer { id } }'})})],
  [traktTokenHandler,new Request('https://example.net/api/trakt-token',{method:'POST',body:JSON.stringify({grant_type:'refresh_token',refresh_token:'old'})})],
  [aniTokenHandler,new Request('https://example.net/api/anilist-token',{method:'POST',body:JSON.stringify({code:'valid',redirect_uri:'https://mokumokuren.netlify.app/callback'})})]
 ];
 for(const [handler,request] of requests){
  const response=await handler(request);
  assert.equal(response.status,200,request.url);
  checks++;
 }
 assert.equal(upstream.length,requests.length);checks++;
}finally{globalThis.fetch=before;globalThis.Netlify=oldNetlify;}
console.log(`Release API deadline contract: ${checks}/${checks} scenarios passed`);
