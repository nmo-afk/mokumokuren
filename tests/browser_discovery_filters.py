"""Real Chromium discovery filtering and poster identity regression, offline fixture."""
from pathlib import Path
from urllib.parse import unquote,urlparse
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
JS=(ROOT/'app.js').read_text();CSS=(ROOT/'style.css').read_text()
fixture="""state.section='Movies';state.tab='Recommended';state.items=[{id:101,title:'Amber Harbour',overview:'Quiet mystery',genres:['Drama'],image:null},{id:102,title:'Blue Comet',overview:'A fast journey',genres:['Science Fiction'],image:null},{id:103,title:'Amber Signal',overview:'A science fiction mystery',genres:['Science Fiction'],image:null}];renderMain();"""
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
  page.add_script_tag(content='(async()=>{'+JS.replace('await callback();layout();setupConnectivity();await verifyAccounts();load();','await callback();layout();'+fixture)+'})().catch(e=>console.error(e))')
  page.wait_for_timeout(100)
  assert page.locator('.recommendation-gallery .poster').count()==3,(width,'initial cards')
  page.locator('#discovery-search').fill('Amber')
  assert page.locator('.recommendation-gallery .poster').count()==2,(width,'search filtering')
  page.locator('#discovery-genre').select_option(label='Science Fiction')
  assert page.locator('.recommendation-gallery .poster').count()==1,(width,'combined filtering')
  assert '1 of 3' in page.locator('#discovery-count').inner_text()
  page.locator('.recommendation-gallery .poster').click()
  assert page.locator('.detail-modal').is_visible(),(width,'filtered card did not open')
  assert 'Amber Signal' in page.locator('.detail-modal').inner_text(),(width,'wrong detail opened')
  page.keyboard.press('Escape')
  page.locator('#discovery-search').fill('nonexistent')
  assert page.locator('.recommendation-gallery .poster').count()==0
  assert page.locator('#discovery-filter-empty').is_visible()
  page.locator('#discovery-search').fill('')
  page.locator('#discovery-genre').select_option('')
  assert page.locator('.recommendation-gallery .poster').count()==3
  page.locator('#toggle').click()
  assert page.locator('.recommendation-gallery .poster').count()==3,(width,'view toggle lost results')
  page.locator('#discovery-search').fill('Blue')
  assert page.locator('.recommendation-gallery .poster').count()==1,(width,'filter after view toggle')
  page.locator('#discovery-search').fill('')
  assert not errors,(width,errors)
  assert page.evaluate('document.documentElement.scrollWidth<=innerWidth'),(width,'overflow')
  print(f'PASS {width}px discovery search, combined genre, card identity, empty state, reset')
  page.close()
 browser.close()
