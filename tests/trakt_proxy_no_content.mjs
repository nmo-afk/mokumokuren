import assert from 'node:assert/strict';
import handler from '../netlify/functions/trakt.mjs';
const originalFetch=globalThis.fetch;
globalThis.Netlify={env:{get:()=> 'test-client-id'}};
const calls=[];
globalThis.fetch=async (url,options)=>{calls.push({url,options});return new Response(null,{status:204})};
try {
 const response=await handler(new Request('https://mokumokuren.netlify.app/.netlify/functions/trakt?path=%2Fusers%2Fme%2Flists%2F123',{method:'DELETE',headers:{authorization:'Bearer test-token'}}));
 assert.equal(response.status,204);
 assert.equal(await response.text(),'');
 assert.equal(calls.length,1);
 assert.equal(calls[0].url,'https://api.trakt.tv/users/me/lists/123');
 assert.equal(calls[0].options.method,'DELETE');
 console.log('Trakt proxy 204 deletion integration test passed');
}finally{globalThis.fetch=originalFetch}
