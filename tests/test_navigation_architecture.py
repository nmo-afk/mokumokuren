from pathlib import Path
import unittest
ROOT=Path(__file__).resolve().parents[1]
class NavigationArchitecture(unittest.TestCase):
 def test_context_switch_is_wired(self):
  s=(ROOT/'app.js').read_text()
  self.assertIn('id="context-switch"',s)
  self.assertIn("document.querySelector('#context-switch').onclick=openDrawer",s)
 def test_drawer_keyboard_trap_and_escape(self):
  s=(ROOT/'app.js').read_text()
  self.assertIn("drawer.addEventListener('keydown'",s)
  self.assertIn("e.shiftKey&&document.activeElement===first",s)
  self.assertIn("if(!drawer.hidden){e.preventDefault();close(true)}",s)
 def test_hidden_overlay_and_mobile_css(self):
  s=(ROOT/'style.css').read_text()
  self.assertIn('.mobile-drawer[hidden],.drawer-shade[hidden]',s)
  self.assertIn('@media(max-width:699px)',s)
