"""Browser check for PWA update consent, keyboard controls and multi-tab behavior.

Runs in a synthetic document because direct Chromium HTTP localhost navigation is
blocked in this environment. It does not claim to test actual SW installation.
"""
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
js=(ROOT/'app.js').read_text()
start=js.index('function setupPwaUpdates(')
end=js.index('// Mobile and desktop offline support',start)
helper=js[start:end]
css=(ROOT/'style.css').read_text()

with sync_playwright() as pw:
 browser=pw.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage'])
 for width in (375, 1440):
  page=browser.new_page(viewport={'width':width,'height':800})
  errors=[]
  page.on('pageerror',lambda err:errors.append(str(err)))
  page.set_content('<div id="app"></div>')
  page.add_style_tag(content=css)
  page.add_script_tag(content=helper+'''\nwindow.startUpdateTest=(mode='existing')=>{
 const listeners={};
 const sw={controller:mode==='new'?null:{},addEventListener:(name,fn)=>listeners[name]=fn};
 const reg={waiting:null,installing:null,
  addEventListener:(name,fn)=>listeners['reg_'+name]=fn,update:async()=>{window.updateChecks++}};
 window.updateMessages=[];window.updateChecks=0;window.reloadCount=0;
 window.updateHarness={reg,sw,listeners};
 setupPwaUpdates(reg,sw,()=>window.reloadCount++);
 return {hasUI:!!document.querySelector('#update-banner')};
};''')
  assert page.evaluate("startUpdateTest().hasUI")
  assert page.locator('#update-banner').is_hidden()
  # Staged update becomes available once installation ends.
  page.evaluate('''() => {
   const {reg,listeners}=window.updateHarness;
   const workerListeners={};
   reg.installing={state:'installing',addEventListener:(name,fn)=>workerListeners[name]=fn};
   listeners.reg_updatefound();
   reg.waiting={postMessage:msg=>window.updateMessages.push(msg)};
   reg.installing.state='installed';workerListeners.statechange();
  }''')
  assert page.locator('#update-banner').is_visible()
  assert 'A new Mokumokuren version is ready' in page.locator('#update-banner').inner_text()
  assert page.evaluate('document.documentElement.scrollWidth <= innerWidth'), width
  page.locator('#update-banner button').focus()
  page.keyboard.press('Enter')
  assert page.evaluate('window.updateMessages.length')==1
  assert page.evaluate('window.updateMessages[0].type')=='ACTIVATE_UPDATE'
  assert page.evaluate('window.reloadCount')==0
  page.evaluate('window.updateHarness.listeners.controllerchange()')
  assert page.evaluate('window.reloadCount')==1
  page.evaluate('window.updateHarness.listeners.controllerchange()')
  assert page.evaluate('window.reloadCount')==1
  assert not errors,(width,errors)
  print(f'PASS {width}px staged update, keyboard consent, single reload')
  page.close()

 # When another tab activates a worker, do not force reload of the current tab.
 page=browser.new_page()
 page.set_content('<div id="app"></div>')
 page.add_script_tag(content=helper+'''\nwindow.runOtherTab=()=>{
 const callbacks={};const sw={controller:{},addEventListener:(name,fn)=>callbacks[name]=fn};
 const reg={waiting:null,addEventListener(){},update:async()=>{}};
 window.reloadCount=0;setupPwaUpdates(reg,sw,()=>window.reloadCount++);
 callbacks.controllerchange();return window.reloadCount;
};''')
 assert page.evaluate('runOtherTab()')==0
 assert page.locator('#update-banner').is_visible()
 assert 'another tab' in page.locator('#update-banner').inner_text()
 page.locator('#update-banner button').click()
 assert page.evaluate('window.reloadCount')==1
 page.close()
 print('PASS another-tab activation requests explicit reload')
 browser.close()
