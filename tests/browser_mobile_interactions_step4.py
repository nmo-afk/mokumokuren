"""Step 4: real Chromium interaction checks, offline and account-safe.
Checks sticky top nav, responsive focus safety, modal actions, and horizontal rails.
"""
from pathlib import Path
from urllib.parse import unquote, urlparse
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
JS=(ROOT/'app.js').read_text()
CSS=(ROOT/'style.css').read_text()+'\n'+(ROOT/'trakt-rebuild.css').read_text()
fixture=(ROOT/'tests/browser_detail_step3.py').read_text().split("fixture='''",1)[1].split("'''",1)[0]
extra_js=r'''
const rawTmdb=tmdb;
tmdb=async path=>{
 const data=await rawTmdb(path);
 if(path==='/movie/501'){
  data.credits.cast=Array.from({length:23},(_,i)=>({name:'Actor '+(i+1),character:'Character '+(i+1),profile_path:'/a1.jpg'}));
 }
 if(path==='/movie/501/credits'){
  data.cast=Array.from({length:23},(_,i)=>({name:'Actor '+(i+1),character:'Character '+(i+1),profile_path:'/a1.jpg'}));
 }
 if(path==='/movie/501/recommendations'){
  data.results=Array.from({length:20},(_,i)=>({id:7010+i,title:'Related Film '+i,poster_path:'/c.jpg',release_date:'2025-03-01'}));
 }
 return data;
};
window.__step4SetTab=(tab)=>{state.tab=tab;layout();state.items=[];renderMain()};
window.__step4Ready=true;
'''
with sync_playwright() as pw:
 browser=pw.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 for width in (320,375,768,1440):
  page=browser.new_page(viewport={'width':width,'height':850},device_scale_factor=1)
  errors=[];missing=[]
  page.on('pageerror',lambda e:errors.append(str(e)))
  def asset(route):
   path=unquote(urlparse(route.request.url).path).lstrip('/')
   f=(ROOT/path).resolve()
   if f.is_relative_to(ROOT) and f.is_file():route.fulfill(path=str(f))
   else:missing.append(path);route.fulfill(status=404,body='not found')
  page.route('https://mokumokuren.test/**',asset)
  page.route('https://image.tmdb.org/**',lambda route:route.fulfill(status=200,content_type='image/svg+xml',body='<svg xmlns="http://www.w3.org/2000/svg" width="200" height="250"><rect width="200" height="250" fill="#536b5f"/></svg>'))
  page.set_content('<base href="https://mokumokuren.test/"><div id="app"></div>')
  page.add_style_tag(content=CSS)
  page.evaluate('''()=>{const m={};const s={getItem:k=>m[k]??null,setItem:(k,v)=>m[k]=String(v),removeItem:k=>delete m[k]};Object.defineProperty(window,'localStorage',{value:s});Object.defineProperty(window,'sessionStorage',{value:s});window.fetch=async()=>({ok:false,status:503,text:async()=>'{}',json:async()=>({})});}''')
  page.add_script_tag(content='(async()=>{'+JS.replace('await callback();layout();setupConnectivity();await verifyAccounts();load();','await callback();layout();'+fixture+extra_js)+'})().catch(e=>console.error(e))')
  page.wait_for_function('window.__step4Ready===true')
  assert page.evaluate('document.documentElement.scrollWidth<=innerWidth'),(width,'shell overflow')
  if width<960:
   # Re-render directly to avoid fetching while verifying navigation geometry.
   page.evaluate("()=>window.__step4SetTab('Discover')")
   page.wait_for_timeout(140)
   assert page.evaluate('''()=>{const r=document.querySelector('.mobile-top-tabs').getBoundingClientRect(),a=document.querySelector('[data-mobile-tab="Discover"]').getBoundingClientRect();return a.left>=r.left-3&&a.right<=r.right+3}'''),(width,'selected mobile tab is clipped')
   assert page.evaluate("getComputedStyle(document.querySelector('.top')).position==='sticky'")
   assert page.evaluate("document.querySelector('.top').getBoundingClientRect().bottom < 180"),(width,'mobile header too tall')
   assert page.evaluate('''()=>!Array.from(document.querySelectorAll('.shell *')).some(e=>getComputedStyle(e).position==='fixed'&&e.getBoundingClientRect().bottom>innerHeight-60&&e.getBoundingClientRect().height>30)'''),(width,'bottom app controls obstruct deployment badge')
  page.evaluate("()=>window.__fixture.render('Movies')")
  if width in (375,1440):page.screenshot(path=str(ROOT.parent/f'mokumokuren-step4-home-{width}.png'),animations='disabled')
  opener=page.locator('.recommendation-gallery .poster').first
  opener.focus();opener.click()
  detail=page.locator('.detail-screen')
  detail.locator('.detail-people-rail .detail-person').first.wait_for(timeout=10000)
  page.wait_for_timeout(120)
  assert detail.evaluate('(e)=>e.scrollWidth<=e.clientWidth+1'),(width,'detail overflow')
  if width in (375,1440):page.screenshot(path=str(ROOT.parent/f'mokumokuren-step4-detail-{width}.png'),animations='disabled')
  actions=detail.locator('#detail-secondary-actions')
  more=detail.locator('#detail-options')
  assert actions.evaluate('(e)=>e.inert'),(width,'closed menu still focusable')
  assert actions.get_attribute('aria-hidden')=='true'
  more.click()
  assert actions.is_visible()
  assert not actions.evaluate('(e)=>e.inert')
  assert actions.get_attribute('aria-hidden')=='false'
  page.keyboard.press('Escape')
  assert detail.is_visible(),(width,'escaping the menu closed the title detail')
  assert actions.evaluate('(e)=>e.inert')
  assert page.evaluate('document.activeElement?.id')=='detail-options'
  if width<=720:
   assert detail.locator('#watched').evaluate('(e)=>e.getBoundingClientRect().height')>=43
   page.set_viewport_size({'width':1024,'height':850})
   assert actions.evaluate('(e)=>e.inert')
   page.set_viewport_size({'width':width,'height':850})
  rail=detail.locator('.detail-people-rail')
  rail.focus();page.keyboard.press('ArrowRight')
  assert rail.evaluate('(e)=>e.scrollLeft>0'),(width,'keyboard rail scrolling broken')
  if width>720:
   controls=detail.locator('.detail-cast-section .rail-controls')
   assert controls.is_visible(),(width,'desktop rail navigation missing')
   rail.evaluate('(e)=>e.scrollLeft=0')
   controls.locator('.rail-next').click()
   page.wait_for_timeout(420)
   assert rail.evaluate('(e)=>e.scrollLeft>0'),(width,'next arrow failed')
  # Simulate accessing another tab from deep in the detail: view returns to the tab/content.
  detail.evaluate('(e)=>e.scrollTop=e.scrollHeight')
  detail.locator('[data-detail-tab="cast"]').click()
  detail.locator('.detail-content .people-grid .person').first.wait_for()
  assert detail.evaluate('''e=>{const t=e.querySelector('.detail-tabs').getBoundingClientRect(),head=e.querySelector('.detail-topbar').getBoundingClientRect();return t.top>=head.bottom-22&&t.top<=head.bottom+50}'''),(width,'tab content did not scroll into view')
  page.keyboard.press('Escape')
  assert page.locator('.detail-screen').count()==0
  assert page.evaluate("document.activeElement?.classList.contains('poster')"),(width,'focus not restored after closing detail')
  assert not page.evaluate("document.body.classList.contains('detail-open')")
  assert not errors,(width,errors)
  assert not missing,(width,missing)
  print(f'PASS Step 4 {width}px: selected top nav, no bottom nav/overflow, menu focus, keyboard rails, tab reveal, focus return')
  page.close()
 browser.close()
