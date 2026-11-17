import pathlib, unittest
ROOT=pathlib.Path(__file__).resolve().parents[1]
class TrackingUIGuards(unittest.TestCase):
 def test_anilist_mutation_must_confirm(self):
  src=(ROOT/'app.js').read_text()
  self.assertIn("mutation.SaveMediaListEntry.status!==",src)
 def test_tracking_buttons_disabled_without_account(self):
  src=(ROOT/'app.js').read_text()
  self.assertIn("watchlistButton.disabled=true;",src)
  self.assertIn("watchedButton.disabled=true;",src)
  self.assertIn("available:!!state.anilist",src)
  self.assertIn("if(!state.trakt)return {watchlist:false,watched:false,available:false};",src)
 def test_stale_detail_errors_are_ignored(self):
  src=(ROOT/'app.js').read_text()
  self.assertIn('request===detailRequest&&back.isConnected',src)
if __name__=='__main__':unittest.main()
