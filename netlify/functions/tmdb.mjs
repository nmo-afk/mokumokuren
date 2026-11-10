export default async (request) => {
 const token=Netlify.env.get('TMDB_READ_TOKEN');
 if(!token)return Response.json({error:'TMDB_READ_TOKEN is not configured in Netlify'}, {status:503});
 const u=new URL(request.url),path=u.searchParams.get('path')||'';
 if(!/^\/(trending\/(movie|tv)\/week|discover\/(movie|tv)|search\/multi|movie\/\d+\/(recommendations|similar)|tv\/\d+\/(recommendations|similar))$/.test(path))return Response.json({error:'Unsupported TMDB path'}, {status:400});
 const params=new URLSearchParams();for(const [k,v] of u.searchParams)if(k!=='path'&&['query','page','with_genres','primary_release_year','first_air_date_year','sort_by','vote_average.gte','with_runtime.gte','with_runtime.lte','with_watch_providers','watch_region'].includes(k))params.set(k,v);
 params.set('language','en-US');
 try{const r=await fetch('https://api.themoviedb.org/3'+path+'?'+params,{headers:{Authorization:'Bearer '+token,accept:'application/json'}});return new Response(await r.text(),{status:r.status,headers:{'content-type':'application/json','cache-control':'public, max-age=300'}})}catch{return Response.json({error:'TMDB temporarily unavailable'},{status:502})}
};
