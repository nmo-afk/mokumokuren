"""Offline computed-style audit of Trakt-style pages.
Checks actual rendered navigation and list panels, excluding images and semantic success indicators.
Never opens live services, uploads screenshots, or requires account credentials.
"""
from pathlib import Path
from urllib.parse import unquote,urlparse
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
JS=(ROOT/'app.js').read_text()
CSS=(ROOT/'style.css').read_text()+'\n'+(ROOT/'trakt-rebuild.css').read_text()
SOURCE=(ROOT/'tests'/'capture_desktop_review.py').read_text()
FIX=SOURCE.split("FIX=r'''",1)[1].split("'''\nwith sync_playwright()",1)[0]
PART=(ROOT/'tests'/'capture_trakt_replica_pass.py').read_text()
MAIN=PART.split("fixture=fix+'''",1)[1].split("'''\n  marker=",1)[0]
MARKER='await callback();layout();setupConnectivity();await verifyAccounts();load();'
assert MARKER in JS
CHECK=r'''() => {
 const out=[]; const isGreen = s=>{
   if(!s||s==='transparent')return false;
   let m=s.match(/^rgba?\(\s*(\d+)[, ]+\s*(\d+)[, ]+\s*(\d+)/);
   if(!m)return false;
   let [r,g,b]=m.slice(1).map(Number);
   return g > r*1.20 && g > b*1.03 && g-r > 12;
 };
 for(const e of document.querySelectorAll('#main *, .desktop-sidebar *, .top *, .detail-screen *')){
   if(!e.getClientRects().length || e.matches('img,svg,video,canvas,source,picture'))continue;
   if(e.closest('.is-connected,.connected,[data-connection-status="connected"]'))continue;
   const cs=getComputedStyle(e);
   const found=[];
   for (const name of ['backgroundColor','color','borderTopColor','borderBottomColor','borderLeftColor','borderRightColor']){
     let v=cs[name]; if(isGreen(v))found.push(name+':'+v)
   }
   if(found.length)out.push({tag:e.tagName.toLowerCase(),cls:String(e.className||'').slice(0,65),id:e.id,issues:found});
 }
 return out;
}'''
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage'])
 for width in (375,1440):
  page=b.new_page(viewport={'width':width,'height':900},device_scale_factor=1)
  errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  def asset(route):
   f=(ROOT/unquote(urlparse(route.request.url).path).lstrip('/')).resolve()
   route.fulfill(path=str(f)) if f.is_relative_to(ROOT) and f.is_file() else route.fulfill(status=404,body='missing')
  page.route('https://mokumokuren.test/**',asset)
  page.set_content('<base href="https://mokumokuren.test/"><div id="app"></div>')
  page.add_style_tag(content=CSS)
  page.evaluate('''() => {const d={};const s={getItem:k=>d[k]??null,setItem:(k,v)=>d[k]=String(v),removeItem:k=>delete d[k]};Object.defineProperty(window,'localStorage',{value:s});Object.defineProperty(window,'sessionStorage',{value:s});window.fetch=async()=>({ok:false,status:503,text:async()=>'{}',json:async()=>({})});}''')
  injected=JS.replace(MARKER,'await callback();layout();'+FIX+'\n'+MAIN)
  page.add_script_tag(content='(async()=>{'+injected+'})().catch(e=>{window.__fixtureError=String(e);console.error(e)})')
  page.wait_for_function('window.__fixtureReady===true',timeout=15000)
  def check(label,func):
   page.evaluate(func)
   page.wait_for_timeout(110)
   items=page.evaluate(CHECK)
   for item in items[:10]:print('FOUND',width,label,item)
   print('COLOR AUDIT',width,label,'off-palette green',len(items))
   if items and __import__('os').environ.get('PALETTE_AUDIT_STRICT','1')=='1':raise AssertionError((width,label,items[:20]))
   assert page.evaluate('getComputedStyle(document.body).backgroundColor')=='rgb(150, 0, 18)',(width,label,'page background')
   assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1'),(width,label,'horizontal overflow')
   assert not errors,(width,label,errors)
  check('Movies home',"window.__view('Movies','Recommended')")
  check('TV in progress',"window.__view('TV Shows','In Progress')")
  check('Movie watchlist',"window.__view('Movies','Watchlist')")
  check('Anime in progress',"window.__view('Anime','In Progress')")
  check('Trakt native lists',"window.__view('Movies','Recommended');window.__showLists()")
  page.close()
 b.close()
print('PASS: both viewport sizes, all five views; no green UI surfaces')
