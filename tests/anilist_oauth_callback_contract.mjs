/** AniList browser callback state isolation, token saving and cleanup (offline). */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const source=readFileSync(new URL('../app.js',import.meta.url),'utf8');
const snippet=source.slice(source.indexOf('function isTraktGatewayBlocked('),source.indexOf('// Make PWA updates explicit'));
assert(snippet.startsWith('function isTraktGatewayBlocked('));
let checks=0;
async function scenario({params='?code=ani-code&state=ani-state',response=null,expectedToken=null,expectedCalls=1,expectedFailure=false}={}){
 const store=new Map([['oauth_anilist_state','ani-state']]);const calls=[],messages=[];
 const state={trakt:'',anilist:'',aniUser:null,traktUser:null};
 const context={state,TRAKT_ID:'fake-client',URL,URLSearchParams,Response,Error,console,
  location:{pathname:'/callback',search:params,origin:'https://mokumokuren.example'},
  history:{replaceState(){}},
  sessionStorage:{getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,v),removeItem:k=>store.delete(k)},
  saveTraktCredentials:()=>{throw Error('Wrong provider')},
  clearAnimeLibraryCache:()=>{},
  async verifyAccounts(){state.aniUser='anime-account'},
  toast:message=>messages.push(String(message)),
  fetch:async(url,opts)=>{calls.push({url,opts});return response||new Response(JSON.stringify({access_token:'fake-ani-token'}),{status:200,headers:{'content-type':'application/json'}})}
 };
 vm.createContext(context);
 vm.runInContext('let anilistAccountRevision=0;'+snippet+'\nglobalThis.callbackForTest=callback;',context);
 await context.callbackForTest();
 assert.equal(calls.length,expectedCalls);
 assert.equal(state.anilist,expectedToken??'');
 assert.equal(store.has('oauth_anilist_state'),false,'AniList state must always be consumed');
 assert.equal(store.get('anilist_token')||null,expectedToken);
 assert.equal(store.has('last_auth_error'),expectedFailure);
 if(expectedCalls)assert.equal(calls[0].url,'https://mokumokuren.example/api/anilist-token');
 checks++;
}
await scenario({expectedToken:'fake-ani-token'});
await scenario({params:'?code=ani-code&state=wrong',expectedCalls:0,expectedFailure:true});
await scenario({params:'?error=access_denied&state=ani-state',expectedCalls:0,expectedFailure:true});
await scenario({response:new Response(JSON.stringify({error:'invalid_grant'}),{status:400,headers:{'content-type':'application/json'}}),expectedFailure:true});
await scenario({response:new Response('<html>challenge</html>',{status:502,headers:{'content-type':'text/html'}}),expectedFailure:true});
console.log(`PASS AniList OAuth callback: ${checks}/${checks} offline scenarios`);
