"""Offline browser checks for Trakt-style shell. No live credentials/API requests."""
from pathlib import Path
from urllib.parse import unquote, urlparse
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parents[1]
APP=(ROOT/'app.js').read_text()
BASE=(ROOT/'style.css').read_text()
UI=(ROOT/'trakt-rebuild.css').read_text()
FIXTURE=r'''state.section='Movies';state.tab='Recommended';
const colors=['#355246','#4b3b4b','#624b3c','#384b64','#6a3b39'];
const art=(i,wide=false)=>{let w=wide?950:390,h=wide?520:585;let svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><defs><linearGradient id="g" x2="1" y2="1"><stop stop-color="${colors[i%colors.length]}"/><stop offset="1" stop-color="#111b20"/></linearGradient></defs><rect width="100%" height="100%" fill="url(#g)"/><circle cx="${w*.73}" cy="${h*.34}" r="${h*.31}" fill="#dabb89" opacity=".3"/><path d="M0 ${h*.95}L${w*.42} ${h*.42}L${w} ${h*.94}V${h}H0Z" fill="#091e1c" opacity=".75"/></svg>`;return 'data:image/svg+xml,'+encodeURIComponent(svg)};
state.items=Array.from({length:16},(_,i)=>({id:i+100,title:['The Longest Night','Beyond the Shore','Winter Archive','Silent City','Lost Horizons'][i%5]+' '+(i+1),overview:'A richly layered story about discovery, memory, and unexpected connections between people.',release_date:'2025-06-12',vote_average:7.8,image:art(i),backdrop_image:art(i,true)}));
renderMain();let dashboard=document.querySelector('#home-dashboard');if(dashboard){dashboard.innerHTML=homeRail('Continue Watching',state.items.slice(0,4).map((x,i)=>({...x,progress:(20+i*20)+'%',nextEpisode:{season:2,number:i+1,title:'The next episode'}})),'Pick up where you left off')+homeRail('Your Watchlist',state.items.slice(4,9),'Saved for later');}
'''
with sync_playwright() as pw:
 browser=pw.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 for width in (320,375,768,1024,1440):
  page=browser.new_page(viewport={'width':width,'height':850},device_scale_factor=1)
  errors=[];page.on('pageerror',lambda error:errors.append(str(error)))
  def route_asset(route):
   target=(ROOT/unquote(urlparse(route.request.url).path).lstrip('/')).resolve()
   if target.is_relative_to(ROOT) and target.is_file():route.fulfill(path=str(target))
   else:route.fulfill(status=404,body='not found')
  page.route('https://mokumokuren.test/**',route_asset)
  page.set_content('<base href="https://mokumokuren.test/"><div id="app"></div>')
  page.add_style_tag(content=BASE)
  page.add_style_tag(content=UI)
  page.evaluate('''() => {const data={};let store={getItem:k=>data[k]??null,setItem:(k,v)=>data[k]=String(v),removeItem:k=>delete data[k]};Object.defineProperty(window,'localStorage',{value:store});Object.defineProperty(window,'sessionStorage',{value:store});window.fetch=async()=>({ok:false,status:503,text:async()=>'{}',json:async()=>({})});}''')
  page.add_script_tag(content='(async()=>{'+APP.replace('await callback();layout();setupConnectivity();await verifyAccounts();load();','await callback();layout();'+FIXTURE)+'})().catch(e=>console.error(e))')
  page.wait_for_timeout(350)
  assert not errors,(width,errors)
  assert page.locator('.desktop-sidebar').count()==1,(width,'desktop sidebar missing')
  assert page.locator('.mobile-top-tabs button').count()==5,(width,'tabs missing')
  assert page.locator('.quick-mode').count()==3,(width,'media selectors missing')
  assert page.locator('.poster-landscape').count()==4,(width,'landscape continue watching missing')
  gallery=page.locator('.recommendation-gallery')
  assert gallery.locator('.media-card>.poster').count()==16,(width,'posters missing')
  first_card=gallery.locator('.media-card').first
  trigger=first_card.locator('.card-menu-trigger')
  if width>=960:
   first_card.scroll_into_view_if_needed()
   before=trigger.bounding_box()
   first_card.locator('.poster').hover()
   page.wait_for_function("getComputedStyle(document.querySelector('.recommendation-gallery .media-card-art')).getPropertyValue('--moku-card-angle').trim()==='180deg'")
   after=trigger.bounding_box()
   assert abs(before['x']-after['x'])<1 and abs(before['y']-after['y'])<1,(width,'menu trigger moved with the artwork')
  trigger.click()
  assert trigger.get_attribute('aria-expanded')=='true'
  assert first_card.get_by_role('button',name='Why this?').is_visible()
  assert page.locator('.detail-overlay').count()==0
  page.keyboard.press('Escape')
  assert trigger.get_attribute('aria-expanded')=='false'
  assert trigger.evaluate('(button)=>document.activeElement===button')
  assert page.evaluate('document.documentElement.scrollWidth<=innerWidth'),(width,'horizontal document overflow',page.evaluate('document.documentElement.scrollWidth'))
  assert page.evaluate('getComputedStyle(document.querySelector(".top")).position')=='sticky',(width,'header not sticky')
  if width >= 960:
   assert page.locator('.desktop-sidebar').is_visible(),(width,'sidebar hidden')
   assert not page.locator('.mobile-top-tabs').is_visible(),(width,'mobile tabs visible on desktop')
   assert page.evaluate('document.querySelector("#main").getBoundingClientRect().left>=205'),(width,'main panel covers sidebar')
  else:
   assert not page.locator('.desktop-sidebar').is_visible(),(width,'sidebar overlaps phone')
   assert page.locator('.mobile-top-tabs').is_visible(),(width,'mobile top tabs hidden')
   assert page.evaluate('''() => {const top=document.querySelector('.top').getBoundingClientRect(), main=document.querySelector('#main').getBoundingClientRect(); return main.top>=top.bottom-1}'''),(width,'header overlaps body')
   assert page.evaluate('document.querySelector(".top").getBoundingClientRect().bottom<180'),(width,'mobile header too tall')
  page.screenshot(path=str(ROOT.parent/f'mokumokuren-step2-{width}.png'),full_page=True)
  # Detail opening still delegates to the untouched data/interaction layer.
  page.locator('.recommendation-gallery .poster').first.click()
  assert page.locator('.detail-modal').is_visible(),(width,'detail did not open')
  page.keyboard.press('Escape')
  assert page.locator('.detail-modal').count()==0,(width,'detail did not dismiss')
  # Drawer, media selector and modal click must still behave correctly.
  if width<960:
   page.locator('#menu-trigger').click();assert page.locator('#mobile-drawer').is_visible()
   page.locator('#drawer-close').click();assert not page.locator('#mobile-drawer').is_visible()
   page.locator('[data-mobile-tab="Discover"]').click()
   assert page.locator('[data-mobile-tab="Discover"].active').count()==1,(width,'mobile navigation did not work')
  else:
   page.locator('[data-side-tab="Discover"]').click()
   assert page.locator('[data-side-tab="Discover"].active').count()==1,(width,'desktop navigation did not work')
  assert not errors,(width,errors)
  print(f'PASS {width}px: shell, responsive top navigation, {16} cards, landscape rail, no overflow/errors')
  page.close()
 browser.close()
