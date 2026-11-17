"""Rendered personal homepage rails, keyboard and partial-failure recovery."""
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
JS=(ROOT/'app.js').read_text();CSS=(ROOT/'style.css').read_text()
with sync_playwright() as pw:
 browser=pw.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 for width in (375,768,1440):
  page=browser.new_page(viewport={'width':width,'height':850});errors=[]
  page.on('pageerror',lambda e:errors.append(str(e)))
  page.set_content('<div id="app"></div>');page.add_style_tag(content=CSS)
  page.evaluate('''() => {const mem={};const store={getItem:k=>mem[k]??null,setItem:(k,v)=>mem[k]=String(v),removeItem:k=>delete mem[k]};Object.defineProperty(window,'localStorage',{value:store});Object.defineProperty(window,'sessionStorage',{value:store});window.__failWatchlist=false;window.__calls=[];window.fetch=async(url,opt={})=>{let p=String(url);window.__calls.push(p);if(p.includes('api.trakt.tv')){if(p.includes('/sync/playback'))return {ok:true,status:200,text:async()=>JSON.stringify([{type:'movie',progress:47,movie:{title:'Continue Film',ids:{trakt:901,tmdb:301}}},{type:'movie',progress:22,movie:{title:'Second Film',ids:{trakt:902,tmdb:302}}}])};if(p.includes('/sync/watchlist/movies')){if(window.__failWatchlist)return {ok:false,status:500,text:async()=>'{"error":"fail"}'};return {ok:true,status:200,text:async()=>JSON.stringify([{movie:{title:'Saved Film',ids:{trakt:903,tmdb:303}}}])}}return {ok:true,status:200,text:async()=>'[]'}}return {ok:false,status:503,json:async()=>({}),text:async()=>'{}'}};}''')
  page.add_script_tag(content='(async()=>{'+JS+'\nwindow.__test={state,renderMain,renderHomeDashboard,setTmdb:fn=>tmdb=fn};window.__ready=true;})().catch(e=>console.error(e))')
  page.wait_for_function('window.__ready===true')
  # Wait for the initial mocked 503 read and its bounded retry to finish.
  page.wait_for_timeout(650)
  page.evaluate('''() => {let t=window.__test;t.state.section='Movies';t.state.tab='Recommended';t.state.trakt='mock-token';t.state.items=[{id:1,_key:1,title:'Discovery Film',poster_path:'/a.jpg'}];t.state.recommendationPool=t.state.items;t.setTmdb(async()=>({poster_path:'/art.jpg'}));t.renderMain();t.renderHomeDashboard()}''')
  page.locator('.home-rail').first.wait_for()
  assert page.locator('.home-rail').count()==2
  assert page.locator('[aria-label="Continue Watching"] .poster').count()==2
  assert page.locator('[aria-label="Your Watchlist"] .poster').count()==1
  first=page.locator('[aria-label="Continue Watching"] .poster').first
  first.focus();first.press('ArrowRight')
  assert page.evaluate("document.activeElement===document.querySelectorAll('[aria-label=\"Continue Watching\"] .poster')[1]")
  page.locator('[aria-label="Your Watchlist"] .poster').click()
  assert page.locator('.detail-overlay').count()==1
  assert 'Saved Film' in page.locator('.detail-overlay').inner_text()
  page.keyboard.press('Escape');page.locator('.detail-overlay').wait_for(state='detached')
  page.evaluate('''() => {window.__failWatchlist=true;window.__test.renderHomeDashboard()}''')
  page.locator('[data-retry-home]').wait_for()
  assert page.locator('[aria-label="Continue Watching"] .poster').count()==2
  assert page.locator('[aria-label="Your Watchlist"] .poster').count()==0
  assert 'Watchlist could not be loaded' in page.locator('#home-dashboard').inner_text()
  page.evaluate('window.__failWatchlist=false')
  page.locator('[data-retry-home]').click()
  page.locator('[aria-label="Your Watchlist"] .poster').wait_for()
  assert not errors,(width,errors)
  print(f'PASS {width}px: personal rails, correct card, keyboard, partial failure and retry')
  page.close()
 browser.close()
