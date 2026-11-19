import assert from 'node:assert/strict';
import handler from '../netlify/functions/trakt-token.mjs';
const redirect_uri='https://mokumokuren.netlify.app/callback';
const payload={code:'valid-code',code_verifier:'a'.repeat(43),redirect_uri};
const oldFetch=globalThis.fetch;
const oldNetlify=globalThis.Netlify;
globalThis.Netlify={env:{get:(name)=>({TRAKT_CLIENT_ID:'test-client',MOKUMOKUREN_ORIGIN:'https://mokumokuren.netlify.app'}[name])}};
const call=(data=payload,method='POST')=>handler(new Request('https://mokumokuren.netlify.app/api/trakt-token',{method,headers:{'content-type':'application/json'},...(method==='POST'?{body:JSON.stringify(data)}:{})}));
const cases=[
  ['success',200,{access_token:'token',token_type:'bearer'} ,200],
  ['rejected code',400,{error:'invalid_grant'},400],
  ['missing token',200,{token_type:'bearer'},502],
  ['invalid JSON',200,'<html>failure</html>',502,'text/html'],
  ['JSON scalar',200,'null',502],
  ['JSON array',200,[],502],
];
try{
  for(const [name,status,body,expected,contentType] of cases){
    globalThis.fetch=async(url,options)=>{
      assert.equal(url,'https://auth.trakt.tv/oauth/token');
      assert.equal(options.method,'POST');
      assert.equal(new Headers(options.headers).get('user-agent'),'Mokumokuren/1.0.0-rc.1');
      assert.deepEqual(JSON.parse(options.body),{...payload,client_id:'test-client',grant_type:'authorization_code'});
      return new Response(typeof body==='string'?body:JSON.stringify(body),{status,headers:{'content-type':contentType||'application/json'}});
    };
    const result=await call();assert.equal(result.status,expected,name);
    assert.equal(result.headers.get('cache-control'),'no-store',name);
    await result.json();
  }
  globalThis.fetch=async()=>{throw new Error('network down')};
  assert.equal((await call()).status,502);
  assert.equal((await call({...payload,code_verifier:'short'})).status,400);
  assert.equal((await call({...payload,code:'  '})).status,400);
  assert.equal((await call(payload,'GET')).status,405);
  console.log('Trakt OAuth contract: 10/10 scenarios passed');
}finally{globalThis.fetch=oldFetch;globalThis.Netlify=oldNetlify}
