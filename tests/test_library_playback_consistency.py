import pathlib, subprocess, unittest
ROOT=pathlib.Path(__file__).resolve().parents[1]
class LibraryPlaybackConsistencyTests(unittest.TestCase):
 def test_library_and_home_use_same_normalizer(self):
  s=(ROOT/'app.js').read_text()
  self.assertIn(".map((x,i)=>normalizeTraktLibraryItem(x,section==='Movies'?'movie':'tv',i))",s)
  self.assertIn('const map=(x,i)=>normalizeTraktLibraryItem(x,kind,i)',s)
 def test_episode_ids_never_become_show_ids(self):
  s=(ROOT/'app.js').read_text()
  start=s.index('function normalizeTraktLibraryItem(')
  end=s.index('\nasync function renderHomeDashboard()',start)
  snippet=s[start:end]
  js=snippet+'''\nconst assert=require('node:assert/strict');
const item=normalizeTraktLibraryItem({type:'episode',show:{title:'Series',ids:{trakt:17}},episode:{title:'Pilot',ids:{tmdb:999},season:1,number:1},progress:145},'tv',0);
assert.equal(item.trakt_id,17);assert.equal(item.tmdb_id,undefined);assert.equal(item.id,17);assert.equal(item.progress,'100%');assert.equal(item.nextEpisode.number,1);
'''
  r=subprocess.run(['node','-e',js],capture_output=True,text=True)
  self.assertEqual(r.returncode,0,r.stderr)
