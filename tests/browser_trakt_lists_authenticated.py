"""Chromium Trakt list CRUD with simulated authenticated remote storage and failures."""
from pathlib import Path
from playwright.sync_api import sync_playwright
from urllib.parse import unquote,urlparse
ROOT=Path(__file__).resolve().parents[1]
JS=(ROOT/'app.js').read_text();CSS=(ROOT/'style.css').read_text()
with sync_playwright() as pw:
 browser=pw.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 for width in (375,768,1440):
  page=browser.new_page(viewport={'width':width,'height':900});errors=[]
  page.on('pageerror',lambda e:errors.append(str(e)))
  def assets(route):
   path=unquote(urlparse(route.request.url).path).lstrip('/');target=(ROOT/path).resolve()
   route.fulfill(path=str(target)) if target.is_relative_to(ROOT) and target.is_file() else route.fulfill(status=404,body='missing')
  page.route('https://mokumokuren.test/**',assets)
  page.set_content('<base href="https://mokumokuren.test/"><div id="app"></div>');page.add_style_tag(content=CSS)
  page.evaluate("""() => {const m={};const s={getItem:k=>m[k]??null,setItem:(k,v)=>m[k]=String(v),removeItem:k=>delete m[k]};Object.defineProperty(window,'localStorage',{value:s});Object.defineProperty(window,'sessionStorage',{value:s});window.fetch=async()=>({ok:false,status:503,text:async()=>'{}',json:async()=>({})});}""")
  fixture="""state.section='Movies';state.trakt='fake-token';window.__remoteLists=[];window.__remoteItems={};window.__calls=[];window.__fail=false;
  trakt=async(path,opts={})=>{const method=opts.method||'GET';window.__calls.push({path,method,body:opts.body});if(window.__fail&&method!=='GET')throw Error('Simulated Trakt outage');
  if(path.split('?')[0]==='/users/me/lists') {if(method==='GET')return structuredClone(window.__remoteLists);const list={name:JSON.parse(opts.body).name,ids:{trakt:99}};window.__remoteLists.push(list);window.__remoteItems[99]=[];return list;}
  if(path==='/users/me/lists/99'){if(method==='DELETE'){window.__remoteLists=[];delete window.__remoteItems[99];return null;}}
  if(path.split('?')[0]==='/users/me/lists/99/items'){if(method==='GET'){if(window.__failListRead)throw Error('Items unavailable');return structuredClone(window.__remoteItems[99]||[]);}const item=JSON.parse(opts.body).movies?.[0];if(!item)throw Error('Incorrect movie payload');if(method==='POST')window.__remoteItems[99].push({type:'movie',movie:{title:'Sample Film',ids:item.ids}});if(method==='DELETE')window.__remoteItems[99]=window.__remoteItems[99].filter(x=>x.movie.ids.tmdb!==item.ids.tmdb);return {added:{movies:1},deleted:{movies:1}};}
  throw Error('Unexpected route '+method+' '+path);
  };window.__showLists=showPersonalLists;window.__ready=true;"""
  page.add_script_tag(content='(async()=>{'+JS.replace('await callback();layout();setupConnectivity();await verifyAccounts();load();','await callback();layout();'+fixture)+'})().catch(e=>console.error(e))')
  page.wait_for_function('window.__ready===true')
  page.evaluate('window.__showLists()')
  page.locator('#personal-list-name').fill('Favorites')
  page.locator('#create-personal-list button').click()
  page.locator('.personal-list-group').wait_for()
  assert page.evaluate('window.__remoteLists[0].name')=='Favorites'
  page.locator('.personal-list-overlay .close').click()
  page.evaluate("window.__showLists({id:201,title:'Sample Film'})")
  page.locator('[data-toggle-list]').click()
  page.wait_for_function("window.__remoteItems[99]?.length===1")
  page.get_by_text('Sample Film',exact=False).first.wait_for()
  assert page.evaluate("window.__calls.some(c=>c.method==='POST'&&c.path.endsWith('/items')&&JSON.parse(c.body).movies[0].ids.tmdb===201)")
  page.evaluate('window.__fail=true')
  page.locator('[data-toggle-list]').click()
  page.locator('#personal-list-feedback').get_by_text('Simulated Trakt outage').wait_for()
  assert page.evaluate('window.__remoteItems[99].length')==1
  page.evaluate('window.__fail=false')
  page.locator('[data-toggle-list]').click()
  page.wait_for_function('window.__remoteItems[99]?.length===0')
  page.on('dialog',lambda dialog:dialog.accept())
  page.locator('[data-delete-list]').click()
  page.wait_for_function('window.__remoteLists.length===0')
  page.locator('.personal-list-overlay .close').click()
  # Simulate a partial outage when fetching a list's items, then recover without reopening.
  page.evaluate("""() => {window.__remoteLists=[{name:'Recovery',ids:{trakt:99}}];window.__remoteItems[99]=[{type:'movie',movie:{title:'Sample Film',ids:{tmdb:201}}}];window.__failListRead=true;}""")
  page.evaluate("window.__showLists({id:201,title:'Sample Film'})")
  page.locator('#personal-list-feedback').get_by_text('Some list items could not be loaded').wait_for()
  assert page.locator('[data-toggle-list]').count()==0
  page.evaluate('window.__failListRead=false')
  page.locator('#refresh-personal-lists').click()
  page.locator('[data-toggle-list]').get_by_text('Remove title from list').wait_for()
  page.locator('.personal-list-overlay .close').click()
  assert not errors,(width,errors)
  assert page.evaluate('document.documentElement.scrollWidth<=innerWidth'),(width,'overflow')
  print(f'PASS {width}px Trakt lists create/add/rejection/remove/delete')
  page.close()
 browser.close()
