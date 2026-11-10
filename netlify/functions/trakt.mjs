const allowed=/^\/(sync\/(watchlist\/(movies|shows)|watched\/(movies|shows)|playback|history|collection\/(movies|shows))|users\/settings|sync\/watchlist|sync\/history|sync\/history\/remove)$/;
export default async request=>{
 const u=new URL(request.url),path=u.searchParams.get('path')||'';
 if(!allowed.test(path))return Response.json({error:'Unsupported endpoint'},{status:400});
 const token=request.headers.get('authorization');const client=Netlify.env.get('TRAKT_CLIENT_ID');
 if(!token||!client)return Response.json({error:'Trakt login or client ID missing'},{status:401});
 const method=request.method==='POST'?'POST':'GET';
 try{
  const r=await fetch('https://api.trakt.tv'+path,{method,headers:{authorization:token,'trakt-api-key':client,'trakt-api-version':'2',accept:'application/json','content-type':'application/json'},body:method==='POST'?await request.text():undefined});
  const raw=await r.text();let d;
  try{d=JSON.parse(raw)}catch{
   return Response.json({error:/cloudflare|sorry, you have been blocked|attention required/i.test(raw)?'Trakt upstream blocked by Cloudflare':'Trakt upstream returned non-JSON',upstream_status:r.status},{status:502,headers:{'cache-control':'no-store'}});
  }
  return Response.json(d,{status:r.status,headers:{'cache-control':'no-store'}});
 }catch{return Response.json({error:'Trakt upstream connection failed'},{status:502,headers:{'cache-control':'no-store'}})}
};
