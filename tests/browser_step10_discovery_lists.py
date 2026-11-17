"""Step 10 offline Chromium tests: recommendation controls and native Trakt list UX."""
from pathlib import Path
from urllib.parse import unquote, urlparse
from playwright.sync_api import sync_playwright
ROOT = Path(__file__).resolve().parents[1]
JS = (ROOT/'app.js').read_text()
CSS = (ROOT/'style.css').read_text() + '\n' + (ROOT/'trakt-rebuild.css').read_text()
fixture = '''
state.section='Movies';state.tab='Recommended';state.trakt='offline-token';
state.items=[
 {id:501,title:'Amber',genres:['Drama'],release_date:'2022-01-01',vote_average:4,overview:'Soft drama'},
 {id:502,title:'Blue',genres:['Action'],release_date:'2024-01-01',vote_average:9,overview:'Action feature'},
 {id:503,title:'Cobalt',genres:['Action'],release_date:'2024-01-01',vote_average:7,overview:'Action mystery'},
 {id:504,title:'Dawn',genres:['Drama'],release_date:'2026-01-01',vote_average:8,overview:'Story'}
];renderMain();
window.__remoteLists=[{name:'Zeta',ids:{trakt:71}},{name:'Alpha',ids:{trakt:72}}];
window.__remoteItems={71:[{type:'movie',movie:{title:'Autumn Road',ids:{tmdb:1}}},{type:'movie',movie:{title:'Fjord Blue',ids:{tmdb:2}}}],72:[{type:'movie',movie:{title:'Azure',ids:{tmdb:3}}}]};
trakt=async(path,opts={})=>{
 const method=opts.method||'GET';const pure=path.split('?')[0];
 if(pure==='/users/me/lists'&&method==='GET')return structuredClone(window.__remoteLists);
 const match=pure.match(/^\\/users\\/me\\/lists\\/(71|72)\\/items$/);
 if(match){const id=Number(match[1]);if(method==='GET')return structuredClone(window.__remoteItems[id]);
 if(method==='DELETE'){const ids=JSON.parse(opts.body).movies[0].ids;window.__remoteItems[id]=window.__remoteItems[id].filter(e=>e.movie.ids.tmdb!==ids.tmdb);return {deleted:{movies:1}};}}
 throw Error('Unexpected '+method+' '+path);
};
window.__openLists=showPersonalLists;window.__checkContains=traktListContains;window.__replacePagedRead=fn=>{traktPagedRead=fn};window.__ready=true;
'''
with sync_playwright() as pw:
 browser = pw.chromium.launch(executable_path='/usr/bin/chromium', args=['--no-sandbox'])
 for width in (320, 375, 768, 1440):
  page=browser.new_page(viewport={'width':width,'height':900}); errors=[]
  page.on('pageerror',lambda e:errors.append(str(e)))
  def assets(route):
   rel=unquote(urlparse(route.request.url).path).lstrip('/'); target=(ROOT/rel).resolve()
   route.fulfill(path=str(target)) if target.is_relative_to(ROOT) and target.is_file() else route.fulfill(status=404,body='missing')
  page.route('https://mokumokuren.test/**',assets)
  page.set_content('<base href="https://mokumokuren.test/"><div id="app"></div>')
  page.add_style_tag(content=CSS)
  page.evaluate("""() => {const m={};const s={getItem:k=>m[k]??null,setItem:(k,v)=>m[k]=String(v),removeItem:k=>delete m[k]};Object.defineProperty(window,'localStorage',{value:s});Object.defineProperty(window,'sessionStorage',{value:s});window.fetch=async()=>({ok:false,status:503,text:async()=>'{}',json:async()=>({})});}""")
  page.add_script_tag(content='(async()=>{'+JS.replace('await callback();layout();setupConnectivity();await verifyAccounts();load();','await callback();layout();'+fixture)+'})().catch(e=>console.error(e))')
  page.wait_for_function('window.__ready===true')
  assert page.locator('.recommendation-gallery .poster').count()==4
  page.locator('.trakt-home-extras summary').click()  # Trakt-first Home keeps advanced discovery controls collapsed.
  page.locator('#discovery-year').select_option('2024')
  assert page.locator('.recommendation-gallery .poster').count()==2
  page.locator('#discovery-sort').select_option('rating')
  assert 'Blue' in page.locator('.recommendation-gallery .poster').first.inner_text()
  page.locator('#discovery-sort').select_option('title')
  assert 'Blue' in page.locator('.recommendation-gallery .poster').first.inner_text()
  page.locator('#discovery-genre').select_option('Action')
  assert page.locator('.recommendation-gallery .poster').count()==2
  page.locator('#discovery-search').fill('Cobalt')
  assert page.locator('.recommendation-gallery .poster').count()==1
  page.locator('.recommendation-gallery .poster').click()
  assert 'Cobalt' in page.locator('.detail-modal').inner_text()
  page.keyboard.press('Escape')
  page.locator('#discovery-reset').click()
  assert page.locator('.recommendation-gallery .poster').count()==4
  assert page.locator('#discovery-year').input_value()==''
  assert page.locator('#discovery-sort').input_value()=='recommended'
  # Match either Trakt or TMDB IDs, but never cross movie/show types.
  assert page.evaluate("window.__checkContains([{type:'movie',movie:{ids:{trakt:991}}}],{tmdb_id:123,trakt_id:991})") is True
  assert page.evaluate("window.__checkContains([{type:'show',show:{ids:{trakt:991}}}],{tmdb_id:123,trakt_id:991})") is False
  # Search and reorder the account-native lists, then delete a filtered item at index 1.
  page.evaluate('window.__openLists()')
  page.locator('.personal-list-group').first.wait_for()
  page.locator('#personal-list-sort').select_option('name')
  assert 'Alpha' in page.locator('.personal-list-group').first.locator('h3').inner_text()
  page.locator('#personal-list-sort').select_option('size')
  assert 'Zeta' in page.locator('.personal-list-group').first.locator('h3').inner_text()
  page.locator('#personal-list-search').fill('Fjord')
  assert page.locator('.personal-list-group').count()==1
  assert page.locator('.personal-list-item').count()==1
  assert 'Fjord Blue' in page.locator('.personal-list-item').inner_text()
  page.locator('[data-remove-entry]').click()
  page.wait_for_function('window.__remoteItems[71].length===1')
  assert page.evaluate('window.__remoteItems[71][0].movie.title')=='Autumn Road'
  assert page.locator('.personal-list-group').count()==0
  assert 'No Trakt lists or titles match' in page.locator('#personal-list-entries').inner_text()
  page.locator('#personal-list-search').fill('')
  assert page.locator('.personal-list-group').count()==2
  assert 'Autumn Road' in page.locator('.personal-list-item').first.inner_text()
  assert page.locator('#personal-list-count').inner_text()=='2 of 2 lists'
  page.locator('.personal-list-overlay .close').click()
  # Nine lists must never produce more than four concurrent item reads.
  page.evaluate("""() => {
   window.__readsActive=0;window.__readsMax=0;
   window.__replacePagedRead(async(path)=>{
    if(path==='/users/me/lists')return Array.from({length:9},(_,i)=>({name:'List '+i,ids:{trakt:800+i}}));
    window.__readsActive++;window.__readsMax=Math.max(window.__readsActive,window.__readsMax);
    await new Promise(r=>setTimeout(r,18));window.__readsActive--;return [];
   });window.__openLists();
  }""")
  page.wait_for_function("document.querySelectorAll('.personal-list-group').length===9")
  assert page.evaluate('window.__readsMax')==4,(width,'unbounded native list reads')
  page.locator('.personal-list-overlay .close').click()
  assert page.evaluate('document.documentElement.scrollWidth<=innerWidth'),(width,'overflow')
  assert not errors,(width,errors)
  print(f'PASS {width}px: recommendation sorting/year/reset, Trakt list search/sort/stable-index removal')
  page.close()
 browser.close()
