"""Offline populated-layout visual regression; fixture imagery is synthetic, not live TMDB art."""
from pathlib import Path
from urllib.parse import unquote,urlparse
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
JS=(ROOT/'app.js').read_text(); CSS=(ROOT/'style.css').read_text()+'\n'+(ROOT/'trakt-rebuild.css').read_text()
with sync_playwright() as pw:
 browser=pw.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 for width in (375,768,1440):
  page=browser.new_page(viewport={'width':width,'height':900})
  errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  def assets(route):
   path=unquote(urlparse(route.request.url).path).lstrip('/'); target=(ROOT/path).resolve()
   if target.is_relative_to(ROOT) and target.is_file():route.fulfill(path=str(target))
   else:route.fulfill(status=404,body='missing')
  page.route('https://mokumokuren.test/**',assets)
  page.set_content('<base href="https://mokumokuren.test/"><div id="app"></div>')
  page.add_style_tag(content=CSS)
  page.evaluate('''() => {const m={};const s={getItem:k=>m[k]??null,setItem:(k,v)=>m[k]=String(v),removeItem:k=>delete m[k]};Object.defineProperty(window,'localStorage',{value:s});Object.defineProperty(window,'sessionStorage',{value:s});window.fetch=async()=>({ok:false,status:503,text:async()=>'{}',json:async()=>({})});}''')
  fixture_js = '''const colors=['#4c3049','#304d4b','#604337','#384d62','#5a3940'];const art=(i,wide=false)=>{let w=wide?800:300,h=wide?450:450;let svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><rect width="100%" height="100%" fill="${colors[i%colors.length]}"/><circle cx="${w*.7}" cy="${h*.32}" r="${h*.23}" fill="#c5a980" opacity=".4"/><path d="M0 ${h*.85} L${w*.4} ${h*.3} L${w} ${h*.9}V${h}H0Z" fill="#172b2b" opacity=".8"/></svg>`;return 'data:image/svg+xml,'+encodeURIComponent(svg)};state.section='Movies';state.tab='Recommended';state.items=Array.from({length:14},(_,i)=>({id:i+100,title:['The Longest Night','Beyond the Shore','Winter Archive','Silent City','Lost Horizons'][i%5]+' '+(i+1),overview:'A richly layered story about discovery, memory, and the unexpected connections between people.',release_date:'2025-06-12',vote_average:7.8,image:art(i),backdrop_image:art(i,true),backdrop_path:null}));renderMain();'''
  page.add_script_tag(content='(async()=>{'+JS.replace('await callback();layout();setupConnectivity();await verifyAccounts();load();','await callback();layout();'+fixture_js)+'})().catch(e=>console.error(e))')
  page.wait_for_timeout(300)
  assert page.locator('.feature-widget').count()==1,(width,'missing feature',errors)
  assert page.evaluate("getComputedStyle(document.querySelector('.feature-widget')).getPropertyValue('--feature-image').includes('800')"),(width,'featured landscape missing')
  assert page.evaluate("[...document.querySelectorAll('.poster .card-flip-front img')].filter(i=>i.complete).every(i=>i.naturalWidth===300&&i.naturalHeight===450)"),(width,'poster aspect ratio wrong')
  posters=page.locator('.poster');assert posters.count()>=10,(width,posters.count())
  assert page.evaluate('document.documentElement.scrollWidth<=innerWidth'),f'horizontal overflow {width}'
  page.wait_for_function("document.querySelector('.poster .card-flip-front img').naturalWidth>0")
  assert page.evaluate('''() => [...document.querySelectorAll('.poster img')].filter(i=>i.complete).every(i=>i.naturalWidth>0)'''),f'poster artwork broken {width}'
  assert not errors,(width,errors)
  page.screenshot(path=str(ROOT.parent/f'populated-audit-{width}.png'),full_page=True)
  posters.first.click();assert page.locator('.detail-modal').is_visible();page.keyboard.press('Escape')
  assert not page.locator('.detail-modal').count()
  print(f'PASS {width}px: {posters.count()} posters, feature, art, navigation, no overflow/errors')
  page.close()
 browser.close()
