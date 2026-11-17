"""Offline Chromium test: real Trakt review mapping, spoiler filtering and escaping."""
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
JS=(ROOT/'app.js').read_text()
CSS=(ROOT/'style.css').read_text()+'\n'+(ROOT/'trakt-rebuild.css').read_text()
assert JS.endswith('await callback();layout();setupConnectivity();await verifyAccounts();load();\n')
FIX=r'''
const movie={id:501,ids:{trakt:801,tmdb:501},title:'Mock Movie',release_date:'2026-01-01',overview:'A movie with trusted review data.',vote_average:7.5};
state.section='Movies';state.tab='Recommended';state.items=[movie];state.recommendationPool=[movie];state.trakt='mock-access';
layout();
tmdb=async path=>path==='/movie/501'?{...movie,credits:{cast:[],crew:[]},genres:[],videos:{results:[]}}:{results:[]};
trakt=async path=>path.includes('/comments/')?[
 {id:1,comment:'A thoroughly enjoyable film.',user:{name:'Reviewer One'},user_rating:8,created_at:'2026-11-01T12:01:00.000Z'},
 {id:2,comment:'<img src=x onerror=alert(1)>',user:{username:'Reviewer Two'},user_rating:10},
 {id:3,comment:'Plot twist spoiler',spoiler:true,user:{name:'Reviewer Three'}}
]:[];
window.__open=()=>openItem(movie);
window.__ready=true;
'''
with sync_playwright() as pw:
 browser=pw.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 for width in (375,1440):
  page=browser.new_page(viewport={'width':width,'height':900});errors=[]
  page.on('pageerror',lambda err:errors.append(str(err)))
  page.set_content('<div id="app"></div>');page.add_style_tag(content=CSS)
  page.evaluate("""()=>{const m={};const s={getItem:k=>m[k]??null,setItem:(k,v)=>m[k]=String(v),removeItem:k=>delete m[k]};Object.defineProperty(window,'localStorage',{value:s});Object.defineProperty(window,'sessionStorage',{value:s});window.fetch=async()=>({ok:false,status:503,json:async()=>({}),text:async()=>'{}'});}""")
  modified=JS.replace('await callback();layout();setupConnectivity();await verifyAccounts();load();','await callback();'+FIX)
  page.add_script_tag(content='(async()=>{'+modified+'})().catch(e=>{window.__failure=String(e)})')
  page.wait_for_function('window.__ready===true||window.__failure')
  assert not page.evaluate('window.__failure')
  page.evaluate('window.__open()')
  page.locator('.detail-reviews-rail .detail-review').first.wait_for(timeout=8000)
  assert page.locator('.detail-reviews-rail .detail-review').count()==2
  content=page.locator('.detail-reviews-rail').inner_text()
  assert 'Reviewer One' in content and 'A thoroughly enjoyable film' in content
  assert 'Plot twist spoiler' not in content
  assert page.locator('.detail-reviews-rail img').count()==0,'untrusted HTML was rendered'
  assert '<img' in content,'review text should be escaped, not removed'
  menu=page.locator('#detail-options');menu.click()
  assert page.locator('#more').is_visible()
  assert page.locator('#save-personal-list').count()==0
  menu.click()
  assert page.locator('#more').is_hidden()
  assert page.evaluate('document.querySelector(".detail-screen").scrollWidth<=document.querySelector(".detail-screen").clientWidth+1')
  assert not errors,(width,errors)
  print(f'PASS {width}px: Trakt reviews, spoiler filtering, HTML escaping, compact More menu and no overflow')
  page.close()
 browser.close()
