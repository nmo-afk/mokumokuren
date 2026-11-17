"""Step 9: confirmed +1 writes, no optimistic progress, Home and library sync, no nested controls."""
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
JS=(ROOT/'app.js').read_text()
CSS=(ROOT/'style.css').read_text()+'\n'+(ROOT/'trakt-rebuild.css').read_text()
fixture=r'''() => {
 const media={id:501,title:{english:'Orbit Quest',romaji:'Orbit Quest'},coverImage:{large:''},bannerImage:'',description:'Example anime',startDate:{year:2026},episodes:10,genres:['Fantasy'],averageScore:88};
 window.__server={entry:{id:7001,progress:3,status:'CURRENT',media},calls:[],resolve:null,reject:null,delayed:false,shouldFail:false};
 window.__test={state,load,layout,renderHomeDashboard,updateAnimeProgress,markNextTraktEpisode,refreshRemoteTracking,setAni:fn=>ani=fn,setTrakt:fn=>trakt=fn,accountRevision:()=>anilistAccountRevision};
 window.__test.setAni(async(q,v={})=>{
  if(q.includes('Viewer'))return {Viewer:{id:7,name:'Tester'}};
  if(q.includes('MediaListCollection'))return {MediaListCollection:{lists:[{entries:[{...window.__server.entry,media:{...media}}]}]}};
  if(q.includes('SaveMediaListEntry')){
   window.__server.calls.push({...v});
   if(window.__server.delayed)await new Promise((res,rej)=>{window.__server.resolve=res;window.__server.reject=rej});
   if(window.__server.shouldFail)throw Error('Simulated provider failure');
   window.__server.entry.progress=v.progress;
   window.__server.entry.status=v.status||window.__server.entry.status;
   return {SaveMediaListEntry:{id:7001,progress:v.progress,status:window.__server.entry.status}};
  }
  if(q.includes('Page('))return {Page:{pageInfo:{hasNextPage:false},media:[media]}};
  return {};
 });
 state.anilist='mock-account';state.section='Anime';state.tab='In Progress';state.demo=false;layout();
}'''
with sync_playwright() as pw:
 browser=pw.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 for width in [375,1440]:
  page=browser.new_page(viewport={'width':width,'height':850});errors=[]
  page.on('pageerror',lambda e:errors.append(str(e)))
  page.set_content('<div id="app"></div>');page.add_style_tag(content=CSS)
  page.evaluate('''() => {const d={};const s={getItem:k=>d[k]??null,setItem:(k,v)=>d[k]=String(v),removeItem:k=>delete d[k]};Object.defineProperty(window,'localStorage',{value:s});Object.defineProperty(window,'sessionStorage',{value:s});window.fetch=async()=>({ok:false,status:503,json:async()=>({}),text:async()=>'{}'});}''')
  page.add_script_tag(content='(async()=>{'+JS+'\n('+fixture+')();window.__ready=true;})().catch(e=>{window.__failure=String(e)})')
  page.wait_for_function('window.__ready===true||window.__failure')
  assert not page.evaluate('window.__failure')
  page.evaluate('window.__test.load()')
  page.wait_for_function("document.querySelector('#library-results')?.textContent?.includes('3/10')")
  assert page.locator('#library-refresh').count()==1
  btn=page.locator('#library-results .quick-episode').first
  assert btn.count()==1
  # Provider has not responded; progress must remain at 3/10.
  page.evaluate('window.__server.delayed=true')
  btn.click()
  page.wait_for_function('window.__server.resolve!==null')
  assert '3/10' in page.locator('#library-results').inner_text()
  assert btn.is_disabled()
  # Same-media concurrent write must be blocked, including from another surface.
  duplicate=page.evaluate('''async()=>await window.__test.updateAnimeProgress(window.__test.state.items[0],4,null)''')
  assert duplicate is False and len(page.evaluate('window.__server.calls'))==1
  page.evaluate('window.__server.delayed=false;window.__server.resolve()')
  page.wait_for_function("document.querySelector('#library-results')?.textContent?.includes('4/10')")
  assert page.evaluate('window.__server.entry.progress')==4
  # A rejected write cannot mutate the library or show a false success.
  page.evaluate('window.__server.shouldFail=true')
  page.locator('#library-results .quick-episode').first.click()
  page.wait_for_function('window.__server.calls.length===2')
  page.wait_for_function('document.querySelector("#library-results .quick-episode")?.disabled===false')
  assert page.evaluate('window.__server.entry.progress')==4
  assert '4/10' in page.locator('#library-results').inner_text()
  page.evaluate('window.__server.shouldFail=false')
  # Home now has an independent +1 control NEXT to Continue Watching.
  page.evaluate('''async()=>{const t=window.__test;t.state.tab='Recommended';t.state.items=[{...t.state.items[0]}];t.layout();await t.renderHomeDashboard()}''')
  home=page.locator('.home-rail-continue')
  home.wait_for()
  assert home.locator('.poster').count()==1
  assert home.locator('[data-home-quick]').count()==1
  assert home.locator('.poster [data-home-quick]').count()==0,'No nested buttons'
  page.screenshot(path=f'/mnt/data/mokumokuren-step9-home-{width}.png',full_page=False)
  home.locator('[data-home-quick]').click()
  page.wait_for_function('window.__server.entry.progress===5')
  page.wait_for_function('document.querySelector(".home-rail-continue")?.textContent?.includes("5/10")')
  # Manual refresh reads from the provider without inventing local state.
  page.evaluate("async()=>{window.__test.state.tab='In Progress';await window.__test.load()}")
  page.wait_for_function('document.querySelector("#library-refresh")')
  page.evaluate('window.__server.entry.progress=6')
  page.locator('#library-refresh').click()
  page.wait_for_function('document.querySelector("#library-results")?.textContent?.includes("6/10")')
  # Simulate returning to the app after >90s while another device advanced progress.
  page.evaluate('window.__server.entry.progress=7;const oldNow=Date.now;Date.now=()=>oldNow()+91000;window.dispatchEvent(new Event("focus"));Date.now=oldNow')
  page.wait_for_function('document.querySelector("#library-results")?.textContent?.includes("7/10")')
  assert not errors,(width,errors)
  assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1'),width
  print(f'PASS {width}px AniList confirmed +1, concurrent-lock, failure rollback, Home and manual remote refresh')
  page.close()
 browser.close()
