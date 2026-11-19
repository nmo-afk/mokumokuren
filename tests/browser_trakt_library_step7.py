"""Offline full DOM validation: complete/in-progress/watchlist split and Continue Watching."""
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
JS=(ROOT/'app.js').read_text()
CSS=(ROOT/'style.css').read_text()+'\n'+(ROOT/'trakt-rebuild.css').read_text()
fixture="""
const realTrakt=trakt;
trakt=async(path)=>{
 if(path.startsWith('/sync/progress/watched?page=1&'))return [
  {show:{title:'Halfway Through',ids:{trakt:11,tmdb:1011}},
   progress:{completed:3,aired:10,next_episode:{season:1,number:4,title:'Next Up'}}},
  {show:{title:'Finished Series',ids:{trakt:22,tmdb:1022}},progress:{completed:10,aired:10,next_episode:null}},
  {show:{title:'Unavailable Progress',ids:{trakt:33,tmdb:1033}}},
 ];
 if(path.startsWith('/sync/watchlist/shows?page=1&'))return [{show:{title:'Saved For Later',ids:{trakt:44,tmdb:1044}}}];
 if(path.startsWith('/sync/playback'))return [];
 return [];
};
enrichTraktCollection=async items=>items;
state.trakt='fixture';state.section='TV Shows';state.tab='In Progress';
await load();window.__ready=true;
window.__test={state,load,renderMain,renderHomeDashboard,useRealTrakt:()=>{trakt=realTrakt}};
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
  page.evaluate("""async () => {
    const t=window.__test;
    t.useRealTrakt();
    t.state.tab='In Progress';
    window.__allowTraktRead=false;
    window.fetch=async url=>{
      if(url.startsWith('https://api.trakt.tv/sync/progress/watched?')){
        if(window.__allowTraktRead)return Response.json([]);
        throw new TypeError('Failed to fetch');
      }
      if(url.startsWith('/api/trakt?path=%2Fsync%2Fprogress%2Fwatched')){
        return Response.json({error:'Trakt upstream blocked by Cloudflare',upstream_status:403},{status:502,headers:{'x-mokumokuren-trakt-blocked':'1'}});
      }
      throw new Error('Unexpected fixture request: '+url);
    };
    await t.load();
  }""")
  error=page.locator('#main .library-load-error[role="alert"]')
  assert error.is_visible()
  assert 'In Progress unavailable' in error.inner_text()
  assert 'Cloudflare' in error.inner_text()
  assert page.locator('#library-count').count()==0
  assert page.locator('#library-empty').is_hidden()
  page.evaluate('window.__allowTraktRead=true')
  page.locator('#library-refresh').click()
  page.wait_for_selector('#library-count')
  assert page.locator('#library-count').inner_text()=='0'
  assert page.locator('#library-empty').is_visible()
  assert error.is_hidden()
  assert not errors,(width,errors)
  assert page.evaluate('document.documentElement.scrollWidth<=innerWidth'),(width,'horizontal overflow')
  print(f'PASS {width}px: Trakt show categories, warnings, native watchlist, Continue Watching, gateway error and refresh recovery')
  page.close()
 browser.close()
