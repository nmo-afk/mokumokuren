"""Browser-level Trakt TV episode tracking, confirmation and rejection."""
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
JS=(ROOT/'app.js').read_text()
CSS=(ROOT/'style.css').read_text()+'\n'+(ROOT/'trakt-rebuild.css').read_text()
with sync_playwright() as pw:
 browser=pw.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 for width in (375,768,1440):
  page=browser.new_page(viewport={'width':width,'height':850});errors=[]
  page.on('pageerror',lambda e:errors.append(str(e)))
  page.set_content('<div id="app"></div>');page.add_style_tag(content=CSS)
  page.evaluate('''() => {const mem={};const store={getItem:k=>mem[k]??null,setItem:(k,v)=>mem[k]=String(v),removeItem:k=>delete mem[k]};Object.defineProperty(window,'localStorage',{value:store});Object.defineProperty(window,'sessionStorage',{value:store});window.__calls=[];window.__watched=false;window.__mode='success';window.fetch=async(url,opt={})=>{let path=String(url),method=opt.method||'GET';if(path.includes('api.trakt.tv')){window.__calls.push({path,method,body:opt.body});if(path.includes('/seasons?'))return {ok:true,status:200,text:async()=>JSON.stringify([{number:1,episode_count:2}])};if(path.includes('/seasons/1?'))return {ok:true,status:200,text:async()=>JSON.stringify([{number:1,title:'Pilot',ids:{trakt:9001}},{number:2,title:'Next',ids:{trakt:9002}}])};if(path.includes('/progress/watched'))return {ok:true,status:200,text:async()=>JSON.stringify({seasons:[{number:1,episodes:[{number:1,completed:window.__watched},{number:2,completed:false}]}]})};if(method==='POST'){if(window.__mode==='http-error')return {ok:false,status:500,text:async()=>'{"error":"failure"}'};if(window.__mode==='unconfirmed')return {ok:true,status:200,text:async()=>'{"added":{"episodes":1}}'};window.__watched=!path.includes('/remove');return {ok:true,status:200,text:async()=>'{"added":{"episodes":1}}'};}return {ok:true,status:200,text:async()=>'[]'};}return {ok:false,status:503,text:async()=>'{}',json:async()=>({})}}}''')
  page.add_script_tag(content='(async()=>{'+JS+'\nwindow.__test={state,renderMain,setTmdb:fn=>tmdb=fn};window.__ready=true;})().catch(e=>console.error(e))')
  page.wait_for_function('window.__ready===true')
  page.evaluate('''() => {const t=window.__test;t.state.section='TV Shows';t.state.tab='Recommended';t.state.trakt='mock-token';t.state.items=[{id:501,_key:501,title:'Sample Series',ids:{trakt:700,tmdb:501}}];t.state.recommendationPool=t.state.items;t.setTmdb(async()=>({}));t.renderMain()}''')
  page.locator('.recommendation-gallery .poster').first.click()
  page.locator('[data-detail-tab="episodes"]').click()
  page.locator('.episode-toggle').first.wait_for()
  first=page.locator('.episode-toggle').first
  assert not first.is_disabled()
  first.click();page.wait_for_function("document.querySelector('.episode-toggle')?.classList.contains('is-watched')")
  assert page.evaluate('window.__watched')
  post=page.evaluate("window.__calls.find(c=>c.method==='POST')")
  assert post and post['path'].endswith('/sync/history') and __import__('json').loads(post['body'])['episodes'][0]['ids']['trakt']==9001
  page.evaluate("window.__mode='http-error'")
  first.click();page.wait_for_function("document.querySelector('.episode-toggle')?.disabled===false")
  assert page.evaluate('window.__watched') and first.get_attribute('aria-label')=='Mark episode 1 unwatched'
  page.evaluate("window.__mode='unconfirmed'")
  first.click();page.wait_for_function("document.querySelector('.episode-toggle')?.disabled===false")
  assert page.evaluate('window.__watched') and first.get_attribute('class').find('is-watched')>=0
  page.evaluate("window.__mode='success'")
  first.click();page.wait_for_function("!document.querySelector('.episode-toggle')?.classList.contains('is-watched')")
  assert not page.evaluate('window.__watched')
  page.get_by_role('button',name='Track episode 1 by date').click()
  drawer=page.get_by_role('dialog',name='Pilot')
  drawer.get_by_role('button',name='Release date').click()
  drawer.wait_for(state='hidden')
  assert page.evaluate("JSON.parse(window.__calls.filter(c=>c.method==='POST').at(-1).body)") == {
   'episodes':[{'ids':{'trakt':9001},'watched_at':'released'}]}
  page.wait_for_function("document.querySelector('.episode-toggle')?.classList.contains('is-watched')")
  assert not errors,(width,errors)
  print(f'PASS {width}px: episode watched/unwatched, HTTP rejection, unconfirmed write, dated episode scope')
  page.close()
 browser.close()
