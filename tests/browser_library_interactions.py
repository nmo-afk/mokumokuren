"""Exercise library filtering, duplicate identifiers, sorting, view changes in Chromium."""
from pathlib import Path
from urllib.parse import unquote,urlparse
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
JS=(ROOT/'app.js').read_text();CSS=(ROOT/'style.css').read_text()+'\n'+(ROOT/'trakt-rebuild.css').read_text()
fixture="""state.section='Movies';state.tab='Watchlist';state.items=[{id:7,title:'Zulu Lake',overview:'First film',release_date:'2020-01-01'},{id:7,title:'Amber Lake',overview:'Second film',release_date:'2024-01-01'},{id:8,title:'Cobalt Bay',overview:'Third film',release_date:'2022-01-01'}];renderMain();"""
with sync_playwright() as pw:
 browser=pw.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 for width in (375,768,1440):
  page=browser.new_page(viewport={'width':width,'height':900});errors=[]
  page.on('pageerror',lambda e:errors.append(str(e)))
  def assets(route):
   path=unquote(urlparse(route.request.url).path).lstrip('/');target=(ROOT/path).resolve()
   if target.is_relative_to(ROOT) and target.is_file():route.fulfill(path=str(target))
   else:route.fulfill(status=404,body='missing')
  page.route('https://mokumokuren.test/**',assets)
  page.set_content('<base href="https://mokumokuren.test/"><div id="app"></div>');page.add_style_tag(content=CSS)
  page.evaluate("""() => {const m={};const s={getItem:k=>m[k]??null,setItem:(k,v)=>m[k]=String(v),removeItem:k=>delete m[k]};Object.defineProperty(window,'localStorage',{value:s});Object.defineProperty(window,'sessionStorage',{value:s});window.fetch=async()=>({ok:false,status:503,text:async()=>'{}',json:async()=>({})});}""")
  page.add_script_tag(content='(async()=>{'+JS.replace('await callback();layout();setupConnectivity();await verifyAccounts();load();','await callback();layout();'+fixture)+'})().catch(e=>console.error(e))')
  page.wait_for_timeout(100)
  cards=page.locator('#library-results .poster')
  assert cards.count()==3,(width,'initial')
  sort=page.locator('#watchlist-sort')
  drawer=page.get_by_role('dialog',name='Sort By')
  sort.click()
  assert drawer.is_visible()
  assert drawer.locator('[data-watchlist-sort]').count()==7
  assert drawer.locator('[data-watchlist-sort="default"]').get_attribute('aria-pressed')=='true'
  page.keyboard.press('Escape')
  assert drawer.is_hidden()
  sort.click()
  drawer.locator('[data-watchlist-sort="title"]').click()
  assert drawer.is_hidden()
  page.wait_for_function('document.activeElement.id === "watchlist-sort"')
  assert 'Amber Lake' in cards.nth(0).inner_text(),(width,'sort')
  cards.nth(0).click()
  assert 'Amber Lake' in page.locator('.detail-modal').inner_text(),(width,'duplicate ID opened wrong title')
  page.keyboard.press('Escape')
  page.locator('#library-search').fill('Zulu')
  assert cards.count()==1 and 'Zulu Lake' in cards.first.inner_text(),(width,'search')
  page.locator('#toggle').click()
  assert cards.count()==1,(width,'toggle')
  cards.first.click()
  assert 'Zulu Lake' in page.locator('.detail-modal').inner_text(),(width,'filtered card opened wrong title')
  page.keyboard.press('Escape')
  page.locator('#library-search').fill('nothing-matches')
  assert cards.count()==0 and page.locator('#library-empty').is_visible(),(width,'empty state')
  page.locator('#library-search').fill('')
  assert cards.count()==3,(width,'clear search')
  sort.click()
  assert drawer.locator('[data-watchlist-sort="title"]').get_attribute('aria-pressed')=='true'
  drawer.locator('[data-watchlist-sort="title"]').click()
  assert 'Zulu Lake' in cards.nth(0).inner_text(),(width,'reverse order')
  assert not errors,(width,errors)
  assert page.evaluate('document.documentElement.scrollWidth<=innerWidth'),(width,'overflow')
  print(f'PASS {width}px library sorting, duplicate IDs, filtering, view toggle, empty state')
  page.close()
 browser.close()
