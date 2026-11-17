from pathlib import Path
import unittest
ROOT=Path(__file__).resolve().parents[1]
class Step2ReleaseInclusion(unittest.TestCase):
 def test_new_css_loaded_by_browser_and_packaged(self):
  self.assertIn('href="/trakt-rebuild.css"',(ROOT/'index.html').read_text())
  self.assertIn("'trakt-rebuild.css'",(ROOT/'scripts/build-release.mjs').read_text())
  self.assertIn("'/trakt-rebuild.css'",(ROOT/'service-worker.js').read_text())
 def test_mobile_top_navigation_not_bottom(self):
  js=(ROOT/'app.js').read_text()
  css=(ROOT/'trakt-rebuild.css').read_text()
  self.assertIn('class="mobile-top-tabs"',js)
  self.assertIn('.shell .workspace>.top',css)
  self.assertNotIn('class="bottom"',js)
 def test_continue_watching_is_landscape(self):
  js=(ROOT/'app.js').read_text()
  self.assertIn('class="poster poster-landscape"',js)
  self.assertIn('homeRailCard(x,label)',js)
