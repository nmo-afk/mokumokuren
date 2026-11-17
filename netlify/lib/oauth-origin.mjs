// OAuth callbacks must have one explicit HTTPS origin. Never trust an arbitrary
// request Host or redirect_uri, since the token endpoints use server credentials.
export function approvedCallbackUri(env){
  const raw=env.get('MOKUMOKUREN_ORIGIN');
  if(typeof raw!=='string'||raw!==raw.trim()||raw.length>253)return null;
  try{
    const url=new URL(raw);
    if(url.protocol!=='https:'||url.username||url.password||url.search||url.hash||
       url.pathname!=='/'||url.origin!==raw||url.port)return null;
    return raw+'/callback';
  }catch{return null;}
}
