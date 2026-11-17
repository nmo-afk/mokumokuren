"""Static guardrails for the approved responsive navigation and poster architecture.

These checks are not a substitute for a browser screenshot audit.
"""
import pathlib
import unittest

ROOT=pathlib.Path(__file__).resolve().parents[1]
CSS=(ROOT/'style.css').read_text()
JS=(ROOT/'app.js').read_text()

class ResponsiveLayoutAudit(unittest.TestCase):
 def test_narrow_phone_and_small_phone_breakpoints(self):
  self.assertIn('@media(max-width:480px)',CSS)
  self.assertIn('@media(max-width:350px)',CSS)
 def test_feature_controls_have_reserved_mobile_space(self):
  self.assertIn('padding:22px 17px 83px!important',CSS)
  self.assertIn('.feature-pagination{bottom:13px',CSS)
 def test_drawer_respects_safe_areas_and_viewport(self):
  self.assertIn('.mobile-drawer:not([hidden]){height:100dvh',CSS)
  self.assertIn('env(safe-area-inset-bottom)',CSS)
 def test_poster_rails_scroll_instead_of_expanding_page(self):
  self.assertIn('.home-rail-track,.recommendation-gallery{max-width:100%',CSS)
  self.assertIn('html{overflow-x:clip}',CSS)
 def test_single_overlay_navigation_architecture(self):
  self.assertEqual(JS.count('id="menu-trigger"'),1)
  self.assertEqual(JS.count('id="mobile-drawer"'),1)
  self.assertIn('.primary-nav,.subnav,.desktop-search,.settings-trigger{display:none!important}',CSS)
