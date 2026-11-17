import pathlib, unittest
SRC=pathlib.Path(__file__).resolve().parents[1].joinpath('app.js').read_text()
class HomeRetryRegression(unittest.TestCase):
 def test_partial_failure_retry_is_available(self):
  self.assertIn("libraryWarnings.length?'<button type=\"button\"",SRC)
  self.assertIn("Retry failed library requests",SRC)
 def test_full_failure_retry_is_available(self):
  self.assertIn('Retry library loading',SRC)
  self.assertIn('role="alert"',SRC)
 def test_retry_reloads_data(self):
  self.assertEqual(SRC.count("target.querySelector('[data-retry-home]').addEventListener('click',()=>void renderHomeDashboard())"),1)
  self.assertEqual(SRC.count("target.querySelector('[data-retry-home]')?.addEventListener('click',()=>void renderHomeDashboard())"),1)
 def test_stale_failure_does_not_replace_new_page(self):
  self.assertIn("state.section===section&&state.tab==='Recommended'&&",SRC)
  self.assertIn('if(isCurrent())',SRC)
if __name__=='__main__': unittest.main()
