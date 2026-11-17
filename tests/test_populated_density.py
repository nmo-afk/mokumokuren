import pathlib
import re
import unittest

CSS = pathlib.Path(__file__).resolve().parents[1].joinpath('style.css').read_text()

class PopulatedDensityTests(unittest.TestCase):
    def test_density_pass_is_present(self):
        self.assertIn('Populated homepage density pass', CSS)
    def test_mobile_feature_still_functional_landscape(self):
        block = CSS.split('Populated homepage density pass', 1)[1]
        self.assertRegex(block, r'\.feature-widget\{min-height:310px!important')
        self.assertIn('.feature-pagination', CSS)
    def test_media_rails_remain_horizontal(self):
        self.assertRegex(CSS, r'\.recommendation-gallery\{[^}]*grid-auto-columns')
        self.assertIn('overflow-x:auto', CSS)

if __name__ == '__main__':
    unittest.main()
