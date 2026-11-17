import pathlib, unittest
ROOT=pathlib.Path(__file__).resolve().parents[1]
class TrackingConfirmation(unittest.TestCase):
 def test_trakt_requires_positive_numeric_count(self):
  s=(ROOT/'app.js').read_text()
  self.assertIn("typeof confirmedCount!=='number'||confirmedCount<1",s)
 def test_anilist_requires_matching_status(self):
  s=(ROOT/'app.js').read_text()
  self.assertIn('mutation.SaveMediaListEntry.status!==',s)
if __name__=='__main__':unittest.main()
