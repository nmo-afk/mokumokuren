"""One-time token consolidation for Trakt-style visual CSS.
Replaces competing historical :root variable declarations with a single explicit
palette and leaves all non-variable component rules intact.
"""
from pathlib import Path
import re,tinycss2
p=Path(__file__).resolve().parents[1]/'trakt-rebuild.css'
s=p.read_text()
rootpattern=re.compile(r':root\s*\{([^{}]*)\}',re.S)
blocks=list(rootpattern.finditer(s))
assert len(blocks)>=2,'Expected historical root declarations to consolidate'
values={}
for block in blocks:
 for d in tinycss2.parse_declaration_list(block.group(1),skip_comments=True,skip_whitespace=True):
  if d.type=='declaration' and d.name.startswith('--'):
   values[d.name]=tinycss2.serialize(d.value).strip()
# The user's final, overriding palette is intentionally not inferred from old CSS.
values.update({
 '--moku-primary':'#960012','--moku-bg':'#960012','--moku-secondary':'#FBD242',
 '--moku-text':'#F2F4F3','--moku-tertiary':'#006757',
 '--moku-panel':'#79000f','--moku-raised':'#65000f','--moku-brand-wash':'#79000f',
 '--moku-raised-brand':'#65000f','--moku-stroke':'rgba(251,210,66,.25)',
 '--moku-gold-wash':'rgba(251,210,66,.16)',
 '--ui-bg':'var(--moku-bg)','--ui-background':'var(--moku-bg)',
 '--ui-sidebar':'var(--moku-panel)','--ui-panel':'var(--moku-panel)',
 '--ui-panel-raised':'var(--moku-raised)','--ui-line':'var(--moku-stroke)',
 '--ui-foreground':'var(--moku-text)','--ui-muted':'#e2cdd0',
 '--ui-gold':'var(--moku-secondary)','--ui-secondary':'var(--moku-secondary)',
 '--ui-accent':'var(--moku-primary)','--ui-primary':'var(--moku-primary)',
 '--ui-red':'var(--moku-primary)','--ui-tertiary':'var(--moku-tertiary)',
 '--deep':'var(--moku-bg)','--surface':'var(--moku-panel)',
 '--surface2':'var(--moku-raised)','--ivory':'var(--moku-text)',
 '--red':'var(--moku-primary)','--gold':'var(--moku-secondary)',
})
# Keep non-custom declarations in old :root blocks (font, color, etc).
# All custom properties are gathered above and emitted only once.
def clean(block):
 declarations=tinycss2.parse_declaration_list(block.group(1),skip_comments=True,skip_whitespace=True)
 other=[d for d in declarations if d.type=='declaration' and not d.name.startswith('--')]
 return ':root{'+''.join(d.name+':'+tinycss2.serialize(d.value).strip()+('!important' if d.important else '')+';' for d in other)+'}' if other else ''
s=rootpattern.sub(clean,s)
header='''/* AUTHORITATIVE MOKUMOKUREN THEME — user confirmed 2026-11-11.
   Trakt layout and button geometry are reference-driven. Burgundy is the page
   canvas, gold replaces Trakt selection purple, ivory is the readable copy.
   Emerald is only for limited tertiary/connected-account states. */
:root{\n'''+''.join(f'  {name}:{val};\n' for name,val in values.items())+'}\n'
p.write_text(header+s)
print('Consolidated',len(blocks),'historical root blocks into',len(values),'single-owner tokens')
