import {secureApiResponse} from '../lib/response-security.mjs';
const apiHandler = async request => {
  if (request.method !== 'POST') return Response.json({error:'POST only'}, {status:405});
  const token = request.headers.get('authorization');
  let body;
  try {
    body = await request.text();
    if (!body || body.length > 12000) throw Error('Invalid query');
  } catch {
    return Response.json({error:'Invalid query'}, {status:400});
  }
  try {
    const upstream = await fetch('https://graphql.anilist.co', {
      method:'POST',
      headers:{'content-type':'application/json','accept':'application/json',...(token ? {authorization:token} : {})},
      body,signal:AbortSignal.timeout(12000)
    });
    const retryAfter = upstream.headers.get('retry-after');
    const headers = {'cache-control':'no-store'};
    if (retryAfter && /^\d{1,4}$/.test(retryAfter.trim()) && Number(retryAfter)<=3600) headers['retry-after']=retryAfter.trim();
    const raw = await upstream.text();
    const type = upstream.headers.get('content-type') || '';
    if (!type.toLowerCase().includes('json')) {
      return Response.json({error:'AniList upstream returned non-JSON',upstream_status:upstream.status},
        {status:upstream.status===429?429:502,headers});
    }
    try { JSON.parse(raw); } catch {
      return Response.json({error:'AniList upstream returned invalid JSON',upstream_status:upstream.status},
        {status:upstream.status===429?429:502,headers});
    }
    return new Response(raw,{status:upstream.status,headers:{...headers,'content-type':'application/json'}});
  } catch {
    return Response.json({error:'AniList upstream connection failed'},
      {status:502,headers:{'cache-control':'no-store'}});
  }
};

export default async request => secureApiResponse(await apiHandler(request));
