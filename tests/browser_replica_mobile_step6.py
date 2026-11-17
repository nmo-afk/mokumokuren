"""Step 6 mobile layout/touch audit. Synthetic titles, no account or provider calls.
Tests actual built application CSS/JS at phone and tablet widths.
"""
from pathlib import Path
from urllib.parse import unquote, urlparse
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parents[1]
JS=(ROOT/'app.js').read_text()
CSS=(ROOT/'style.css').read_text()+'\n'+(ROOT/'trakt-rebuild.css').read_text()
fixture=(ROOT/'tests/browser_detail_step3.py').read_text().split("fixture='''",1)[1].split("'''",1)[0]
marker='await callback();layout();setupConnectivity();await verifyAccounts();load();'
assert marker in JS
fixture += '''\nwindow.__step6Ready=true;
window.__step6Nav=(tab)=>{state.tab=tab;layout();renderMain()};
window.__step6Movie=()=>{state.section='Movies';state.tab='Recommended';state.items=[film];layout();renderMain()};
'''

with sync_playwright() as pw:
    browser=pw.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage'])
    for width in (320,375,430,600,768,959):
        page=browser.new_page(viewport={'width':width,'height':820},device_scale_factor=1)
        errors=[];missing=[]
        page.on('pageerror',lambda e:errors.append(str(e)))
        def asset(route):
            path=unquote(urlparse(route.request.url).path).lstrip('/')
            f=(ROOT/path).resolve()
            if f.is_relative_to(ROOT) and f.is_file():route.fulfill(path=str(f))
            else:missing.append(path);route.fulfill(status=404,body='missing fixture asset')
        page.route('https://mokumokuren.test/**',asset)
        page.route('https://image.tmdb.org/**',lambda r:r.fulfill(status=200,content_type='image/svg+xml',body='<svg xmlns="http://www.w3.org/2000/svg" width="200" height="250"><rect width="200" height="250" fill="#9a0020"/></svg>'))
        page.set_content('<base href="https://mokumokuren.test/"><div id="app"></div>')
        page.add_style_tag(content=CSS)
        page.evaluate('''()=>{const m={};const s={getItem:k=>m[k]??null,setItem:(k,v)=>m[k]=String(v),removeItem:k=>delete m[k]};Object.defineProperty(window,'localStorage',{value:s});Object.defineProperty(window,'sessionStorage',{value:s});window.fetch=async()=>({ok:false,status:503,text:async()=>'{}',json:async()=>({})});}''')
        page.add_script_tag(content='(async()=>{'+JS.replace(marker,'await callback();layout();'+fixture)+'})().catch(e=>{window.__error=String(e);console.error(e)})')
        page.wait_for_function('window.__step6Ready===true||window.__error',timeout=15000)
        assert not page.evaluate('window.__error'),(width,page.evaluate('window.__error'))
        def evaluate(script):return page.evaluate(script)
        assert evaluate('''()=>{const h=document.querySelector('.top');return getComputedStyle(h).position==='sticky'&&h.getBoundingClientRect().height<120}'''),(width,'header exceeds two rows or not sticky')
        assert evaluate('''()=>{const t=document.querySelector('.top'),m=t.querySelector('.quick-modes'),nav=t.querySelector('.mobile-top-tabs');return m.getBoundingClientRect().top<nav.getBoundingClientRect().top&&nav.getBoundingClientRect().bottom<=t.getBoundingClientRect().bottom+2}'''),(width,'media selector and tabs not in separate rows')
        assert evaluate('''()=>{const h=document.querySelector('.top'),tools=h.querySelector('.header-tools');return [...tools.querySelectorAll('button')].filter(b=>getComputedStyle(b).display!=='none').every(b=>b.getBoundingClientRect().width>=34)}'''),(width,'tools too small')
        assert evaluate('''()=>document.documentElement.scrollWidth<=innerWidth+1'''),(width,'horizontal page overflow')
        assert evaluate('''()=>!Array.from(document.querySelectorAll('.shell *')).some(e=>getComputedStyle(e).position==='fixed'&&e.getBoundingClientRect().bottom>innerHeight-55&&e.getBoundingClientRect().height>30)'''),(width,'bottom nav obstructs Netlify')
        # Real top-left menu interaction must be accessible, non-obstructing and escapable.
        page.locator('#menu-trigger').click()
        assert page.locator('#mobile-drawer').is_visible(),(width,'mobile drawer did not open')
        assert page.locator('#menu-trigger').get_attribute('aria-expanded')=='true'
        assert page.evaluate('document.body.classList.contains("drawer-open")')
        page.keyboard.press('Escape')
        assert not page.locator('#mobile-drawer').is_visible(),(width,'mobile drawer did not close')
        assert page.locator('#menu-trigger').get_attribute('aria-expanded')=='false'
        assert not page.evaluate('document.body.classList.contains("drawer-open")')
        if width==375:
            page.set_viewport_size({'width':844,'height':390})
            assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1'),('landscape','page overflow')
            assert page.evaluate('getComputedStyle(document.querySelector(".top")).position==="sticky"'),('landscape','header')
            page.set_viewport_size({'width':width,'height':820})
        for tab in ('Watched','Discover','In Progress'):
            page.evaluate('(tab)=>window.__step6Nav(tab)',tab)
            page.wait_for_timeout(80)
            assert evaluate('''()=>{const n=document.querySelector('.mobile-top-tabs'),b=n.querySelector('.active'),nr=n.getBoundingClientRect(),br=b.getBoundingClientRect();return br.left>=nr.left-4&&br.right<=nr.right+4}'''),(width,tab+' active tab clipped')
        page.evaluate('window.__step6Movie()')
        assert page.locator('.recommendation-gallery .poster').count()>=1
        page.locator('.recommendation-gallery .poster').first.click()
        page.locator('.detail-screen').wait_for()
        assert evaluate('''()=>{const e=document.querySelector('.detail-screen');return e.scrollWidth<=e.clientWidth+1&&e.getBoundingClientRect().height>=innerHeight-1}'''),(width,'detail clipped')
        assert evaluate('''()=>{const e=document.querySelector('.detail-topbar');return getComputedStyle(e).position==='sticky'&&e.getBoundingClientRect().height>=54}'''),(width,'detail back/share controls not sticky')
        assert evaluate('''()=>[...document.querySelectorAll('.detail-actions button:not([hidden]),.detail-actions a:not([hidden])')].filter(e=>getComputedStyle(e).display!=='none').every(e=>e.getBoundingClientRect().height>=43)'''),(width,'detail touch targets too small')
        if width<=600:
            assert evaluate('''()=>{const b=document.querySelector('.detail-tabs');return getComputedStyle(b).position==='sticky'&&b.clientWidth<=innerWidth}'''),(width,'detail tabs not sticky')
        detail=page.locator('.detail-screen')
        detail.evaluate('(e)=>e.scrollTop=e.scrollHeight')
        assert evaluate('''()=>document.querySelector('.detail-topbar').getBoundingClientRect().top>=-2'''),(width,'detail toolbar lost on scroll')
        page.locator('#close').click()
        assert page.locator('.detail-screen').count()==0,(width,'detail did not close')
        assert not errors,(width,errors)
        assert not missing,(width,missing)
        print(f'PASS Replica Mobile {width}px: two-row sticky header, tabs, touch, detail scroll, no bottom overlay/overflow')
        page.close()
    browser.close()
