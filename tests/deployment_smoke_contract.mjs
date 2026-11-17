import assert from 'node:assert/strict';
import {verifyLiveDeploy} from '../scripts/verify-live-deploy.mjs';
const origin='https://mokumokuren.netlify.app';
const headers={'content-security-policy':"default-src 'self'; script-src 'self'",'cache-control':'no-store'};
const mock=async(url,opts)=>{
 const u=new URL(url);assert.equal(u.origin,origin);
 if(u.pathname==='/')return new Response('<title>Mokumokuren</title>',{headers});
 if(u.pathname==='/manifest.webmanifest')return Response.json({name:'Mokumokuren'});
 if(u.pathname==='/service-worker.js')return new Response('const STATIC_SHELL = [];');
 if(u.pathname==='/api/release-health')return Response.json({configured:true},{headers});
 if(u.pathname==='/api/tmdb')return Response.json({id:550,poster_path:'/example.jpg'});
 if(u.pathname==='/api/anilist'){
  assert.equal(opts.method,'POST');
  assert.match(opts.body,/Media/);
  return Response.json({data:{Media:{id:1}}});
 }
 if(u.pathname==='/api/trakt'){
  assert.equal(opts.headers.authorization,'Bearer private-test-token');
  return Response.json({user:{username:'test-user'}});
 }
 throw Error('unexpected URL');
};
let report=await verifyLiveDeploy(origin,mock);
assert.equal(report.passed,5);assert.equal(report.total,5);
report=await verifyLiveDeploy(origin,mock,{traktToken:'private-test-token'});
assert.equal(report.passed,6);assert.equal(report.total,6);
await assert.rejects(()=>verifyLiveDeploy('http://insecure.example',mock),/HTTPS/);
await assert.rejects(()=>verifyLiveDeploy(origin+'/',mock),/canonical/);
report=await verifyLiveDeploy(origin,async (url,options)=>{
 if(url.endsWith('/api/release-health'))return Response.json({configured:false},{status:503,headers});
 return mock(url,options);
});
assert.equal(report.passed,4);
assert.equal(report.results.find(x=>x.name==='Netlify runtime configuration').ok,false);
console.log('Deployment smoke contract: 6/6 scenarios passed; no network requests made');
