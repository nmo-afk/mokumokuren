"""Real Chromium AniList tracking checks with deterministic mocked GraphQL responses."""
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
  page.add_script_tag(content='(async()=>{'+JS+'''
  load=async()=>{};window.__test={state,renderMain,setAni:fn=>ani=fn};window.__ready=true;
  })().catch(e=>console.error(e))''')
  page.wait_for_function('window.__ready===true');page.wait_for_timeout(350)
  page.evaluate('''() => {const t=window.__test;t.state.section='Anime';t.state.tab='Recommended';t.state.anilist='mock-auth-token';t.state.items=[{id:701,_key:701,title:'Sample Anime',episodes:12,progress:3,status:'CURRENT',description:'Synopsis'}];t.state.recommendationPool=t.state.items;window.__mockMode='success';window.__calls=[];t.setAni(async (query,variables)=>{window.__calls.push({query,variables});if(window.__mockMode==='reject')return {SaveMediaListEntry:{id:900,progress:999,status:'DROPPED'}};return {SaveMediaListEntry:{id:900,progress:variables.progress??3,status:variables.status??'CURRENT'}}});t.renderMain();}''')
  page.locator('.recommendation-gallery .poster').first.click()
  page.locator('[data-detail-tab="episodes"]').click()
  plus=page.locator('#episode-plus');plus.wait_for()
  assert not plus.is_disabled()
  plus.click()
  page.wait_for_timeout(500);print('ERRORS',errors);print('STATE',page.evaluate("({token:window.__test.state.anilist,calls:window.__calls,disabled:document.querySelector('#episode-plus')?.disabled,busy:document.querySelector('.anime-tracker')?.dataset.syncBusy,errors:document.querySelector('#anime-sync-note')?.textContent,toast:document.querySelector('.toast')?.textContent})"))
  page.wait_for_function("document.querySelector('#progress-count')?.textContent==='4 / 12'",timeout=5000)
  assert page.evaluate('window.__test.state.items[0].progress')==4
  assert page.evaluate("window.__calls.filter(c=>c.query.includes('SaveMediaListEntry')).at(-1).variables.progress")==4
  page.evaluate("window.__mockMode='reject'")
  plus.click()
  page.wait_for_timeout(500);print('ERRORS',errors);print('STATE',page.evaluate("({token:window.__test.state.anilist,calls:window.__calls,disabled:document.querySelector('#episode-plus')?.disabled,busy:document.querySelector('.anime-tracker')?.dataset.syncBusy,errors:document.querySelector('#anime-sync-note')?.textContent,toast:document.querySelector('.toast')?.textContent})"))
  page.wait_for_function("window.__calls.length>=2 && document.querySelector('#episode-plus')?.disabled===false")
  assert page.locator('#progress-count').inner_text()=='4 / 12','rejected mutation must not advance progress'
  assert page.evaluate('window.__test.state.items[0].progress')==4
  page.evaluate("window.__mockMode='success'")
  page.locator('[data-anime-status="COMPLETED"]').click()
  page.wait_for_function("window.__test.state.items[0].status==='COMPLETED'")
  assert page.locator('[data-anime-status="COMPLETED"]').get_attribute('class').find('active')>=0
  page.evaluate("window.__mockMode='reject'")
  page.locator('[data-anime-status="PAUSED"]').click()
  page.wait_for_function("window.__calls.length>=4 && document.querySelector('[data-anime-status=PAUSED]')?.disabled===false")
  assert page.evaluate('window.__test.state.items[0].status')=='COMPLETED','rejected status must not mutate state'
  assert not errors,(width,errors)
  print(f'PASS {width}px: authenticated mock progress/status success and rejection')
  page.close()
 browser.close()
