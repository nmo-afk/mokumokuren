"""Real Chromium smoke test for local Mokumokuren; no account tokens required."""
import os, subprocess, time, urllib.request
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
PORT=18765
# Server uses 8765; bind port through local socket only in a separate process.
server=subprocess.Popen(['python','local_server.py'],cwd=ROOT,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL,env={**os.environ,'BROWSER':'true'})
try:
 for _ in range(40):
  try:
   urllib.request.urlopen('http://127.0.0.1:8765/',timeout=1);break
  except Exception:time.sleep(.2)
 else:raise RuntimeError('Local server failed to start')
 with sync_playwright() as p:
  browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
  for width,height in [(1440,900),(390,844)]:
   page=browser.new_page(viewport={'width':width,'height':height},reduced_motion='reduce')
   errors=[]
   page.on('pageerror',lambda e:errors.append(str(e)))
   page.goto('http://127.0.0.1:8765/',wait_until='domcontentloaded',timeout=20000)
   page.locator('#menu-trigger').wait_for(timeout=12000)
   page.locator('#menu-trigger').click()
   assert page.locator('#mobile-drawer').is_visible(),f'drawer hidden at {width}'
   page.keyboard.press('Escape')
   assert not page.locator('#mobile-drawer').is_visible(),f'drawer did not close at {width}'
   assert not errors,f'JS exceptions at {width}: {errors}'
   page.screenshot(path=str(ROOT/'tests'/f'chromium-{width}.png'),full_page=True)
   print(f'PASS {width}x{height}: page loaded, drawer opens/closes, no JS exceptions')
   page.close()
  browser.close()
finally:
 server.terminate()
 try:server.wait(timeout=3)
 except subprocess.TimeoutExpired:server.kill()
