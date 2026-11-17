import unittest
from pathlib import Path

class LibraryIdentityRegression(unittest.TestCase):
    def test_filtered_cards_use_filtered_position(self):
        js=(Path(__file__).resolve().parents[1]/'app.js').read_text()
        self.assertIn('data-library-index',js)
        self.assertIn('const item=subset[Number(b.dataset.libraryIndex)]',js)
        self.assertNotIn("openItem(items.find(x=>String(x._key||x.id)===b.dataset.open))",js)

if __name__=='__main__':unittest.main()
