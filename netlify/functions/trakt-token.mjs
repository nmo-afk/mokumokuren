import {approvedCallbackUri} from '../lib/oauth-origin.mjs';
import {secureApiResponse} from '../lib/response-security.mjs';
// Token exchanges stay server-side, and responses must never be cached.
// Trakt refresh tokens rotate on each successful exchange. PKCE does not use a client secret.
const apiHandler = async request => {
  const noStore={'cache-control':'no-store'};
  const error=(message,status)=>Response.json({error:message},{status,headers:noStore});
  if(request.method!=='POST')return error('POST only',405);
  let body;
  try{body=await request.json()}catch{return error('Invalid JSON',400)}
  if(!body||typeof body!=='object'||Array.isArray(body))return error('Invalid token request',400);
  const callback=approvedCallbackUri(Netlify.env);
  if(!callback)return error('MOKUMOKUREN_ORIGIN must be an HTTPS origin without a path',503);
  const isRefresh=body.grant_type==='refresh_token';
  if(isRefresh){
    if(typeof body.refresh_token!=='string'||!body.refresh_token.trim()||body.refresh_token.length>4096)
      return error('Invalid Trakt refresh request',400);
  }else if((body.grant_type&&body.grant_type!=='authorization_code')||
    typeof body.code!=='string'||!body.code.trim()||body.code.length>2048||
    typeof body.code_verifier!=='string'||!/^[A-Za-z0-9._~-]{43,128}$/.test(body.code_verifier)||
    body.redirect_uri!==callback){
    return error('Invalid Trakt PKCE request',400);
  }
  const client=Netlify.env.get('TRAKT_CLIENT_ID');
  if(!client)return error('TRAKT_CLIENT_ID is not configured',503);
  try{
    const payload=isRefresh
      ?{client_id:client,grant_type:'refresh_token',refresh_token:body.refresh_token}
      :{code:body.code,client_id:client,code_verifier:body.code_verifier,
        redirect_uri:body.redirect_uri,grant_type:'authorization_code'};
    const upstream=await fetch('https://api.trakt.tv/oauth/token',{
      method:'POST',headers:{'content-type':'application/json',accept:'application/json'},
      body:JSON.stringify(payload),signal:AbortSignal.timeout(12000)
    });
    const raw=await upstream.text();
    const type=upstream.headers.get('content-type')||'';
    let parsed;
    try{parsed=JSON.parse(raw)}catch{parsed=null}
    if(!type.toLowerCase().includes('json')||!parsed||typeof parsed!=='object'||Array.isArray(parsed))
      return Response.json({error:'Trakt token endpoint returned an invalid response',upstream_status:upstream.status},{status:502,headers:noStore});
    if(upstream.ok&&(!String(parsed.access_token||'').trim()||
        (isRefresh&&!String(parsed.refresh_token||'').trim())))
      return error('Trakt token response missing required credentials',502);
    return Response.json(parsed,{status:upstream.status,headers:noStore});
  }catch{return error('Trakt token service unavailable',502)}
};

export default async request => secureApiResponse(await apiHandler(request));
