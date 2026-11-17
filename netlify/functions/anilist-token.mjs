import {approvedCallbackUri} from '../lib/oauth-origin.mjs';
import {secureApiResponse} from '../lib/response-security.mjs';
const apiHandler = async request => {
  if (request.method !== 'POST') return Response.json({error:'POST only'}, {status:405});
  let body;
  try { body = await request.json(); }
  catch { return Response.json({error:'Invalid JSON'}, {status:400}); }
  const callback=approvedCallbackUri(Netlify.env);
  if(!callback)return Response.json({error:'MOKUMOKUREN_ORIGIN must be an HTTPS origin without a path'}, {status:503,headers:{'cache-control':'no-store'}});
  if (!body || typeof body.code !== 'string' || !body.code.trim() || body.code.length > 2048 ||
      body.redirect_uri !== callback) {
    return Response.json({error:'Invalid authorization callback'}, {status:400});
  }
  const client = Netlify.env.get('ANILIST_CLIENT_ID');
  const secret = Netlify.env.get('ANILIST_CLIENT_SECRET');
  if (!client || !secret) return Response.json({error:'ANILIST_CLIENT_ID or ANILIST_CLIENT_SECRET not configured in Netlify'}, {status:503});
  try {
    const upstream = await fetch('https://anilist.co/api/v2/oauth/token', {
      method:'POST', headers:{'content-type':'application/json','accept':'application/json'},
      body:JSON.stringify({grant_type:'authorization_code',client_id:client,client_secret:secret,redirect_uri:body.redirect_uri,code:body.code}),signal:AbortSignal.timeout(12000)
    });
    const raw = await upstream.text();
    const type = upstream.headers.get('content-type') || '';
    let parsed;
    try { parsed = JSON.parse(raw); } catch { parsed = null; }
    if (!type.toLowerCase().includes('json') || !parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return Response.json({error:'AniList token endpoint returned an invalid response',upstream_status:upstream.status},
        {status:502,headers:{'cache-control':'no-store'}});
    }
    if (upstream.ok && (typeof parsed.access_token !== 'string' || !parsed.access_token)) {
      return Response.json({error:'AniList token response did not contain an access token'},
        {status:502,headers:{'cache-control':'no-store'}});
    }
    return Response.json(parsed, {status:upstream.status,headers:{'cache-control':'no-store'}});
  } catch {
    return Response.json({error:'AniList token service unavailable'}, {status:502,headers:{'cache-control':'no-store'}});
  }
};

export default async request => secureApiResponse(await apiHandler(request));
