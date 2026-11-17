"""Step 11 sidebar: three-state desktop navigation and mobile independence (offline)."""
from pathlib import Path
from urllib.parse import unquote, urlparse
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[1]
source=(root/'app.js').read_text()
css=(root/'style.css').read_text()+'\n'+(root/'trakt-rebuild.css').read_text()
fixture="""state.items=Array.from({length:8},(_,i)=>({id:100+i,title:'Film '+i,release_date:'2026-01-01',image:'',overview:'Description'}));renderMain();"""
with sync_playwright() as pw:
 browser=pw.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 for width in (375,1024,1440):
  page=browser.new_page(viewport={'width':width,'height':850},device_scale_factor=1)
  errors=[]
  page.on('pageerror',lambda e:errors.append(str(e)))
  def assets(route):
   target=(root/unquote(urlparse(route.request.url).path).lstrip('/')).resolve()
   if target.is_relative_to(root) and target.is_file():route.fulfill(path=str(target))
   else:route.fulfill(status=404,body='missing')
  page.route('https://mokumokuren.test/**',assets)
  page.set_content('<base href="https://mokumokuren.test/"><div id="app"></div>')
  page.add_style_tag(content=css)
  page.evaluate("""() => {const data={};const storage={getItem:k=>data[k]??null,setItem:(k,v)=>data[k]=String(v),removeItem:k=>delete data[k]};Object.defineProperty(window,'localStorage',{value:storage});Object.defineProperty(window,'sessionStorage',{value:storage});window.fetch=async()=>({ok:false,status:503,text:async()=>'{}',json:async()=>({})})}""")
  page.add_script_tag(content='(async()=>{'+source.replace('await callback();layout();setupConnectivity();await verifyAccounts();load();','await callback();layout();'+fixture)+'})().catch(e=>console.error(e))')
  page.wait_for_timeout(250)
  if width<960:
   assert not page.locator('#desktop-sidebar-toggle').is_visible()
   assert not page.locator('.desktop-sidebar').is_visible()
   assert page.locator('#menu-trigger').is_visible()
   assert page.locator('.mobile-top-tabs').is_visible()
  else:
   assert page.locator('#desktop-sidebar-toggle').is_visible()
   assert page.locator('.desktop-sidebar').is_visible()
   assert page.locator('.workspace').get_attribute('data-sidebar-mode')=='expanded'
   page.locator('#desktop-sidebar-toggle').click()
   assert page.locator('.workspace').get_attribute('data-sidebar-mode')=='compact'
   assert page.locator('.desktop-sidebar').is_visible()
   assert page.locator('.desktop-sidebar .side-label').first.is_hidden()
   assert page.locator('#desktop-sidebar-toggle').get_attribute('aria-label')=='Hide sidebar'
   assert 50<=page.locator('.desktop-sidebar').bounding_box()['width']<=70
   page.screenshot(path=str(root.parent/f'mokumokuren-sidebar-compact-{width}.png'))
   page.locator('[data-side-tab="Discover"]').click()
   assert page.locator('.workspace').get_attribute('data-sidebar-mode')=='compact', 'mode lost during nav rerender'
   page.locator('#desktop-sidebar-toggle').click()
   assert page.locator('.workspace').get_attribute('data-sidebar-mode')=='hidden'
   assert not page.locator('.desktop-sidebar').is_visible()
   assert page.locator('#desktop-sidebar-toggle').is_visible()
   assert page.evaluate('document.querySelector("#main").getBoundingClientRect().left < 50')
   page.screenshot(path=str(root.parent/f'mokumokuren-sidebar-hidden-{width}.png'))
   page.locator('#desktop-sidebar-toggle').click()
   assert page.locator('.workspace').get_attribute('data-sidebar-mode')=='expanded'
   assert page.locator('.desktop-sidebar').is_visible()
   assert page.locator('#desktop-sidebar-toggle').get_attribute('aria-label')=='Collapse sidebar'
  assert page.evaluate('document.documentElement.scrollWidth<=innerWidth'),('horizontal overflow',width)
  assert not errors,(width,errors)
  print('PASS',width,'sidebar modes and no overflow')
  page.close()
 browser.close()
