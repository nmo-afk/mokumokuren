/** Browser PKCE fallback must never replay a code after an OAuth response.
 * Only a distinct edge challenge or a browser fetch rejection can switch routes.
 * This fixture makes zero network calls or account mutations.
 */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const source=readFileSync(new URL('../app.js',import.meta.url),'utf8');
const snippet=source.slice(source.indexOf('function isTraktGatewayBlocked('),source.indexOf('// Make PWA updates explicit'));
assert(snippet.startsWith('function isTraktGatewayBlocked('),'Missing OAuth gateway helper');
const direct='https://api.trakt.tv/oauth/token';
const server='https://mokumokuren.example/api/trakt-token';
const response=(value,status=200,type='application/json')=>new Response(
 typeof value==='string'?value:JSON.stringify(value),{status,headers:{'content-type':type}}
);
let passed=0;
async function scenario(name,first,second,serverCalls,shouldConnect){
 const calls=[],toasts=[],store=new Map([
  ['oauth_trakt_state','s1'],['oauth_trakt_verifier','a'.repeat(43)]]);
 const context={
  URL,URLSearchParams,Response,Error,console,TRAKT_ID:'public-test-id',
  location:{pathname:'/callback',search:'?code=code1&state=s1',origin:'https://mokumokuren.example'},
  history:{replaceState(){}},
  sessionStorage:{getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,v),removeItem:k=>store.delete(k)},
  state:{traktUser:null,aniUser:null},
  toast:message=>toasts.push(message),
  async verifyAccounts(){context.state.traktUser='private-user'},
  saveTraktCredentials:data=>{context.saved=data.access_token},
  clearAnimeLibraryCache:()=>{},
  fetch:async(url)=>{
   calls.push(url);
   if(url===direct){if(first instanceof Error)throw first;return first;}
   if(url===server)return second;
   throw Error('Unexpected URL '+url);
  },
 };
 vm.createContext(context);
 vm.runInContext(snippet+'\nglobalThis.testCallback=callback;',context);
 await context.testCallback();
 assert.equal(calls[0],direct,name+' first route');
 assert.equal(calls.filter(x=>x===server).length,serverCalls,name+' fallback count');
 assert.equal(context.saved==='valid-token',shouldConnect,name+' success');
 assert(!store.has('oauth_trakt_state')&&!store.has('oauth_trakt_verifier'),name+' state cleanup');
 if(!shouldConnect)assert(toasts.some(t=>t.includes('login failed')),name+' failure notice');
 passed++;
}
await scenario('gateway 403 Cloudflare HTML',response('<html>Attention Required! | Cloudflare</html>',403,'text/html'),response({access_token:'valid-token'}),1,true);
await scenario('gateway 503 blocked HTML',response('<h1>Sorry, you have been blocked</h1>',503,'text/html'),response({access_token:'valid-token'}),1,true);
await scenario('browser fetch failure',new Error('CORS'),response({access_token:'valid-token'}),1,true);
await scenario('successful direct exchange',response({access_token:'valid-token'}),null,0,true);
await scenario('invalid code is never retried',response({error:'invalid_grant'},400),null,0,false);
await scenario('JSON forbidden is never retried',response({error:'not_permitted'},403),null,0,false);
await scenario('rate limit is never retried',response('<html>Cloudflare throttle</html>',429,'text/html'),null,0,false);
await scenario('unrecognized HTTP error is never retried',response('<html>maintenance</html>',503,'text/html'),null,0,false);
await scenario('ambiguous successful HTML is never retried',response('<html>strange success</html>',200,'text/html'),null,0,false);
console.log(`PASS Trakt OAuth gateway fallback: ${passed}/${passed} scenarios`);
