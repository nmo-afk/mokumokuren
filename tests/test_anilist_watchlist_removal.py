import pathlib, subprocess, unittest
ROOT=pathlib.Path(__file__).resolve().parents[1]
class AniListRemovalTests(unittest.TestCase):
 def test_remove_planning_entry_and_fail_closed(self):
  source=(ROOT/'app.js').read_text()
  start=source.index('async function changeStatus(')
  end=source.index('// mokumokuren_rc2_enrichment',start)
  fn=source[start:end]
  js=r'''
const assert=require('node:assert/strict');
let calls=[], removed=true;
const state={section:'Anime',anilist:'token',animeLibraryLoaded:true};
const anilistAccountRevision=0;
const episodeWritesInFlight=new Set();
let animeLibraryPending=null;
const toast=()=>{};const load=async()=>{};
const ani=async(q,v)=>{
 calls.push({q,v});
 if(q.includes('Viewer{'))return {Viewer:{id:12}};
 if(q.includes('MediaList(mediaId:'))return {MediaList:{id:99,status:'PLANNING'}};
 if(q.includes('DeleteMediaListEntry'))return {DeleteMediaListEntry:{deleted:removed}};
 throw Error('Unexpected AniList operation');
};
''' + fn + r'''
(async()=>{
 const x={id:123,status:'PLANNING'};
 assert.equal(await changeStatus(x,'remove-watchlist'),true);
 assert.equal(x.status,null);
 assert.equal(state.animeLibraryLoaded,false);
 assert.equal(calls.filter(z=>z.q.includes('DeleteMediaListEntry')).length,1);
 assert.equal(calls.find(z=>z.q.includes('DeleteMediaListEntry')).v.id,99);
 removed=false;const y={id:124,status:'PLANNING'};
 assert.equal(await changeStatus(y,'remove-watchlist'),false);
 assert.equal(y.status,'PLANNING');
})().catch(e=>{console.error(e);process.exitCode=1});
'''
  result=subprocess.run(['node','-e',js],capture_output=True,text=True)
  self.assertEqual(result.returncode,0,result.stderr)
if __name__=='__main__': unittest.main()
