"""Step 8: real Chromium AniList browse/detail/status UI against deterministic API fixtures."""
from pathlib import Path
from urllib.parse import unquote,urlparse
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
JS=(ROOT/'app.js').read_text();CSS=(ROOT/'style.css').read_text()+'\n'+(ROOT/'trakt-rebuild.css').read_text()
fixture=r'''() => {
 const cover='/assets/icon-512.png';
 const base=(id,name,status='RELEASING')=>({id,title:{english:name,romaji:name},description:'A carefully crafted anime story.',coverImage:{large:cover,extraLarge:cover},bannerImage:cover,startDate:{year:2026,month:4,day:1},season:'SPRING',seasonYear:2026,format:'TV',releaseStatus:status,duration:24,episodes:12,genres:['Fantasy','Action'],tags:[{name:'Magic',rank:95}],averageScore:87,popularity:23502,trending:101,nextAiringEpisode:{episode:7,airingAt:1794540000}});
 const library=[{id:10,progress:3,status:'CURRENT',media:base(101,'Astra Dawn')}, {id:11,progress:2,status:'PAUSED',media:base(201,'Paused Journey')}, {id:12,progress:2,status:'DROPPED',media:base(202,'Dropped Journey')}, {id:13,progress:4,status:'REPEATING',media:base(203,'Rewatch Journey')}, {id:14,progress:0,status:'PLANNING',media:base(204,'Future Anime')}, {id:15,progress:12,status:'COMPLETED',media:base(205,'Finished Anime')}];
 window.__calls=[];
 const full=id=>({...base(id,id===101?'Astra Dawn':'Astra Sequel'),source:'ORIGINAL',studios:{nodes:[{name:'Studio Aurora'}]},trailer:{site:'youtube',id:'123456789ab'},characters:{edges:[{role:'MAIN',node:{id:1,name:{full:'Captain Astra'},image:{large:cover}}}]},staff:{edges:[{role:'Director',node:{id:2,name:{full:'Director A'},image:{large:cover}}}]},relations:{edges:[{relationType:'SEQUEL',node:{...base(103,'Astra Sequel'),type:'ANIME'}}]},recommendations:{nodes:[]}});
 window.__test={state,load,layout,renderMain,openItem,setAni:fn=>ani=fn};
 window.__test.setAni(async(q,v={})=>{
  window.__calls.push({q,v});
  if(q.includes('MediaListCollection'))return {MediaListCollection:{lists:[{entries:library}]}};
  if(q.includes('Viewer'))return {Viewer:{id:99,name:'Demo'}};
  if(q.includes('Media(id:$id,type:ANIME)'))return {Media:full(v.id)};
  if(q.includes('Page('))return {Page:{pageInfo:{hasNextPage:v.page===1},media:v.page===1?[base(101,'Astra Dawn'),base(102,'Blue Orbit')]:[base(103,'Astra Sequel')]}};
  return {};
 });
 state.section='Anime';state.tab='Discover';state.anilist='test-session';state.query='';state.genre='';state.year='';state.sort='POPULARITY_DESC';state.animeLibraryLoaded=false;
 layout();
}'''
with sync_playwright() as pw:
 browser=pw.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 for width in (320,375,768,1440):
  page=browser.new_page(viewport={'width':width,'height':900}, device_scale_factor=1);errors=[]
  page.on('pageerror',lambda e:errors.append(str(e)))
  def assets(route):
   path=unquote(urlparse(route.request.url).path).lstrip('/')
   target=(ROOT/path).resolve()
   if target.is_relative_to(ROOT) and target.is_file():route.fulfill(path=str(target))
   else:route.fulfill(status=404,body='missing')
  page.route('https://mokumokuren.test/**',assets)
  page.set_content('<base href="https://mokumokuren.test/"><div id="app"></div>')
  page.add_style_tag(content=CSS)
  page.evaluate('''() => {const mem={};const storage={getItem:k=>mem[k]??null,setItem:(k,v)=>mem[k]=String(v),removeItem:k=>delete mem[k]};Object.defineProperty(window,'localStorage',{value:storage});Object.defineProperty(window,'sessionStorage',{value:storage});window.fetch=async()=>({status:503,ok:false,text:async()=>'{}',json:async()=>({})});}''')
  page.add_script_tag(content='(async()=>{'+JS+'\n('+fixture+')();window.__ready=true})().catch(e=>console.error(e))')
  page.wait_for_function('window.__ready===true')
  page.evaluate('window.__test.load()')
  page.wait_for_function('document.querySelectorAll(".anime-results .poster").length===2')
  assert page.locator('.anime-card-badge').count()>=1,(width,'watch status badge missing')
  assert 'Watching' in page.locator('.anime-card-badge').first.inner_text()
  # Year-only browsing must not send seasonYear without a season (AniList requires both).
  page.locator('#year').fill('2025');page.locator('#go').click()
  page.wait_for_function('document.querySelectorAll(".anime-results .poster").length===2')
  year_args=page.evaluate('window.__calls.filter(x=>x.q.includes("Page(")).at(-1).v')
  assert year_args['yearStart']==20250101 and year_args['yearEnd']==20251231 and not year_args.get('seasonYear'),(width,year_args)
  page.locator('#genre').select_option('Fantasy')
  page.locator('#anime-format').select_option('TV')
  page.locator('#anime-season').select_option('SPRING')
  page.locator('#year').fill('2026')
  page.locator('#anime-release').select_option('RELEASING')
  page.locator('#sort').select_option('SCORE_DESC')
  page.locator('#go').click()
  page.wait_for_function('document.querySelectorAll(".anime-results .poster").length===2')
  last=page.evaluate('window.__calls.filter(x=>x.q.includes("Page(")).at(-1).v')
  assert last['season']=='SPRING' and last['seasonYear']==2026 and last['format']=='TV' and last['status']=='RELEASING' and last['genre']=='Fantasy', (width,last)
  assert 'yearStart' not in last or last['yearStart'] is None
  page.locator('#anime-more').click()
  page.wait_for_function('document.querySelectorAll(".anime-results .poster").length===3')
  assert page.locator('.anime-results .poster').count()==3
  # An already-tracked anime must still be available in discovery and detail.
  page.locator('.anime-results .poster').first.click()
  page.locator('#detail-content .anime-facts').wait_for(timeout=8000)
  if width in (375,1440):page.screenshot(path=f'/mnt/data/mokumokuren-step8-detail-{width}.png',full_page=False)
  assert 'Studio Aurora' in page.locator('#detail-content').inner_text()
  assert 'Captain Astra' in page.locator('#detail-content').inner_text()
  assert 'Franchise & related' in page.locator('#detail-content').inner_text()
  assert '3 / 12' in page.locator('#detail-content').inner_text()
  assert page.locator('#save-personal-list').count()==0,'Anime ID must not be sent to a Trakt list'
  page.locator('[data-detail-tab="cast"]').click()
  page.locator('.anime-credits-grid .anime-credit').first.wait_for(timeout=8000)
  assert 'Director A' in page.locator('#detail-content').inner_text()
  page.locator('[data-detail-tab="related"]').click()
  page.locator('[data-anime-open="103"]').first.wait_for(timeout=8000)
  page.keyboard.press('Escape')
  page.evaluate("window.__test.state.tab='In Progress';window.__test.load()")
  page.wait_for_function('document.querySelectorAll("#library-results .poster").length===2')
  page.locator('[data-anime-library-filter="PAUSED"]').click()
  assert page.locator('#library-results .poster').count()==1
  assert 'Paused Journey' in page.locator('#library-results').inner_text()
  page.locator('[data-anime-library-filter="DROPPED"]').click()
  assert page.locator('#library-results .poster').count()==1
  assert 'Dropped Journey' in page.locator('#library-results').inner_text()
  page.evaluate("window.__test.state.tab='Watchlist';window.__test.load()")
  page.wait_for_function('document.querySelectorAll("#library-results .poster").length===1')
  assert 'Future Anime' in page.locator('#library-results').inner_text()
  page.evaluate("window.__test.state.tab='Watched';window.__test.load()")
  page.wait_for_function('document.querySelectorAll("#library-results .poster").length===1')
  assert 'Finished Anime' in page.locator('#library-results').inner_text()
  assert page.evaluate('document.documentElement.scrollWidth <= innerWidth+1'),(width,'page overflow',page.evaluate('document.documentElement.scrollWidth'))
  assert page.evaluate("getComputedStyle(document.querySelector('.top')).position==='sticky'"),(width,'mobile header not sticky')
  assert not errors,(width,errors)
  # Save an internal shot of populated anime discovery at supported widths.
  page.evaluate("async()=>{window.__test.state.tab='Discover';window.__test.layout();await window.__test.load()}")
  if width in (375,1440):page.screenshot(path=f'/mnt/data/mokumokuren-step8-anime-{width}.png',full_page=True)
  print(f'PASS {width}px AniList discovery filters/pagination, detail metadata, related anime, library statuses, no overflow')
  page.close()
 browser.close()
