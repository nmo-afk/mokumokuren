import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {inspectReleaseConfiguration} from '../netlify/lib/release-readiness.mjs';
import {secureApiResponse} from '../netlify/lib/response-security.mjs';
import releaseHealth from '../netlify/functions/release-health.mjs';
import traktHandler from '../netlify/functions/trakt.mjs';
import tmdbHandler from '../netlify/functions/tmdb.mjs';

const app=readFileSync(new URL('../app.js',import.meta.url),'utf8');
let checks=0;
const ok=()=>checks++;
const env={
 MOKUMOKUREN_ORIGIN:'https://mokumokuren.netlify.app',
 TMDB_READ_TOKEN:'private-test-token',
 TRAKT_CLIENT_ID:'42rPcHWAppxsSkWTIuApWjcED9nBfgXO6ay9bNioynw',
 ANILIST_CLIENT_ID:'56513',
 ANILIST_CLIENT_SECRET:'private-test-secret',
};
assert.match(app,new RegExp(`TRAKT_ID='${env.TRAKT_CLIENT_ID}'`));ok();
assert.match(app,new RegExp(`ANILIST_ID='${env.ANILIST_CLIENT_ID}'`));ok();
const read=values=>({get:key=>values[key]});
assert.equal(inspectReleaseConfiguration(read(env),env.MOKUMOKUREN_ORIGIN).ready,true);ok();
for(const key of Object.keys(env)) {
 const copy={...env};delete copy[key];
 assert.equal(inspectReleaseConfiguration(read(copy),env.MOKUMOKUREN_ORIGIN).ready,false,`Missing ${key} should block release`);ok();
}
for(const value of ['http://mokumokuren.netlify.app','https://evil.example', 'https://mokumokuren.netlify.app/']) {
 assert.equal(inspectReleaseConfiguration(read(env),value).ready,false);ok();
}
const originalNetlify=globalThis.Netlify,originalFetch=globalThis.fetch;
try {
 globalThis.Netlify={env:read(env)};
 let response=await releaseHealth(new Request(env.MOKUMOKUREN_ORIGIN+'/api/release-health'));
 assert.equal(response.status,200);assert.equal((await response.json()).configured,true);ok();
 assert.equal(response.headers.get('cache-control'),'no-store');ok();
 assert.equal(response.headers.get('x-content-type-options'),'nosniff');ok();
 assert.equal(response.headers.get('x-frame-options'),'DENY');ok();
 assert.equal(response.headers.get('content-security-policy')?.includes("default-src 'none'"),true);ok();
 response=await releaseHealth(new Request('https://evil.example/api/release-health'));
 assert.equal(response.status,503);assert.equal((await response.json()).configured,false);ok();
 response=await releaseHealth(new Request(env.MOKUMOKUREN_ORIGIN+'/api/release-health',{method:'POST'}));
 assert.equal(response.status,405);ok();
 globalThis.fetch=async()=>new Response(null,{status:204});
 response=await traktHandler(new Request(env.MOKUMOKUREN_ORIGIN+'/api/trakt?path=%2Fusers%2Fme%2Flists%2Fdemo%2Fitems',{method:'DELETE',headers:{authorization:'Bearer fake'}}));
 assert.equal(response.status,204);assert.equal(response.headers.get('cache-control'),'no-store');ok();
 globalThis.fetch=async()=>new Response(JSON.stringify({id:7}),{status:200,headers:{'content-type':'application/json'}});
 response=await tmdbHandler(new Request(env.MOKUMOKUREN_ORIGIN+'/api/tmdb?path=%2Fmovie%2F7'));
 assert.equal(response.status,200);assert.equal(response.headers.get('cache-control'),'public, max-age=300');ok();
 assert.equal(response.headers.get('x-content-type-options'),'nosniff');ok();
} finally {globalThis.Netlify=originalNetlify;globalThis.fetch=originalFetch;}
const response=secureApiResponse(Response.json({hello:'world'}));
assert.equal(response.headers.get('cache-control'),'no-store');ok();
console.log(`Release configuration/security contract: ${checks}/${checks} assertions passed`);
