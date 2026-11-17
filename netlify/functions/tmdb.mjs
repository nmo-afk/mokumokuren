import {secureApiResponse} from '../lib/response-security.mjs';
const allowedPath=/^\/(trending\/(movie|tv)\/week|discover\/(movie|tv)|search\/multi|(movie|tv)\/\d+(\/(recommendations|similar|credits|videos|watch\/providers|season\/\d+))?)$/;
const allowedParams=new Set(['query','page','with_genres','primary_release_year','first_air_date_year','sort_by','vote_average.gte','with_runtime.gte','with_runtime.lte','with_watch_providers','watch_region','append_to_response']);
const error=(message,status)=>Response.json({error:message},{status,headers:{'cache-control':'no-store'}});
const apiHandler = async (request) => {
 if(request.method!=='GET')return error('Method not allowed',405);
 const token=Netlify.env.get('TMDB_READ_TOKEN');
 if(!token)return error('TMDB_READ_TOKEN is not configured in Netlify',503);
 const u=new URL(request.url),path=u.searchParams.get('path')||'';
 if(!allowedPath.test(path))return error('Unsupported TMDB path',400);
 const params=new URLSearchParams();
 for(const [k,v] of u.searchParams)if(k!=='path'&&allowedParams.has(k))params.set(k,v);
 params.set('language','en-US');
 try{
  const r=await fetch('https://api.themoviedb.org/3'+path+'?'+params,{headers:{Authorization:'Bearer '+token,accept:'application/json'},signal:AbortSignal.timeout(12000)});
  const retryAfter=r.headers.get('retry-after');
  const retryHeaders={'cache-control':'no-store'};
  if(retryAfter&&/^\d{1,4}$/.test(retryAfter.trim())&&Number(retryAfter)<=3600)retryHeaders['retry-after']=retryAfter.trim();
  const body=await r.text();
  let parsed;
  try{parsed=JSON.parse(body)}catch{return Response.json({error:r.status===429?'TMDB rate limit reached':'TMDB returned an invalid response'},{status:r.status===429?429:502,headers:retryHeaders})}
  if(!parsed||typeof parsed!=='object'||Array.isArray(parsed))return error('TMDB returned an invalid response',502);
  if(!r.ok){
   const message=typeof parsed.status_message==='string'?parsed.status_message:'TMDB request failed';
   return Response.json({error:message},{status:r.status,headers:retryHeaders});
  }
  return Response.json(parsed,{status:r.status,headers:{'cache-control':'public, max-age=300'}});
 }catch{return error('TMDB temporarily unavailable',502)}
};

export default async request => secureApiResponse(await apiHandler(request));
