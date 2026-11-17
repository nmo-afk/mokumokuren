import assert from 'node:assert/strict';
import handler from '../netlify/functions/anilist-token.mjs';
const url='https://mokumokuren.netlify.app/callback';
globalThis.Netlify={env:{get:(name)=>({ANILIST_CLIENT_ID:'123',ANILIST_CLIENT_SECRET:'server-secret',MOKUMOKUREN_ORIGIN:'https://mokumokuren.netlify.app'}[name])}};
const request=(body)=>new Request('https://example.test/api/anilist-token',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)});
const original=globalThis.fetch;
try {
  assert.equal((await handler(new Request('https://example.test',{method:'GET'}))).status,405);
  assert.equal((await handler(request({code:'',redirect_uri:url}))).status,400);
  assert.equal((await handler(request({code:'abc',redirect_uri:'https://evil.test/callback'}))).status,400);
  for(const [type,payload,status] of [
    ['text/html','<html>blocked</html>',502],
    ['application/json','not-json',502],
    ['application/json','{}',502],
    ['application/json','{"access_token":"ok","token_type":"Bearer"}',200],
  ]) {
    globalThis.fetch=async()=>new Response(payload,{status:200,headers:{'content-type':type}});
    const result=await handler(request({code:'abc',redirect_uri:url}));
    assert.equal(result.status,status,`Unexpected result for ${payload}`);
    assert.equal(result.headers.get('cache-control'),'no-store');
  }
  globalThis.fetch=async()=>new Response('{"error":"invalid_grant"}',{status:400,headers:{'content-type':'application/json'}});
  assert.equal((await handler(request({code:'bad',redirect_uri:url}))).status,400);
  globalThis.fetch=async()=>{throw Error('offline')};
  assert.equal((await handler(request({code:'abc',redirect_uri:url}))).status,502);
  console.log('AniList OAuth token contract: 9 scenarios passed');
} finally {globalThis.fetch=original;}
