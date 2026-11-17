"""Static guardrails supplemented by browser_episode_step9.py and browser_trakt_episode_step9.py."""
from pathlib import Path
import unittest
APP=(Path(__file__).resolve().parents[1]/'app.js').read_text()
class EpisodeProgressStep9(unittest.TestCase):
 def test_anilist_awaits_confirmed_response_before_mutating_model(self):
  fn=APP.split('async function updateAnimeProgress(',1)[1].split('// Personalised home rails',1)[0]
  self.assertLess(fn.index('const saved=d?.SaveMediaListEntry'),fn.index('reconcileAnimeProgress(mediaId'))
  self.assertIn('saved.progress!==next',fn)
 def test_per_account_write_lock_both_providers(self):
  self.assertIn("const lock='anime:'+revision+':'+mediaId",APP)
  self.assertIn("const lock='trakt:'+revision+':'+show",APP)
  self.assertIn('episodeWritesInFlight.delete(lock)',APP)
 def test_remote_refresh_provider_authoritative(self):
  self.assertIn('clearAnimeLibraryCache();',APP)
  self.assertIn('clearTrackingCache();',APP)
  self.assertIn("m.querySelector('#library-refresh').onclick=()=>void refreshRemoteTracking({force:true})",APP)
 def test_home_has_separate_quick_episode_button(self):
  self.assertIn('data-home-quick=',APP)
  self.assertIn("performQuickEpisode(item,button,section==='Anime')",APP)
if __name__=='__main__':unittest.main()
