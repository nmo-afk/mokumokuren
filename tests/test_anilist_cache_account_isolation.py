import pathlib, subprocess, unittest
ROOT=pathlib.Path(__file__).resolve().parents[1]
class AniListCacheIsolation(unittest.TestCase):
 def test_old_account_data_not_reused_or_committed(self):
  source=(ROOT/'app.js').read_text()
  start=source.index('let animeLibraryToken = state.anilist;')
  end=source.index('\nfunction rankRecommendations(',start)
  snippet=source[start:end]
  js=r'''
const assert=require('node:assert/strict');
let state={anilist:'old',animeLibrary:[],animeLibraryLoaded:false,animeLibraryError:''};
let resolveOld;
let requests=[];
async function ani(q,v){
 if(q.includes('Viewer'))return {Viewer:{id:state.anilist==='old'?1:2}};
 if(state.anilist==='old')return new Promise(r=>resolveOld=r);
 return {MediaListCollection:{lists:[{entries:[{media:{id:22},status:'CURRENT'}]}]}};
}
'''+snippet+r'''
(async()=>{
 let old=fetchAnimeLibrary();
 for(let i=0;i<10&&!resolveOld;i++)await Promise.resolve();
 assert.ok(resolveOld,'old request started');
 state.anilist='new';
 let latest=await fetchAnimeLibrary();
 assert.equal(latest[0].media.id,22);
 resolveOld({MediaListCollection:{lists:[{entries:[{media:{id:11},status:'COMPLETED'}]}]}});
 assert.deepEqual(await old,[],'stale request discarded');
 assert.equal(state.animeLibrary[0].media.id,22,'new account cache preserved');
 state.anilist='';
 assert.deepEqual(await fetchAnimeLibrary(),[]);
 assert.deepEqual(state.animeLibrary,[],'disconnect clears cache');
 console.log('AniList account isolation passed');
})().catch(e=>{console.error(e);process.exit(1)});
'''
  r=subprocess.run(['node','-e',js],text=True,capture_output=True,cwd=ROOT)
  self.assertEqual(r.returncode,0,r.stderr)
if __name__=='__main__':unittest.main()
