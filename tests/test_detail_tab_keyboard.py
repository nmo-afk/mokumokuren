import pathlib, unittest
ROOT=pathlib.Path(__file__).resolve().parents[1]
class DetailTabKeyboardTests(unittest.TestCase):
    def test_roving_tabindex_and_keyboard_navigation(self):
        source=(ROOT/'app.js').read_text(encoding='utf-8')
        self.assertIn('tabIndex=selected?0:-1',source)
        self.assertIn("['ArrowLeft','ArrowRight','Home','End']",source)
        self.assertIn('tabs[next].focus();tabs[next].click()',source)
if __name__=='__main__': unittest.main()
