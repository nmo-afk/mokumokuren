"""Browser regression: TV season switching and unauthenticated anime controls."""
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
  page.evaluate('''() => {const memory={};const storage={getItem:k=>memory[k]??null,setItem:(k,v)=>memory[k]=String(v),removeItem:k=>delete memory[k]};Object.defineProperty(window,'localStorage',{value:storage});Object.defineProperty(window,'sessionStorage',{value:storage});window.fetch=async()=>({ok:false,status:503,text:async()=>'{}',json:async()=>({})});}''')
  page.add_script_tag(content='(async()=>{'+JS+'\nwindow.__test={state,renderMain,setTmdb:fn=>tmdb=fn};window.__mokuReady=true;})().catch(e=>console.error(e))')
  page.wait_for_function('window.__mokuReady===true')
  page.evaluate('''() => {window.__test.state.section='TV Shows';window.__test.state.tab='Recommended';window.__test.state.trakt='';window.__test.state.items=[{id:501,title:'Sample Series',name:'Sample Series',_key:501,ids:{tmdb:501}}];window.__test.state.recommendationPool=window.__test.state.items;window.__test.setTmdb(async path=>{if(path==='/tv/501')return {seasons:[{season_number:1,name:'Season 1'},{season_number:2,name:'Season 2'}]};if(path==='/tv/501/season/1')return {episodes:[{episode_number:1,name:'Pilot'},{episode_number:2,name:'Second'}]};if(path==='/tv/501/season/2')return {episodes:[{episode_number:1,name:'Return'}]};return {}});window.__test.renderMain();}''')
  page.locator('.recommendation-gallery .poster').first.click()
  tabs=page.locator('.detail-overlay [data-detail-tab]')
  assert tabs.count()>=2,(width,tabs.count())
  page.locator('.detail-overlay [data-detail-tab="episodes"]').click()
  page.locator('.episode-card').first.wait_for()
  assert page.locator('.episode-card').count()==2
  assert 'Pilot' in page.locator('.episode-card').first.inner_text()
  assert page.locator('.episode-toggle').first.is_disabled()
  page.locator('#season-select').select_option('2')
  page.wait_for_function("document.querySelectorAll('.episode-card').length===1")
  assert 'Return' in page.locator('.episode-card').first.inner_text()
  page.keyboard.press('Escape');assert page.locator('.detail-overlay').count()==0
  page.evaluate('''() => {window.__test.state.section='Anime';window.__test.state.tab='Recommended';window.__test.state.anilist='';window.__test.state.items=[{id:701,_key:701,title:'Sample Anime',episodes:12,progress:3,status:'CURRENT',description:'Anime synopsis'}];window.__test.state.recommendationPool=window.__test.state.items;window.__test.renderMain();}''')
  page.locator('.recommendation-gallery .poster').first.click()
  page.locator('.detail-overlay [data-detail-tab="episodes"]').click()
  page.locator('#progress-count').wait_for()
  assert page.locator('#progress-count').inner_text()=='3 / 12'
  assert page.locator('#episode-plus').is_disabled()
  assert page.locator('#episode-minus').is_disabled()
  assert all(x.is_disabled() for x in page.locator('[data-anime-status]').all())
  page.keyboard.press('Escape')
  assert not errors,(width,errors)
  print(f'PASS {width}px: TV seasons/episodes, no-account tracking guard, anime progress/status controls')
  page.close()
 browser.close()
