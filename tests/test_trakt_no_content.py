import pathlib, unittest
ROOT=pathlib.Path(__file__).resolve().parents[1]
class TraktNoContentTests(unittest.TestCase):
 def test_netlify_preserves_204(self):
  source=(ROOT/'netlify/functions/trakt.mjs').read_text()
  self.assertIn('if(r.status===204)return new Response(null,{status:204',source)
  self.assertLess(source.index('if(r.status===204)'),source.index('JSON.parse(raw)'))
 def test_local_preserves_204(self):
  source=(ROOT/'local_server.py').read_text()
  self.assertIn('if status==204:',source)
  self.assertLess(source.index('if status==204:'),source.index("if 'json' not in ctype.lower():"))
 def test_frontend_accepts_204(self):
  source=(ROOT/'app.js').read_text()
  self.assertIn('if(r.ok&&r.status===204)return null;',source)
if __name__=='__main__':unittest.main()
