import pathlib, unittest
ROOT=pathlib.Path(__file__).resolve().parents[1]
class DetailDismissalTests(unittest.TestCase):
 def test_not_interested_uses_full_modal_cleanup(self):
  source=(ROOT/'app.js').read_text()
  self.assertIn("back.querySelector('#not').onclick=()=>{saveRecommendationFeedback(x,'not');dismiss();void load()}",source)
 def test_dismiss_restores_scroll_and_modal_state(self):
  source=(ROOT/'app.js').read_text()
  self.assertIn("if(state.modal===x)state.modal=null",source)
  self.assertIn("document.body.classList.remove('detail-open')",source)
if __name__=='__main__': unittest.main()
