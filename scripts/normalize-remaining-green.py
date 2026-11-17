"""Replace legacy green-tinted UI colors with the confirmed Trakt-replica palette.
Green is reserved for the explicit tertiary variable and successful connections.
One-time migration; not run as part of the build.
"""
from pathlib import Path
import colorsys,re
root=Path(__file__).resolve().parents[1]
for name in ('style.css','trakt-rebuild.css'):
 p=root/name
 raw=p.read_text()
 swaps=[]
 def transform(m):
  token=m.group(1)
  hexval=token[:6]
  rgb=[int(hexval[i:i+2],16) for i in (0,2,4)]
  r,g,b=rgb
  h,l,s=colorsys.rgb_to_hls(r/255,g/255,b/255)
  if not (65<=h*360<=195 and s>.08 and g>r*1.2 and g>b*1.03):return m.group(0)
  if hexval.lower()=='006757':return m.group(0)
  if hexval.lower()=='43b785':result='006757'
  elif l>.74:result='f2f4f3'
  elif g>115 and s>.4:result='FBD242'
  elif l>.36:result='d6b4b8'
  elif g>64:result='912838'
  else:result='65000f'
  swaps.append((token,result))
  return '#'+result+token[6:]
 raw=re.sub(r'#([a-fA-F0-9]{8}|[a-fA-F0-9]{6})(?![a-fA-F0-9])',transform,raw)
 def rgba(m):
  func=m.group('fn');r=int(m.group('r'));g=int(m.group('g'));b=int(m.group('b'))
  suffix=m.group('suffix')
  if (g>r*1.2 and g>b*1.03 and g-r>12) or (r<=15 and g>20 and b>=g*.85 and b<=g*1.2):
   swaps.append((m.group(0), 'burgundy rgba'))
   return f'{func}(78,0,11{suffix})'
  return m.group(0)
 raw=re.sub(r'(?P<fn>rgba?)\(\s*(?P<r>\d+)\s*,\s*(?P<g>\d+)\s*,\s*(?P<b>\d+)(?P<suffix>\s*(?:,\s*\.?\d+)?\s*)\)',rgba,raw)
 p.write_text(raw)
 print(name,'remaining mapped:',len(swaps),'examples:',swaps[:10])
