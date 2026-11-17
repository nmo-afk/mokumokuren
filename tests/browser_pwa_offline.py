"""Actual Chromium service-worker/offline mobile + desktop test; mock local static server only."""
from pathlib import Path
import functools
import http.server
import threading
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
class Silent(http.server.SimpleHTTPRequestHandler):
    def log_message(self,*args): pass
server=http.server.ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Silent,directory=str(ROOT)))
thread=threading.Thread(target=server.serve_forever,daemon=True)
thread.start()
try:
    with sync_playwright() as pw:
        browser=pw.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage'])
        context=browser.new_context(viewport={'width':390,'height':844},service_workers='allow')
        page=context.new_page()
        page.goto(f'http://127.0.0.1:{server.server_port}/',wait_until='domcontentloaded')
        page.wait_for_function("navigator.serviceWorker?.controller !== null",timeout=15000)
        assert page.locator('#main').count()==1
        # Direct fetch to API is deliberately not cached: server would return 404.
        assert page.evaluate("fetch('/api/trakt').then(r=>r.status)")==404
        context.set_offline(True)
        page.reload(wait_until='domcontentloaded',timeout=15000)
        page.wait_for_selector('#main',timeout=15000)
        assert page.locator('#connection-banner').is_visible()
        assert 'Trakt and AniList changes require a connection' in page.locator('#connection-banner').inner_text()
        assert page.evaluate('document.documentElement.scrollWidth<=window.innerWidth')
        page.set_viewport_size({'width':1366,'height':850})
        assert page.evaluate('document.documentElement.scrollWidth<=window.innerWidth')
        # No private Trakt data can be served offline from the service worker.
        assert page.evaluate("fetch('/api/trakt').then(()=>false).catch(()=>true)")
        context.set_offline(False)
        page.wait_for_function("document.querySelector('#connection-banner').hidden === true")
        print('PASS actual Chromium PWA install, offline reload (mobile + desktop), network-only API, reconnect banner')
        browser.close()
finally:
    server.shutdown()
