"""Execute the frontend TMDB function with a mocked fetch, not just a text assertion."""
import json, pathlib, subprocess, unittest
ROOT=pathlib.Path(__file__).resolve().parents[1]
class TMDBCircuitBreaker(unittest.TestCase):
 def test_detail_failure_does_not_flood_proxy_or_disable_discovery(self):
  source=(ROOT/'app.js').read_text()
  start=source.index('const transientReadStatuses=')
  end=source.index('async function ani(query,variables={})',start)
  js=source[start:end]
  test='''let count=0;
const fetch=async (url)=>{count++;return {ok:false,status:400,headers:{get:()=>null},json:async()=>({error:'Unsupported TMDB path'})}};
(async()=>{
 for(const path of ['/tv/123','/tv/456','/discover/tv','/tv/123']){
  try{await tmdb(path)}catch(e){if(!e.message.includes('HTTP 400'))throw e}
 }
 if(count!==4)throw Error('An unsupported detail request incorrectly disabled another route; got '+count);
 console.log('ok');
})().catch(e=>{console.error(e);process.exit(1)});'''
  result=subprocess.run(['node','-e',js+'\n'+test],capture_output=True,text=True)
  self.assertEqual(result.returncode,0,result.stderr)
if __name__=='__main__':unittest.main()
