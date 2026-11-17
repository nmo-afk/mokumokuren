"""Offline real-Chromium detail and library interaction regression tests.
Run: python tests/browser_detail_interactions.py. No live account access required.
"""
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
JS=(ROOT/'app.js').read_text()
CSS=(ROOT/'style.css').read_text()+'\n'+(ROOT/'trakt-rebuild.css').read_text()
with sync_playwright() as pw:
 browser=pw.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 for width in (375,768,1440):
  page=browser.new_page(viewport={'width':width,'height':850})
  errors=[]
  page.on('pageerror',lambda error:errors.append(str(error)))
  page.set_content('<div id="app"></div>')
  page.add_style_tag(content=CSS)
  page.evaluate('''() => {const memory={};const storage={getItem:k=>memory[k]??null,setItem:(k,v)=>memory[k]=String(v),removeItem:k=>delete memory[k]};Object.defineProperty(window,'localStorage',{value:storage});Object.defineProperty(window,'sessionStorage',{value:storage});window.fetch=async()=>({ok:false,status:503,text:async()=>'{}',json:async()=>({})});}''')
  page.add_script_tag(content='(async()=>{'+JS+'\nawait new Promise(resolve=>setTimeout(resolve,650));state.items=[{id:201,title:"Example Film",overview:"A film overview",release_date:"2025-03-01",vote_average:7.5,_key:201},{id:202,title:"Another Film",overview:"Second film",release_date:"2024-02-01",_key:202}];state.recommendationPool=state.items;renderMain();})().catch(e=>console.error(e))')
  # Let mocked startup 503 recovery settle before interacting with the fixed fixture.
  page.locator('.recommendation-gallery .poster').first.wait_for(timeout=3000)
  page.locator('.recommendation-gallery .poster').first.click()
  dialog=page.locator('.detail-overlay')
  assert dialog.is_visible(),f'detail failed to open at {width}'
  assert dialog.get_attribute('role') is None # role belongs to article
  assert dialog.locator('[role="dialog"]').get_attribute('aria-label')=='Example Film'
  assert page.evaluate("document.body.classList.contains('detail-open')")
  assert dialog.locator('#watchlist').is_disabled(), 'unauthenticated tracking must be disabled'
  assert dialog.locator('#watched').is_disabled(), 'unauthenticated tracking must be disabled'
  tabs=dialog.locator('[data-detail-tab]')
  assert tabs.count()==3
  tabs.nth(0).focus()
  page.keyboard.press('ArrowRight')
  assert tabs.nth(1).get_attribute('aria-selected')=='true'
  page.keyboard.press('End')
  assert tabs.nth(2).get_attribute('aria-selected')=='true'
  page.keyboard.press('Escape')
  assert dialog.count()==0
  assert not page.evaluate("document.body.classList.contains('detail-open')")
  assert page.locator('.recommendation-gallery .poster').first.evaluate('(e)=>document.activeElement===e'), 'focus not restored'
  page.locator('.recommendation-gallery .poster').nth(1).click()
  assert page.locator('.detail-overlay [role="dialog"]').get_attribute('aria-label')=='Another Film'
  # All viewport sizes use Trakt-style compact More actions.
  more=page.locator('.detail-overlay #detail-options')
  more.click()
  assert more.get_attribute('aria-expanded')=='true'
  page.locator('.detail-overlay #not').click()
  assert page.locator('.detail-overlay').count()==0
  assert not page.evaluate("document.body.classList.contains('detail-open')")
  assert not errors,(width,errors)
  print(f'PASS {width}px: poster identity, modal, disabled tracking, tabs, Escape, focus, dismissal')
  page.close()
 browser.close()
