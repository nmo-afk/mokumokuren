"""Step 9: Trakt Continue Watching +1 reads back next episode, blocks duplicate writes."""
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
JS=(ROOT/'app.js').read_text()
CSS=(ROOT/'style.css').read_text()+'\n'+(ROOT/'trakt-rebuild.css').read_text()
fixture=r'''() => {
 window.__server={episode:1,writes:[],delayed:false,resolve:null,shouldFail:false};
 window.__test={state,layout,renderHomeDashboard,refreshRemoteTracking,setTrakt:fn=>trakt=fn};
 window.__test.setTrakt(async(path,options={})=>{
  const s=window.__server;
  if(path.startsWith('/sync/watched/shows'))return [{show:{title:'Galaxy Rangers',ids:{trakt:33,tmdb:733}}}];
  if(path.startsWith('/sync/watchlist/shows'))return [];
  if(path.includes('/shows/33/progress/watched'))return {completed:false,completed_episodes:s.episode,aired:12,next_episode:{season:1,number:s.episode+1,title:'Episode '+(s.episode+1)}};
  if(path==='/sync/history'){
   s.writes.push(JSON.parse(options.body));
   if(s.delayed)await new Promise(resolve=>s.resolve=resolve);
   if(s.shouldFail)throw Error('Trakt failed');
   s.episode++;
   return {added:{episodes:1},not_found:{shows:[]}};
  }
  return [];
 });
 enrichTraktCollection=async rows=>rows;
 state.section='TV Shows';state.tab='Recommended';state.trakt='mock-account';state.items=[{id:11,title:'Discovery fixture'}];state.demo=false;
 layout();
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
  page.evaluate('window.__test.renderHomeDashboard()')
  page.wait_for_function("document.querySelector('.home-rail-continue')?.textContent?.includes('E2')")
  assert page.locator('.home-rail-continue [data-home-quick]').count()==1
  assert page.locator('.home-rail-continue .poster [data-home-quick]').count()==0
  page.evaluate('window.__server.delayed=true')
  page.locator('.home-rail-continue [data-home-quick]').click()
  page.wait_for_function('window.__server.resolve!==null')
  assert page.evaluate('window.__server.episode')==1
  assert page.locator('.home-rail-continue [data-home-quick]').is_disabled()
  assert page.evaluate('window.__server.writes[0].shows[0].seasons[0].episodes[0].number')==2
  page.evaluate('window.__server.delayed=false;window.__server.resolve()')
  page.wait_for_function('window.__server.episode===2')
  page.wait_for_function("document.querySelector('.home-rail-continue')?.textContent?.includes('E3')")
  assert page.evaluate('window.__server.writes.length')==1
  # Failed provider write must leave episode history unchanged; no guessing E4.
  page.evaluate('window.__server.shouldFail=true')
  page.locator('.home-rail-continue [data-home-quick]').click()
  page.wait_for_function('window.__server.writes.length===2')
  page.wait_for_function("document.querySelector('.home-rail-continue [data-home-quick]')?.disabled===false")
  assert page.evaluate('window.__server.episode')==2
  assert 'E3' in page.locator('.home-rail-continue').inner_text()
  assert not errors,(width,errors)
  print(f'PASS {width}px Trakt +1 confirmed write, next-episode readback, failure guard, compact Home controls')
  page.close()
 browser.close()
