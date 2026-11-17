import pathlib,unittest
ROOT=pathlib.Path(__file__).resolve().parents[1]
class HomePriorityTests(unittest.TestCase):
 def test_persisted_priority_and_safe_default(self):
  js=(ROOT/'app.js').read_text()
  self.assertIn("priority:'featured'",js)
  self.assertIn("if(!['featured','library'].includes(homePrefs.priority))",js)
 def test_layout_reorders_existing_sections_without_recreating(self):
  js=(ROOT/'app.js').read_text()
  self.assertIn('content.insertBefore(library,featured)',js)
  self.assertIn('content.insertBefore(featured,library)',js)
  self.assertIn('applyHomePriority();document.querySelector',js)
 def test_settings_expose_control_and_save(self):
  js=(ROOT/'app.js').read_text()
  self.assertIn('id="home-priority"',js)
  self.assertIn("back.querySelector('#home-priority').onchange",js)
  self.assertIn('saveHomePrefs();applyHomePriority()',js)
