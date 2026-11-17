"""Asset-backed offline visual audit; no live account or media API claims."""
from pathlib import Path
from urllib.parse import urlparse, unquote
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
JS=(ROOT/'app.js').read_text(); CSS=(ROOT/'style.css').read_text()+'\n'+(ROOT/'trakt-rebuild.css').read_text()
ICONS_RENDERED='''() => [...document.querySelectorAll('.af-icon')].filter(icon=>icon.getClientRects().length)
  .every(icon=>icon instanceof HTMLImageElement?icon.complete&&icon.naturalWidth>0:icon.getBBox().width>0)'''
with sync_playwright() as pw:
    browser=pw.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
    for width in (375,768,1440):
        page=browser.new_page(viewport={'width':width,'height':900},device_scale_factor=1)
        errors=[]; missing=[]
        page.on('pageerror',lambda e:errors.append(str(e)))
        def assets(route):
            path=unquote(urlparse(route.request.url).path).lstrip('/')
            if path=='fixture':
                route.fulfill(content_type='text/html',body='<div id="app"></div>')
                return
            target=(ROOT/path).resolve()
            if target.is_relative_to(ROOT) and target.is_file():
                route.fulfill(path=str(target))
            else:
                missing.append(path);route.fulfill(status=404,body='missing')
        page.route('https://mokumokuren.test/**',assets)
        page.goto('https://mokumokuren.test/fixture')
        page.add_style_tag(content=CSS)
        page.evaluate('''() => {const m={};const s={getItem:k=>m[k]??null,setItem:(k,v)=>m[k]=String(v),removeItem:k=>delete m[k]};Object.defineProperty(window,'localStorage',{value:s});Object.defineProperty(window,'sessionStorage',{value:s});window.fetch=async()=>({ok:false,status:503,text:async()=>'{}',json:async()=>({})});}''')
        page.add_script_tag(content='(async()=>{'+JS+'})().catch(e=>console.error(e))')
        page.wait_for_timeout(350)
        icons=page.locator('.af-icon:visible')
        assert page.locator('svg.trakt-icon:visible').count()>0
        assert page.locator('img[src="/assets/ui-icons/mask.png"]:visible').count()==1
        page.wait_for_function(ICONS_RENDERED)
        assert not errors,(width,errors)
        empty=page.locator('.recommendation-empty')
        assert empty.count()==1
        assert empty.bounding_box()['height']<130, f'oversized empty-state at {width}'
        assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
        page.screenshot(path=str(ROOT.parent/f'visual-audit-{width}.png'),full_page=True)
        if width<960:
            page.locator('#menu-trigger').click()
            assert page.locator('#mobile-drawer').is_visible()
            page.wait_for_function(ICONS_RENDERED)
            page.locator('#drawer-close').click()
        assert not missing,(width,missing)
        print(f'PASS {width}px: {icons.count()} loaded Trakt and fallback icons, no page errors or overflow')
        page.close()
    browser.close()
