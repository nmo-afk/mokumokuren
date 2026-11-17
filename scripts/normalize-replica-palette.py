"""One-time migration of pre-Trakt green UI values to the user-approved theme.
Run only on a fresh copy of the most recent checkpoint. Does not touch JavaScript,
credentials, uploaded artwork or Arctic icon assets.
"""
from pathlib import Path
import re
ROOT=Path(__file__).resolve().parents[1]
TOKENS={
 '061d1b':'65000f','061b17':'65000f','071b17':'65000f','071e1a':'65000f',
 '08231f':'79000f','092924':'79000f','092824':'79000f','082b26':'79000f',
 '08251f':'79000f','10332e':'65000f','173b32':'65000f','18372e':'65000f',
 '153e31':'65000f','091e1c':'52000b','111719':'52000b','131d1c':'52000b',
 '2d4d43':'912838','35554c':'912838','364542':'912838',
 '445c55':'b7646d','486058':'b7646d','56675e':'b7646d',
 '29423e':'79000f','243533':'79000f',
 'b9cac4':'e2cdd0','c9d4cf':'e2cdd0','b8c6c1':'e2cdd0',
 'dbe4da':'f2f4f3','8b9d99':'d6b4b8','d8e0db':'f2f4f3','aab9b1':'d6b4b8',
 '4d5948':'d6b4b8','6b8076':'d6b4b8',
}
# Explicitly preserve emerald success and connected-state indicators.
PRESERVE={'006757','43b785'}
assert not set(TOKENS)&PRESERVE
for f in ('style.css','trakt-rebuild.css'):
 p=ROOT/f
 s=p.read_text()
 counts={}
 def sub(m):
  key=m.group(1).lower()
  if key not in TOKENS:return m.group()
  counts[key]=counts.get(key,0)+1
  # Preserve the opacity suffix in #RRGGBBAA values.
  return '#'+TOKENS[key]
 s=re.sub(r'#([0-9a-fA-F]{6})(?=[0-9a-fA-F]{2}\b|\b|[^0-9a-fA-F])',sub,s)
 # Remove remaining RGB green-tinted UI overlays.
 for a,b in [('rgba(10,32,30,','rgba(78,0,11,'),('rgba(11,23,24,','rgba(78,0,11,'),
             ('rgba(6,23,18,','rgba(78,0,11,'),('rgba(6,29,27,','rgba(78,0,11,'),
             ('rgba(1,9,8,','rgba(78,0,11,')]:
  if a in s:
   counts[a]=s.count(a)
   s=s.replace(a,b)
 p.write_text(s)
 print(f, 'replaced',sum(counts.values()),'legacy colour occurrences', sorted(counts.items(),key=lambda x:-x[1])[:10])
