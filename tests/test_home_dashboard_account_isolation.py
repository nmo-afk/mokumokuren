import pathlib
import unittest

ROOT = pathlib.Path(__file__).resolve().parents[1]

class HomeDashboardAccountIsolation(unittest.TestCase):
    def test_account_snapshot_guarded_before_render_and_on_error(self):
        js = (ROOT / 'app.js').read_text(encoding='utf-8')
        start = js.index('async function renderHomeDashboard()')
        end = js.index('\n}', start) + 2
        fn = js[start:end]
        self.assertIn("accountRevision=section==='Anime'?anilistAccountRevision:traktAccountRevision", fn)
        self.assertIn("(section==='Anime'?anilistAccountRevision:traktAccountRevision)===accountRevision", fn)
        self.assertIn('if(!isCurrent())return;', fn)
        self.assertIn('if(isCurrent())', fn)

if __name__ == '__main__':
    unittest.main()
