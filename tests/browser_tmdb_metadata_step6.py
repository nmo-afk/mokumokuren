"""Offline Chromium contracts: resolved TMDB details, watch providers, key crew and episode art."""
from pathlib import Path
from urllib.parse import unquote,urlparse
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
APP=(ROOT/'app.js').read_text()
CSS=(ROOT/'style.css').read_text()+'\n'+(ROOT/'trakt-rebuild.css').read_text()
ART='<svg xmlns="http://www.w3.org/2000/svg" width="100" height="160"><rect width="100" height="160" fill="#355b51" /></svg>'

with sync_playwright() as pw:
 browser=pw.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 for width in (375,1440):
  page=browser.new_page(viewport={'width':width,'height':900})
  errors=[]
  page.on('pageerror',lambda err:errors.append(str(err)))
  def route_asset(route):
   u=urlparse(route.request.url)
   if u.hostname=='image.tmdb.org':
    if u.path.endswith('broken.jpg'):route.fulfill(status=404,body='not found')
    else:route.fulfill(status=200,content_type='image/svg+xml',body=ART)
    return
   path=unquote(u.path).lstrip('/')
   target=(ROOT/path).resolve()
   if target.is_relative_to(ROOT) and target.is_file():route.fulfill(path=str(target))
   else:route.fulfill(status=404,body='not found')
  page.route('https://mokumokuren.test/**',route_asset)
  page.route('https://image.tmdb.org/**',route_asset)
  page.set_content('<base href="https://mokumokuren.test/"><div id="app"></div>')
  page.add_style_tag(content=CSS)
  page.evaluate('''() => {
   const m={};const storage={getItem:k=>m[k]??null,setItem:(k,v)=>m[k]=String(v),removeItem:k=>delete m[k]};
   Object.defineProperty(window,'localStorage',{value:storage});
   Object.defineProperty(window,'sessionStorage',{value:storage});
   const success=v=>({ok:true,status:200,headers:{get:()=>null},json:async()=>v});
   window.fetch=async url=>{
    const {searchParams}=new URL(String(url),'https://mokumokuren.test/');
    const path=searchParams.get('path')||'';
    if(path==='/movie/123')return success({id:123,title:'Sample Film',overview:'A metadata-rich film',poster_path:'/film.jpg',backdrop_path:'/backdrop.jpg',runtime:113,vote_average:8.2,release_date:'2024-08-20',genres:[{name:'Drama'}],credits:{cast:[{id:7,name:'Example Actor',character:'Protagonist',profile_path:'/actor.jpg'}],crew:[{id:8,name:'Example Director',job:'Director',profile_path:'/director.jpg'}]},videos:{results:[{site:'YouTube',key:'abcdefghijk',type:'Trailer',official:true}]},production_companies:[{name:'Production Company'}],release_dates:{results:[{iso_3166_1:'GB',release_dates:[{certification:'12A'}]}]}});
    if(path==='/movie/123/recommendations')return success({results:[{id:34,title:'Related Film',release_date:'2023-01-01',poster_path:'/related.jpg'}]});
    if(path==='/movie/123/watch/providers')return success({results:{GB:{link:'https://www.themoviedb.org/movie/123/watch?locale=GB',flatrate:[{provider_id:10,provider_name:'Example Streaming',logo_path:'/stream.jpg'}],rent:[{provider_id:11,provider_name:'Example Rental',logo_path:'/rent.jpg'}]}}});
    if(path==='/tv/456')return success({id:456,name:'Example Series',overview:'TV metadata',poster_path:'/series.jpg',backdrop_path:'/seriesback.jpg',vote_average:7.9,number_of_seasons:1,number_of_episodes:2,first_air_date:'2024-02-01',seasons:[{season_number:1,name:'Season 1',episode_count:2}],credits:{cast:[{id:18,name:'Example TV Actor',character:'Lead',profile_path:'/tvactor.jpg'}],crew:[{id:19,name:'Example Creator',job:'Executive Producer'}]},created_by:[{name:'Example Creator'}],content_ratings:{results:[{iso_3166_1:'GB',rating:'15'}]}});
    if(path==='/tv/456/season/1')return success({episodes:[{episode_number:1,name:'Pilot',still_path:'/broken.jpg',runtime:22,overview:'First episode'},{episode_number:2,name:'Finale',runtime:24,overview:'Second episode'}]});
    if(path==='/tv/456/watch/providers')return success({results:{}});
    if(path==='/tv/456/recommendations')return success({results:[]});
    if(path==='/tv/456/similar')return success({results:[{id:55,name:'Similar Show',poster_path:'/similar.jpg'}]});
    if(path==='/search/multi')return success({results:searchParams.get('query')==='Sample Film'?[{id:123,title:'Sample Film',media_type:'movie',release_date:'2024-08-20',poster_path:'/film.jpg',backdrop_path:'/backdrop.jpg'}]:[]});
    return {ok:false,status:503,headers:{get:()=>null},json:async()=>({error:'Mock unavailable'})};
   };
  }''')
  page.add_script_tag(content=APP.replace('await callback();layout();setupConnectivity();await verifyAccounts();load();','layout();'))
  page.evaluate('''() => {state.section='Movies';state.tab='Recommended';state.items=[{id:123,tmdb_id:123,title:'Sample Film',release_date:'2024-08-20'}];state.recommendationPool=state.items;renderMain();}''')
  page.locator('.recommendation-gallery .poster').first.click()
  page.locator('.detail-person').first.wait_for(timeout=6000)
  assert page.locator('.detail-person strong').first.inner_text()=='Example Actor'
  assert page.locator('.detail-related-card strong').first.inner_text()=='Related Film'
  assert page.locator('.detail-provider-card').count()==2
  assert page.locator('.detail-provider-card strong').first.inner_text()=='Example Streaming'
  assert page.locator('.detail-provider-attribution').get_by_text('JustWatch').count()==1
  assert page.locator('.detail-provider-attribution a').last.get_attribute('href').startswith('https://www.themoviedb.org/movie/123/watch')
  assert page.locator('#detail-certification').inner_text()=='12A'
  assert page.locator('.detail-poster-frame img').count()==1
  assert page.locator('#detail-header-trailer').get_attribute('href')=='https://www.youtube.com/watch?v=abcdefghijk'
  page.locator('[data-detail-tab="cast"]').click()
  page.locator('.people-grid').first.wait_for(timeout=6000)
  assert page.locator('.detail-content').get_by_text('Example Director').count()==1
  page.screenshot(path=str(ROOT.parent/f'mokumokuren-step6-movie-{width}.png'))
  page.keyboard.press('Escape')
  # Trakt-only item: search must recover the TMDB identity for detail and cast.
  page.evaluate('''() => {state.section='Movies';state.items=[{_key:987,ids:{trakt:987},trakt_id:987,title:'Sample Film',year:2024}];state.recommendationPool=state.items;renderMain();}''')
  page.locator('.recommendation-gallery .poster').first.click()
  page.locator('.detail-person').first.wait_for(timeout=6000)
  assert page.evaluate('state.modal.tmdb_id')==123,'Trakt-only title did not retain resolved TMDB ID'
  page.keyboard.press('Escape')
  page.evaluate('''() => {state.section='TV Shows';state.items=[{id:456,tmdb_id:456,name:'Example Series',year:2024}];state.recommendationPool=state.items;renderMain();}''')
  page.locator('.recommendation-gallery .poster').first.click()
  page.locator('.episode-card').first.wait_for(timeout=6000)
  assert page.locator('.episode-card').count()==2
  page.locator('.episode-image-fallback').first.wait_for(timeout=6000)
  assert page.locator('.episode-image-fallback').count()==1
  assert page.locator('.episode-toggle').first.is_disabled()
  assert page.locator('.detail-related-card strong').first.inner_text()=='Similar Show'
  assert page.locator('#detail-certification').inner_text()=='15'
  page.screenshot(path=str(ROOT.parent/f'mokumokuren-step6-tv-{width}.png'))
  assert not errors,(width,errors)
  assert page.evaluate('document.documentElement.scrollWidth<=innerWidth'),(width,'horizontal overflow')
  print(f'PASS {width}px: TMDB movie/show metadata, cast/crew, watch providers, seasons, fallback image, related titles')
  page.close()
 browser.close()
