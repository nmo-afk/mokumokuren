import pathlib, unittest
SOURCE=(pathlib.Path(__file__).resolve().parents[1]/'app.js').read_text()
class TrackingFailClosed(unittest.TestCase):
 def test_failed_lookup_does_not_guess_from_current_tab(self):
  self.assertNotIn("return {watchlist:state.tab==='Watchlist',watched:state.tab==='Watched'}", SOURCE)
  self.assertIn("error:'Tracking status could not be verified. Please retry.'",SOURCE)
 def test_failed_lookup_disables_tracking_buttons(self):
  self.assertIn('const canTrack=tracking.available&&',SOURCE)
  self.assertIn('watchlistButton.disabled=!tracking.available||watchlistPending;',SOURCE)
  self.assertIn('watchedButton.disabled=!canTrack;',SOURCE)
 def test_detail_tabs_have_selected_state(self):
  self.assertIn('role="tablist"',SOURCE)
  self.assertIn("setAttribute('aria-selected',String(selected))",SOURCE)
