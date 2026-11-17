import pathlib
import unittest

APP = pathlib.Path(__file__).resolve().parents[1] / 'app.js'

class NavigationSelectionTests(unittest.TestCase):
    def test_unmatched_card_does_not_open_unrelated_feature(self):
        source = APP.read_text(encoding='utf-8')
        self.assertNotIn('===b.dataset.open)||feature', source)
        self.assertIn('if(item)openItem(item)', source)

    def test_media_switch_clears_stale_library_filter(self):
        source = APP.read_text(encoding='utf-8')
        self.assertIn("state.section=b.dataset.section;libraryFilters.query='';libraryFilters.sort='default'", source)

    def test_library_tab_switch_clears_stale_filter(self):
        source = APP.read_text(encoding='utf-8')
        self.assertIn("state.tab=b.dataset.tab;libraryFilters.query='';libraryFilters.sort='default'", source)

if __name__ == '__main__':
    unittest.main()
