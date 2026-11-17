"""Step 3: browser acceptance of Trakt-style main-page composition.
No provider credentials, network access or changes to the user's accounts.
"""
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
JS=(ROOT/'app.js').read_text(); CSS=(ROOT/'style.css').read_text()+'\n'+(ROOT/'trakt-rebuild.css').read_text()
FIXTURE='''
state.trakt='offline-test';state.anilist='offline-test';state.section='TV Shows';state.tab='Recommended';
const titles=Array.from({length:9},(_,i)=>({id:200+i,trakt_id:300+i,_key:300+i,title:'Show '+(i+1),progress:(20+i*7)+'%',watchedCount:i+1,nextEpisode:{season:1,number:i+2,title:'Next Story'},episodes:12,genres:['Drama'],first_air_date:'2025-04-02',overview:'A dramatic show.'}));
const anime=titles.map((x,i)=>({...x,id:500+i,_key:500+i,title:'Anime '+(i+1),progress:2+i,episodes:12,status:'CURRENT'}));
const movies=titles.map((x,i)=>({...x,id:800+i,_key:800+i,title:'Movie '+(i+1),release_date:'2025-01-02',vote_average:5+i/2}));
load=async()=>{renderMain();};
window.__view=(section,tab)=>{state.section=section;state.tab=tab;state.items=section==='Anime'?anime:section==='TV Shows'?titles:movies;libraryFilters.query='';libraryFilters.sort='default';layout();};
window.__view('TV Shows','Recommended');
const rail=document.querySelector('#home-dashboard');rail.innerHTML=homeRail('Continue Watching',titles.slice(0,3),'Pick up where you left off')+homeRail('Your Watchlist',titles.slice(3,8),'Saved for later');
window.__ready=true;
'''
with sync_playwright() as pw:
 browser=pw.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage'])
 for width in [320,375,768,1024,1440]:
  page=browser.new_page(viewport={'width':width,'height':900});errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  page.set_content('<div id="app"></div>')
  page.add_style_tag(content=CSS)
  page.evaluate("""() => {const data={};const store={getItem:k=>data[k]??null,setItem:(k,v)=>data[k]=String(v),removeItem:k=>delete data[k]};Object.defineProperty(window,'localStorage',{value:store});Object.defineProperty(window,'sessionStorage',{value:store});window.fetch=async()=>({ok:false,status:503,text:async()=>'{}',json:async()=>({})});} """)
  marker='await callback();layout();setupConnectivity();await verifyAccounts();load();'
  assert marker in JS
  page.add_script_tag(content='(async()=>{'+JS.replace(marker,'await callback();layout();'+FIXTURE)+'})().catch(e=>{window.__failure=String(e);console.error(e)})')
  page.wait_for_function('window.__ready===true||window.__failure!==undefined',timeout=12000)
  assert page.evaluate('window.__failure') is None,(width,page.evaluate('window.__failure'))
  assert page.locator('.replica-home-rail').count()==2
  assert page.locator('.trakt-start-watching .replica-rail-collapse').count()==1
  # Actual connected-rail controls collapse visually, retain aria-expanded, and expand again.
  button=page.locator('[aria-label="Your Watchlist"] .replica-rail-collapse')
  button.click();assert button.get_attribute('aria-expanded')=='false';assert page.locator('[aria-label="Your Watchlist"] .home-rail-track').is_hidden()
  button.click();assert button.get_attribute('aria-expanded')=='true';assert page.locator('[aria-label="Your Watchlist"] .home-rail-track').is_visible()
  page.locator('.trakt-start-watching .replica-rail-collapse').click()
  assert page.locator('.trakt-start-watching .recommendation-gallery').is_hidden()
  page.locator('.trakt-start-watching .replica-rail-collapse').click()
  assert page.locator('.trakt-start-watching .recommendation-gallery').is_visible()
  # A rail heading links into the real library page (not a fake screen).
  page.locator('[aria-label="Your Watchlist"] [data-replica-view="Watchlist"]').click()
  assert page.locator('#main').get_attribute('data-view')=='watchlist'
  assert page.locator('#library-results .poster').count()==9
  assert page.locator('.replica-library').count()==1
  assert page.locator('#library-empty').is_hidden(),(width,'no-results illustration must stay hidden when titles exist')
  assert not page.locator('.replica-progress-grid').count()
  page.evaluate("window.__view('TV Shows','In Progress')")
  assert page.locator('#library-results .poster-library-progress').count()==9
  assert '20%' in page.locator('#library-results').inner_text()
  assert page.evaluate("getComputedStyle(document.querySelector('.replica-progress-art')).aspectRatio")=='16 / 9'
  assert page.locator('.replica-progress-overlay').count()==9
  page.locator('#library-search').fill('Show 4');assert page.locator('#library-results .poster').count()==1
  page.locator('#library-search').fill('');assert page.locator('#library-results .poster').count()==9
  page.evaluate("window.__view('Anime','In Progress')")
  assert page.locator('.replica-progress-grid').count()==1
  assert page.locator('#library-results .poster-library-progress').count()==9
  page.evaluate("window.__view('Movies','Discover')")
  assert page.locator('.replica-discover').count()==1
  assert page.locator('#search').count()==1
  assert page.locator('.trakt-discovery-results .poster').count()==9
  page.evaluate("window.__view('Anime','Discover')")
  assert page.locator('.anime-browse-toolbar').get_attribute('role')=='search'
  assert page.locator('.anime-results .poster').count()==9
  page.evaluate("window.__view('Movies','Profile')")
  assert page.locator('.replica-profile').count()==1
  assert page.locator('.profile-provider').count()==2
  assert page.locator('#profile-open-lists, #drawer-personal-lists, [data-side-action="lists"]').count()==0
  page.evaluate("window.__view('Movies','Recommended')")
  page.get_by_role('button',name='View Watchlist',exact=True).click()
  assert page.locator('#main').get_attribute('data-view')=='watchlist'
  assert page.locator('#watchlist-sort').is_visible()
  assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1'),(width,'horizontal overflow')
  assert not errors,(width,errors)
  print(f'PASS {width}px: linked/collapsible rails, library progress, filters, Watchlist and profile')
  page.close()
 browser.close()
