import unittest
from pathlib import Path

APP = (Path(__file__).resolve().parents[1] / 'app.js').read_text(encoding='utf-8')

class HomePartialFailureTests(unittest.TestCase):
    def test_failed_playback_is_not_presented_as_empty_library(self):
        self.assertIn("libraryWarnings.push('Continue Watching could not be loaded from Trakt.')", APP)
    def test_failed_watchlist_is_not_presented_as_empty_library(self):
        self.assertIn("libraryWarnings.push('Watchlist could not be loaded from Trakt.')", APP)
    def test_warning_is_escaped_and_announced(self):
        self.assertIn('role="status">${esc(message)}', APP)
    def test_empty_state_only_when_no_failures(self):
        self.assertIn('!libraryWarnings.length?', APP)

if __name__ == '__main__': unittest.main()
