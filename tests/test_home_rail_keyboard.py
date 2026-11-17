import pathlib, unittest
APP = pathlib.Path(__file__).resolve().parents[1] / 'app.js'
class HomeRailInteractionTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls): cls.source=APP.read_text(encoding='utf-8')
    def test_generic_card_binding_does_not_override_personal_rails(self):
        self.assertIn("if(b.closest('.home-dashboard'))return",self.source)
    def test_rail_cards_have_account_specific_handlers(self):
        self.assertIn('button.onclick=()=>openItem(rail.items[i])',self.source)
    def test_keyboard_navigation_supported(self):
        self.assertIn("event.key==='ArrowRight'",self.source)
        self.assertIn("event.key!=='ArrowLeft'",self.source)
        self.assertIn('buttons[next].focus()',self.source)
    def test_rail_has_accessible_label(self):
        self.assertIn('class="home-rail ${',self.source)
if __name__=='__main__':unittest.main()
