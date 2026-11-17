"""Browser regression for persisted homepage priority and reset."""
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
JS=(ROOT/'app.js').read_text(); CSS=(ROOT/'style.css').read_text()+'\n'+(ROOT/'trakt-rebuild.css').read_text()
fixture="""state.section='Movies';state.tab='Recommended';state.items=[{id:101,title:'Priority Fixture',overview:'Fixture',release_date:'2025-01-01',image:'',backdrop_image:''}];renderMain();"""
with sync_playwright() as pw:
 browser=pw.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 for width in (375,768,1440):
  page=browser.new_page(viewport={'width':width,'height':900})
  errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  page.set_content('<div id="app"></div>');page.add_style_tag(content=CSS)
  page.evaluate("""() => {const m={};const s={getItem:k=>m[k]??null,setItem:(k,v)=>m[k]=String(v),removeItem:k=>delete m[k]};Object.defineProperty(window,'localStorage',{value:s});Object.defineProperty(window,'sessionStorage',{value:s});window.fetch=async()=>({ok:false,status:503,json:async()=>({}),text:async()=>'{}'});}""")
  page.add_script_tag(content='(async()=>{'+JS.replace('await callback();layout();setupConnectivity();await verifyAccounts();load();','await callback();layout();'+fixture)+'})().catch(e=>console.error(e))')
  page.wait_for_timeout(150)
  if width < 960:
   page.locator('#menu-trigger').click();page.locator('#drawer-settings').click()
  else: page.locator('[data-side-action="settings"]').click()
  page.locator('#home-priority').select_option('library')
  assert page.locator(".trakt-home-extras .feature-widget").count()==1
  assert page.locator(".trakt-start-watching").count()==1
  assert page.evaluate("JSON.parse(localStorage.getItem('mok_home_prefs')).priority")=='library'
  page.locator('.settings .close').click()
  page.locator(".trakt-home-extras summary").click()
  page.locator('[data-feature-step="1"]').click() if page.locator('[data-feature-step="1"]').count() else None
  assert page.locator(".trakt-home-extras .feature-widget").count()==1
  assert page.locator(".trakt-start-watching").count()==1
  if width < 960:
   page.locator('#menu-trigger').click();page.locator('#drawer-settings').click()
  else: page.locator('[data-side-action="settings"]').click()
  assert page.locator('#home-priority').input_value()=='library'
  page.locator('#home-reset').click()
  assert page.locator('#home-priority').input_value()=='featured'
  assert page.locator('.trakt-home-extras .feature-widget').count()==1
  assert page.evaluate("JSON.parse(localStorage.getItem('mok_home_prefs')).priority")=='featured'
  page.locator('.settings .close').click()
  assert not errors,(width,errors)
  print(f'PASS {width}px homepage priority, persistence, reset')
  page.close()
 browser.close()
