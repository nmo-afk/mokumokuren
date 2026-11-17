"""Guard the user-approved palette against legacy theme regressions.
Does not mistake page-colour consistency for Trakt visual parity.
"""
from pathlib import Path
import unittest,colorsys,re
ROOT=Path(__file__).resolve().parents[1]
class ReplicaPaletteContract(unittest.TestCase):
 def test_single_theme_token_owner(self):
  rebuild=(ROOT/'trakt-rebuild.css').read_text()
  for token,expected in [('--moku-bg','#960012'),('--moku-primary','#960012'),
                         ('--moku-secondary','#FBD242'),('--moku-text','#F2F4F3'),
                         ('--moku-tertiary','#006757')]:
   self.assertEqual(rebuild.count(token+':'+expected+';'),1,token)
  self.assertIn('background-color:#960012!important',rebuild)
 def test_only_approved_green_appears_in_css_colors(self):
  for file in ('style.css','trakt-rebuild.css'):
   css=(ROOT/file).read_text()
   for token in re.findall(r'#([0-9a-fA-F]{6})(?:[0-9a-fA-F]{2})?\b',css):
    r,g,b=(int(token[i:i+2],16) for i in (0,2,4))
    h,l,s=colorsys.rgb_to_hls(r/255,g/255,b/255)
    if 65<=h*360<=195 and s>.08 and g>r*1.2 and g>b*1.03:
     self.assertEqual(token.lower(),'006757',f'Unexpected green in {file}: #{token}')
 def test_legacy_css_not_allowed_to_reintroduce_green_or_change_theme(self):
  css=(ROOT/'style.css').read_text()
  self.assertLess(css.count('!important'),170)
  html=(ROOT/'index.html').read_text()
  self.assertLess(html.index('href="/style.css"'),html.index('href="/trakt-rebuild.css"'))
  self.assertIn('name="theme-color" content="#960012"',html)
if __name__=='__main__':unittest.main()
