"""Real Chromium regression: missing posters and detail artwork must degrade gracefully."""
from pathlib import Path
from urllib.parse import unquote,urlparse
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
JS=(ROOT/'app.js').read_text();CSS=(ROOT/'style.css').read_text()+'\n'+(ROOT/'trakt-rebuild.css').read_text()
with sync_playwright() as pw:
 browser=pw.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 for width in (375,768,1440):
  page=browser.new_page(viewport={'width':width,'height':900}); errors=[]
  page.on('pageerror',lambda e:errors.append(str(e)))
  def route_asset(route):
   path=unquote(urlparse(route.request.url).path).lstrip('/'); target=(ROOT/path).resolve()
   if path=='fixture':route.fulfill(content_type='text/html',body='<div id="app"></div>')
   elif target.is_relative_to(ROOT) and target.is_file():route.fulfill(path=str(target))
   else:route.fulfill(status=404,body='missing')
  page.route('https://mokumokuren.test/**',route_asset)
  page.goto('https://mokumokuren.test/fixture')
  page.add_style_tag(content=CSS)
  page.evaluate('''() => {const m={};const s={getItem:k=>m[k]??null,setItem:(k,v)=>m[k]=String(v),removeItem:k=>delete m[k]};Object.defineProperty(window,'localStorage',{value:s});Object.defineProperty(window,'sessionStorage',{value:s});window.fetch=async()=>({ok:false,status:503,text:async()=>'{}',json:async()=>({})});}''')
  fixture="""state.section='Movies';state.tab='Recommended';state.items=Array.from({length:8},(_,i)=>({id:100+i,title:'Artwork failure '+i,overview:'A test item',release_date:'2025-06-12',image:'https://mokumokuren.test/missing-'+i+'.jpg'}));renderMain();"""
  page.add_script_tag(content='(async()=>{'+JS.replace('await callback();layout();setupConnectivity();await verifyAccounts();load();','await callback();layout();'+fixture)+'})().catch(e=>console.error(e))')
  for poster in page.locator('.poster').all():
   poster.scroll_into_view_if_needed()
  page.wait_for_function("() => document.querySelectorAll('.poster .placeholder').length === 8",timeout=10000)
  assert page.locator('.poster .placeholder .af-icon').count()==8,(width,'missing fallback')
  page.wait_for_function("[...document.querySelectorAll('.poster .placeholder svg.trakt-icon')].every(icon=>icon.getBBox().width>0)")
  page.locator('.poster').first.click()
  assert page.locator('.detail-modal').is_visible()
  page.wait_for_function("() => {const x=document.querySelector('.detail-poster');return !x || x.hidden}")
  assert not errors,(width,errors)
  assert page.evaluate('document.documentElement.scrollWidth<=innerWidth'),(width,'overflow')
  page.keyboard.press('Escape');assert page.locator('.detail-modal').count()==0
  print(f'PASS {width}px: 8 broken posters replaced; detail image hidden; no errors/overflow')
  page.close()
 browser.close()
