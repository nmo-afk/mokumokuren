import pathlib, unittest
ROOT=pathlib.Path(__file__).resolve().parents[1]
JS=(ROOT/'app.js').read_text(encoding='utf-8')
class AnimeTrackingGuards(unittest.TestCase):
    def test_progress_requires_server_confirmation(self):
        self.assertIn('saved.progress!==next', JS)
        self.assertIn('AniList did not confirm the requested episode progress', JS)
    def test_no_optimistic_progress_update(self):
        fn=JS.split('async function updateAnimeProgress(',1)[1].split('// Personalised home rails',1)[0]
        self.assertLess(fn.index('const saved=d?.SaveMediaListEntry'),fn.index('x.progress=saved.progress'))
    def test_status_only_updates_on_success(self):
        self.assertIn('if(ok&&box.isConnected)', JS)
        self.assertIn('}catch(e){toast(e.message);return false}', JS)
    def test_controls_guard_busy_and_disconnected(self):
        self.assertIn("box.dataset.syncBusy==='true'", JS)
        self.assertIn('b.disabled=busy||!state.anilist', JS)
    def test_anime_tracking_requires_connection(self):
        self.assertIn('available:!!state.anilist', JS)
if __name__=='__main__': unittest.main()
