"""Replica step 2: compact segmented navbar, sidebar hit targets, hotkeys.
All provider calls are mocked, no credentials or remote writes.
"""
from pathlib import Path
from urllib.parse import unquote,urlparse
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
JS=(ROOT/'app.js').read_text()
CSS=(ROOT/'style.css').read_text()+'\n'+(ROOT/'trakt-rebuild.css').read_text()
FIXTURE="""state.items=[{id:123,title:'Test Movie',release_date:'2026-01-01',overview:'Test'}];renderMain();window.__ready=true;"""
with sync_playwright() as pw:
 browser=pw.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 for width in (320,375,768,1024,1440):
  page=browser.new_page(viewport={'width':width,'height':850})
  errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  def assets(route):
   target=(ROOT/unquote(urlparse(route.request.url).path).lstrip('/')).resolve()
   route.fulfill(path=str(target)) if target.is_relative_to(ROOT) and target.is_file() else route.fulfill(status=404,body='missing')
  page.route('https://mokumokuren.test/**',assets)
  page.set_content('<base href="https://mokumokuren.test/"><div id="app"></div>')
  page.add_style_tag(content=CSS)
  page.evaluate('''() => {let m={};let storage={getItem:k=>m[k]??null,setItem:(k,v)=>m[k]=String(v),removeItem:k=>delete m[k]};Object.defineProperty(window,'localStorage',{value:storage});Object.defineProperty(window,'sessionStorage',{value:storage});window.fetch=async()=>({ok:false,status:503,text:async()=>'{"error":"offline"}',json:async()=>({})})}''')
  page.add_script_tag(content='(async()=>{'+JS.replace('await callback();layout();setupConnectivity();await verifyAccounts();load();','await callback();layout();'+FIXTURE)+'})().catch(e=>console.error(e))')
  page.wait_for_function('window.__ready===true')
  assert page.locator('.quick-mode[role="radio"]').count()==3
  assert page.locator('.quick-mode[aria-checked="true"]').count()==1
  assert page.locator('.quick-mode.active').get_attribute('aria-label')=='Movies'
  assert page.locator('.header-tools button').count()==3
  assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
  if width>=960:
   aside=page.locator('.desktop-sidebar').bounding_box();top=page.locator('.top').bounding_box();toggle=page.locator('#desktop-sidebar-toggle').bounding_box()
   assert abs(aside['width']-208)<1.5,(width,'wrong expanded width',aside)
   assert toggle['x']>=aside['x']+aside['width']-1,(width,'sidebar blocks collapse toggle')
   assert abs(top['height']-56)<2,(width,'toolbar height')
   assert page.locator('.quick-mode:not(.active) .segment-label').first.is_hidden()
  else:
   assert page.locator('#desktop-sidebar-toggle').is_hidden()
   assert page.locator('.top').bounding_box()['height']<180,(width,'mobile top too tall')
   assert page.locator('.mobile-top-tabs').is_visible()
  page.locator('.quick-mode.active').focus()
  page.keyboard.press('ArrowRight')
  assert page.locator('.quick-mode.active').get_attribute('aria-label')=='TV Shows',(width,'keyboard selector')
  assert page.locator('.quick-mode.active').get_attribute('aria-checked')=='true'
  assert page.locator('.quick-mode.active').get_attribute('tabindex')=='0'
  page.keyboard.press('End')
  assert page.locator('.quick-mode.active').get_attribute('aria-label')=='Anime'
  page.keyboard.press('Home')
  assert page.locator('.quick-mode.active').get_attribute('aria-label')=='Movies'
  page.locator('#header-settings').click()
  assert page.locator('[data-side-tab="Profile"].active').count()==1
  page.locator('#header-filter').click() if width>=960 else page.locator('#quick-search').click()
  assert page.locator('[data-side-tab="Discover"].active').count()==1
  page.locator('[data-side-tab="Recommended"]').click() if width>=960 else page.locator('[data-mobile-tab="Recommended"]').click()
  page.keyboard.press('/')
  assert page.locator('[data-side-tab="Discover"].active').count()==1,(width,'search shortcut')
  assert not errors,(width,errors)
  print('PASS',width,'Trakt-style segmented selector, keyboard, sidebar geometry, search and profile')
  page.close()
 browser.close()
