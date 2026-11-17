"""Regression check: Escape closes the topmost detail dialog, not the underlying drawer."""
import pathlib, unittest
ROOT=pathlib.Path(__file__).resolve().parents[1]
class EscapePriority(unittest.TestCase):
 def test_dialog_escape_stops_bubbling(self):
  js=(ROOT/'app.js').read_text()
  self.assertIn("e.stopPropagation();dismiss();return",js)
 def test_global_escape_does_not_close_drawer_behind_dialog(self):
  js=(ROOT/'app.js').read_text()
  self.assertIn("if(document.querySelector('.modal-back'))return",js)
 def test_modal_state_cleared_on_dismissal(self):
  js=(ROOT/'app.js').read_text()
  self.assertIn('if(state.modal===x)state.modal=null',js)
if __name__=='__main__':unittest.main()
