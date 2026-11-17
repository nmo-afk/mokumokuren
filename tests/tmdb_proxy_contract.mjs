import assert from 'node:assert/strict';
import handler from '../netlify/functions/tmdb.mjs';
const originalFetch=globalThis.fetch,originalNetlify=globalThis.Netlify;
globalThis.Netlify={env:{get:()=> 'fake-token'}};
const call=(path='/tv/123',method='GET')=>handler(new Request('https://example.net/.netlify/functions/tmdb?path='+encodeURIComponent(path),{method}));
let count=0;
const check=async(name,status,body,expected,contentType='application/json')=>{
 globalThis.fetch=async()=>new Response(typeof body==='string'?body:JSON.stringify(body),{status,headers:{'content-type':contentType}});
 const response=await call();assert.equal(response.status,expected,name);assert.equal(response.headers.get('content-type')?.includes('application/json'),true,name);await response.json();count++;
};
try{
 await check('valid metadata',200,{id:123,name:'Example'},200);
 await check('TMDB throttling',429,{status_message:'Rate limit exceeded'},429);
 await check('upstream unauthorized',401,{status_message:'Invalid API key'},401);
 await check('upstream server failure',500,{status_message:'Service unavailable'},500);
 await check('HTML gateway failure',502,'<html>Bad gateway</html>',502,'text/html');
 await check('malformed JSON',200,'{not-json',502);
 await check('JSON scalar',200,'null',502);
 await check('JSON array',200,[],502);
 globalThis.fetch=async()=>{throw new Error('offline')};assert.equal((await call()).status,502);count++;
 let forwarded='';globalThis.fetch=async url=>{forwarded=String(url);return new Response(JSON.stringify({results:{GB:{}}}),{status:200,headers:{'content-type':'application/json'}})};
 assert.equal((await call('/tv/123/watch/providers')).status,200);assert.ok(forwarded.includes('/tv/123/watch/providers'));count++;
 assert.equal((await call('/movie/123/watch/providers')).status,200);assert.ok(forwarded.includes('/movie/123/watch/providers'));count++;
 assert.equal((await call('/tv/123/watch/providers/unsafe')).status,400);count++;
 assert.equal((await call('/tv/abc')).status,400);count++;
 assert.equal((await call('/tv/123','POST')).status,405);count++;
 console.log(`TMDB proxy contract: ${count}/${count} passed`);
}finally{globalThis.fetch=originalFetch;globalThis.Netlify=originalNetlify}
