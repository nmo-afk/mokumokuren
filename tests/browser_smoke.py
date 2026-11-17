"""Offline Chromium smoke test. Run: python tests/browser_smoke.py (requires playwright + chromium).
Uses inline assets and mocked network; does NOT verify authenticated integrations or real image delivery.
"""
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT = Path(__file__).resolve().parents[1]
JS = (ROOT/'app.js').read_text()
CSS = (ROOT/'style.css').read_text()+'\n'+(ROOT/'trakt-rebuild.css').read_text()
with sync_playwright() as pw:
    browser = pw.chromium.launch(executable_path='/usr/bin/chromium', args=['--no-sandbox'])
    for width in (375, 768, 1440):
        page = browser.new_page(viewport={'width': width, 'height': 850})
        errors=[]
        page.on('pageerror', lambda error: errors.append(str(error)))
        page.set_content('<div id="app"></div>')
        page.add_style_tag(content=CSS)
        page.evaluate('''() => {const memory={};const storage={getItem:k=>memory[k]??null,setItem:(k,v)=>memory[k]=String(v),removeItem:k=>delete memory[k]};Object.defineProperty(window,'localStorage',{value:storage});Object.defineProperty(window,'sessionStorage',{value:storage});window.fetch=async()=>({ok:false,status:503,text:async()=>'{"error":"offline"}',json:async()=>({error:'offline'})});}''')
        page.add_script_tag(content='(async()=>{'+JS+'})().catch(e=>console.error(e))')
        page.wait_for_timeout(200)
        assert not errors, (width, errors)
        assert page.locator('#main').count()==1
        assert page.evaluate('document.documentElement.scrollWidth <= innerWidth'), f'horizontal overflow at {width}'
        assert page.locator('.discovery-controls .section-title .muted').inner_text()=='50% adventurous'
        page.locator('#balance').fill('75')
        assert page.locator('.discovery-controls .section-title .muted').inner_text()=='75% adventurous'
        if width < 960:
            page.locator('#menu-trigger').click()
            assert page.locator('#mobile-drawer').is_visible(), f'drawer did not open at {width}'
            page.locator('#drawer-close').click()
            assert not page.locator('#mobile-drawer').is_visible(), f'drawer did not close at {width}'
        else:
            assert page.locator('.desktop-sidebar').is_visible(), 'desktop sidebar missing'
            assert not page.locator('#menu-trigger').is_visible(), 'desktop should use sidebar instead of drawer'
        print(f'PASS: {width}px offline render, slider, responsive navigation, overflow, JS errors')
        page.close()
    browser.close()
