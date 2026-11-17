from pathlib import Path
import unittest

JS=Path(__file__).resolve().parents[1].joinpath('app.js').read_text()

class ArtworkFallbackTests(unittest.TestCase):
    def test_capture_phase_handles_non_bubbling_image_errors(self):
        self.assertIn("document.addEventListener('error',event=>{", JS)
        self.assertIn('},true);', JS)
    def test_poster_failure_replaces_image_not_card(self):
        self.assertIn("img.closest('.poster')", JS)
        self.assertIn("img.replaceWith(placeholder)", JS)
        self.assertIn("placeholder.innerHTML=uiIcon('film')", JS)
    def test_icon_failures_do_not_trigger_poster_replacement(self):
        self.assertIn("!img.classList.contains('af-icon')", JS)
    def test_other_artwork_failures_hide_broken_image(self):
        self.assertIn("img.classList.contains('detail-poster')", JS)
        self.assertIn('img.hidden=true', JS)

if __name__=='__main__': unittest.main()
