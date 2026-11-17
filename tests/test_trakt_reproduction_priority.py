from pathlib import Path
import unittest, json
ROOT=Path(__file__).resolve().parents[1]
class TraktReproductionPriority(unittest.TestCase):
 def test_palette_metadata(self):
  css=(ROOT/'trakt-rebuild.css').read_text()
  self.assertIn('--moku-bg:#960012;',css)
  self.assertIn('--moku-secondary:#FBD242;',css)
  self.assertIn('--moku-text:#F2F4F3;',css)
  self.assertIn('background-color:#960012!important',css)
  self.assertEqual(json.loads((ROOT/'manifest.webmanifest').read_text())['background_color'],'#960012')
  self.assertIn('name="theme-color" content="#960012"',(ROOT/'index.html').read_text())
 def test_trakt_first_home_and_preserved_integrations(self):
  js=(ROOT/'app.js').read_text()
  self.assertIn('function applyTraktHomeComposition',js)
  self.assertIn("h2.textContent='Continue Watching'",js)
  self.assertIn("h3.textContent='Start Watching'",js)
  self.assertIn('async function renderHomeDashboard',js)
  self.assertIn('async function fetchAnimeLibrary',js)
 def test_design_spec_supersedes_forest_canvas(self):
  spec=(ROOT/'CONFIRMED-DESIGN-SPEC.md').read_text()
  self.assertIn('background: #960012',spec)
  self.assertNotIn('Background: #061D1B',spec)
