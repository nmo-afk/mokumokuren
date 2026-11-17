"""Offline full DOM validation: complete/in-progress/watchlist split and Continue Watching."""
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
JS=(ROOT/'app.js').read_text()
CSS=(ROOT/'style.css').read_text()+'\n'+(ROOT/'trakt-rebuild.css').read_text()
fixture="""
trakt=async(path)=>{
 if(path.startsWith('/sync/watched/shows'))return [
  {show:{title:'Halfway Through',ids:{trakt:11,tmdb:1011}}},
  {show:{title:'Finished Series',ids:{trakt:22,tmdb:1022}}},
  {show:{title:'Unavailable Progress',ids:{trakt:33,tmdb:1033}}},
 ];
 if(path.includes('/shows/11/progress/watched'))return {completed:false,completed_episodes:3,aired:10,next_episode:{season:1,number:4,title:'Next Up'}};
 if(path.includes('/shows/22/progress/watched'))return {completed:true,completed_episodes:10,aired:10};
 if(path.includes('/shows/33/progress/watched'))throw Error('Unavailable');
 if(path.startsWith('/sync/watchlist/shows'))return [{show:{title:'Saved For Later',ids:{trakt:44,tmdb:1044}}}];
 if(path.startsWith('/sync/playback'))return [];
 return [];
};
enrichTraktCollection=async items=>items;
state.trakt='fixture';state.section='TV Shows';state.tab='In Progress';
await load();window.__ready=true;
window.__test={state,load,renderMain,renderHomeDashboard};
"""
with sync_playwright() as pw:
 browser=pw.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 for width in (375,1440):
  page=browser.new_page(viewport={'width':width,'height':850});errors=[]
  page.on('pageerror',lambda e:errors.append(str(e)))
  page.set_content('<div id="app"></div>');page.add_style_tag(content=CSS)
  page.evaluate("""() => {const cache={};const s={getItem:k=>cache[k]??null,setItem:(k,v)=>cache[k]=String(v),removeItem:k=>delete cache[k]};Object.defineProperty(window,'localStorage',{value:s});Object.defineProperty(window,'sessionStorage',{value:s});window.fetch=async()=>({ok:false,status:503,json:async()=>({}),text:async()=>'{}'});} """)
  source=JS.replace('await callback();layout();setupConnectivity();await verifyAccounts();load();','await callback();layout();'+fixture)
  page.add_script_tag(content='(async()=>{'+source+'})().catch(e=>{console.error(e);window.__failure=String(e)})')
  page.wait_for_function('window.__ready===true||window.__failure!==undefined')
  assert page.evaluate('window.__failure') is None, (width,page.evaluate('window.__failure'))
  assert page.locator('#library-results .poster').count()==1,(width,'in progress')
  assert 'Halfway Through' in page.locator('#library-results').inner_text()
  assert 'Finished Series' not in page.locator('#library-results').inner_text()
  assert '1 shows have unavailable progress' in page.locator('.library-sync-warning').inner_text()
  assert '30%' in page.locator('#library-results').inner_text()
  page.evaluate("async()=>{window.__test.state.tab='Watched';await window.__test.load()}")
  assert page.locator('#library-results .poster').count()==1,(width,'completed count')
  assert 'Finished Series' in page.locator('#library-results').inner_text()
  assert 'Halfway Through' not in page.locator('#library-results').inner_text()
  page.evaluate("async()=>{window.__test.state.tab='Watchlist';await window.__test.load()}")
  assert 'Saved For Later' in page.locator('#library-results').inner_text()
  page.evaluate("async()=>{const t=window.__test;t.state.tab='Recommended';t.state.items=[{id:700,title:'Discovery fixture'}];t.renderMain();await t.renderHomeDashboard()}")
  assert 'Halfway Through' in page.locator('#home-dashboard').inner_text()
  assert 'Finished Series' not in page.locator('#home-dashboard').inner_text()
  assert 'Saved For Later' in page.locator('#home-dashboard').inner_text()
  assert not errors,(width,errors)
  assert page.evaluate('document.documentElement.scrollWidth<=innerWidth'),(width,'horizontal overflow')
  print(f'PASS {width}px: Trakt show categories, warnings, native watchlist, Continue Watching')
  page.close()
 browser.close()
