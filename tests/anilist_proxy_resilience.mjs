import assert from 'node:assert/strict';
import handler from '../netlify/functions/anilist.mjs';
const req = (body='{"query":"{ Viewer { id } }"}') => new Request('https://example.com/api/anilist',{method:'POST',body});
const originalFetch=globalThis.fetch;
try {
  globalThis.fetch=async()=>new Response('{"data":{"Viewer":{"id":7}}}',{status:200,headers:{'content-type':'application/json'}});
  let response=await handler(req()); assert.equal(response.status,200); assert.equal((await response.json()).data.Viewer.id,7);
  globalThis.fetch=async()=>new Response('<html>Blocked</html>',{status:403,headers:{'content-type':'text/html'}});
  response=await handler(req()); assert.equal(response.status,502); assert.equal((await response.json()).upstream_status,403);
  globalThis.fetch=async()=>new Response('{bad',{status:200,headers:{'content-type':'application/json'}});
  response=await handler(req()); assert.equal(response.status,502); assert.match((await response.json()).error,/invalid JSON/);
  globalThis.fetch=async()=>{throw Error('network unavailable')};
  response=await handler(req()); assert.equal(response.status,502); assert.match((await response.json()).error,/connection failed/);
  response=await handler(req('')); assert.equal(response.status,400);
  response=await handler(req('x'.repeat(12001))); assert.equal(response.status,400);
  console.log('AniList proxy resilience: 6 scenarios passed');
} finally {globalThis.fetch=originalFetch}
