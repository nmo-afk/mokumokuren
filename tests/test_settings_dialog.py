import pathlib, unittest
ROOT=pathlib.Path(__file__).resolve().parents[1]
class SettingsDialogChecks(unittest.TestCase):
 def test_dialog_semantics(self):
  js=(ROOT/'app.js').read_text()
  self.assertIn('aria-modal=\"true\" aria-label=\"Settings\"',js)
 def test_keyboard_and_cleanup(self):
  js=(ROOT/'app.js').read_text()
  for token in ("const closeSettings=", "e.key==='Escape'", "e.key!=='Tab'", "document.removeEventListener('keydown',settingsKeydown,true)", "settingsDialog.querySelector('.close').focus()"):
   self.assertIn(token,js)
