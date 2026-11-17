"""Visual milestone smoke: responsive populated feature, rails, navigation, long titles."""
from pathlib import Path
from urllib.parse import unquote,urlparse
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
JS=(ROOT/'app.js').read_text();CSS=(ROOT/'style.css').read_text();REBUILD_CSS=(ROOT/'trakt-rebuild.css').read_text()
with sync_playwright() as pw:
 browser=pw.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 for width in (320,375,768,1024,1440):
  page=browser.new_page(viewport={'width':width,'height':900})
  errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  def assets(route):
   path=unquote(urlparse(route.request.url).path).lstrip('/');target=(ROOT/path).resolve()
   if target.is_relative_to(ROOT) and target.is_file():route.fulfill(path=str(target))
   else:route.fulfill(status=404,body='missing')
  page.route('https://mokumokuren.test/**',assets)
  page.set_content('<base href="https://mokumokuren.test/"><div id="app"></div>')
  page.add_style_tag(content=CSS)
  page.add_style_tag(content=REBUILD_CSS)
  page.evaluate('''() => {const m={};const s={getItem:k=>m[k]??null,setItem:(k,v)=>m[k]=String(v),removeItem:k=>delete m[k]};Object.defineProperty(window,'localStorage',{value:s});Object.defineProperty(window,'sessionStorage',{value:s});window.fetch=async()=>({ok:false,status:503,text:async()=>'{}',json:async()=>({})});}''')
  fixture='''state.section='Movies';state.tab='Recommended';state.items=Array.from({length:14},(_,i)=>({id:100+i,title:i===0?'A Very Long Cinematic Title About Unexpected Journeys Across Many Worlds':'Featured Film '+i,overview:'A richly layered story about discovery, memory, and the unexpected connections between people.',release_date:'2025-06-12',vote_average:7.8,image:'data:image/svg+xml,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="300" height="450"><rect width="300" height="450" fill="#304d4b"/></svg>'),backdrop_image:'data:image/svg+xml,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="800" height="450"><rect width="800" height="450" fill="#4c3049"/></svg>')}));renderMain();'''
  page.add_script_tag(content='(async()=>{'+JS.replace('await callback();layout();setupConnectivity();await verifyAccounts();load();','await callback();layout();'+fixture)+'})().catch(e=>console.error(e))')
  page.wait_for_timeout(350)
  # Validate the *actual* two-stylesheet application shell, not legacy CSS alone.
  assert page.locator('.shell .workspace>.top').evaluate('(e)=>getComputedStyle(e).position')=='sticky',(width,'mobile/desktop top bar is not sticky')
  assert page.locator('.shell .workspace>.top').bounding_box()['y']<=2,(width,'top bar is not at top')
  if width>=960:
   assert page.locator('.desktop-sidebar').is_visible(),(width,'desktop sidebar missing')
   assert not page.locator('.mobile-top-tabs').is_visible(),(width,'mobile tabs leaked into desktop')
  else:
   assert page.locator('.mobile-top-tabs').is_visible(),(width,'mobile top navigation missing')
   assert not page.locator('.desktop-sidebar').is_visible(),(width,'desktop sidebar leaked into mobile')
  assert page.locator('.feature-widget').is_visible(),(width,'missing feature')
  assert page.locator('.recommendation-gallery .poster').count()==14,(width,'missing cards')
  assert page.evaluate('document.documentElement.scrollWidth<=innerWidth'),(width,'page overflow')
  assert page.evaluate('''() => {let f=document.querySelector('.feature-widget').getBoundingClientRect(),p=document.querySelector('.feature-pagination').getBoundingClientRect();return p.left>=f.left&&p.right<=f.right&&p.top>=f.top&&p.bottom<=f.bottom}'''),(width,'feature controls outside widget')
  page.locator('[data-feature-step="1"]').click()
  assert 'Featured Film 1' in page.locator('.feature-copy h2').inner_text(),(width,'feature navigation')
  page.locator('.recommendation-gallery .poster').nth(3).click()
  assert page.locator('.detail-modal').is_visible(),(width,'detail opening')
  page.keyboard.press('Escape');assert page.locator('.detail-modal').count()==0,(width,'detail dismissal')
  assert not errors,(width,errors)
  assert page.evaluate("document.querySelector('style:last-of-type').textContent.includes('--ui-accent')"),(width,'missing rebuild CSS')
  broken_icons=page.evaluate("Array.from(document.querySelectorAll('img.af-icon')).filter(e=>!e.complete || e.naturalWidth===0).map(e=>e.getAttribute('src'))")
  assert not broken_icons,(width,'broken icons: '+str(broken_icons[:8]))
  page.evaluate('window.scrollTo(0,0)')
  page.wait_for_timeout(150)
  page.screenshot(path=str(ROOT.parent/f'step11-actual-home-{width}.png'),full_page=True)
  print(f'PASS {width}px: responsive feature, 14 cards, carousel, details, no overflow/errors')
  page.close()
 browser.close()
