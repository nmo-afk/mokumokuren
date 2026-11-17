"""Visual palette regression. Applies full legacy+rebuild CSS in browser; never uses live accounts."""
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
css=(ROOT/'style.css').read_text()+'\n'+(ROOT/'trakt-rebuild.css').read_text()
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage'])
 for width in (375,1024,1440):
  page=browser.new_page(viewport={'width':width,'height':900})
  page.set_content('''<div class="shell"><div class="workspace" data-sidebar-mode="expanded"><aside class="desktop-sidebar"><button class="active">Sidebar</button></aside><header class="top"><div class="quick-modes"><button class="quick-mode active">Movies</button></div><div class="mobile-top-tabs"><button class="active">Movies</button></div></header><main id="main"><section class="content"><button class="action">Primary</button><button class="chip active">Active chip</button><div class="trakt-section-shortcuts"><div class="trakt-shortcut-track"><button class="current">Home</button></div></div></section></main></div></div>''')
  page.add_style_tag(content=css)
  colors=page.evaluate('''() => {
   const c=s=>getComputedStyle(document.querySelector(s));
   return {background:c('body').backgroundColor,rootBackground:c(':root').backgroundColor,
    sidebar:c('.desktop-sidebar').backgroundColor,primary:c('.quick-mode.active').backgroundColor,selectedText:c('.quick-mode.active').color,selectedEdge:c('.quick-mode.active').boxShadow,
    primaryButton:c('#main .action').backgroundColor,section:c('#main .trakt-shortcut-track button.current').borderBottomColor,sidebarSelected:c('.desktop-sidebar button.active').color,
    mobile:c('.mobile-top-tabs button.active').color,
    bodyText:c('body').color,
    vars:['--moku-primary','--moku-secondary','--moku-tertiary','--moku-bg','--moku-text'].map(v=>c(':root').getPropertyValue(v).trim())};
  }''')
  assert colors['vars']==['#960012','#FBD242','#006757','#061D1B','#F2F4F3'],colors
  assert colors['background']=='rgb(6, 29, 27)',colors
  assert colors['bodyText']=='rgb(242, 244, 243)',colors
  assert colors['selectedText']=='rgb(251, 210, 66)',colors
  assert 'rgb(251, 210, 66)' in colors['selectedEdge'],colors
  assert colors['sidebarSelected']=='rgb(251, 210, 66)',colors
  assert colors['primaryButton']=='rgb(150, 0, 18)',colors
  assert colors['section']=='rgb(251, 210, 66)',colors
  if width<960:assert colors['mobile']=='rgb(251, 210, 66)',colors
  else:assert colors['sidebar']!='rgb(9, 40, 36)',colors
  print(f'PASS corrected palette at {width}px: red primary action, gold selection, ivory text, forest canvas, red-tinted chrome')
  page.close()
 browser.close()
