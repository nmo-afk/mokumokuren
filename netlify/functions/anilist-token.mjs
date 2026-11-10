export default async request=>{
  if(request.method!=='POST')return Response.json({error:'POST only'},{status:405});
  let body;try{body=await request.json()}catch{return Response.json({error:'Invalid JSON'},{status:400})}
  if(typeof body.code!=='string'||body.code.length>2048||body.redirect_uri!=='https://mokumokuren.netlify.app/callback')return Response.json({error:'Invalid authorization callback'},{status:400});
  const client=Netlify.env.get('ANILIST_CLIENT_ID'),secret=Netlify.env.get('ANILIST_CLIENT_SECRET');
  if(!client||!secret)return Response.json({error:'ANILIST_CLIENT_ID or ANILIST_CLIENT_SECRET not configured in Netlify'},{status:503});
  try{
    const response=await fetch('https://anilist.co/api/v2/oauth/token',{method:'POST',headers:{'content-type':'application/json','accept':'application/json'},body:JSON.stringify({grant_type:'authorization_code',client_id:client,client_secret:secret,redirect_uri:body.redirect_uri,code:body.code})});
    return new Response(await response.text(),{status:response.status,headers:{'content-type':'application/json','cache-control':'no-store'}});
  }catch{return Response.json({error:'AniList token service unavailable'},{status:502})}
};
