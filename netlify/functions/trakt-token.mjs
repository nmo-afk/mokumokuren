export default async request => {
  if(request.method !== 'POST') return Response.json({error:'POST only'},{status:405});
  let body;
  try { body=await request.json(); } catch { return Response.json({error:'Invalid JSON'},{status:400}); }
  if(typeof body.code!=='string'||typeof body.code_verifier!=='string'||body.redirect_uri!=='https://mokumokuren.netlify.app/callback') return Response.json({error:'Invalid Trakt OAuth request'},{status:400});
  const client=Netlify.env.get('TRAKT_CLIENT_ID');
  if(!client) return Response.json({error:'TRAKT_CLIENT_ID not configured in Netlify Functions'},{status:503});
  const secret=Netlify.env.get('TRAKT_CLIENT_SECRET');
  const payload={code:body.code,client_id:client,redirect_uri:body.redirect_uri,grant_type:'authorization_code',code_verifier:body.code_verifier};
  if(secret) payload.client_secret=secret;
  try {
    const r=await fetch('https://api.trakt.tv/oauth/token',{method:'POST',headers:{'content-type':'application/json','accept':'application/json'},body:JSON.stringify(payload)});
    return new Response(await r.text(),{status:r.status,headers:{'content-type':'application/json','cache-control':'no-store'}});
  }catch{return Response.json({error:'Trakt token service unavailable'},{status:502})}
};
