import unittest
from pathlib import Path

APP = (Path(__file__).resolve().parents[1] / 'app.js').read_text()

class DiscoveryFilterTests(unittest.TestCase):
    def test_search_and_genre_are_both_applied(self):
        self.assertIn('function discoveryMatches(x)', APP)
        self.assertIn('!discoveryGenre||genres.includes(discoveryGenre)', APP)
        self.assertIn('toLocaleLowerCase().includes(q)', APP)
    def test_filtered_cards_keep_their_own_identity(self):
        self.assertIn('button.onclick=()=>openItem(filtered[i])', APP)
    def test_controls_are_wired(self):
        self.assertIn('"#discovery-search").oninput', APP)
        self.assertIn('"#discovery-genre").onchange', APP)
