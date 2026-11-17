import pathlib, unittest
ROOT=pathlib.Path(__file__).resolve().parents[1]
class TraktListRecovery(unittest.TestCase):
 def test_manual_refresh_available(self):
  js=(ROOT/'app.js').read_text()
  self.assertIn('id="refresh-personal-lists"',js)
  self.assertIn("querySelector('#refresh-personal-lists').onclick=()=>void run(load)",js)
 def test_missing_items_cannot_be_edited(self):
  js=(ROOT/'app.js').read_text()
  self.assertIn("if(!itemsById.has(id))throw Error('List contents have not loaded",js)
  self.assertIn('selected&&payload&&entries?',js)
 def test_account_change_does_not_render_stale_data(self):
  js=(ROOT/'app.js').read_text()
  self.assertIn('const accountRevision=traktAccountRevision;',js)
  self.assertIn('if(traktAccountRevision!==accountRevision||!back.isConnected)return;',js)
if __name__=='__main__':unittest.main()
