"""Replica Step 5 — AniList controls inside Trakt detail/navigation geometry.
Offline fixtures. Never calls real providers or alters an account.
"""
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
JS=(ROOT/'app.js').read_text()
CSS=(ROOT/'style.css').read_text()+'\n'+(ROOT/'trakt-rebuild.css').read_text()
FIXTURE=r'''
const item={id:901,_key:901,title:'Seasons of Fire',image:'/assets/icon-512.png',backdrop_image:'/assets/icon-512.png',startDate:{year:2026},format:'TV',releaseStatus:'RELEASING',episodes:12,progress:2,status:'PAUSED',averageScore:89,description:'A story about the changing seasons.'};
state.section='Anime';state.tab='Recommended';state.items=[item];state.anilist='offline-test-only';
let mutationDelay=null;
window.__calls=[];
ani=async(q,vars={})=>{
 window.__calls.push({q,vars});
 if(q.includes('Media(id:$id,type:ANIME)'))return {Media:{...item,coverImage:{large:'/assets/icon-512.png'},title:{english:item.title},genres:['Drama'],characters:{edges:[{role:'MAIN',node:{id:123,name:{full:'Hero'},image:{large:'/assets/icon-512.png'}}}]},staff:{edges:[{role:'Director',node:{id:77,name:{full:'Director One'},image:{large:'/assets/icon-512.png'}}}]},studios:{nodes:[{name:'Studio Gold'}]},relations:{edges:[]},recommendations:{nodes:[]}}};
 if(q.includes('SaveMediaListEntry'))return {SaveMediaListEntry:{id:19,progress:vars.progress??item.progress,status:vars.status??item.status}};
 return {};
};
load=async()=>{}; // No network; a status mutation may request a reload.
renderMain();openItem(item);window.__ready=true;
'''
with sync_playwright() as pw:
 browser=pw.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage'])
 for width in (320,375,768,1024,1440):
  page=browser.new_page(viewport={'width':width,'height':900});errors=[]
  page.on('pageerror',lambda e:errors.append(str(e)))
  page.set_content('<div id="app"></div>')
  page.add_style_tag(content=CSS)
  page.evaluate('''()=>{const m={};const s={getItem:k=>m[k]??null,setItem:(k,v)=>m[k]=String(v),removeItem:k=>delete m[k]};Object.defineProperty(window,'localStorage',{value:s});Object.defineProperty(window,'sessionStorage',{value:s});window.fetch=async()=>({ok:false,status:503,text:async()=>'{}',json:async()=>({})});}''')
  marker='await callback();layout();setupConnectivity();await verifyAccounts();load();'
  assert marker in JS
  page.add_script_tag(content='(async()=>{'+JS.replace(marker,'await callback();layout();'+FIXTURE)+'\n})().catch(e=>{window.__failure=String(e);console.error(e)})')
  page.wait_for_function('window.__ready===true||window.__failure!==undefined',timeout=12000)
  assert page.evaluate('window.__failure') is None,(width,page.evaluate('window.__failure'))
  page.locator('.detail-inline-anime #episode-plus').wait_for(timeout=8000)
  assert page.locator('.detail-staff-section .anime-credit').count()==1,(width,'Staff should be a Trakt rail')
  assert page.locator('.detail-cast-section').count()==0 or page.locator('.detail-person').count()>=1
  assert page.locator('.detail-inline-anime .replica-anime-tracker').count()==1
  assert page.locator('#progress-count').inner_text()=='2 / 12'
  assert page.locator('.replica-anime-progress-track').get_attribute('aria-valuenow')=='2'
  assert page.locator('[data-anime-status="PAUSED"]').get_attribute('aria-pressed')=='true'
  assert not page.locator('#episode-plus').is_disabled()
  page.locator('#episode-plus').click()
  page.wait_for_function("document.querySelector('#progress-count')?.textContent==='3 / 12'",timeout=8000)
  assert page.locator('.replica-anime-progress-track').get_attribute('aria-valuenow')=='3'
  assert page.locator('[data-anime-status="CURRENT"]').get_attribute('aria-pressed')=='true'
  assert page.locator('[data-anime-status="PAUSED"]').get_attribute('aria-pressed')=='false'
  calls=page.evaluate("window.__calls.filter(c=>c.q.includes('SaveMediaListEntry')).map(c=>c.vars)")
  assert calls[0]['mediaId']==901 and calls[0]['progress']==3 and calls[0]['status']=='CURRENT',(width,calls)
  page.locator('[data-anime-status="COMPLETED"]').click()
  page.wait_for_function("document.querySelector('[data-anime-status=COMPLETED]')?.getAttribute('aria-pressed')==='true'",timeout=8000)
  assert page.locator('#save-personal-list').count()==0,'Never send AniList media ID to Trakt native lists'
  assert page.evaluate("document.querySelector('.detail-screen').scrollWidth<=document.querySelector('.detail-screen').clientWidth+1"),(width,'horizontal overflow')
  assert not errors,(width,errors)
  print(f'PASS Replica Anime {width}px: Trakt-style staff rail, compact tracker, +1 confirmed, aria progress, status confirmed, no overflow')
  page.close()
 browser.close()
