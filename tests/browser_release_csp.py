"""Synthetic HTTPS-origin browser smoke test against the actual dist build and CSP.
Runs without a local HTTP server; never uses live account credentials.
"""
from pathlib import Path
from urllib.parse import urlparse
import mimetypes, tomllib
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
DIST=ROOT/'dist'
configuration=tomllib.loads((ROOT/'netlify.toml').read_text())
headers=next(item['values'] for item in configuration['headers'] if item['for']=='/*')
assert 'Content-Security-Policy' in headers
origin='https://mokumokuren.test'
with sync_playwright() as pw:
 browser=pw.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage'])
 try:
  for width in (390,1366):
   context=browser.new_context(viewport={'width':width,'height':850},service_workers='block')
   page=context.new_page()
   errors=[]
   page.on('pageerror',lambda e:errors.append(str(e)))
   page.on('console',lambda m:errors.append(m.text) if 'content security policy' in m.text.lower() else None)
   def intercept(route):
    parsed=urlparse(route.request.url)
    rel=parsed.path.lstrip('/') or 'index.html'
    if rel.startswith('api/'):
     route.fulfill(status=503,content_type='application/json',body='{"error":"Mock API not configured"}')
     return
    path=(DIST/rel).resolve()
    if not path.is_relative_to(DIST.resolve()) or not path.is_file():
     route.fulfill(status=404,body='Missing runtime asset')
     return
    typ=mimetypes.guess_type(path.name)[0] or 'application/octet-stream'
    route.fulfill(status=200,body=path.read_bytes(),content_type=typ,headers={'Content-Security-Policy':headers['Content-Security-Policy'],'X-Content-Type-Options':'nosniff'})
   page.route(origin+'/**',intercept)
   def intercept_trakt_auth(route):
    route.fulfill(status=200,content_type='application/json',body='{"mock":true}',headers={
     'Access-Control-Allow-Origin':origin,
     'Access-Control-Allow-Methods':'POST',
     'Access-Control-Allow-Headers':'content-type',
    })
   page.route('https://auth.trakt.tv/oauth/token',intercept_trakt_auth)
   page.goto(origin+'/',wait_until='domcontentloaded',timeout=15000)
   page.locator('#main').wait_for(timeout=10000)
   assert page.evaluate("""async () => {
    const response = await fetch('https://auth.trakt.tv/oauth/token', {
     method:'POST', headers:{'content-type':'application/json'}, body:'{}',
    });
    return response.ok && (await response.json()).mock;
   }""")
   navigation=page.locator('#desktop-sidebar')
   if width<960:
    page.get_by_role('button',name='Open menu').click()
    navigation=page.locator('#mobile-drawer')
   navigation.get_by_role('button',name='Discover',exact=True).click()
   assert page.get_by_role('textbox',name='Search titles or mood').count()==1
   assert page.get_by_role('combobox',name='Filter by genre').count()==1
   assert page.get_by_role('combobox',name='Sort discovery results').count()==1
   assert page.get_by_role('spinbutton',name='Release year').count()==1
   assert page.evaluate('document.documentElement.scrollWidth <= window.innerWidth')
   assert not errors,(width,errors)
   print(f'PASS {width}px dist build, Trakt auth allowed by CSP, accessible discovery controls, no JS/CSP errors')
   context.close()
 finally:browser.close()
