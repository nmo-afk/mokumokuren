"""Regression guard: never confuse a Trakt show ID with a TMDB ID."""
import pathlib, re, subprocess, unittest
ROOT=pathlib.Path(__file__).resolve().parents[1]
class IdentifierSafety(unittest.TestCase):
 def test_trakt_id_not_used_as_tmdb(self):
  js=(ROOT/'app.js').read_text()
  m=re.search(r'const mediaId=x=>([^;]+);',js)
  self.assertIsNotNone(m)
  expr=m.group(1)
  script=f"const mediaId=x=>{expr};console.log(JSON.stringify([mediaId({{ids:{{trakt:123}}}}),mediaId({{ids:{{trakt:123,tmdb:456}}}}),mediaId({{id:789}}),mediaId({{trakt_id:99,id:99}})]))"
  result=subprocess.run(['node','-e',script],capture_output=True,text=True,check=True)
  self.assertEqual(result.stdout.strip(),'[0,456,789,0]')
 def test_trakt_id_can_be_used_to_verify_tracking_without_tmdb(self):
  js=(ROOT/'app.js').read_text()
  self.assertIn('if(!(tmdbId>0||traktId>0))return {watchlist:false,watched:false,available:false',js)
  self.assertIn("const showTraktId=traktId||Number(watchedEntry?.show?.ids?.trakt)",js)
if __name__=='__main__':unittest.main()
