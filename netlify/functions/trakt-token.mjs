export default async request => {
  if(request.method !== 'POST') return Response.json({error:'POST only'},{status:405});
  let body;
  try{body=await request.json()}catch{return Response.json({error:'Invalid JSON'},{status:400})}
  if(typeof body.code!=='string'||typeof body.code_verifier!=='string'||
    !/^[A-Za-z0-9._~-]{43,128}$/.test(body.code_verifier)||
    body.redirect_uri!=='https://mokumokuren.netlify.app/callback')
    return Response.json({error:'Invalid Trakt PKCE request'},{status:400});
  const client=Netlify.env.get('TRAKT_CLIENT_ID');
  if(!client)return Response.json({error:'TRAKT_CLIENT_ID is not configured'},{status:503});
  try{
    const r=await fetch('https://api.trakt.tv/oauth/token',{
      method:'POST',headers:{'content-type':'application/json','accept':'application/json'},
      body:JSON.stringify({code:body.code,client_id:client,code_verifier:body.code_verifier,
        redirect_uri:body.redirect_uri,grant_type:'authorization_code'})
    });
    const raw=await r.text();
    const type=r.headers.get('content-type')||'';
    if(!type.includes('json'))return Response.json({error:'trakt_upstream_blocked',message:'Trakt returned a non-JSON response (possibly a Cloudflare block)',upstream_status:r.status},{status:502,headers:{'cache-control':'no-store'}});
    return new Response(raw,{status:r.status,headers:{'content-type':'application/json','cache-control':'no-store'}});
  }catch{return Response.json({error:'Trakt token service unavailable'},{status:502})}
};
