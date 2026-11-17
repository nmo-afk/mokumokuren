import pathlib, unittest
ROOT=pathlib.Path(__file__).resolve().parents[1]
class HomePartialFailureRenderingTests(unittest.TestCase):
 def test_failed_rails_not_rendered_as_empty_collections(self):
  s=(ROOT/'app.js').read_text()
  self.assertIn("failedRails.add('Continue Watching')",s)
  self.assertIn("failedRails.add('Your Watchlist')",s)
  self.assertIn('rails.filter(r=>!failedRails.has(r.label)).map(r=>homeRail',s)
 def test_successful_rails_remain_clickable(self):
  s=(ROOT/'app.js').read_text()
  self.assertIn('for(const rail of rails.filter(r=>!failedRails.has(r.label)))',s)
