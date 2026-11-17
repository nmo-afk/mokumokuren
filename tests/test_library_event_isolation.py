import unittest
from pathlib import Path
SOURCE=(Path(__file__).resolve().parents[1]/'app.js').read_text()
class LibraryEventIsolation(unittest.TestCase):
 def test_global_card_binding_skips_library(self):
  self.assertIn("if(t==='Discover')m.querySelectorAll('[data-open]')",SOURCE)
  self.assertIn("gallery.querySelectorAll('[data-open]').forEach((button,i)=>{button.onclick=()=>openItem(filtered[i])})",SOURCE)
 def test_library_binds_filtered_index(self):
  self.assertIn('const item=subset[Number(b.dataset.libraryIndex)]',SOURCE)
