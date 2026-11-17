"""Real application rendered in Chromium with offline test data and user-provided reference artwork.
Not a Trakt screenshot. Not live OAuth/TMDB/AniList data. Does not ship in dist.
"""
from pathlib import Path
from urllib.parse import unquote,urlparse
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
OUT=Path('/mnt/data/mokumokuren-gold-selection-detail-review')
OUT.mkdir(exist_ok=True)
JS=(ROOT/'app.js').read_text()
CSS=(ROOT/'style.css').read_text()+'\n'+(ROOT/'trakt-rebuild.css').read_text()
FIX=r'''const a=n=>'/tests/visual-fixtures/'+n+'.jpg';
const hero=n=>a(n+'-backdrop');
const movie={id:601,_key:601,title:'Street Fighter',image:a('street-fighter'),backdrop_image:hero('street-fighter'),release_date:'2026-10-16',vote_average:6.7,overview:'In 1993, estranged Street Fighters Ryu and Ken Masters are thrown back into combat when Chun-Li recruits them for the next World Warrior Tournament. Behind the brutal clash of fists and fury lies a conspiracy that forces them to face the demons of their past.',runtime:120,genres:[{name:'Action'},{name:'Adventure'}]};
const titles=[movie,
 {id:602,title:'Godzilla Minus Zero',image:a('godzilla'),backdrop_image:hero('godzilla'),release_date:'2026-05-11',vote_average:8.1,overview:'A world at the brink confronts a terrifying force.',genres:[{name:'Action'}]},
 {id:603,title:'Karate Kid: Legends',image:a('karate-kid'),release_date:'2025-06-11',vote_average:7.2,overview:'An unlikely martial arts champion discovers a new path.',genres:[{name:'Action'}]},
 {id:604,title:'Fearless',image:a('fearless'),release_date:'2006-01-26',vote_average:7.8,overview:'A martial artist seeks redemption.'},
 {id:605,title:'Heart of the Beast',image:a('heart-beast'),release_date:'2026-07-19',vote_average:7.0,overview:'A long journey through an unforgiving wilderness.'},
 {id:606,title:'Sword of Destiny',image:a('sword-of-destiny'),release_date:'2016-02-26',vote_average:7.4,overview:'A storied sword and a legendary warrior.'},
 {id:607,title:'You Can See Everything',image:a('everything'),release_date:'2026-04-08',vote_average:7.3,overview:'An uncanny discovery changes everything.'},
 {id:608,title:'Golden Axe',image:a('golden-axe'),release_date:'2026-09-16',vote_average:7.8,overview:'Fantasy heroes face an ancient evil.'}];
const tv={id:702,_key:702,title:'Golden Axe',image:a('golden-axe'),backdrop_image:hero('golden-axe'),first_air_date:'2026-09-16',vote_average:7.8,overview:'Legendary warriors Ax Battler, Tyris Flare, and Gilius Thunderhead reunite to save Yuria from Death Adder. Their quest is complicated by an inexperienced adventurer whose dream of heroism exceeds his abilities.',episodes:10,genres:[{name:'Animation'},{name:'Comedy'},{name:'Action'}]};
const anime={id:801,_key:801,title:'Fullmetal Alchemist: Brotherhood',image:a('anime-poster'),backdrop_image:hero('anime-frame'),averageScore:93,startDate:{year:2009},episodes:64,progress:12,status:'CURRENT',genres:['Adventure','Drama','Fantasy'],description:'Two brothers seek the Philosopher\'s Stone while confronting the consequences of forbidden alchemy.'};
const castMovie=[{name:'Andrew Koji',character:'Ryu',profile_path:'/movie-cast-1.jpg'},{name:'Noah Centineo',character:'Ken Masters',profile_path:'/movie-cast-2.jpg'},{name:'Callina Liang',character:'Chun-Li',profile_path:'/movie-cast-3.jpg'}];
const castTv=[{name:'Matthew Rhys',character:'Gilius Thunderhead',profile_path:'/cast-1.jpg'},{name:'Danny Pudi',character:'Hampton Squib',profile_path:'/cast-2.jpg'},{name:'Lisa Gilroy',character:'Tyris Flare',profile_path:'/cast-3.jpg'}];
const asRelated=titles.slice(1,7).map(x=>({id:x.id,title:x.title,release_date:x.release_date,image:x.image}));
tmdb=async(path)=>{
 if(path==='/movie/601')return {...movie,tagline:'The fight begins again.',credits:{crew:[{name:'Kitao Sakurai',job:'Director'}],cast:castMovie},release_dates:{results:[{iso_3166_1:'GB',release_dates:[{certification:'12A'}]}]},production_companies:[{name:'Demo Studio'}],original_language:'en',videos:{results:[]}};
 if(path==='/movie/601/recommendations')return {results:asRelated};
 if(path==='/movie/601/watch/providers')return {results:{GB:{flatrate:[{provider_id:1,provider_name:'Sample streaming service',logo_path:''}]}}};
 if(path==='/tv/702')return {...tv,number_of_seasons:1,number_of_episodes:10,status:'Returning Series',credits:{cast:castTv},created_by:[{name:'Mike McMahan'},{name:'Joe Chandler'}],seasons:[{season_number:1,episode_count:10}],production_companies:[{name:'Paramount Animation'}],original_language:'en'};
 if(path==='/tv/702/season/1')return {episodes:[{episode_number:1,name:'The Legend of the Emerald',still_path:'/episode-1.jpg',runtime:22,air_date:'2026-09-16'},{episode_number:2,name:'Rideable Beasts',still_path:'/episode-2.jpg',runtime:22,air_date:'2026-09-16'},{episode_number:3,name:'The Quest Continues',still_path:'/episode-1.jpg',runtime:23,air_date:'2026-09-23'}]};
 if(path==='/tv/702/recommendations')return {results:[{id:708,name:'Arcane',image:a('arcane'),first_air_date:'2021-11-06'},{id:709,name:'Castlevania',image:a('castlevania'),first_air_date:'2017-07-07'},{id:710,name:'Halo Legends',image:a('halo'),first_air_date:'2009-01-01'}]};
 if(path==='/tv/702/watch/providers')return {results:{GB:{flatrate:[{provider_id:21,provider_name:'Paramount+',logo_path:''}]}}};
 return {};
};
ani=async()=>({Media:{...anime,title:{english:anime.title,romaji:anime.title},coverImage:{large:anime.image,extraLarge:anime.image},bannerImage:anime.backdrop_image,description:anime.description,format:'TV',episodes:64,duration:24,season:'SPRING',seasonYear:2009,releaseStatus:'FINISHED',averageScore:93,source:'MANGA',genres:anime.genres,studios:{nodes:[{name:'Bones'}]},characters:{edges:[{role:'MAIN',node:{id:11,name:{full:'Edward Elric'},image:{large:a('anime-frame')}}}]},staff:{edges:[{role:'Director',node:{id:22,name:{full:'Demo director'},image:{large:a('anime-frame')}}}]},relations:{edges:[]},recommendations:{nodes:[]}}});
window.__demo={titles,movie,tv,anime,open:openItem,
 setSection(section){state.section=section;state.tab='Recommended';state.items=section==='Movies'?titles:section==='TV Shows'?[tv,{...tv,id:703,title:'Halo Legends',image:a('halo')},{...tv,id:704,title:'Arcane',image:a('arcane')}]:[anime];state.recommendationPool=state.items;layout();renderMain()}};
window.__demo.setSection('Movies');
window.__ready=true;
'''
with sync_playwright() as pw:
 browser=pw.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage'])
 page=browser.new_page(viewport={'width':1440,'height':1070},device_scale_factor=1)
 errors=[];page.on('pageerror',lambda error: errors.append(str(error)))
 def asset(route):
  rel=unquote(urlparse(route.request.url).path).lstrip('/')
  f=(ROOT/rel).resolve()
  if f.is_relative_to(ROOT) and f.is_file():route.fulfill(path=str(f))
  else:route.fulfill(status=404,body='missing')
 def tmdb_asset(route):
  rel=Path(unquote(urlparse(route.request.url).path)).name
  f=ROOT/'tests'/'visual-fixtures'/rel
  if f.is_file():route.fulfill(path=str(f))
  else:route.fulfill(status=404,body='missing')
 page.route('https://mokumokuren.test/**',asset)
 page.route('https://image.tmdb.org/**',tmdb_asset)
 page.set_content('<base href="https://mokumokuren.test/"><div id="app"></div>')
 page.add_style_tag(content=CSS)
 page.evaluate('''() => {const m={};const s={getItem:k=>m[k]??null,setItem:(k,v)=>m[k]=String(v),removeItem:k=>delete m[k]};Object.defineProperty(window,'localStorage',{value:s});Object.defineProperty(window,'sessionStorage',{value:s});window.fetch=async()=>({ok:false,status:503,text:async()=>'{}',json:async()=>({})});}''')
 assert JS.endswith('await callback();layout();setupConnectivity();await verifyAccounts();load();\n')
 modified=JS.replace('await callback();layout();setupConnectivity();await verifyAccounts();load();','await callback();layout();'+FIX)
 page.add_script_tag(content='(async()=>{'+modified+'})().catch(e=>{window.__initError=String(e);console.error(e)})')
 page.wait_for_function('window.__ready===true',timeout=12000)
 page.wait_for_timeout(500)
 assert page.locator('.desktop-sidebar').is_visible()
 assert page.locator('.recommendation-gallery .poster').count()>=6
 assert not errors,(errors,page.evaluate('window.__initError'))
 page.screenshot(path=str(OUT/'01-desktop-home.png'),full_page=True,animations='disabled')
 print('CAPTURE desktop homepage',page.locator('.poster').count(),'cards')
 def detail(label,item,filename):
  page.evaluate('(s)=>{window.__demo.setSection(s)}',label)
  page.evaluate('(key)=>window.__demo.open(window.__demo[key])',item)
  page.locator('.detail-overview').wait_for(timeout=10000)
  page.wait_for_timeout(500)
  page.evaluate('document.activeElement?.blur()')
  page.screenshot(path=str(OUT/filename),animations='disabled')
  assert page.locator('.detail-poster').is_visible(),(label,'poster missing')
  assert page.evaluate('document.querySelector(".detail-screen").scrollWidth<=document.querySelector(".detail-screen").clientWidth+1')
  return page.locator('.detail-screen')
 d=detail('Movies','movie','02-desktop-movie-overview.png')
 assert page.locator('.detail-person').count()==3
 assert page.locator('.detail-related-card').count()>=3
 d.evaluate('(e)=>e.scrollTop=550')
 page.wait_for_timeout(200)
 page.screenshot(path=str(OUT/'03-desktop-movie-cast-related.png'),animations='disabled')
 page.keyboard.press('Escape')
 d=detail('TV Shows','tv','04-desktop-tv-overview.png')
 page.locator('.detail-inline-episodes .episode-card').first.wait_for(timeout=7000)
 d.evaluate('(e)=>e.scrollTop=520')
 page.wait_for_timeout(200)
 page.screenshot(path=str(OUT/'05-desktop-tv-episodes.png'),animations='disabled')
 page.keyboard.press('Escape')
 d=detail('Anime','anime','06-desktop-anime-overview.png')
 assert page.locator('.detail-inline-anime').count()>0
 assert not errors,errors
 metrics=page.evaluate('''() => ({iconCount:document.querySelectorAll('img.af-icon').length,brokenIcons:[...document.querySelectorAll('img.af-icon')].filter(i=>!i.complete||i.naturalWidth===0).length,viewportOverflow:document.documentElement.scrollWidth>innerWidth})''')
 assert metrics['brokenIcons']==0,metrics
 print('CAPTURE complete',metrics,'errors',errors)
 browser.close()
