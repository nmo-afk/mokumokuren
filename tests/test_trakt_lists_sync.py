import pathlib, unittest
ROOT=pathlib.Path(__file__).resolve().parents[1]
class TraktListsSyncTests(unittest.TestCase):
 def test_trakt_only_storage(self):
  js=(ROOT/'app.js').read_text()
  self.assertIn("trakt('/users/me/lists'",js)
  self.assertNotIn('savePersonalLists(',js)
  self.assertNotIn("store('mok_personal_lists",js)
 def test_crud_methods(self):
  js=(ROOT/'app.js').read_text()
  self.assertIn("method:'DELETE'",js)
  self.assertIn("method:'POST'",js)
  self.assertIn('traktListContains',js)
 def test_proxies_support_lists(self):
  net=(ROOT/'netlify/functions/trakt.mjs').read_text()
  local=(ROOT/'local_server.py').read_text()
  self.assertIn('listPath.test(path)',net)
  self.assertIn("'DELETE'",net)
  self.assertIn('def do_DELETE(self)',local)
  self.assertIn('/users/me/lists',local)
 def test_no_local_fallback(self):
  js=(ROOT/'app.js').read_text()
  self.assertIn('Lists are stored in your Trakt account',js)
  self.assertIn('if(!state.trakt){form.hidden=true',js)
 def test_empty_delete_response(self):
  self.assertIn('if(r.ok&&r.status===204)return null;', (ROOT/'app.js').read_text())
if __name__=='__main__':unittest.main()
