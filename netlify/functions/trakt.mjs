import {secureApiResponse} from '../lib/response-security.mjs';
const listPath=/^\/users\/me\/lists(?:\/[a-zA-Z0-9_-]+(?:\/items)?)?$/;
const allowed=/^\/(sync\/(watchlist\/(movies|shows)|watched\/(movies|shows)|playback|history|collection\/(movies|shows))|users\/settings|sync\/watchlist(?:\/remove)?|sync\/history|sync\/history\/remove)$/;
const apiHandler = async request=>{
 const u=new URL(request.url),path=u.searchParams.get('path')||'';
 const route=path.split('?')[0];
 const isList=listPath.test(path)||listPath.test(route);
 const isAllowed=allowed.test(path)||allowed.test(route);
 const isShow=/^\/shows\/\d+\/(seasons(?:\/\d+)?|progress\/watched)$/.test(route);
 const isReviews=/^\/(movies|shows)\/\d+\/comments\/(popular|newest)$/.test(route);
 if(!(isList||isAllowed||isShow||isReviews))return Response.json({error:'Unsupported endpoint'},{status:400});
 // Only approved Trakt pagination/extended parameters may pass to the upstream.
 // Existing episode calls also use extended=full.
 const pathQuery=path.includes('?')?path.slice(path.indexOf('?')+1):'';
 const params=new URLSearchParams(pathQuery),paged=/^\/sync\/(?:watched|watchlist)\/(?:movies|shows)$/.test(route)||isList;
 for(const [key,value] of params){
  const valid=(paged&&key==='page'&&/^[1-9]\d{0,3}$/.test(value))||
   ((isReviews||route==='/sync/history')&&key==='limit'&&/^[1-9]\d?$/.test(value)&&Number(value)<=20)||
   (paged&&key==='limit'&&/^[1-9]\d{0,2}$/.test(value)&&Number(value)<=100)||
   (key==='extended'&&value==='full'&&(isShow||/^\/sync\/watched\/(?:movies|shows)$/.test(route)))||
   (key==='extended'&&value==='progress'&&/^\/sync\/watched\/shows$/.test(route));
  if(!valid||params.getAll(key).length!==1)return Response.json({error:'Unsupported Trakt query'},{status:400});
 }
 if(path.includes('#'))return Response.json({error:'Unsupported Trakt query'},{status:400});
 const token=request.headers.get('authorization');const client=Netlify.env.get('TRAKT_CLIENT_ID');
 if(!token||!client)return Response.json({error:'Trakt login or client ID missing'},{status:401});
 const method=request.method;
 if(!['GET','POST','DELETE'].includes(method))return Response.json({error:'Method not allowed'},{status:405});
 if(method!=='GET'&&isReviews)return Response.json({error:'Reviews are read-only'},{status:405});
 if(method!=='GET'&&pathQuery)return Response.json({error:'Write queries are not supported'},{status:405});
 if(method!=='GET'&&!listPath.test(path)&&!['/sync/watchlist','/sync/watchlist/remove','/sync/history','/sync/history/remove'].includes(path))return Response.json({error:'Unsupported write endpoint'},{status:405});
 try{
  const r=await fetch('https://api.trakt.tv'+path,{method,headers:{authorization:token,'trakt-api-key':client,'trakt-api-version':'2',accept:'application/json','content-type':'application/json'},body:method!=='GET'?await request.text():undefined,signal:AbortSignal.timeout(12000)});
  // Trakt returns 204 No Content for successful deletes; preserve it.
  if(r.status===204)return new Response(null,{status:204,headers:{'cache-control':'no-store'}});
  const retryAfter=r.headers.get('retry-after');
  const headers={'cache-control':'no-store'};
  if(retryAfter&&/^\d{1,4}$/.test(retryAfter.trim())&&Number(retryAfter)<=3600)headers['retry-after']=retryAfter.trim();
  const raw=await r.text();let d;
  try{d=JSON.parse(raw)}catch{
   return Response.json({error:r.status===429?'Trakt rate limit reached':/cloudflare|sorry, you have been blocked|attention required/i.test(raw)?'Trakt upstream blocked by Cloudflare':'Trakt upstream returned non-JSON',upstream_status:r.status},{status:r.status===429?429:502,headers});
  }
  return Response.json(d,{status:r.status,headers});
 }catch{return Response.json({error:'Trakt upstream connection failed'},{status:502,headers:{'cache-control':'no-store'}})}
};

export default async request => secureApiResponse(await apiHandler(request));
