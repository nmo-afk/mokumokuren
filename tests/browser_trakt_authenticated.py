"""Mocked Trakt watchlist changes, dated tracking and write confirmation."""
from pathlib import Path
from playwright.sync_api import expect, sync_playwright
ROOT=Path(__file__).resolve().parents[1]
JS=(ROOT/'app.js').read_text()
CSS=(ROOT/'style.css').read_text()+'\n'+(ROOT/'trakt-rebuild.css').read_text()
with sync_playwright() as pw:
 browser=pw.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 for width in (375,768,1440):
  page=browser.new_page(viewport={'width':width,'height':850},timezone_id='UTC');errors=[]
  page.on('pageerror',lambda e:errors.append(str(e)))
  page.set_content('<div id="app"></div>');page.add_style_tag(content=CSS)
  page.evaluate('''() => {const mem={};const store={getItem:k=>mem[k]??null,setItem:(k,v)=>mem[k]=String(v),removeItem:k=>delete mem[k]};Object.defineProperty(window,'localStorage',{value:store});Object.defineProperty(window,'sessionStorage',{value:store});window.__calls=[];window.__mode='success';window.__saved=false;window.__watched=false;window.fetch=async(url,opt={})=>{const path=String(url);if(path.includes('api.trakt.tv')){window.__calls.push({path,method:opt.method||'GET',body:opt.body});if((opt.method||'GET')==='POST'){if(window.__mode==='http-error')return {ok:false,status:500,text:async()=>JSON.stringify({error:'simulated failure'})};if(window.__mode==='unconfirmed')return {ok:true,status:200,text:async()=>JSON.stringify({added:{movies:0},deleted:{movies:0}})};if(path.includes('watchlist/remove'))window.__saved=false;else if(path.endsWith('/sync/watchlist'))window.__saved=true;else if(path.endsWith('/sync/history'))window.__watched=true;return {ok:true,status:200,text:async()=>JSON.stringify({added:{movies:1},deleted:{movies:1}})}}const entries=(path.includes('/sync/watchlist/')&&window.__saved)||(path.includes('/sync/watched/')&&window.__watched)?[{movie:{ids:{tmdb:201}}}]:[];return {ok:true,status:200,text:async()=>JSON.stringify(entries)}}return {ok:false,status:503,text:async()=>'{}',json:async()=>({})}};}''')
  page.add_script_tag(content='(async()=>{'+JS+'''\nwindow.__test={state,renderMain,setTmdb:fn=>tmdb=fn};window.__ready=true;})().catch(e=>console.error(e))''')
  page.wait_for_function('window.__ready===true')
  page.evaluate('''() => {
   const mockFetch = window.fetch;
   window.fetch = (url, options) => {
    if (String(url).endsWith('/sync/history?limit=15')) {
     return Promise.resolve(new Response(JSON.stringify([
      {type:'movie', watched_at:'2020-06-03T22:00:00Z', movie:{title:'Later Film'}},
      {type:'movie', watched_at:'2020-06-03T20:00:00Z', movie:{title:'Earlier Film'}}
     ]), {headers:{'content-type':'application/json'}}));
    }
    return mockFetch(url, options);
   };
  }''')
  page.evaluate('''() => {const t=window.__test;t.state.section='Movies';t.state.tab='Recommended';t.state.trakt='mock-trakt-token';t.state.items=[{id:201,_key:201,title:'Sample Film',poster_path:'/fake.jpg',ids:{tmdb:201}}];t.state.recommendationPool=t.state.items;t.setTmdb(async()=>({}));t.renderMain()}''')
  page.locator('.recommendation-gallery .poster').first.click()
  watch=page.locator('.detail-overlay #watchlist');watched=page.locator('.detail-overlay #watched')
  page.wait_for_function("document.querySelector('#watchlist')?.disabled===false")
  watch.click();page.wait_for_function("document.querySelector('#watchlist')?.dataset.inWatchlist==='true'")
  assert page.evaluate('window.__saved')
  assert page.evaluate("JSON.parse(window.__calls.find(c=>c.method==='POST').body).movies[0].ids.tmdb") == 201
  page.evaluate("window.__mode='http-error'")
  watch.click();page.wait_for_function("document.querySelector('#watchlist')?.disabled===false")
  assert page.evaluate('window.__saved'),'HTTP rejection must not change watchlist'
  assert watch.get_attribute('data-in-watchlist')=='true'
  page.evaluate("window.__mode='unconfirmed'")
  watch.click();page.wait_for_function("document.querySelector('#watchlist')?.disabled===false")
  assert page.evaluate('window.__saved'),'unconfirmed mutation must not change watchlist'
  page.evaluate("window.__mode='success'")
  watch.click();page.wait_for_function("document.querySelector('#watchlist')?.dataset.inWatchlist==='false'")
  assert not page.evaluate('window.__saved')
  writes="window.__calls.filter(c=>c.method==='POST'&&c.path.endsWith('/sync/history'))"
  watched.click()
  drawer=page.locator('.trakt-track-drawer[open]')
  drawer.wait_for()
  expect(drawer).to_have_accessible_name('Sample Film')
  assert drawer.locator('[data-track-choice]').all_text_contents()==['Just now','Release date','Other date','Unknown date']
  drawer.get_by_role('button',name='Other date').click()
  date=drawer.get_by_label('Watch date and time')
  submit=drawer.get_by_role('button',name='Mark as Watched')
  assert date.is_disabled() and submit.is_disabled()
  page.keyboard.press('Escape')
  drawer.get_by_role('button',name='Other date').click()
  drawer.locator('[data-history-slot="1"]').click()
  assert date.input_value()=='2020-06-03T21:00'
  assert page.evaluate(writes)==[], 'Opening the drawer and choosing a slot do not write history'
  page.evaluate("window.__mode='unconfirmed'")
  submit.click()
  expect(drawer.locator('.tracking-feedback')).to_contain_text('did not confirm a new watch')
  assert not page.evaluate('window.__watched')
  assert date.input_value()=='2020-06-03T21:00'
  page.evaluate("window.__mode='success'")
  submit.click()
  drawer.wait_for(state='hidden')
  page.wait_for_function("document.querySelector('#watched')?.ariaLabel==='Track another watch'")
  assert page.evaluate('window.__watched')
  assert page.evaluate("JSON.parse(("+writes+").at(-1).body)")['movies']==[
   {'ids':{'tmdb':201},'watched_at':'2020-06-03T21:00:00.000Z'}]
  assert watched.is_enabled()
  watched.click()
  drawer.get_by_role('button',name='Unknown date').click()
  drawer.wait_for(state='hidden')
  assert page.evaluate("JSON.parse(("+writes+").at(-1).body)")['movies'][0]['watched_at']=='unknown'
  assert not errors,(width,errors)
  print(f'PASS {width}px: Trakt watchlist changes, date selection, unconfirmed writes, dated rewatch')
  page.close()
 browser.close()
