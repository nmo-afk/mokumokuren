"""Built bundle smoke: request every app asset from dist in offline Chromium.

The sandbox blocks local HTTP navigation; this test routes a synthetic origin to
real built files, preserving CSS/JS URL loading without a live server.
"""
from pathlib import Path
from urllib.parse import unquote, urlparse
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parents[1]
DIST=ROOT/'dist'
assert (DIST/'trakt-rebuild.css').is_file(), 'Run node scripts/build-release.mjs first'
with sync_playwright() as pw:
 browser=pw.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 for width in (375,1440):
  page=browser.new_page(viewport={'width':width,'height':800})
  errors=[];page.on('pageerror',lambda error:errors.append(str(error)))
  assets=[]
  def route_asset(route):
   path=unquote(urlparse(route.request.url).path).lstrip('/')
   target=(DIST/path).resolve()
   if target.is_relative_to(DIST) and target.is_file():
    assets.append(path)
    route.fulfill(path=str(target))
   else:route.fulfill(status=404,body='Missing asset')
  page.route('https://mokumokuren.test/**',route_asset)
  # about:blank has denied storage, so provide test-only memory-backed storage.
  page.evaluate("""() => {const m={};const storage={getItem:k=>m[k]??null,setItem:(k,v)=>m[k]=String(v),removeItem:k=>delete m[k]};Object.defineProperty(window,'localStorage',{value:storage});Object.defineProperty(window,'sessionStorage',{value:storage});window.fetch=async()=>({ok:false,status:503,text:async()=>'{}',json:async()=>({})});}""")
  index=(DIST/'index.html').read_text().replace('<head>','<head><base href="https://mokumokuren.test/">',1)
  page.set_content(index,wait_until='domcontentloaded')
  page.locator('.quick-mode').first.wait_for(timeout=15000)
  assert 'app.js' in assets and 'style.css' in assets and 'trakt-rebuild.css' in assets,(width,assets)
  assert page.evaluate('getComputedStyle(document.querySelector(".top")).position')=='sticky'
  assert page.locator('.mobile-top-tabs').is_visible()==(width<960)
  assert page.locator('.desktop-sidebar').is_visible()==(width>=960)
  assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
  assert not errors,(width,errors)
  print(f'PASS built files {width}px: CSS/JS loaded from dist, sticky navigation, no JS errors or overflow')
  page.close()
 browser.close()
