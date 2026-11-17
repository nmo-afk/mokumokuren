"""Full-CSS Step 3 visual and interaction gate with offline synthetic data.
Run python tests/browser_detail_step3.py; no user credentials or live API requests.
"""
from pathlib import Path
from urllib.parse import urlparse, unquote
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
JS=(ROOT/'app.js').read_text()
CSS=(ROOT/'style.css').read_text()+'\n'+(ROOT/'trakt-rebuild.css').read_text()
fixture='''
const art=(kind='poster',hue=30)=>{const w=kind==='still'?720:360,h=kind==='still'?405:540;
 const s=`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><defs><linearGradient id="a" x1="0" x2="1" y1="0" y2="1"><stop stop-color="hsl(${hue} 35% 43%)"/><stop offset="1" stop-color="#101d1c"/></linearGradient></defs><rect width="100%" height="100%" fill="url(#a)"/><circle cx="${w*.72}" cy="${h*.34}" r="${h*.21}" opacity=".4" fill="#d7c38d"/><path d="M0 ${h*.95}L${w*.42} ${h*.28}L${w} ${h*.94}v${h}H0Z" fill="#0e2825" opacity=".75"/></svg>`;return 'data:image/svg+xml,'+encodeURIComponent(s)};
const film={id:501,_key:501,title:'The Longest Night',image:art('poster',12),backdrop_image:art('still',28),vote_average:7.8,release_date:'2026-06-12',overview:'A detective is pulled into a sprawling mystery at the edge of the city. The lives of unlikely strangers become intertwined over one extraordinary night.',runtime:121,genres:[{name:'Mystery'},{name:'Drama'}]};
const show={id:502,_key:502,title:'Golden Axe',image:art('poster',31),backdrop_image:art('still',27),vote_average:7.4,first_air_date:'2026-09-16',overview:'The heroes come together in a fantastic world to face their greatest challenge yet.',episodes:10,genres:[{name:'Animation'},{name:'Fantasy'}]};
const anime={id:701,_key:701,title:'Fullmetal Alchemist: Brotherhood',image:art('poster',66),backdrop_image:art('still',123),averageScore:93,startDate:{year:2009},episodes:64,progress:12,status:'CURRENT',genres:['Adventure','Drama','Fantasy'],description:'Two brothers search for a way to restore what they have lost.'};
state.section='Movies';state.tab='Recommended';state.items=[film];state.recommendationPool=state.items;renderMain();
tmdb=async (path)=>{
 if(path==='/movie/501')return {title:film.title,overview:film.overview,release_date:film.release_date,runtime:121,vote_average:7.8,genres:film.genres,tagline:'One night changes everything.',credits:{crew:[{name:'Test Director',job:'Director'}],cast:[{name:'Actor One',character:'Detective',profile_path:'/a1.jpg'},{name:'Actor Two',character:'Witness',profile_path:'/a2.jpg'}]},videos:{results:[]},production_companies:[{name:'Test Studio'}]};
 if(path==='/movie/501/credits')return {cast:[{name:'Actor One',character:'Detective',profile_path:'/a1.jpg'},{name:'Actor Two',character:'Witness',profile_path:'/a2.jpg'}]};
 if(path==='/movie/501/recommendations')return {results:[{id:506,title:'Related Feature',poster_path:'/c.jpg',release_date:'2025-03-01'}]};
 if(path==='/tv/502')return {title:show.title,overview:show.overview,first_air_date:show.first_air_date,number_of_seasons:2,number_of_episodes:10,genres:show.genres,credits:{cast:[{name:'Voice Actor One',character:'Hero',profile_path:'/a1.jpg'}]},created_by:[{name:'Test Creator'}],seasons:[{season_number:1,episode_count:2},{season_number:2,episode_count:3}]};
 if(path==='/tv/502/recommendations')return {results:[{id:507,name:'Related Series',poster_path:'/c.jpg',first_air_date:'2025-03-01'}]};
 if(path==='/tv/502/season/1')return {episodes:[{episode_number:1,name:'First Adventure',still_path:'/s1.jpg',runtime:24},{episode_number:2,name:'Second Adventure',still_path:'/s2.jpg',runtime:23}]};
 if(path==='/tv/502/season/2')return {episodes:[{episode_number:1,name:'Return Adventure',still_path:'/s1.jpg',runtime:24}]};
 return {};
};
window.__fixture={film,show,anime,render:section=>{state.section=section;state.tab='Recommended';state.items=[section==='TV Shows'?show:section==='Anime'?anime:film];state.recommendationPool=state.items;renderMain()}};
'''
with sync_playwright() as pw:
 browser=pw.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 for width in (320,375,768,1440):
  page=browser.new_page(viewport={'width':width,'height':850}, device_scale_factor=1)
  errors=[]; missing=[]
  page.on('pageerror',lambda e:errors.append(str(e)))
  def asset(route):
   path=unquote(urlparse(route.request.url).path).lstrip('/')
   f=(ROOT/path).resolve()
   if f.is_relative_to(ROOT) and f.is_file():route.fulfill(path=str(f))
   else:missing.append(path);route.fulfill(status=404,body='missing')
  def art_route(route):
   route.fulfill(status=200, content_type='image/svg+xml', body='<svg xmlns="http://www.w3.org/2000/svg" width="200" height="250"><rect width="200" height="250" fill="#40594e"/></svg>')
  page.route('https://mokumokuren.test/**',asset)
  page.route('https://image.tmdb.org/**',art_route)
  page.set_content('<base href="https://mokumokuren.test/"><div id="app"></div>')
  page.add_style_tag(content=CSS)
  page.evaluate('''()=>{const m={};const s={getItem:k=>m[k]??null,setItem:(k,v)=>m[k]=String(v),removeItem:k=>delete m[k]};Object.defineProperty(window,'localStorage',{value:s});Object.defineProperty(window,'sessionStorage',{value:s});window.fetch=async()=>({ok:false,status:503,text:async()=>'{}',json:async()=>({})});}''')
  page.add_script_tag(content='(async()=>{'+JS.replace('await callback();layout();setupConnectivity();await verifyAccounts();load();','await callback();layout();'+fixture)+'\nwindow.__ready=true;})().catch(e=>console.error(e))')
  page.wait_for_function('window.__ready===true')
  for label,section in [('movie','Movies'),('tv','TV Shows'),('anime','Anime')]:
   page.evaluate('s=>window.__fixture.render(s)',section)
   page.locator('.recommendation-gallery .poster').first.click()
   detail=page.locator('.detail-screen')
   detail.locator('.detail-overview').wait_for(timeout=10000)
   assert detail.get_attribute('role')=='dialog'
   assert detail.locator('.detail-head h2').is_visible()
   assert detail.locator('.detail-poster').is_visible()
   assert detail.locator('.detail-poster').evaluate('(e)=>e.getBoundingClientRect().width') >= (170 if width<=350 else 185 if width<=720 else 220),(width,label,'poster still capped by old modal styles')
   assert detail.locator('#watchlist').is_disabled(),(width,label,'unauthenticated tracking must fail closed')
   assert detail.locator('#watched').is_disabled()
   assert detail.locator('.detail-topbar').is_visible()
   assert page.evaluate('document.documentElement.scrollWidth<=innerWidth'),(width,label,'viewport overflow')
   assert page.evaluate('''()=>{let el=document.querySelector('.detail-screen');return el.scrollWidth <= el.clientWidth+1}'''),(width,label,'detail overflows')
   assert page.evaluate('''()=>getComputedStyle(document.querySelector('.detail-screen')).overflowY==='auto' ''')
   assert page.evaluate('''()=>document.body.classList.contains('detail-open')''')
   if label=='movie':
    assert detail.locator('.detail-person').count()==2
    assert detail.locator('.detail-related-card').count()==1
    assert detail.locator('#detail-byline').inner_text()=='Directed by Test Director'
    detail.locator('[data-jump="cast"]').click()
    detail.locator('.detail-content .people-grid .person').first.wait_for()
    detail.locator('[data-detail-tab="overview"]').click()
    detail.locator('.detail-overview').wait_for()

   if label=='tv':
    detail.locator('.detail-inline-episodes .episode-card').first.wait_for(timeout=10000)
    assert detail.locator('.detail-inline-episodes .episode-card').count()==2
    assert detail.locator('.detail-person').count()==1
    assert detail.locator('.detail-related-card').count()==1
    detail.locator('.detail-inline-episodes #season-select').select_option('2')
    detail.locator('.detail-inline-episodes .episode-card').first.wait_for()
    page.wait_for_function("document.querySelectorAll('.detail-inline-episodes .episode-card').length===1")
   if label=='anime':
    assert detail.locator('.detail-inline-anime #progress-count').inner_text()=='12 / 64'
    assert detail.locator('#episode-plus').is_disabled()
   if width <=720:
    detail.locator('#detail-options').click()
    assert detail.locator('#detail-options').get_attribute('aria-expanded')=='true'
    assert detail.locator('#save-personal-list').count()==0,'V1 exposes Watchlist on all titles'
    assert detail.locator('#watchlist').is_visible()
    detail.locator('#detail-options').click()
   if width in (375,1440):
    detail.screenshot(path=str(ROOT.parent/f'mokumokuren-step3-{label}-{width}.png'),animations='disabled')
   page.evaluate("document.querySelector('.detail-screen').scrollTop= document.querySelector('.detail-screen').scrollHeight")
   assert detail.locator('#close').is_visible()
   detail.locator('#close').click();assert page.locator('.detail-screen').count()==0
  assert not errors,(width,errors)
  assert not missing,(width,missing)
  print(f'PASS Step 3 {width}px: movie/TV/anime full-screen detail, cast, related, episode rails, account guards, no overflow or errors')
  page.close()
 browser.close()
