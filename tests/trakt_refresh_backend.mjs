import assert from 'node:assert/strict';
import handler from '../netlify/functions/trakt-token.mjs';
const previousFetch=globalThis.fetch,previousNetlify=globalThis.Netlify;
globalThis.Netlify={env:{get:(name)=>({TRAKT_CLIENT_ID:'public-client-id',MOKUMOKUREN_ORIGIN:'https://mokumokuren.netlify.app'}[name])}};
const url='https://mokumokuren.netlify.app/api/trakt-token';
const call=data=>handler(new Request(url,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(data)}));
let checks=0;
try {
 for(const invalid of [null,{},[],{grant_type:'refresh_token'}, {grant_type:'refresh_token',refresh_token:''}, {grant_type:'refresh_token',refresh_token:' '.repeat(8)}, {grant_type:'refresh_token',refresh_token:'z'.repeat(4097)}]){
  const r=await call(invalid);assert.equal(r.status,400);assert.equal(r.headers.get('cache-control'),'no-store');checks++;
 }
 let sent;
 globalThis.fetch=async (endpoint,opts)=>{
  assert.equal(endpoint,'https://auth.trakt.tv/oauth/token');
  sent=JSON.parse(opts.body);
  return new Response(JSON.stringify({access_token:'new-access',refresh_token:'new-refresh',expires_in:604800}),{status:200,headers:{'content-type':'application/json'}});
 };
 const ok=await call({grant_type:'refresh_token',refresh_token:'old-refresh'});
 assert.equal(ok.status,200);assert.equal(ok.headers.get('cache-control'),'no-store');
 assert.deepEqual(sent,{client_id:'public-client-id',grant_type:'refresh_token',refresh_token:'old-refresh'});
 assert.equal('client_secret' in sent,false);checks++;
 globalThis.fetch=async()=>new Response(JSON.stringify({access_token:'new-access'}),{status:200,headers:{'content-type':'application/json'}});
 assert.equal((await call({grant_type:'refresh_token',refresh_token:'old'})).status,502);checks++;
 globalThis.fetch=async()=>new Response(JSON.stringify({error:'invalid_grant'}),{status:400,headers:{'content-type':'application/json'}});
 const denied=await call({grant_type:'refresh_token',refresh_token:'old'});
 assert.equal(denied.status,400);assert.equal((await denied.json()).error,'invalid_grant');checks++;
 globalThis.fetch=async()=>{throw Error('offline')};
 assert.equal((await call({grant_type:'refresh_token',refresh_token:'old'})).status,502);checks++;
 console.log(`Trakt refresh server contract: ${checks}/${checks} cases passed`);
}finally{globalThis.fetch=previousFetch;globalThis.Netlify=previousNetlify;}
