"""Capture actual Mokumokuren navigation views using offline demonstration data.
Images from visual-fixtures are user-supplied screenshots cropped for test ONLY.
"""
from pathlib import Path
from urllib.parse import unquote,urlparse
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
OUT=Path('/mnt/data/mokumokuren-navigation-review')
OUT.mkdir(exist_ok=True)
source=(ROOT/'tests'/'capture_desktop_review.py').read_text()
fix=source.split("FIX=r'''",1)[1].split("'''\nwith sync_playwright()",1)[0]
js=(ROOT/'app.js').read_text();css=(ROOT/'style.css').read_text()+'\n'+(ROOT/'trakt-rebuild.css').read_text()
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage'])
 for width,height in [(1440,950),(375,900)]:
  page=browser.new_page(viewport={'width':width,'height':height},device_scale_factor=1)
  errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  def serve(route):
   target=(ROOT/unquote(urlparse(route.request.url).path).lstrip('/')).resolve()
   if target.is_relative_to(ROOT) and target.is_file():route.fulfill(path=str(target))
   else:route.fulfill(status=404,body='not found')
  page.route('https://mokumokuren.test/**',serve)
  page.set_content('<base href="https://mokumokuren.test/"><div id="app"></div>')
  page.add_style_tag(content=css)
  page.evaluate('''() => {
   const data={};const store={getItem:k=>data[k]??null,setItem:(k,v)=>data[k]=String(v),removeItem:k=>delete data[k]};
   Object.defineProperty(window,'localStorage',{value:store});
   Object.defineProperty(window,'sessionStorage',{value:store});
   window.fetch=async()=>({ok:false,status:503,text:async()=>'{"error":"fixture unavailable"}',json:async()=>({})});
  }''')
  fixture=fix+'''
// The fixture routes are authoritative only within the screenshot process.
state.trakt='offline-fixture';state.anilist='offline-fixture';
load=async()=>{renderMain();};
window.__view=(section,tab)=>{
 state.section=section;state.tab=tab;
 state.items=section==='Movies'?titles:(section==='TV Shows'?[tv,{...tv,id:703,title:'Arcane',image:a('arcane'),backdrop_image:a('arcane'),progress:'50%',nextEpisode:{season:2,number:3,title:'The Base Violence'}},{...tv,id:704,title:'Castlevania',image:a('castlevania'),progress:'63%'}]:[anime,{...anime,id:802,title:'Arcane',image:a('arcane'),progress:4,episodes:9,status:'CURRENT'},{...anime,id:803,title:'Castlevania',image:a('castlevania'),progress:32,episodes:32,status:'COMPLETED'}]);
 libraryFilters.query='';libraryFilters.sort='default';
 layout();
 if(tab==='Recommended'){
  const dash=document.querySelector('#home-dashboard');
  if(dash){
   const ip=section==='Movies'?[{...titles[0],progress:'42%'},{...titles[1],progress:'67%'},{...titles[2],progress:'15%'}]:section==='TV Shows'?state.items.map((x,i)=>({...x,progress:`${35+i*22}%`,nextEpisode:{season:1,number:6+i,title:'Next episode'}})):state.items.filter(x=>x.status!=='COMPLETED');
   dash.innerHTML=homeRail('Continue Watching',ip,'Pick up where you left off')+homeRail('Your Watchlist',state.items.slice(1,6),'Saved for later');
  }
 }
};
traktPagedRead=async path=>{
 if(path==='/users/me/lists')return [
  {name:'Weekend Watchlist',description:'For the weekend',ids:{trakt:15},privacy:'private'},
  {name:'Best Martial Arts Films',description:'Favorite action titles',ids:{trakt:16},privacy:'private'},
  {name:'Films to Rewatch',description:'Worth another look',ids:{trakt:17},privacy:'private'},
  {name:'Watch with Friends',description:'Shared viewing ideas',ids:{trakt:18},privacy:'private'}
 ];
 if(path.includes('/15/'))return [{type:'movie',movie:{title:'Street Fighter',ids:{tmdb:601}}},{type:'movie',movie:{title:'Godzilla Minus Zero',ids:{tmdb:602}}}];
 if(path.includes('/16/'))return [{type:'movie',movie:{title:'Karate Kid: Legends',ids:{tmdb:603}}},{type:'movie',movie:{title:'Fearless',ids:{tmdb:604}}}];
 if(path.includes('/17/'))return [{type:'movie',movie:{title:'Sword of Destiny',ids:{tmdb:606}}}];
 return [];
};
window.__showLists=showPersonalLists;
window.__view('Movies','Recommended');
window.__fixtureReady=true;
'''
  marker='await callback();layout();setupConnectivity();await verifyAccounts();load();'
  assert marker in js
  page.add_script_tag(content='(async()=>{'+js.replace(marker,'await callback();layout();'+fixture)+'})().catch(e=>{window.__fixtureError=String(e);console.error(e)})')
  page.wait_for_function('window.__fixtureReady===true',timeout=15000)
  def capture(section,tab,name,extra=None):
   page.evaluate('([section,tab])=>window.__view(section,tab)',[section,tab]);
   page.wait_for_timeout(180)
   if extra:page.evaluate(extra)
   page.evaluate('window.scrollTo(0,0)')
   page.screenshot(path=str(OUT/f'{name}-{width}.png'),full_page=(width>=900),animations='disabled')
   assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1'),(width,section,tab,'horizontal overflow')
   if width>=960:
    assert not page.locator('.trakt-section-shortcuts').is_visible(),(width,section,tab,'desktop sidebar provides navigation, duplicated shortcuts should be hidden')
    assert page.locator('.trakt-shortcut-track .current').count()==1,(width,tab,'selection')
    assert page.locator('.desktop-sidebar button.active').count()==1,(width,tab,'side selection')
   else:
    assert page.locator('.mobile-top-tabs').is_visible(),(width,tab,'sticky mobile navigation missing')
    assert not page.locator('.trakt-section-shortcuts').is_visible(),(width,tab,'duplicate mobile navigation')
   assert not errors,(width,tab,errors)
   print('CAPTURE',width,name,'cards',page.locator('#main .poster').count())
  capture('Movies','Recommended','01-home-movies')
  capture('TV Shows','Recommended','02-home-tv')
  capture('Movies','Discover','03-discover-movies')
  capture('TV Shows','Discover','04-discover-tv')
  capture('TV Shows','In Progress','05-in-progress-tv')
  capture('Movies','Watchlist','06-watchlist-movies')
  capture('Movies','Watched','07-watched-movies')
  capture('Anime','Discover','08-discover-anime')
  capture('Anime','In Progress','09-anime-library')
  capture('Movies','Profile','11-profile')
  assert page.locator('.profile-provider').count()==2
  if width>=960:
   page.locator('.desktop-sidebar [data-side-tab="Watchlist"]').click()
   assert page.locator('#main').get_attribute('data-view')=='watchlist'
   assert page.locator('[data-side-tab="Watchlist"]').get_attribute('class')=='active'
  else:
   page.locator('.mobile-top-tabs [data-mobile-tab="Watchlist"]').click()
   assert page.locator('#main').get_attribute('data-view')=='watchlist'
  page.evaluate("window.__view('Movies','Recommended');window.__showLists()")
  page.locator('.personal-list-group').first.wait_for(timeout=7000)
  page.wait_for_timeout(200)
  page.screenshot(path=str(OUT/f'10-trakt-lists-{width}.png'),full_page=False,animations='disabled')
  assert page.locator('.personal-list-group').count()==4
  if width>=960:
   assert page.locator('.desktop-sidebar').is_visible()
   assert page.locator('[data-side-action=lists]').get_attribute('class')=='active'
  print('CAPTURE',width,'10-trakt-lists','lists',page.locator('.personal-list-group').count())
  page.close()
 browser.close()
print('COMPLETE')
