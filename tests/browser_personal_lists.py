"""Real Chromium exercise of local personal list creation, toggling and deletion."""
from pathlib import Path
from urllib.parse import unquote,urlparse
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
JS=(ROOT/'app.js').read_text();CSS=(ROOT/'style.css').read_text()
with sync_playwright() as pw:
 browser=pw.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 for width in (375,768,1440):
  page=browser.new_page(viewport={'width':width,'height':900});errors=[]
  page.on('pageerror',lambda e:errors.append(str(e)))
  def assets(route):
   path=unquote(urlparse(route.request.url).path).lstrip('/');target=(ROOT/path).resolve()
   if target.is_relative_to(ROOT) and target.is_file():route.fulfill(path=str(target))
   else:route.fulfill(status=404,body='missing')
  page.route('https://mokumokuren.test/**',assets)
  page.set_content('<base href="https://mokumokuren.test/"><div id="app"></div>');page.add_style_tag(content=CSS)
  page.evaluate("""() => {const m={};const s={getItem:k=>m[k]??null,setItem:(k,v)=>m[k]=String(v),removeItem:k=>delete m[k]};Object.defineProperty(window,'localStorage',{value:s});Object.defineProperty(window,'sessionStorage',{value:s});window.fetch=async()=>({ok:false,status:503,text:async()=>'{}',json:async()=>({})});}""")
  fixture="state.section='Movies';state.tab='Watchlist';state.items=[{id:55,title:'Test Film',overview:'Film details',release_date:'2024-01-01'}];renderMain();"
  page.add_script_tag(content='(async()=>{'+JS.replace('await callback();layout();setupConnectivity();await verifyAccounts();load();','await callback();layout();'+fixture)+'})().catch(e=>console.error(e))')
  page.wait_for_timeout(100)
  page.locator('#menu-trigger').click();page.locator('#drawer-personal-lists').click()
  page.locator('#personal-list-name').fill('Favorites');page.locator('#create-personal-list button[type=submit]').click()
  assert page.locator('.personal-list-group').count()==1
  page.locator('.personal-list-overlay .close').click()
  page.locator('#library-results .poster').first.click()
  page.locator('#save-personal-list').click()
  page.locator('[data-toggle-list]').click()
  assert 'Test Film' in page.locator('.personal-list-items').inner_text()
  assert len(page.evaluate("JSON.parse(localStorage.getItem('mok_personal_lists_v1'))[0].items"))==1
  page.locator('[data-toggle-list]').click()
  assert len(page.evaluate("JSON.parse(localStorage.getItem('mok_personal_lists_v1'))[0].items"))==0
  page.locator('[data-delete-list]').click()
  assert page.locator('.personal-list-group').count()==0
  assert not errors,(width,errors)
  assert page.evaluate('document.documentElement.scrollWidth<=innerWidth'),(width,'overflow')
  print(f'PASS {width}px personal lists create/add/remove/delete')
  page.close()
 browser.close()
