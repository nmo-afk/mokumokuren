"""Normalized themed icons retain source style but are optically centered in the UI."""
import json
import unittest
from pathlib import Path
try:
    from PIL import Image
except ImportError:  # optional visual-only dependency
    Image=None
ROOT=Path(__file__).resolve().parents[1]

class UiIconAlignmentTests(unittest.TestCase):
    @unittest.skipUnless(Image is not None, "Pillow is optional for visual-only icon geometry checks")
    def test_centering_and_release_inclusion(self):
        originals=sorted((ROOT/'assets/arctic-icons').glob('*.png'))
        normalized=ROOT/'assets/ui-icons'
        release=json.loads((ROOT/'dist/release-integrity.json').read_text())
        public={entry['path'] for entry in release['files']}
        self.assertIn('mask.png', {icon.name for icon in originals})
        for original in originals:
            icon=normalized/original.name
            self.assertTrue(icon.is_file(),str(icon))
            with Image.open(icon) as image:
                self.assertEqual(image.size,(128,128))
                bbox=image.convert('RGBA').getchannel('A').getbbox()
            self.assertIsNotNone(bbox)
            left,top,right,bottom=bbox
            self.assertLessEqual(abs((left+right)/2-64),1)
            self.assertLessEqual(abs((top+bottom)/2-64),1)
            self.assertGreaterEqual(max(right-left,bottom-top),88)
            self.assertIn('assets/ui-icons/'+original.name,public)

if __name__=='__main__':unittest.main()
