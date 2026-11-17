"""Offline/online banner browser contract using local in-memory HTML and mock APIs."""
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
JS=(ROOT/'app.js').read_text()
CSS=(ROOT/'style.css').read_text()
with sync_playwright() as pw:
    browser=pw.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage'])
    for width in (390, 1366):
        page=browser.new_page(viewport={'width':width,'height':850})
        errors=[]
        page.on('pageerror',lambda err:errors.append(str(err)))
        page.set_content('<main id="app"></main>')
        page.add_style_tag(content=CSS)
        page.evaluate('''() => {
          const data={};const storage={getItem:k=>data[k]??null,setItem:(k,v)=>data[k]=String(v),removeItem:k=>delete data[k]};
          Object.defineProperty(window,'localStorage',{value:storage});
          Object.defineProperty(window,'sessionStorage',{value:storage});
          Object.defineProperty(navigator,'onLine',{value:false,configurable:true});
          window.fetch=async()=>({ok:false,status:503,text:async()=>'{}',json:async()=>({error:'offline'})});
        }''')
        page.add_script_tag(content='(async()=>{'+JS+'})().catch(e=>console.error(e))')
        page.wait_for_selector('#connection-banner:not([hidden])',timeout=8000)
        assert 'Trakt and AniList changes require a connection' in page.locator('#connection-banner').inner_text()
        assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
        page.evaluate('''() => {Object.defineProperty(navigator,'onLine',{value:true,configurable:true});window.dispatchEvent(new Event('online'));}''')
        assert page.locator('#connection-banner').is_hidden()
        page.evaluate('''() => {Object.defineProperty(navigator,'onLine',{value:false,configurable:true});window.dispatchEvent(new Event('offline'));}''')
        assert page.locator('#connection-banner').is_visible()
        assert not errors,(width,errors)
        print(f'PASS {width}px mobile/desktop offline banner and reconnect events')
        page.close()
    browser.close()
