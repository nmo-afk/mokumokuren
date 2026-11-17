const TRAKT_ID='42rPcHWAppxsSkWTIuApWjcED9nBfgXO6ay9bNioynw', ANILIST_ID='56513';
const sections=['Movies','TV Shows','Anime'],tabs=['Recommended','In Progress','Watchlist','Watched','Discover'];
const store=(k,v)=>localStorage.setItem(k,JSON.stringify(v));const read=(k,d)=>{try{return JSON.parse(localStorage.getItem(k))??d}catch{return d}};
let state={traktUser:null,aniUser:null,section:read('section','Movies'),tab:'Recommended',view:read('view','grid'),balance:read('balance',{Movies:50,'TV Shows':50,Anime:50}),trakt:sessionStorage.getItem('trakt_token')||'',anilist:sessionStorage.getItem('anilist_token')||'',items:[],remote:[],loadError:'',loading:false,query:'',genre:'',year:'',sort:'popularity.desc',modal:null,settings:false,feedback:read('feedback',{}),animeLibrary:[],animeLibraryLoaded:false,animeLibraryError:'',demo:read('demo',false)};
const defaultHomePrefs={featured:true,library:true,discovery:true,explanation:false,density:'comfortable',priority:'featured'};
let homePrefs={...defaultHomePrefs,...read('mok_home_prefs',{})};
if(!['featured','library'].includes(homePrefs.priority))homePrefs.priority='featured';
let sidebarMode=read('mok_sidebar_mode','expanded');
if(!['expanded','compact','hidden'].includes(sidebarMode))sidebarMode='expanded';
let featuredIndex=0;
let loadGeneration=0;
// A credential refresh rotates the Trakt access token but does NOT change the
// account. These revisions only change on an explicit connect/disconnect.
let traktAccountRevision=0, anilistAccountRevision=0;
const animeSortOptions={ 'POPULARITY_DESC':'Most popular','SCORE_DESC':'Highest community rating','START_DATE_DESC':'Newest first','TRENDING_DESC':'Trending'};
const sortAnimeItems=(items,sort)=>[...items].sort((a,b)=>sort==='SCORE_DESC'?(b.averageScore||0)-(a.averageScore||0):sort==='START_DATE_DESC'?(b.startDate?.year||0)-(a.startDate?.year||0):sort==='TRENDING_DESC'?(b.trending||0)-(a.trending||0):(b.popularity||0)-(a.popularity||0));
// Anime has its own AniList browse controls; no second list database is created.
const animeFormats={TV:'TV series',TV_SHORT:'TV short',MOVIE:'Movie',OVA:'OVA',ONA:'ONA',SPECIAL:'Special',MUSIC:'Music'};
const animeSeasons={WINTER:'Winter',SPRING:'Spring',SUMMER:'Summer',FALL:'Autumn'};
const animeReleaseStatuses={RELEASING:'Airing',FINISHED:'Finished',NOT_YET_RELEASED:'Upcoming',CANCELLED:'Cancelled',HIATUS:'On hiatus'};
const animeListStatuses={CURRENT:'Watching',REPEATING:'Rewatching',PLANNING:'Planning',COMPLETED:'Completed',PAUSED:'Paused',DROPPED:'Dropped'};
const animeGenres=['Action','Adventure','Comedy','Drama','Fantasy','Mystery','Romance','Sci-Fi','Slice of Life','Sports','Thriller'];
let animeBrowseFilters={format:'',season:'',release:''};
let animeLibraryStatusFilter='';
let animeBrowsePage=1,animeBrowseHasMore=false,animeBrowseLoading=false;
const animeTitle=m=>typeof m?.title==='string'?m.title:(m?.title?.english||m?.title?.romaji||m?.title?.native||m?.name||'Untitled');
function normaliseAnimeMedia(media,entry=null){
 const m=media||{};
 return {...m,name:animeTitle(m),image:m.coverImage?.extraLarge||m.coverImage?.large||m.image||'',
  backdrop_image:m.bannerImage||m.backdrop_image||'',
  description:m.description||m.overview||'',releaseStatus:m.releaseStatus||m.mediaStatus||(!entry?m.status:null),
  ...(entry?{progress:Number(entry.progress)||0,status:entry.status,listEntryId:entry.id,repeat:entry.repeat||0}:{}),
  _key:m.id};
}
function animeEntryStatus(x){return animeListStatuses[x?.status]||''}
const animeMediaFields=`id title{romaji english native} description(asHtml:false) coverImage{large extraLarge} bannerImage startDate{year month day} season seasonYear format releaseStatus:status duration episodes genres tags{name rank isMediaSpoiler} averageScore popularity trending nextAiringEpisode{episode airingAt}`;
async function queryAnimeBrowse(page=1){
 const year=Number(state.year),hasYear=Number.isInteger(year)&&year>=1950&&year<=2040;
 const season=animeBrowseFilters.season||undefined;
 const q=`query($page:Int,$search:String,$genre:String,$season:MediaSeason,$seasonYear:Int,$yearStart:FuzzyDateInt,$yearEnd:FuzzyDateInt,$format:MediaFormat,$status:MediaStatus,$sort:[MediaSort]){Page(page:$page,perPage:40){pageInfo{hasNextPage} media(type:ANIME,isAdult:false,search:$search,genre:$genre,season:$season,seasonYear:$seasonYear,startDate_greater:$yearStart,startDate_lesser:$yearEnd,format:$format,status:$status,sort:$sort){${animeMediaFields}}}}`;
 return ani(q,{page,search:state.query||undefined,genre:state.genre||undefined,season,
  seasonYear:season&&hasYear?year:undefined,yearStart:!season&&hasYear?year*10000+101:undefined,
  yearEnd:!season&&hasYear?year*10000+1231:undefined,
  format:animeBrowseFilters.format||undefined,status:animeBrowseFilters.release||undefined,
  sort:[animeSortOptions[state.sort]?state.sort:'POPULARITY_DESC']});
}
function mergeAnimeBrowseMedia(media,library,excludeOnList=false){
 const entries=new Map(library.filter(e=>e?.media?.id).map(e=>[Number(e.media.id),e]));
 return (media||[]).filter(x=>x?.id&&(!excludeOnList||!entries.has(Number(x.id)))&&state.feedback[x.id]!=='not')
  .map(x=>normaliseAnimeMedia(x,entries.get(Number(x.id))));
}
function renderAnimeDiscovery(m,items){
 const option=(value,label,selected)=>`<option value="${esc(value)}" ${value===selected?'selected':''}>${esc(label)}</option>`;
 m.innerHTML=`<div class="content anime-discover replica-anime-page"><header class="anime-browse-header"><div class="eyebrow">ANILIST / ANIME</div><h2>Discover Anime</h2><p class="muted">Explore seasonal releases, films, TV series and more. Your AniList entries remain visible in discovery.</p></header>
 <div class="anime-browse-toolbar replica-anime-filters" role="search" aria-label="Anime discovery filters"><label class="anime-query-label">Find anime<input id="search" type="search" class="search" autocomplete="off" placeholder="Search anime…" value="${esc(state.query)}"></label>
 <label>Genre<select id="genre">${option('','All genres',state.genre)}${animeGenres.map(g=>option(g,g,state.genre)).join('')}</select></label>
 <label>Format<select id="anime-format">${option('','All formats',animeBrowseFilters.format)}${Object.entries(animeFormats).map(([k,v])=>option(k,v,animeBrowseFilters.format)).join('')}</select></label>
 <label>Season<select id="anime-season">${option('','Any season',animeBrowseFilters.season)}${Object.entries(animeSeasons).map(([k,v])=>option(k,v,animeBrowseFilters.season)).join('')}</select></label>
 <label>Year<input id="year" type="number" class="search" min="1950" max="2040" placeholder="Any year" value="${esc(state.year)}"></label>
 <label>Airing status<select id="anime-release">${option('','Any status',animeBrowseFilters.release)}${Object.entries(animeReleaseStatuses).map(([k,v])=>option(k,v,animeBrowseFilters.release)).join('')}</select></label>
 <label>Sort<select id="sort">${Object.entries(animeSortOptions).map(([k,v])=>option(k,v,animeSortOptions[state.sort]?state.sort:'POPULARITY_DESC')).join('')}</select></label>
 <button class="action" id="go">Apply filters</button><button class="chip" id="anime-reset">Reset</button></div>
 <div class="anime-browse-results-heading replica-anime-heading"><h3>Anime titles</h3><span class="muted">${items.length} shown · AniList</span><button class="chip" id="toggle">${state.view==='grid'?'List view':'Grid view'}</button></div>
 <div class="grid anime-results replica-anime-results ${state.view==='list'?'list':''}">${items.map(item=>card(item)).join('')}</div>
 ${state.loading?'<div class="empty" role="status">Searching AniList…</div>':state.loadError?`<div class="empty" role="alert">${esc(state.loadError)}</div>`:!items.length?'<div class="empty">No anime matched these filters.</div>':''}
 ${animeBrowseHasMore?`<div class="anime-page-actions"><button class="action secondary" id="anime-more" ${animeBrowseLoading?'disabled':''}>${animeBrowseLoading?'Loading…':'Load more anime'}</button></div>`:''}
 <p class="footnote">Discovery and anime statuses come from AniList. Watching progress is updated only after AniList confirms a change.</p></div>`;
 const apply=()=>{state.query=m.querySelector('#search').value.trim();state.genre=m.querySelector('#genre').value;state.year=m.querySelector('#year').value.trim();state.sort=m.querySelector('#sort').value;animeBrowseFilters={format:m.querySelector('#anime-format').value,season:m.querySelector('#anime-season').value,release:m.querySelector('#anime-release').value};animeBrowsePage=1;load()};
 m.querySelector('#go').onclick=apply;
 m.querySelector('#search').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();apply()}});
 m.querySelector('#anime-reset').onclick=()=>{state.query='';state.genre='';state.year='';state.sort='POPULARITY_DESC';animeBrowseFilters={format:'',season:'',release:''};animeBrowsePage=1;load()};
 m.querySelector('#anime-more')?.addEventListener('click',()=>void loadMoreAnime());
 m.querySelector('#toggle').onclick=toggleView;
}
async function loadMoreAnime(){
 if(state.section!=='Anime'||state.tab!=='Discover'||!animeBrowseHasMore||animeBrowseLoading)return;
 const generation=loadGeneration,revision=anilistAccountRevision,nextPage=animeBrowsePage+1;
 const fingerprint=[state.query,state.genre,state.year,state.sort,animeBrowseFilters.format,animeBrowseFilters.season,animeBrowseFilters.release].join('|');
 const stillCurrent=()=>loadGeneration===generation&&revision===anilistAccountRevision&&state.section==='Anime'&&state.tab==='Discover'&&fingerprint===[state.query,state.genre,state.year,state.sort,animeBrowseFilters.format,animeBrowseFilters.season,animeBrowseFilters.release].join('|');
 animeBrowseLoading=true;document.querySelector('#anime-more')?.setAttribute('disabled','');
 try{
  const d=await queryAnimeBrowse(nextPage);
  if(!stillCurrent())return;
  const existing=new Set(state.items.map(x=>Number(x.id)));
  const extra=mergeAnimeBrowseMedia(d.Page?.media||[],state.animeLibrary).filter(x=>!existing.has(Number(x.id)));
  state.items.push(...extra);animeBrowsePage=nextPage;animeBrowseHasMore=!!d.Page?.pageInfo?.hasNextPage;
 }catch(e){if(stillCurrent())toast('More anime could not be loaded: '+e.message)}
 finally{animeBrowseLoading=false;if(stillCurrent())renderMain()}
}

const saveHomePrefs=()=>store('mok_home_prefs',homePrefs);
function applyHomePriority(){const content=document.querySelector('#main .content'),featured=content?.querySelector('.feature-widget'),library=content?.querySelector('#home-dashboard');if(!featured||!library)return;if(content.classList.contains('trakt-home-page')||featured.parentElement!==content||library.parentElement!==content)return;if(homePrefs.priority==='library')content.insertBefore(library,featured);else content.insertBefore(featured,library)}
// Capture image failures even when cards are rendered asynchronously. Never retry a broken URL.
document.addEventListener('error',event=>{
 const img=event.target;
 if(!(img instanceof HTMLImageElement))return;
 if(img.classList.contains('card-flip-backdrop')){img.remove();return;}
 if(img.closest('.poster')&&!img.classList.contains('af-icon')){
  const placeholder=document.createElement('span');
  placeholder.className='placeholder';
  placeholder.setAttribute('aria-hidden','true');
  placeholder.innerHTML=uiIcon('film');
  img.replaceWith(placeholder);
 }else if(img.classList.contains('detail-poster')){
  const placeholder=document.createElement('div');placeholder.className='detail-poster-empty detail-fallback';
  placeholder.setAttribute('role','img');placeholder.setAttribute('aria-label','Poster artwork unavailable');
  placeholder.innerHTML=uiIcon('film');img.replaceWith(placeholder);
 }else if(img.closest('.detail-person,.detail-related-card')){
  const placeholder=document.createElement('div');placeholder.className=img.closest('.detail-person')?'detail-person-placeholder':'detail-related-placeholder';
  placeholder.setAttribute('aria-hidden','true');placeholder.innerHTML=uiIcon('person');img.replaceWith(placeholder);
 }else if(img.closest('.episode-thumb')){
  const fallback=document.createElement('span');fallback.className='episode-image-fallback';
  fallback.setAttribute('aria-hidden','true');fallback.innerHTML=uiIcon('tv');img.replaceWith(fallback);
 }else if(img.closest('.person')){
  img.hidden=true;
 }
},true);
const app=document.querySelector('#app');const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const pic=x=>x.image||(x.poster_path?'https://image.tmdb.org/t/p/w500'+x.poster_path:'');const title=x=>{const t=x?.title??x?.media?.title;return (typeof t==='string'&&t.trim())||(typeof t==='object'&&(t?.english||t?.romaji||t?.native))||x?.name||'Untitled';};
const synopsis=x=>String(x?.overview||x?.description||'Discover your next obsession. Connect your account to personalise your picks.').replace(/<[^>]*>/g,'').replace(/&nbsp;/g,' ').replace(/&amp;/g,'&');
const sample=[{id:1,title:'The Last Signal',overview:'A mysterious transmission changes everything.',year:2025,genre:'Mystery',type:'movie'},{id:2,title:'Beyond the Frame',overview:'A journey through unexpected worlds.',year:2024,genre:'Adventure',type:'movie'},{id:3,title:'Midnight City',overview:'Stories converge after dark.',year:2026,genre:'Drama',type:'movie'}];
function toast(s){let n=document.createElement('div');n.className='toast';n.textContent=s;document.body.append(n);setTimeout(()=>n.remove(),3500)}
const tmdbDiscoveryGenres=['28:Action','12:Adventure','35:Comedy','18:Drama','14:Fantasy','27:Horror','9648:Mystery','10749:Romance','878:Sci-Fi','53:Thriller'];
const tmdbCardGenreNames=new Map(tmdbDiscoveryGenres.map(value=>value.split(':')));
function cardCommunityScore(item){
 const score=Number(item.averageScore||10*Number(item.vote_average||item.rating));
 return Number.isFinite(score)&&score>0&&score<=100?Math.round(score):null;
}
function cardMetadata(item){
 const titleText=title(item);
 const genre=(item.genres||[]).map(value=>typeof value==='string'?value:value?.name).find(Boolean)
  ||(item.genre_ids||[]).map(id=>tmdbCardGenreNames.get(String(id))).find(Boolean)||'';
 const certification=typeof item.certification==='string'?item.certification.trim():'';
 const score=cardCommunityScore(item);
 return {titleText,genre,certification,score};
}
function cardArtwork(item,image,metadata,{artClass='',frontTag='',note=''}={}){
 const {titleText,genre,certification,score}=metadata;
 const background=backdrop(item)||image;
 return `<span class="media-card-art ${artClass}" aria-hidden="true">
  <span class="card-flip-face card-flip-front">${image?`<img loading="lazy" src="${esc(image)}" alt="">`:`<span class="placeholder">${uiIcon('film')}</span>`}${frontTag}</span>
  <span class="card-flip-face card-flip-back">${background?`<img class="card-flip-backdrop" loading="lazy" src="${esc(background)}" alt="">`:''}
   <span class="card-flip-copy"><strong>${esc(titleText)}</strong>${genre?`<span class="card-flip-genre">${esc(genre)}</span>`:''}${certification?`<span class="card-flip-certification">${esc(certification)}</span>`:''}${note?`<span class="card-flip-note">${esc(note)}</span>`:''}</span>
   ${score!==null?`<span class="card-flip-score">${uiIcon('star')} ${score}%</span>`:''}
  </span>
 </span>`;
}
function card(x,libraryIndex=null){
 const metadata=cardMetadata(x),{titleText,genre,certification,score}=metadata;
 const year=x.release_date?.slice(0,4)||x.first_air_date?.slice(0,4)||x.startDate?.year||x.year;
 const status=state.section==='Anime'?animeEntryStatus(x):'';
 const progress=x.progress!=null?(typeof x.progress==='string'&&x.progress.endsWith('%')?x.progress:`${x.progress}/${x.episodes??'?'} episodes`):'';
 const runtime=x.episodes?`${x.episodes} eps.`:(x.runtime||x.duration)?`${x.runtime||x.duration} min`:'';
 const caption=[year,runtime,progress].filter(Boolean).join(' · ');
 const description=[titleText,caption,status,genre,certification,score!==null?`${score}% community rating`:''].filter(Boolean).join('. ');
 const index=libraryIndex===null?'':` data-library-index="${libraryIndex}"`;
 const frontTag=status?`<span class="anime-card-badge">${esc(status)}</span>`:'';
 return `<button type="button" class="poster" data-open="${esc(x._key||x.id)}"${index} aria-label="${esc(description)}">${cardArtwork(x,pic(x),metadata,{frontTag})}<span class="poster-body"><strong>${esc(titleText)}</strong><small>${esc(caption)}${score!==null?`<span class="card-caption-score">${caption?' · ':''}${score}%</span>`:''}</small></span></button>`;
}
// Use the captured Trakt shapes first. The normalized Arctic PNGs supply
// controls without a matching Trakt shape, including the Anime mask.
const TRAKT_ICONS = new Set([
 "film","tv","home","home-active","compass","compass-active","search","settings","list","filter",
 "sidemenu","chevron-right","chevron-up","check","circle-check","bookmark","bookmark-filled","dot-menu","xmark",
 "sort","sort-default","sort-added","sort-runtime","sort-rating","sort-release","sort-title","sort-rank","sort-direction",
 "star","info","circle-play","track-now","track-release","track-other","track-unknown","track-slot-add","track-slot-selected"
]);
function uiIcon(name){
 if(TRAKT_ICONS.has(name))return `<svg class="af-icon trakt-icon" aria-hidden="true" focusable="false"><use href="/assets/trakt-icons.svg#${name}" width="100%" height="100%"/></svg>`;
 return `<img class="af-icon" src="/assets/ui-icons/${name}.png" alt="" aria-hidden="true">`;
}
const sectionIcons={Movies:uiIcon('film'),'TV Shows':uiIcon('tv'),Anime:uiIcon('mask')};
const tabIcons={'Recommended':'star','In Progress':'circle-play','Watchlist':'bookmark','Watched':'circle-check','Discover':'compass'};
// Step 4: make the selected mobile top tab visible without scrolling the page.
function revealActiveMobileTab(){
 const rail=document.querySelector('.mobile-top-tabs'),active=rail?.querySelector('button.active');
 if(!rail||!active)return;
 requestAnimationFrame(()=>{
  if(!rail.isConnected||getComputedStyle(rail).display==='none')return;
  const r=active.getBoundingClientRect(),host=rail.getBoundingClientRect();
  if(r.left<host.left+3||r.right>host.right-3)
   rail.scrollLeft += (r.left+r.width/2)-(host.left+host.width/2);
 });
}
// Desktop rail controls supplement native phone swipe scrolling. Install once per rail.
let horizontalRailSequence=0,horizontalResizeListenerReady=false;
function enhanceHorizontalRails(root=document){
 if(!horizontalResizeListenerReady){
  horizontalResizeListenerReady=true;
  window.addEventListener('resize',()=>document.querySelectorAll('[data-rail-enhanced="true"]').forEach(rail=>rail.dispatchEvent(new Event('scroll'))),{passive:true});
 }
 const rails=root.querySelectorAll('.home-rail-track,.detail-people-rail,.detail-related-rail,.episode-rail');
 rails.forEach(rail=>{
  if(rail.dataset.railEnhanced)return;
  rail.dataset.railEnhanced='true';
  const parent=rail.closest('.home-rail,.detail-section');
  const heading=parent?.querySelector('.section-title,.detail-section-heading');
  const label=heading?.querySelector('h3')?.textContent.trim()||'Titles';
  if(!rail.id)rail.id='mok-rail-'+(++horizontalRailSequence);
  rail.setAttribute('tabindex','0');
  rail.setAttribute('role','region');
  rail.setAttribute('aria-label',label+' — horizontal scrolling');
  rail.addEventListener('keydown',e=>{
   if(e.target!==rail||!['ArrowLeft','ArrowRight'].includes(e.key))return;
   e.preventDefault();
   rail.scrollBy({left:(e.key==='ArrowRight'?1:-1)*Math.max(160,Math.round(rail.clientWidth*.73)),behavior:'auto'});
  });
  if(!heading)return;
  const controls=document.createElement('span');controls.className='rail-controls';
  controls.innerHTML=`<button type="button" class="rail-step rail-prev" aria-label="Scroll ${esc(label)} left" aria-controls="${rail.id}">${uiIcon('chevron-right')}</button><button type="button" class="rail-step rail-next" aria-label="Scroll ${esc(label)} right" aria-controls="${rail.id}">${uiIcon('chevron-right')}</button>`;
  heading.append(controls);
  const update=()=>{
   if(!rail.isConnected)return;
   const end=Math.max(0,rail.scrollWidth-rail.clientWidth);
   controls.hidden=end<8;
   controls.querySelector('.rail-prev').disabled=rail.scrollLeft<6;
   controls.querySelector('.rail-next').disabled=rail.scrollLeft>=end-6;
  };
  controls.querySelector('.rail-prev').onclick=()=>rail.scrollBy({left:-Math.max(160,Math.round(rail.clientWidth*.8)),behavior:window.matchMedia?.('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});
  controls.querySelector('.rail-next').onclick=()=>rail.scrollBy({left:Math.max(160,Math.round(rail.clientWidth*.8)),behavior:window.matchMedia?.('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});
  rail.addEventListener('scroll',update,{passive:true});
  requestAnimationFrame(update);
 });
}
let navKeyboardAbort=new AbortController();
function layout(){
 navKeyboardAbort.abort();navKeyboardAbort=new AbortController();
 const s=state.section;
 const navSection=v=>`<button type="button" data-section="${v}" class="${s===v?'active':''}">${sectionIcons[v]}<span>${v}</span></button>`;
 const navTab=t=>`<button type="button" data-tab="${t}" class="${state.tab===t?'active':''}">${uiIcon(tabIcons[t])}<span>${t}</span></button>`;
 app.innerHTML=`<div class="shell"><div class="workspace"><header class="top"><div class="brand">
 <button type="button" class="menu-trigger" id="menu-trigger" aria-label="Open menu" aria-expanded="false">${uiIcon('sidemenu')}</button>
 <h1><img class="brand-mark" src="/assets/favicon-180.png" alt=""> MOKUMOKUREN</h1>
 </div><button type="button" id="desktop-sidebar-toggle" class="sidebar-mode-toggle" aria-label="Collapse sidebar" aria-controls="desktop-sidebar" title="Collapse sidebar">${uiIcon('sidemenu')}</button><div class="quick-modes trakt-segmented-select" role="radiogroup" aria-label="Choose media: Movies, TV Shows, Anime">${sections.map(v=>`<button type="button" role="radio" class="quick-mode ${s===v?'active':''}" data-quick-section="${v}" aria-label="${esc(v)}" aria-checked="${s===v}" tabindex="${s===v?'0':'-1'}"><span class="segment-icon" aria-hidden="true">${sectionIcons[v]}</span><span class="segment-label">${esc(v)}</span></button>`).join('')}</div><div class="header-tools" role="group" aria-label="Explore and account controls"><button type="button" id="header-filter" class="header-filter" aria-label="Discover and filter titles" title="Discover and filter titles">${uiIcon('filter')}</button><button type="button" id="quick-search" class="search-trigger" aria-label="Search titles" title="Search titles" aria-keyshortcuts="/">${uiIcon('search')}<span>Search titles</span></button><button type="button" id="header-settings" class="header-settings" aria-label="Your profile" title="Your profile">${uiIcon('user')}</button></div><nav class="mobile-top-tabs" aria-label="${esc(s)} navigation">${tabs.map(t=>`<button type="button" data-mobile-tab="${t}" class="${state.tab===t?'active':''}" aria-current="${state.tab===t?'page':'false'}">${esc(t==='Recommended'?'Home':t)}</button>`).join('')}</nav><div class="current-location"><span class="location-label">BROWSING</span><button type="button" id="context-switch" aria-label="Change section or library view">${sectionIcons[s]||sectionIcons.Movies}<span>${esc(s)} <span class="location-separator">/</span> ${esc(state.tab)}</span>${uiIcon('chevron-right')}</button></div></header><main id="main"></main></div>
 <div class="drawer-shade" id="drawer-shade" hidden></div><nav class="mobile-drawer" id="mobile-drawer" aria-label="Navigation" hidden>
 <div class="drawer-head"><strong>MOKUMOKUREN</strong><button id="drawer-close" aria-label="Close menu">${uiIcon('xmark')}</button></div>
 <p class="drawer-heading">Browse</p>${sections.map(navSection).join('')}
 <p class="drawer-heading">Library & discovery</p>${tabs.map(navTab).join('')}
 <div class="drawer-foot"><button type="button" id="drawer-profile">${uiIcon('user')} Profile</button><button id="drawer-settings">${uiIcon('settings')} Settings & connections</button><small>${state.trakt?'Trakt connected':'Trakt not connected'} · ${state.anilist?'AniList connected':'AniList not connected'}</small></div></nav></div>`;
 const side=document.createElement('aside');side.className='desktop-sidebar';side.id='desktop-sidebar';side.setAttribute('aria-label','Primary navigation');side.innerHTML=`<div class="side-brand"><img src="/assets/favicon-32.png" alt=""><span>Mokumokuren</span></div><div class="side-label">NAVIGATION</div>${[['Recommended','home','Home'],['Discover','compass','Discover'],['In Progress','circle-play','Continue Watching'],['Watchlist','bookmark','Watchlist'],['Watched','circle-check',state.section==='Movies'?'Watched':'Completed']].map(([tab,icon,label],i)=>`${i===3?'<div class="side-label">YOUR LIBRARY</div>':''}<button type="button" data-side-tab="${tab}" class="${state.tab===tab?'active':''}" ${state.tab===tab?'aria-current="page"':''}>${uiIcon(state.tab===tab&&['home','compass'].includes(icon)?icon+'-active':icon)}<span>${label}</span></button>`).join('')}<div class="side-label">ACCOUNT</div><button type="button" data-side-tab="Profile" class="${state.tab==='Profile'?'active':''}" ${state.tab==='Profile'?'aria-current="page"':''}>${uiIcon('user')}<span>Profile</span></button><div class="side-bottom"><button type="button" data-side-action="settings">${uiIcon('settings')}<span>Settings</span></button></div>`;document.querySelector('.workspace').prepend(side);side.querySelectorAll('[data-side-tab]').forEach(b=>b.onclick=()=>{state.tab=b.dataset.sideTab;libraryFilters.query='';libraryFilters.sort='default';layout();load()});side.querySelector('[data-side-action="settings"]').onclick=()=>showSettings();
 const sidebarToggle=document.querySelector('#desktop-sidebar-toggle');
 const applySidebarMode=()=>{
  const workspace=document.querySelector('.workspace');
  workspace.dataset.sidebarMode=sidebarMode;
  side.inert=sidebarMode==='hidden';
  side.setAttribute('aria-hidden',String(sidebarMode==='hidden'));
  const nextLabel=sidebarMode==='expanded'?'Collapse sidebar':sidebarMode==='compact'?'Hide sidebar':'Expand sidebar';
  sidebarToggle.setAttribute('aria-label',nextLabel);sidebarToggle.title=nextLabel;
  sidebarToggle.setAttribute('aria-expanded',String(sidebarMode!=='hidden'));
  side.querySelectorAll('button').forEach(button=>{const label=button.querySelector('span')?.textContent?.trim();if(label){button.title=label;button.setAttribute('aria-label',label)}});
 };
 sidebarToggle.onclick=()=>{sidebarMode=sidebarMode==='expanded'?'compact':sidebarMode==='compact'?'hidden':'expanded';store('mok_sidebar_mode',sidebarMode);applySidebarMode()};
 applySidebarMode();
 const drawer=document.querySelector('#mobile-drawer'),shade=document.querySelector('#drawer-shade'),trigger=document.querySelector('#menu-trigger');
 const close=(restoreFocus=false)=>{drawer.hidden=true;shade.hidden=true;trigger.setAttribute('aria-expanded','false');document.body.classList.remove('drawer-open');if(restoreFocus)trigger.focus()};
 const openDrawer=()=>{drawer.hidden=false;shade.hidden=false;trigger.setAttribute('aria-expanded','true');document.body.classList.add('drawer-open');document.querySelector('#drawer-close').focus()};trigger.onclick=openDrawer;document.querySelector('#context-switch').onclick=openDrawer;
 shade.onclick=()=>close(true);document.querySelector('#drawer-close').onclick=()=>close(true);drawer.addEventListener('keydown',e=>{if(e.key!=='Tab')return;const focusable=[...drawer.querySelectorAll('button:not(:disabled)')];const first=focusable[0],last=focusable[focusable.length-1];if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus()}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus()}});
 document.querySelector('#drawer-profile').onclick=()=>{close();state.tab='Profile';layout();load()};
 document.querySelector('#drawer-settings').onclick=()=>{close();showSettings()};
 const openDiscovery=(focusSelector='#search')=>{state.tab='Discover';layout();load();setTimeout(()=>document.querySelector(focusSelector)?.focus(),150)};
 document.querySelector('#quick-search').onclick=()=>openDiscovery();
 document.querySelector('#header-filter').onclick=()=>openDiscovery(state.section==='Anime'?'#anime-format':'#genre');
 document.querySelector('#header-settings').onclick=()=>{state.tab='Profile';layout();load()};
 document.querySelector('.quick-modes').addEventListener('keydown',event=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;event.preventDefault();const current=sections.indexOf(state.section);const next=event.key==='Home'?0:event.key==='End'?sections.length-1:(current+(event.key==='ArrowRight'?1:-1)+sections.length)%sections.length;document.querySelector(`[data-quick-section="${sections[next]}"]`)?.click();document.querySelector('.quick-mode.active')?.focus()});
 document.addEventListener('keydown',event=>{if(event.key!=='/'||event.altKey||event.ctrlKey||event.metaKey||['INPUT','TEXTAREA','SELECT'].includes(document.activeElement?.tagName)||document.querySelector('.modal-back'))return;event.preventDefault();document.querySelector('#quick-search')?.click()},{signal:navKeyboardAbort.signal});
 document.querySelectorAll('[data-mobile-tab]').forEach(b=>b.onclick=()=>{state.tab=b.dataset.mobileTab;libraryFilters.query='';libraryFilters.sort='default';layout();load()});
 document.querySelectorAll('[data-quick-section]').forEach(b=>b.onclick=()=>{state.section=b.dataset.quickSection;state.tab='Recommended';store('section',state.section);layout();load()});
 document.querySelectorAll('[data-section]').forEach(b=>b.onclick=()=>{close();state.section=b.dataset.section;libraryFilters.query='';libraryFilters.sort='default';store('section',state.section);state.tab='Recommended';layout();load()});
 document.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>{close();state.tab=b.dataset.tab;libraryFilters.query='';libraryFilters.sort='default';layout();load()});
 document.onkeydown=e=>{if(e.key!=='Escape')return;if(document.querySelector('.modal-back'))return;if(!drawer.hidden){e.preventDefault();close(true)}};
 renderMain();
 revealActiveMobileTab();
}
let discoveryQuery="",discoveryGenre="",discoveryYear="",discoverySort="recommended";
function discoveryTitleYear(x){return Number(String(x.release_date||x.first_air_date||x.startDate?.year||x.year||'').slice(0,4))||0}
function discoveryTitleRating(x){return Number(x.averageScore||((x.vote_average||0)*10))||0}
function discoveryMatches(x){
 const q=discoveryQuery.trim().toLocaleLowerCase();
 const genres=(x.genres||[]).map(g=>typeof g==='string'?g:g.name||'');
 return (!q||[title(x),synopsis(x),...genres].some(v=>String(v||'').toLocaleLowerCase().includes(q)))&&
  (!discoveryGenre||genres.includes(discoveryGenre))&&(!discoveryYear||String(discoveryTitleYear(x))===discoveryYear);
}
function discoveryResults(items){
 const filtered=items.filter(discoveryMatches);
 if(discoverySort==='title')filtered.sort((a,b)=>title(a).localeCompare(title(b)));
 else if(discoverySort==='newest')filtered.sort((a,b)=>discoveryTitleYear(b)-discoveryTitleYear(a));
 else if(discoverySort==='rating')filtered.sort((a,b)=>discoveryTitleRating(b)-discoveryTitleRating(a));
 return filtered;
}
let activeTitleMenu=null;
const recommendationWatchlistWrites=new Set();
function openTitleMenu(trigger,panel,{removeOnClose=false}={}){
 if(activeTitleMenu?.trigger===trigger){activeTitleMenu.close(true);return null;}
 activeTitleMenu?.close();
 const controller=new AbortController(),{signal}=controller;
 const nativePopover=typeof panel.showPopover==='function';
 const close=(restoreFocus=false)=>{
  controller.abort();
  if(nativePopover&&panel.matches(':popover-open'))panel.hidePopover();
  panel.hidden=true;
  panel.inert=true;
  panel.setAttribute('aria-hidden','true');
  trigger.setAttribute('aria-expanded','false');
  if(removeOnClose)panel.remove();
  if(activeTitleMenu===menu)activeTitleMenu=null;
  if(restoreFocus&&trigger.isConnected)trigger.focus({preventScroll:true});
 };
 const menu={trigger,close};
 activeTitleMenu=menu;
 panel.hidden=false;
 panel.inert=false;
 panel.setAttribute('aria-hidden','false');
 trigger.setAttribute('aria-expanded','true');
 if(nativePopover){panel.setAttribute('popover','manual');panel.showPopover();}
 const position=()=>{
  if(!trigger.isConnected||!trigger.getClientRects().length){close();return;}
  const anchor=trigger.getBoundingClientRect();
  if(anchor.bottom<=0||anchor.top>=window.innerHeight||anchor.right<=0||anchor.left>=window.innerWidth){close();return;}
  panel.style.left=Math.max(8,Math.min(anchor.right-panel.offsetWidth,window.innerWidth-panel.offsetWidth-8))+'px';
  panel.style.top=Math.max(8,Math.min(anchor.top,window.innerHeight-panel.offsetHeight-8))+'px';
 };
 position();
 if(activeTitleMenu!==menu)return null;
 const contains=target=>panel.contains(target)||trigger.contains(target);
 document.addEventListener('pointerdown',event=>{if(!contains(event.target))close();},{capture:true,signal});
 document.addEventListener('focusin',event=>{if(!contains(event.target))close();},{signal});
 document.addEventListener('keydown',event=>{
  if(event.key!=='Escape')return;
  event.preventDefault();event.stopPropagation();close(true);
 },{capture:true,signal});
 window.addEventListener('resize',position,{signal});
 window.addEventListener('scroll',position,{capture:true,passive:true,signal});
 panel.querySelector('button:not([disabled])')?.focus({preventScroll:true});
 return menu;
}
function saveRecommendationFeedback(item,preference){
 state.feedback[item.id]=preference;
 store('feedback',state.feedback);
}
function showRecommendationReason(item,section){
 const reason=item.previewItem?'This title is from the preview catalog.':section==='Anime'?
  'Picked from the AniList catalog using your Discovery Balance and available anime watch activity.':state.query?
  'This title matched your search in the TMDB catalog.':'This title comes from the current TMDB weekly trending catalog.';
 const drawer=document.createElement('dialog');
 drawer.className='watchlist-sort-drawer recommendation-why-drawer';
 drawer.setAttribute('aria-labelledby','recommendation-why-title');
 drawer.innerHTML=`<header><div><span class="muted">${esc(title(item))}</span><h3 id="recommendation-why-title">Why was this recommended?</h3></div><button type="button" class="chip watchlist-sort-close" aria-label="Close recommendation explanation">${uiIcon('xmark')}</button></header><p>${esc(reason)}</p>`;
 document.body.append(drawer);
 drawer.querySelector('button').onclick=()=>drawer.close();
 drawer.addEventListener('close',()=>drawer.remove(),{once:true});
 drawer.showModal();
}
function showRecommendationActions(trigger,item){
 if(activeTitleMenu?.trigger===trigger){activeTitleMenu.close(true);return;}
 const section=state.section;
 const accountRevision=()=>section==='Anime'?anilistAccountRevision:traktAccountRevision;
 const revision=accountRevision(),writeKey=`${section}:${revision}:${item._key||item.id}`;
 const panel=document.createElement('div');
 panel.id=trigger.getAttribute('aria-controls');
 panel.className='title-popover recommendation-menu';
 panel.setAttribute('role','group');
 panel.setAttribute('aria-label',`Actions for ${title(item)}`);
 panel.innerHTML=`<button type="button" data-recommendation-why>${uiIcon('info')} Why this?</button>
  <button type="button" data-recommendation-watchlist disabled>${uiIcon('bookmark')} <span>Watchlist</span></button>
  <button type="button" data-recommendation-track>${uiIcon('check')} Track…</button>
  <button type="button" data-recommendation-hide>${uiIcon('xmark')} Hide recommendation</button>`;
 trigger.parentElement.append(panel);
 const menu=openTitleMenu(trigger,panel,{removeOnClose:true});
 if(!menu)return;
 panel.querySelector('[data-recommendation-why]').onclick=()=>{menu.close(true);showRecommendationReason(item,section);};
 panel.querySelector('[data-recommendation-track]').onclick=()=>{
  menu.close(true);
  if(section==='Anime'){
   openItem(item);
   document.querySelector('.detail-overlay #watched:not([disabled])')?.focus();
  }else openTraktTrackDrawer(traktTrackTarget(item,section),trigger);
 };
 panel.querySelector('[data-recommendation-hide]').onclick=()=>{menu.close();saveRecommendationFeedback(item,'not');void load();};
 const watchlist=panel.querySelector('[data-recommendation-watchlist]');
 watchlist.title='Checking Watchlist';
 const isCurrent=()=>activeTitleMenu===menu&&state.section===section&&accountRevision()===revision;
 void getItemTracking(item).then(tracking=>{
  if(!isCurrent())return;
  const saving=recommendationWatchlistWrites.has(writeKey);
  watchlist.disabled=!tracking.available||saving;
  watchlist.title=saving?'Saving Watchlist change…':tracking.available?'':tracking.error||`Connect ${section==='Anime'?'AniList':'Trakt'} in Settings`;
  watchlist.querySelector('span').textContent=tracking.watchlist?'Remove from Watchlist':'Add to Watchlist';
  watchlist.querySelector('use').setAttribute('href',`/assets/trakt-icons.svg#${tracking.watchlist?'bookmark-filled':'bookmark'}`);
  watchlist.onclick=()=>{
   if(watchlist.disabled||!isCurrent()||recommendationWatchlistWrites.has(writeKey))return;
   recommendationWatchlistWrites.add(writeKey);
   watchlist.disabled=true;
   menu.close(true);
   void changeStatus(item,tracking.watchlist?'remove-watchlist':'watchlist').finally(()=>recommendationWatchlistWrites.delete(writeKey));
  };
 });
}
function updateDiscoveryGallery(){
 const gallery=document.querySelector('.recommendation-gallery');if(!gallery)return;
 if(activeTitleMenu&&gallery.contains(activeTitleMenu.trigger))activeTitleMenu.close();
 const filtered=discoveryResults(state.items);
 gallery.innerHTML=filtered.map((item,index)=>`<div class="media-card">${card(item)}<button type="button" class="card-menu-trigger" data-recommendation-index="${index}" aria-controls="recommendation-menu-${index}" aria-label="Actions for ${esc(title(item))}" aria-expanded="false">${uiIcon('dot-menu')}</button></div>`).join('');
 const count=document.querySelector('#discovery-count');if(count)count.textContent=`${filtered.length} of ${state.items.length} titles`;
 const empty=document.querySelector('#discovery-filter-empty');if(empty)empty.hidden=!!filtered.length||!state.items.length;
 gallery.querySelectorAll('[data-open]').forEach((button,i)=>{button.onclick=()=>openItem(filtered[i])});
 gallery.querySelectorAll('[data-recommendation-index]').forEach(button=>{button.onclick=()=>showRecommendationActions(button,filtered[Number(button.dataset.recommendationIndex)]);});
}
function resetDiscoveryFilters(){discoveryQuery='';discoveryGenre='';discoveryYear='';discoverySort='recommended';renderMain()}

function renderMain(){const m=document.querySelector('#main');if(!m)return;if(activeTitleMenu&&(!activeTitleMenu.trigger.isConnected||m.contains(activeTitleMenu.trigger)))activeTitleMenu.close();let t=state.tab,s=state.section,items=state.items;let feature=items.length?items[((featuredIndex%items.length)+items.length)%items.length]:(state.demo?sample.find(item=>state.feedback[item.id]!=='not'):null);if(t==='Recommended'){m.innerHTML=`<div class="content"><div class="page-heading"><div><span class="eyebrow">${esc(s)} / YOUR DISCOVERY</span><h2>${esc(s)} · Recommended</h2></div><button type="button" class="chip" data-replica-view="Watchlist">${uiIcon('bookmark')} View Watchlist</button></div>${homePrefs.featured&&feature?featureWidget(feature):""}${homePrefs.library?'<div id="home-dashboard" class="home-dashboard" aria-live="polite"></div>':''}${homePrefs.discovery?'<div class="discovery-controls"><div class="section-title"><h3>Discovery balance</h3><span class="muted">${state.balance[s]}% adventurous</span></div><input class="range" type="range" min="0" max="100" step="5" id="balance" aria-label="Discovery balance" value="${state.balance[s]}"><div class="row" style="justify-content:space-between"><small class="muted">Familiar</small><small class="muted">Unexpected</small></div></div>':''}<div class="section-title"><h3>${uiIcon('star')} Recommended for you</h3><button class="chip" id="toggle">${state.view==='list'?'Show rail':'Show all'}</button></div><div class="discovery-filter-toolbar"><label>Find a title<input id="discovery-search" class="search" type="search" placeholder="Search titles, genres or descriptions…" value="${esc(discoveryQuery)}"></label><label>Genre<select id="discovery-genre"><option value="">All genres</option>${[...new Set(items.flatMap(x=>(x.genres||[]).map(g=>typeof g==='string'?g:g.name||'')))].filter(Boolean).sort().map(g=>`<option value="${esc(g)}" ${g===discoveryGenre?'selected':''}>${esc(g)}</option>`).join('')}</select></label><label>Year<select id="discovery-year"><option value="">Any year</option>${[...new Set(items.map(discoveryTitleYear))].filter(Boolean).sort((a,b)=>b-a).map(y=>`<option value="${y}" ${String(y)===discoveryYear?'selected':''}>${y}</option>`).join('')}</select></label><label>Sort<select id="discovery-sort">${[['recommended','Recommended'],['rating','Highest rating'],['newest','Newest first'],['title','Title A–Z']].map(([v,label])=>`<option value="${v}" ${v===discoverySort?'selected':''}>${label}</option>`).join('')}</select></label><button type="button" class="chip discovery-reset" id="discovery-reset">Clear filters</button><span class="muted" id="discovery-count" aria-live="polite"></span></div><div id="discovery-filter-empty" class="muted" hidden>No titles match these filters.</div><div class="recommendation-gallery ${state.view==='list'?'gallery-expanded':''} ${homePrefs.density==='compact'?'compact-posters':''}" aria-label="Recommended titles"></div>${!items.length?`<div class="empty illustrated-empty recommendation-empty" role="status">${state.loading?'Finding recommendations…':'No recommendations yet. Connect your accounts and configure TMDB, or enable preview data in Settings.'}</div>`:''}${homePrefs.explanation?'<div class="panel"><h3>Why these picks?</h3><p>Recommendations are ranked using available account activity and your Discovery Balance. Availability and relevance depend on connected accounts.</p></div>':''}</div>`;applyHomePriority();document.querySelector('#featured-open')?.addEventListener('click',()=>openItem(feature));document.querySelectorAll('[data-feature-step]').forEach(b=>b.onclick=()=>{if(!state.items.length)return;featuredIndex=(featuredIndex+Number(b.dataset.featureStep)+state.items.length)%state.items.length;renderMain();renderHomeDashboard()});if(document.querySelector('.discovery-controls .section-title .muted'))document.querySelector('.discovery-controls .section-title .muted').textContent=state.balance[s]+'% adventurous';if(document.querySelector('#balance'))document.querySelector('#balance').oninput=e=>{state.balance[s]=+e.target.value;store('balance',state.balance);document.querySelector('.section-title .muted').textContent=e.target.value+'% adventurous';state.items=rankRecommendations((state.recommendationPool||state.items).filter(item=>state.feedback[item.id]!=='not'),s);updateDiscoveryGallery()};document.querySelector("#discovery-search").oninput=e=>{discoveryQuery=e.target.value;updateDiscoveryGallery()};document.querySelector("#discovery-genre").onchange=e=>{discoveryGenre=e.target.value;updateDiscoveryGallery()};document.querySelector("#discovery-year").onchange=e=>{discoveryYear=e.target.value;updateDiscoveryGallery()};document.querySelector("#discovery-sort").onchange=e=>{discoverySort=e.target.value;updateDiscoveryGallery()};document.querySelector("#discovery-reset").onclick=resetDiscoveryFilters;updateDiscoveryGallery();document.querySelector('#toggle').onclick=toggleView}
else if(t==='Discover'&&s==='Anime'){renderAnimeDiscovery(m,items)}
else if(t==='Discover'){m.innerHTML=`<div class="content"><div class="section-title"><h3>${uiIcon('compass')} Discover ${s}</h3></div><input class="search" id="search" aria-label="Search titles or mood" placeholder="Search titles, or describe a mood…" value="${esc(state.query)}"><div class="filters"><select id="genre" aria-label="Filter by genre"><option value="">All genres</option>${(s==='Anime'?['Action','Adventure','Comedy','Drama','Fantasy','Mystery','Romance','Sci-Fi','Slice of Life','Sports','Thriller']:tmdbDiscoveryGenres).map(g=>{let [v,n]=g.includes(':')?g.split(':'):[g,g];return `<option value="${v}" ${state.genre===v?'selected':''}>${n}</option>`}).join('')}</select><input class="search" id="year" aria-label="Release year" type="number" min="1950" max="2030" placeholder="Release year" value="${esc(state.year)}"><select id="sort" aria-label="Sort discovery results">${s==='Anime'?Object.entries(animeSortOptions).map(([v,l])=>`<option value="${v}">${l}</option>`).join(''):`<option value="popularity.desc">Most popular</option><option value="vote_average.desc">Highest community rating</option><option value="${s==='Movies'?'primary_release_date.desc':'first_air_date.desc'}">Newest first</option>`}</select><button class="action" id="go">Search</button></div><div class="row"><button class="chip" id="toggle">${state.view==='grid'?'List view':'Grid view'}</button><button class="chip" id="mood">Try a mood search</button></div><div class="grid ${state.view==='list'?'list':''}" style="margin-top:16px">${items.map(item=>card(item)).join('')}</div>${state.loading?'<div class="empty" role="status">Searching titles…</div>':state.loadError?`<div class="empty" role="alert">${esc(state.loadError)}</div>`:!items.length?'<div class="empty">No results yet. Try a different search.</div>':''}<p class="footnote">Movie and TV discovery uses TMDB when configured. Anime discovery uses AniList. AI-style mood search is a basic keyword search in this build, not a connected language model.</p></div>`;document.querySelector('#sort').value=s==='Anime'?(animeSortOptions[state.sort]?state.sort:'POPULARITY_DESC'):(state.sort?.includes('_DESC')?'popularity.desc':state.sort);document.querySelector('#go').onclick=()=>{state.query=document.querySelector('#search').value.trim();state.genre=document.querySelector('#genre').value;state.year=document.querySelector('#year').value;state.sort=document.querySelector('#sort').value;load()};document.querySelector('#mood').onclick=()=>{document.querySelector('#search').value='mystery';state.query='mystery';load()};document.querySelector('#toggle').onclick=toggleView}
else if(t==='Profile'){renderProfilePage(m)}else{renderLibraryPage(m,t,s,items)}enhanceMainNavigation(m,t,s);if(t==='Recommended')applyTraktHomeComposition(m,s);enhanceReplicaMainPages(m,t,s);if(t==='Discover')m.querySelectorAll('[data-open]').forEach(b=>b.onclick=()=>{const item=state.items.find(x=>String(x._key||x.id)===b.dataset.open);if(item)openItem(item)});requestAnimationFrame(()=>enhanceHorizontalRails(m))}
// Step 11 navigation fidelity: shared contextual page navigation, preserving the
// same authoritative Trakt/AniList requests and existing content renderers.
function applyTraktHomeComposition(main,section){
 // The supplied Trakt Home HTML uses Continue Watching followed by Start Watching.
 // Keep the existing account-driven rails, feature carousel and discovery controls,
 // but demote Mokumokuren-only additions below Trakt's main two sections.
 const content=main.querySelector(':scope > .content');
 if(!content)return;
 content.classList.add('trakt-home-page');
 const heading=content.querySelector('.page-heading');
 if(heading){
  heading.classList.add('trakt-home-heading');
  const h2=heading.querySelector('h2');if(h2)h2.textContent='Continue Watching';
  const eyebrow=heading.querySelector('.eyebrow');if(eyebrow)eyebrow.textContent=section.toUpperCase()+' / HOME';
  let subtitle=heading.querySelector('.trakt-home-subtitle');
  if(!subtitle){subtitle=document.createElement('p');subtitle.className='trakt-home-subtitle';heading.querySelector('div')?.append(subtitle)}
  subtitle.textContent=section==='Movies'?'Your movies. Your pace. Pick up where you left off.':section==='Anime'?'Your anime. Your pace. Continue from your AniList history.':'Your shows. Your pace. Continue from your Trakt history.';
 }
 const suggested=[...content.querySelectorAll('.section-title')].find(e=>e.querySelector('h3')?.textContent.includes('Recommended for you'));
 const gallery=content.querySelector('.recommendation-gallery');
 if(suggested&&gallery){
  const start=document.createElement('section');start.className='trakt-start-watching';start.setAttribute('aria-label','Start Watching');
  const h3=suggested.querySelector('h3');if(h3){h3.textContent='Start Watching'}
  suggested.before(start);start.append(suggested,gallery);
  const empty=content.querySelector('.recommendation-empty');if(empty)start.append(empty);
  const advanced=document.createElement('details');advanced.className='trakt-home-extras';
  advanced.innerHTML='<summary>Personalise discoveries</summary><div class="trakt-home-extra-body"></div>';
  start.after(advanced);
  const box=advanced.querySelector('.trakt-home-extra-body');
  for(const selector of ['.discovery-filter-toolbar','.discovery-controls','.feature-widget','.panel']){
   const item=content.querySelector(selector);if(item)box.append(item);
  }
  const emptyFilters=content.querySelector('#discovery-filter-empty');if(emptyFilters)box.append(emptyFilters);
 }
}

// Replica Step 3: view-level composition. The source of the records, OAuth and
// tracking writes remain unchanged. Only already-rendered interface sections
// and their accessible controls are reorganized.
function enhanceReplicaMainPages(main,tab,section){
 if(!main.dataset.replicaPageEvents){
  main.dataset.replicaPageEvents='true';
  main.addEventListener('click',event=>{
   const link=event.target.closest('[data-replica-view]');
   if(link){const next=link.dataset.replicaView;if(next!==state.tab){state.tab=next;libraryFilters.query='';libraryFilters.sort='default';layout();load()}return}
   const toggle=event.target.closest('[data-replica-collapse]');
   if(toggle){const area=toggle.closest('.home-rail,.trakt-start-watching');const track=area?.querySelector('.home-rail-track,.recommendation-gallery');if(!track)return;
    const collapsed=toggle.getAttribute('aria-expanded')!=='false';track.hidden=collapsed;area.classList.toggle('replica-collapsed',collapsed);toggle.setAttribute('aria-expanded',String(!collapsed));toggle.setAttribute('aria-label',(collapsed?'Expand ':'Collapse ')+(area.getAttribute('aria-label')||'title list'));return}
   const scroll=event.target.closest('[data-replica-scroll]');
   if(scroll){const area=scroll.closest('.home-rail,.trakt-start-watching');const track=area?.querySelector('.home-rail-track,.recommendation-gallery');if(!track)return;const delta=Number(scroll.dataset.replicaScroll)||0;track.scrollBy?.({left:delta*Math.max(240,track.clientWidth*.78),behavior:'smooth'});return}
  });
 }
 const content=main.querySelector(':scope > .content');if(!content)return;
 content.classList.add('replica-page','replica-page-'+tab.toLowerCase().replaceAll(' ','-'));
 if(tab==='Recommended'){
  const heading=content.querySelector('.trakt-home-heading');
  if(heading&&!heading.querySelector('[data-replica-view="In Progress"]')){
   const actions=document.createElement('div');actions.className='replica-home-heading-actions';
   actions.innerHTML=`<button type="button" class="replica-home-view" data-replica-view="In Progress" aria-label="View all in progress titles">View all ${uiIcon('chevron-right')}</button>`;
   heading.append(actions);
  }
  const start=content.querySelector('.trakt-start-watching');
  if(start&&!start.querySelector('[data-replica-collapse]')){
   start.setAttribute('aria-label','Start Watching');
   const head=start.querySelector('.section-title');
   if(head){head.classList.add('replica-rail-heading');const buttons=document.createElement('div');buttons.className='replica-rail-actions';buttons.innerHTML=`<button type="button" class="replica-rail-step" data-replica-scroll="-1" aria-label="Previous Start Watching titles">${uiIcon('chevron-right')}</button><button type="button" class="replica-rail-step" data-replica-scroll="1" aria-label="Next Start Watching titles">${uiIcon('chevron-right')}</button><button type="button" class="replica-rail-collapse" data-replica-collapse aria-expanded="true" aria-label="Collapse Start Watching">${uiIcon('chevron-up')}</button>`;head.append(buttons)}
  }
 }else if(tab==='Discover'){
  content.classList.add('replica-discover');
  const filters=content.querySelector('.filters,.anime-browse-toolbar');
  if(filters){filters.setAttribute('role','search');filters.setAttribute('aria-label','Discover filters')}
  const results=content.querySelector('.discover-results-heading,.anime-browse-results-heading');
  if(results)results.classList.add('replica-results-heading');
 }else if(['In Progress','Watchlist','Watched'].includes(tab)){
  content.classList.add('replica-library');
  const grid=content.querySelector('#library-results');
  if(grid)grid.classList.toggle('replica-progress-grid',tab==='In Progress'&&section!=='Movies');
  const toolbar=content.querySelector('.library-toolbar');
  if(toolbar)toolbar.setAttribute('role','search');
  const heading=content.querySelector('.library-hero');
  if(heading)heading.classList.add('replica-collection-head');
 }else if(tab==='Profile')content.classList.add('replica-profile');
}

function enhanceMainNavigation(main,tab,section){
 const content=main.querySelector(':scope > .content');if(!content)return;
 main.dataset.view=tab.toLowerCase().replaceAll(' ','-');
 main.dataset.media=section.toLowerCase().replaceAll(' ','-');
 const label=tab==='Recommended'?'Home':tab==='Watched'&&section!=='Movies'?'Completed':tab;
 const links=[['Recommended','Home','home'],['Discover','Discover','compass'],['In Progress','In Progress','circle-play'],['Watchlist','Watchlist','watchlist'],['Watched',section==='Movies'?'Watched':'Completed','circle-check'],['Profile','Profile','user']];
 const nav=document.createElement('nav');nav.className='trakt-section-shortcuts';nav.setAttribute('aria-label',section+' views');
 nav.innerHTML=`<span class="trakt-shortcuts-caption">${esc(section)} <span aria-hidden="true">/</span> ${esc(label)}</span><div class="trakt-shortcut-track">${links.map(([value,title,icon])=>`<button type="button" data-shortcut="${value}" class="${tab===value?'current':''}" ${tab===value?'aria-current="page"':''}>${uiIcon(icon)}<span>${title}</span></button>`).join('')}</div><span class="trakt-connection-status" title="Account data is synchronized with the connected provider"><span class="trakt-status-dot ${section==='Anime'?(state.anilist?'is-connected':''):(state.trakt?'is-connected':'')}"></span>${section==='Anime'?'AniList':'Trakt'}</span>`;
 content.prepend(nav);
 nav.querySelectorAll('[data-shortcut]').forEach(btn=>btn.onclick=()=>{
  if(btn.dataset.shortcut===state.tab)return;
  state.tab=btn.dataset.shortcut;
  libraryFilters.query='';libraryFilters.sort='default';
  layout();load();window.scrollTo?.(0,0);
 });
 const hero=content.querySelector('.library-hero');if(hero){
  hero.querySelector('.library-total')?.setAttribute('aria-label','Items currently shown');
 }
 if(tab==='Discover'&&section!=='Anime'){
  const heading=content.querySelector('.section-title');
  if(heading){heading.classList.add('discover-main-heading');heading.innerHTML=`<div class="discover-heading-copy"><span class="eyebrow">EXPLORE THE CATALOGUE</span><h2>Discover ${esc(section)}</h2><p class="muted">Find your next favorite through search, genres and community ratings.</p></div><span class="discover-provider">Powered by TMDB</span>`;}
  const filter=content.querySelector('.filters');filter?.classList.add('trakt-discover-filters');const query=content.querySelector(':scope > #search');if(filter&&query)filter.prepend(query);
  const cards=content.querySelector('.grid');if(cards){
   const label=document.createElement('div');label.className='discover-results-heading';
   label.innerHTML=`<h3>Explore ${esc(section)}</h3><span>${state.items.length} titles</span>`;
   cards.before(label);cards.classList.add('trakt-discovery-results');
  }
 }
 if(tab==='Discover'&&section==='Anime')content.classList.add('trakt-anime-browse');
 if(['In Progress','Watchlist','Watched'].includes(tab)){
  const grid=content.querySelector('.library-results');grid?.classList.add('trakt-library-grid');
 }
}

function renderProfilePage(main){
 const traktVerified=Boolean(state.trakt&&state.traktUser),aniVerified=Boolean(state.anilist&&state.aniUser);
 const status=(connected,verified)=>!connected?'Not connected':verified?'Connected':'Session awaiting verification';
 const accounts=[
  {name:'Trakt',connected:!!state.trakt,verified:traktVerified,username:state.traktUser,subtitle:'Movies, TV shows, watch history and Watchlist'},
  {name:'AniList',connected:!!state.anilist,verified:aniVerified,username:state.aniUser,subtitle:'Anime tracking, statuses and episode progress'}
 ];
 main.innerHTML=`<div class="content profile-page"><header class="profile-hero"><span class="eyebrow">YOUR SPACE / ACCOUNT</span><h2>Profile</h2><p class="muted">Your connected libraries in one place. Trakt manages movies and TV; AniList manages anime.</p></header><div class="profile-identity"><img src="/assets/favicon-180.png" alt=""><div><strong>${esc(state.traktUser||state.aniUser||'Your collection')}</strong><span>Personal media dashboard</span></div><button class="chip" id="profile-settings">${uiIcon('settings')} Connections</button></div><div class="profile-provider-grid">${accounts.map(a=>`<section class="profile-provider"><div class="profile-provider-top"><h3>${esc(a.name)}</h3><span class="profile-provider-status ${a.verified?'connected':''}">${esc(status(a.connected,a.verified))}</span></div><strong>${esc(a.username||'No verified username')}</strong><p>${esc(a.subtitle)}</p><button class="chip" data-profile-settings>${a.connected?'Manage connection':'Connect account'}</button></section>`).join('')}</div><div class="profile-quick-section"><h3>My activity</h3><div class="profile-quick-links"><button data-profile-view="In Progress">${uiIcon('circle-play')}<strong>In Progress</strong><span>Continue your shows and films</span></button><button data-profile-view="Watched">${uiIcon('circle-check')}<strong>Watched & completed</strong><span>Browse titles you've finished</span></button><button data-profile-view="Watchlist">${uiIcon('bookmark')}<strong>Watchlist</strong><span>Everything saved for later</span></button></div></div></div>`;
 main.querySelectorAll('[data-profile-settings],#profile-settings').forEach(b=>b.onclick=()=>showSettings());
 main.querySelectorAll('[data-profile-view]').forEach(b=>b.onclick=()=>{state.tab=b.dataset.profileView;libraryFilters.query='';libraryFilters.sort='default';layout();load()});
}

// Library controls operate on the loaded collection, without additional API requests.
const libraryFilters={query:'',sort:'default'};
const animeLibraryTabs={all:'Watching now',CURRENT:'Watching',REPEATING:'Rewatching',PAUSED:'Paused',DROPPED:'Dropped'};
const watchlistSortOptions=[
 {key:'default',label:'Default',direction:'asc'},
 {key:'added',label:'Date Added',direction:'desc',traktOnly:true,value:item=>parseWatchlistDate(item.listedAt)},
 {key:'runtime',label:'Runtime',direction:'desc',value:item=>watchlistNumber(item.runtime||item.duration)},
 {key:'rating',label:'Rating',direction:'desc',value:item=>watchlistNumber(item.vote_average||item.averageScore||item.rating)},
 {key:'release',label:'Release Date',direction:'desc',value:watchlistReleaseDate},
 {key:'title',label:'Title',direction:'asc',value:title},
 {key:'rank',label:'Rank',direction:'asc',traktOnly:true,value:item=>watchlistNumber(item.watchlistRank)}
];
function parseWatchlistDate(value){
 const time=value?Date.parse(String(value)):NaN;
 return Number.isFinite(time)?time:null;
}
function watchlistReleaseDate(item){
 const date=item.startDate;
 return parseWatchlistDate(item.release_date||item.first_air_date)
  ?? (date?.year?Date.UTC(date.year,(date.month||1)-1,date.day||1):parseWatchlistDate(item.year));
}
function watchlistNumber(value){
 const number=Number(value);
 return Number.isFinite(number)&&number>0?number:null;
}
function getWatchlistSort(value,section){
 const [key,direction]=value.split(':');
 const option=watchlistSortOptions.find(entry=>entry.key===key&&(!entry.traktOnly||section!=='Anime'))||watchlistSortOptions[0];
 return {option,direction:key===option.key&&['asc','desc'].includes(direction)?direction:option.direction};
}
function sortedWatchlist(items,value,section){
 const {option,direction}=getWatchlistSort(value,section);
 if(option.key==='default')return direction==='desc'?[...items].reverse():items;
 const sign=direction==='asc'?1:-1;
 return items.map(item=>({item,key:option.value(item)})).sort((a,b)=>{
  if(a.key===null||b.key===null)return Number(a.key===null)-Number(b.key===null);
  return sign*(typeof a.key==='string'?a.key.localeCompare(b.key):a.key-b.key);
 }).map(({item})=>item);
}
function wireWatchlistSort(view,section,update){
 const trigger=view.querySelector('#watchlist-sort');
 const drawer=view.querySelector('#watchlist-sort-drawer');
 const list=drawer.querySelector('.watchlist-sort-options');
 const options=watchlistSortOptions.filter(option=>section!=='Anime'||!option.traktOnly);
 function renderOptions(){
  const current=getWatchlistSort(libraryFilters.sort,section);
  list.innerHTML=options.map(option=>{
   const active=option===current.option;
   const direction=active?` aria-label="${option.label}, ${current.direction==='asc'?'ascending':'descending'}"`:'';
   return `<button type="button" data-watchlist-sort="${option.key}" aria-pressed="${active}"${direction}>${uiIcon('sort-'+option.key)}<span>${option.label}</span>${active?`<span class="watchlist-sort-direction" data-direction="${current.direction}">${uiIcon('sort-direction')}</span>`:''}</button>`;
  }).join('');
  trigger.title=`Sort Watchlist: ${current.option.label}`;
 }
 renderOptions();
 trigger.addEventListener('click',()=>{
  if(drawer.open)return;
  drawer.showModal();
  list.querySelector('[aria-pressed="true"]').focus();
 });
 list.addEventListener('click',event=>{
  const button=event.target.closest('[data-watchlist-sort]');
  if(!button)return;
  const current=getWatchlistSort(libraryFilters.sort,section);
  const next=options.find(option=>option.key===button.dataset.watchlistSort);
  if(!next)return;
  const direction=next===current.option?(current.direction==='asc'?'desc':'asc'):next.direction;
  libraryFilters.sort=next.key+':'+direction;
  renderOptions();
  update();
  drawer.close();
 });
 drawer.querySelector('[data-sort-close]').addEventListener('click',()=>drawer.close());
 drawer.addEventListener('close',()=>{if(trigger.isConnected)trigger.focus()});
 drawer.addEventListener('click',event=>{
  if(event.target!==drawer)return;
  const {left,right,top,bottom}=drawer.getBoundingClientRect();
  if(event.clientX<left||event.clientX>right||event.clientY<top||event.clientY>bottom)drawer.close();
 });
}
function libraryResults(items){
 const q=libraryFilters.query.trim().toLocaleLowerCase();
 const filtered=items.filter(x=>(state.section!=='Anime'||state.tab!=='In Progress'||(animeLibraryStatusFilter&&animeLibraryStatusFilter!=='all'?x.status===animeLibraryStatusFilter:['CURRENT','REPEATING'].includes(x.status)))&&(!q||[title(x),synopsis(x),x.release_date,x.first_air_date,x.startDate?.year,x.year].some(v=>String(v??'').toLocaleLowerCase().includes(q))));
 if(state.tab==='Watchlist')return sortedWatchlist(filtered,libraryFilters.sort,state.section);
 const year=x=>Number(String(x.release_date||x.first_air_date||x.startDate?.year||x.year||'').slice(0,4))||0;
 if(libraryFilters.sort==='title')filtered.sort((a,b)=>title(a).localeCompare(title(b)));
 if(libraryFilters.sort==='newest')filtered.sort((a,b)=>year(b)-year(a));
 if(libraryFilters.sort==='oldest')filtered.sort((a,b)=>year(a)-year(b));
 return filtered;
}
function replicaProgressCard(x,index,section){
 const name=title(x),image=backdrop(x),id=esc(x._key||x.id);
 const episode=x.nextEpisode;
 const next=episode?`S${episode.season} · E${episode.number}${episode.title?' · '+episode.title:''}`:(section==='Anime'?'Continue your anime':'Continue watching');
 const watched=Number(x.watchedCount);
 const total=Number(x.episodes);
 const watchedText=section==='Anime'&&Number.isFinite(Number(x.progress))?`${x.progress}/${total||'?'} episodes`:
  Number.isFinite(watched)&&watched>0?`${x.progress!=null?String(x.progress)+' · ':''}${watched} watched`:
  (x.progress!=null?String(x.progress):'In progress');
 let percentage=null;
 if(section==='Anime'&&total>0)percentage=100*Number(x.progress||0)/total;
 else if(typeof x.progress==='string'&&x.progress.endsWith('%'))percentage=Number.parseFloat(x.progress);
 if(!Number.isFinite(percentage))percentage=null;
 const safePercent=percentage===null?null:Math.max(0,Math.min(100,percentage));
 const metadata=cardMetadata(x);
 const frontTag=safePercent!==null?`<span class="replica-progress-overlay"><span class="replica-progress-fill" style="width:${safePercent}%"></span></span>`:'';
 const art=cardArtwork(x,image,metadata,{artClass:'replica-progress-art',frontTag,note:next});
 const description=[name,watchedText,next,metadata.genre,metadata.certification,metadata.score!==null?`${metadata.score}% community rating`:''].filter(Boolean).join('. ');
 return `<button type="button" class="poster poster-library-progress" data-open="${id}" data-library-index="${index}" aria-label="${esc(description)}">${art}<span class="poster-body"><strong>${esc(name)}</strong><small>${esc(next)}</small><span class="replica-progress-caption">${esc(watchedText)}</span></span></button>`;
}
function renderLibraryPage(m,t,s,items){
 const label=t==='Watched'&&s!=='Movies'?'Completed':t;
 const isWatchlist=t==='Watchlist';
 const sortControl=isWatchlist
  ? `<button type="button" class="chip watchlist-sort-trigger" id="watchlist-sort" aria-haspopup="dialog" aria-controls="watchlist-sort-drawer" aria-label="Sort Watchlist">${uiIcon('sort')} <span>Sort</span></button>`
  : '<label class="library-sort-label"><span>Sort by</span><select id="library-sort"><option value="default">Default order</option><option value="title">Title A–Z</option><option value="newest">Newest first</option><option value="oldest">Oldest first</option></select></label>';
 const sortDrawer=isWatchlist?`<dialog class="watchlist-sort-drawer" id="watchlist-sort-drawer" aria-labelledby="watchlist-sort-title">
  <header><h3 id="watchlist-sort-title">Sort By</h3><button type="button" class="chip watchlist-sort-close" data-sort-close aria-label="Close sort drawer">${uiIcon('xmark')}</button></header>
  <div class="watchlist-sort-options" role="group" aria-label="Watchlist order"></div>
 </dialog>`:'';
 const count=`<div class="library-total"><strong id="library-count">${items.length}</strong><span>titles</span></div>`;
 const subtitle=t==='In Progress'&&s==='Movies'?'Movies with a resumable Trakt playback position.':
  t==='Watched'&&s==='TV Shows'?'Shows whose aired episodes are fully watched on Trakt.':
  t==='In Progress'&&s==='TV Shows'?'Shows with watched episodes and more episodes remaining.':
  s==='Anime'&&t==='In Progress'?'Watching and rewatching anime. Use the status filters for paused or dropped titles.':'Your titles, organised your way.';
 const heading=isWatchlist
  ? `<div class="watchlist-heading"><h2>${esc(label)}</h2><div class="watchlist-summary"><span>${esc(s)}</span>${count}</div></div>`
  : `<div><span class="eyebrow">YOUR COLLECTION / ${esc(s)}</span><h2>${uiIcon(tabIcons[t]||'list')} ${esc(label)}</h2><p class="muted">${subtitle}</p></div>${count}`;
 const viewLabel=state.view==='grid'?'List view':'Grid view';
 const toolbar=`<div class="library-toolbar"><label class="library-search-label">
  <span${isWatchlist?' class="screen-reader-only"':''}>Search collection</span>
  <input class="search" id="library-search" type="search" autocomplete="off" placeholder="${isWatchlist?'Search Watchlist':'Search by title, year or description…'}" value="${esc(libraryFilters.query)}"></label>
  ${sortControl}
  <button class="chip library-refresh" id="library-refresh" type="button" aria-label="Refresh progress from connected account">${isWatchlist?'Refresh':'Refresh progress'}</button>
  <button class="chip library-view" id="toggle" type="button" title="${viewLabel}" aria-label="Change poster layout">${isWatchlist?uiIcon(state.view==='grid'?'list':'grid'):''}<span>${viewLabel}</span></button>
 </div>`;
 m.innerHTML=`<div class="content library-page${isWatchlist?' watchlist-page':''}">
  <header class="library-hero">${heading}${isWatchlist?toolbar:''}</header>
  ${isWatchlist?'':toolbar}
  ${s==='Anime'&&t==='In Progress'?`<nav class="anime-library-tabs" aria-label="AniList watching status">${Object.entries(animeLibraryTabs).map(([value,label])=>`<button class="chip ${(animeLibraryStatusFilter||'all')===value?'active':''}" data-anime-library-filter="${value}" aria-pressed="${(animeLibraryStatusFilter||'all')===value}">${label}</button>`).join('')}</nav>`:''}
  ${state.libraryWarning?`<p class="muted library-sync-warning" role="status">${esc(state.libraryWarning)}</p>`:''}
  <div class="grid library-results${state.view==='list'?' list':''}" id="library-results"></div>
  <div id="library-empty" class="empty illustrated-empty" hidden></div>${sortDrawer}
 </div>`;

 const search=m.querySelector('#library-search'),sort=m.querySelector('#library-sort'),grid=m.querySelector('#library-results'),empty=m.querySelector('#library-empty');
 if(sort)sort.value=libraryFilters.sort;
 m.querySelectorAll('[data-anime-library-filter]').forEach(b=>b.onclick=()=>{animeLibraryStatusFilter=b.dataset.animeLibraryFilter;m.querySelectorAll('[data-anime-library-filter]').forEach(z=>{z.classList.toggle('active',z===b);z.setAttribute('aria-pressed',String(z===b))});update()});
 const update=()=>{const subset=libraryResults(items);grid.innerHTML=subset.map((item,index)=>t==='In Progress'&&s!=='Movies'?replicaProgressCard(item,index,s):card(item,index)).join('');m.querySelector('#library-count').textContent=subset.length;empty.hidden=!!subset.length;if(!subset.length)empty.textContent=state.loading?'Loading your library…':state.loadError||(!items.length?`No ${label.toLowerCase()} titles yet. Connect ${s==='Anime'?'AniList':'Trakt'} in Settings.`:'No titles match your search.');grid.querySelectorAll('[data-library-index]').forEach(b=>b.onclick=()=>{const item=subset[Number(b.dataset.libraryIndex)];if(item)openItem(item)});wireQuickProgress()};
 search.oninput=()=>{libraryFilters.query=search.value;update()};
 if(sort)sort.onchange=()=>{libraryFilters.sort=sort.value;update()};
 else wireWatchlistSort(m,s,update);
 m.querySelector('#toggle').onclick=toggleView;m.querySelector('#library-refresh').onclick=()=>void refreshRemoteTracking({force:true});update();
}
function toggleView(){state.view=state.view==='grid'?'list':'grid';store('view',state.view);renderMain()}
const mediaKind=()=>state.section==='Movies'?'movie':state.section==='TV Shows'?'tv':'anime';
// Never interpret a Trakt ID as a TMDB ID. Some library records only contain Trakt identifiers.
const mediaId=x=>Number(x.tmdb_id||x.ids?.tmdb||((x.ids?.trakt||x.trakt_id)?0:x.id)||0);
const backdrop=x=>x.backdrop_image||(x.backdrop_path?'https://image.tmdb.org/t/p/w1280'+x.backdrop_path:pic(x));
function featureWidget(x){return `<section class="feature-widget" style="--feature-image:url('${esc(backdrop(x))}')"><div class="feature-copy"><span class="eyebrow">FEATURED · ${esc(state.section)}</span><h2>${esc(title(x))}</h2><p>${esc(synopsis(x))}</p><div class="feature-actions"><button class="action" id="featured-open">${uiIcon('info')} Explore title</button><span>${esc(x.release_date?.slice(0,4)||x.first_air_date?.slice(0,4)||x.startDate?.year||x.year||'')} ${x.vote_average?' · '+Number(x.vote_average).toFixed(1)+'/10':''}</span></div></div><div class="feature-pagination" aria-label="Featured title navigation"><button type="button" data-feature-step="-1" aria-label="Previous featured title">${uiIcon('chevron-right')}</button><span>${state.items.length?featuredIndex%state.items.length+1:1} / ${Math.max(1,state.items.length)}</span><button type="button" data-feature-step="1" aria-label="Next featured title">${uiIcon('chevron-right')}</button></div></section>`}
function detailTab(name,label){return `<button type="button" role="tab" aria-selected="${name==='overview'}" tabindex="${name==='overview'?0:-1}" data-detail-tab="${name}" class="${name==='overview'?'active':''}">${label}</button>`}
const detailReviewCache=new Map();
async function loadTraktDetailReviews(kind,traktId,rail){
 if(!state.trakt||!(Number(traktId)>0)){rail.textContent='Connect Trakt to read community reviews.';return}
 const revision=traktAccountRevision;
 const key=revision+':'+kind+':'+traktId;
 let cached=detailReviewCache.get(key);
 if(!cached||cached.until<Date.now()){
  const path='/'+(kind==='movie'?'movies':'shows')+'/'+encodeURIComponent(String(traktId))+'/comments/popular?limit=8';
  const promise=trakt(path).then(rows=>Array.isArray(rows)?rows:[]);
  cached={until:Date.now()+3*60*1000,promise};detailReviewCache.set(key,cached);
  promise.catch(()=>{if(detailReviewCache.get(key)===cached)detailReviewCache.delete(key)});
  if(detailReviewCache.size>40)detailReviewCache.delete(detailReviewCache.keys().next().value);
 }
 try{
  const reviews=(await cached.promise).filter(r=>r&&!r.spoiler&&typeof r.comment==='string'&&r.comment.trim()).slice(0,8);
  if(revision!==traktAccountRevision||!rail.isConnected)return;
  rail.innerHTML=reviews.length?reviews.map(r=>{
   const user=r.user||{},author=user.name||user.username||'Trakt member';
   const rating=Number(r.user_rating);
   const date=typeof r.created_at==='string'?r.created_at.slice(0,10):'';
   return `<article class="detail-review"><div class="detail-review-head"><strong>${esc(author)}</strong>${rating>=1&&rating<=10?`<span class="detail-review-rating">★ ${rating}/10</span>`:''}</div>${date?`<small>${esc(date)}</small>`:''}<p>${esc(r.comment.trim().slice(0,420))}</p></article>`;
  }).join(''):'<p class="muted">No spoiler-free Trakt reviews are available for this title.</p>';
 }catch(e){if(revision===traktAccountRevision&&rail.isConnected)rail.innerHTML='<p class="muted">Trakt reviews are unavailable right now.</p>'}
}
function wireDetailSections(container){
 // Sections mirror Trakt's in-page expand/collapse affordance; all content is visible initially.
 container.querySelectorAll('.detail-section').forEach((section,index)=>{
  if(section.querySelector(':scope > .detail-section-heading')===null)return;
  const heading=section.querySelector(':scope > .detail-section-heading');
  if(heading.querySelector('.detail-collapse'))return;
  const label=heading.querySelector('h3')?.textContent?.trim()||'section';
  const control=document.createElement('button');control.type='button';control.className='detail-collapse';
  control.setAttribute('aria-label','Collapse '+label);control.setAttribute('aria-expanded','true');
  control.innerHTML='<span aria-hidden="true">⌃</span>';
  heading.appendChild(control);
  const items=[...section.children].filter(el=>el!==heading);
  control.onclick=()=>{
   const expanded=control.getAttribute('aria-expanded')!=='true';
   control.setAttribute('aria-expanded',String(expanded));
   control.setAttribute('aria-label',(expanded?'Collapse ':'Expand ')+label);
   items.forEach(el=>el.hidden=!expanded);
  };
 });
}
// Trakt date tracking uses the provider's history API and leaves AniList progress separate.
const trackHistoryLimit=15;
const pendingTraktTracks=new Set();
const trackDateChoices=[
 {value:'now',label:'Just now',icon:'track-now'},
 {value:'released',label:'Release date',icon:'track-release'},
 {value:'custom',label:'Other date',icon:'track-other'},
 {value:'unknown',label:'Unknown date',icon:'track-unknown'},
];
function traktTrackTarget(item,section){
 if(!item||!['Movies','TV Shows'].includes(section))return null;
 const traktId=Number(item.ids?.trakt||item.trakt_id),tmdb=mediaId(item);
 const ids=Number.isSafeInteger(traktId)&&traktId>0?{trakt:traktId}:
  Number.isSafeInteger(tmdb)&&tmdb>0?{tmdb}:null;
 return ids?{kind:section==='Movies'?'movie':'show',name:title(item),ids}:null;
}
function traktEpisodeTrackTarget(show,episode,season){
 if(!episode)return null;
 const directId=Number(episode.ids?.trakt);
 const number=Number(episode.number??episode.episode_number);
 const name=episode.title||episode.name||`Episode ${number}`;
 if(Number.isSafeInteger(directId)&&directId>0)return {kind:'episode',name,ids:{trakt:directId}};
 const showTarget=traktTrackTarget(show,'TV Shows');
 if(!showTarget||!Number.isSafeInteger(season)||season<0||!Number.isSafeInteger(number)||number<1)return null;
 return {kind:'episode',name,showIds:showTarget.ids,season,number};
}
function formatTrackLocalTime(timestamp){
 const date=new Date(timestamp),pad=value=>String(value).padStart(2,'0');
 return `${String(date.getFullYear()).padStart(4,'0')}-${pad(date.getMonth()+1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
function parseTrackLocalTime(value,now=Date.now()){
 if(typeof value==='number'){
  const date=new Date(value);
  return Number.isFinite(date.getTime())&&value<=now?date.toISOString():null;
 }
 if(!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value))return null;
 const date=new Date(value),time=date.getTime();
 // The round trip rejects invalid dates and missing local times during clock changes.
 return Number.isFinite(time)&&time<=now&&formatTrackLocalTime(time)===value?date.toISOString():null;
}
function buildTraktTrackPayload(target,choice,input='',now=Date.now()){
 if(!target)throw Error('Trakt could not identify this title.');
 const time=choice==='custom'?parseTrackLocalTime(input,now):choice;
 if(!time||!trackDateChoices.some(entry=>entry.value===choice))throw Error('Choose a valid date and time in the past.');
 const dateFields=choice==='now'?{}:{watched_at:time};
 if(target.kind==='episode'&&target.showIds)
  return {shows:[{ids:target.showIds,seasons:[{number:target.season,episodes:[{number:target.number,...dateFields}]}]}]};
 return {[target.kind+'s']:[{ids:target.ids,...dateFields}]};
}
function watchHistorySlots(rows,now=Date.now()){
 const recent=rows.filter(row=>typeof row?.watched_at==='string').map(row=>({row,time:Date.parse(row.watched_at)}))
  .filter(({time})=>Number.isFinite(time)&&time!==0&&time<=now)
  .sort((a,b)=>b.time-a.time).slice(0,trackHistoryLimit);
 return recent.map(({row,time},index)=>{
  const upper=index?recent[index-1].time:now;
  const firstMinute=Math.floor(time/60000)+1,lastMinute=Math.ceil(upper/60000)-1;
  const slot=firstMinute<=lastMinute?60000*Math.floor((firstMinute+lastMinute)/2):null;
  const name=row.type==='episode'?[row.show?.title,row.episode?.title].filter(Boolean).join(' · '):row.movie?.title||row.show?.title;
  return {name:name||'Watched title',time,upper,slot};
 });
}
async function recordTraktWatch(target,choice,input,revision=traktAccountRevision){
 if(!state.trakt)throw Error('Connect Trakt in Settings first.');
 if(revision!==traktAccountRevision)throw Error('The Trakt account changed. Reopen tracking.');
 const payload=buildTraktTrackPayload(target,choice,input);
 const key=JSON.stringify([revision,target.kind,target.ids||target.showIds,target.season,target.number]);
 if(pendingTraktTracks.has(key))throw Error('This watch is already being saved.');
 pendingTraktTracks.add(key);
 try{
  const result=await trakt('/sync/history',{method:'POST',body:JSON.stringify(payload)});
  if(revision!==traktAccountRevision||!state.trakt)throw Error('The Trakt account changed during tracking.');
  if(['movies','shows','seasons','episodes'].some(key=>result?.not_found?.[key]?.length))
   throw Error('Trakt could not match this title or one of its episodes. Check your history before trying again.');
  const added=target.kind==='movie'?result?.added?.movies:result?.added?.episodes;
  if(!Number.isSafeInteger(added)||added<1)throw Error('Trakt did not confirm a new watch. Check your history before trying again.');
  clearTrackingCache();
  return added;
 }finally{pendingTraktTracks.delete(key);}
}
function openTraktTrackDrawer(target,trigger,onRecorded){
 if(!target){toast('Trakt could not identify this title.');return;}
 if(document.querySelector('.trakt-track-drawer[open]'))return;
 const revision=traktAccountRevision;
 const drawer=document.createElement('dialog');
 drawer.className='watchlist-sort-drawer trakt-track-drawer';
 drawer.setAttribute('aria-labelledby','trakt-track-title');
 drawer.innerHTML=`<header><h3 id="trakt-track-title">${esc(target.name)}</h3><button type="button" class="chip watchlist-sort-close" data-track-close aria-label="Close tracking">${uiIcon('xmark')}</button></header>
  <div class="tracking-drawer-body"></div><p class="tracking-feedback" role="status"></p>`;
 const body=drawer.querySelector('.tracking-drawer-body'),feedback=drawer.querySelector('.tracking-feedback');
 let step='choices',saving=false,viewRevision=0;
 const connected=()=>Boolean(state.trakt)&&revision===traktAccountRevision;
 const notice=()=>connected()?'':revision===traktAccountRevision?'Connect Trakt in Settings to track watches.':'The Trakt account changed. Reopen tracking.';
 const close=()=>{if(!saving)drawer.close();};
 const leaveStep=()=>{if(saving)return;if(step==='custom')showChoices('custom');else close();};
 async function submit(choice,value=''){
  if(saving)return;
  if(!connected()){feedback.textContent=notice();return;}
  saving=true;
  const controls=[...drawer.querySelectorAll('button:not([disabled]),input:not([disabled])')];
  controls.forEach(control=>{control.disabled=true;});
  feedback.textContent='Saving to Trakt…';
  let added;
  try{added=await recordTraktWatch(target,choice,value,revision);}
  catch(err){feedback.textContent=err.message;return;}
  finally{saving=false;controls.forEach(control=>{control.disabled=false;});}
  close();
  toast(target.kind==='show'?`${added} ${added===1?'episode watch':'episode watches'} recorded on Trakt`:'Watch recorded on Trakt');
  void load();
  if(onRecorded)void onRecorded();
 }
 function showChoices(focus){
  step='choices';viewRevision++;
  body.innerHTML=`<div class="watchlist-sort-options tracking-date-choices" role="group" aria-label="When did you watch this?">${trackDateChoices.map(({value,label,icon})=>`<button type="button" data-track-choice="${value}" ${connected()?'':'disabled'}>${uiIcon(icon)}<span>${label}</span></button>`).join('')}</div>
   ${target.kind==='show'?'<p class="tracking-hint">These choices apply to the show’s episodes. Open the episode guide to track a single episode.</p>':''}`;
  feedback.textContent=notice();
  body.querySelectorAll('[data-track-choice]').forEach(button=>button.onclick=()=>{
   if(button.dataset.trackChoice==='custom')showCustom();else void submit(button.dataset.trackChoice);
  });
  if(focus)body.querySelector(`[data-track-choice="${focus}"]`)?.focus({preventScroll:true});
 }
 function showCustom(){
  step='custom';const view=++viewRevision;
  feedback.textContent='';
  body.innerHTML=`<form class="tracking-date-form">
   <label class="screen-reader-only" for="trakt-track-date">Watch date and time</label>
   <div class="tracking-date-field">${uiIcon('track-other')}<input id="trakt-track-date" type="datetime-local" max="${formatTrackLocalTime(Date.now())}" required disabled></div>
   <div class="tracking-form-actions"><button type="button" class="chip" data-track-cancel>Cancel</button><button type="submit" class="action" disabled>Mark as Watched</button></div>
   </form><section class="tracking-history" aria-label="Recent watch history"><p class="tracking-hint" role="status">Loading dates from Trakt…</p><ol class="tracking-history-list"></ol></section>`;

  const form=body.querySelector('form'),input=form.querySelector('input'),save=form.querySelector('[type="submit"]');
  const hint=body.querySelector('.tracking-hint'),list=body.querySelector('ol');
  let selectedSlot=null;
  const watchDate=()=>selectedSlot!==null&&input.value===formatTrackLocalTime(selectedSlot)?selectedSlot:input.value;
  const validate=()=>{save.disabled=!connected()||input.disabled||!parseTrackLocalTime(watchDate());};
  form.querySelector('[data-track-cancel]').onclick=()=>showChoices('custom');
  form.querySelector('[data-track-cancel]').focus({preventScroll:true});
  input.oninput=validate;
  form.onsubmit=event=>{event.preventDefault();if(!save.disabled)void submit('custom',watchDate());};
  const stillOpen=()=>drawer.open&&view===viewRevision;
  const useManual=message=>{hint.textContent=message;input.disabled=!connected();validate();};
  void (async()=>{
   try{
    const rows=await trakt('/sync/history?limit='+trackHistoryLimit);
    if(!stillOpen())return;
    if(!Array.isArray(rows))throw Error('Trakt returned an invalid history response.');
    const entries=watchHistorySlots(rows);
    const format=new Intl.DateTimeFormat(undefined,{dateStyle:'medium',timeStyle:'short'});
    list.innerHTML=entries.map(({name,time,upper,slot},index)=>`<li class="tracking-history-item">
     ${slot!==null?`<div class="tracking-history-gap"><button type="button" class="tracking-history-slot" data-history-slot="${index}" aria-pressed="false" aria-label="Choose a time between ${esc(format.format(time))} and ${esc(format.format(upper))}">${uiIcon('track-slot-add')}</button></div>`:''}
     <div class="tracking-history-record"><strong>${esc(name)}</strong><small>${esc(format.format(time))}</small></div></li>`).join('');

    if(!entries.some(entry=>entry.slot!==null)){useManual('No recent gaps are available. Enter the date and time.');return;}
    hint.textContent='Choose where to insert this watch, then adjust the date if needed.';
    const slots=[...list.querySelectorAll('[data-history-slot]')];
    slots.forEach(button=>button.onclick=()=>{
     if(!connected())return;
     slots.forEach(control=>{const selected=control===button;control.disabled=selected;control.setAttribute('aria-pressed',String(selected));control.innerHTML=uiIcon(selected?'track-slot-selected':'track-slot-add');});
     input.disabled=false;
     selectedSlot=entries[Number(button.dataset.historySlot)].slot;
     input.value=formatTrackLocalTime(selectedSlot);
     validate();
     input.focus({preventScroll:true});
    });
   }catch{if(stillOpen())useManual(connected()?'Recent history is unavailable. Enter the date and time.':notice());}
  })();
 }
 drawer.querySelector('[data-track-close]').onclick=leaveStep;
 drawer.addEventListener('cancel',event=>{event.preventDefault();leaveStep();});
 drawer.addEventListener('click',event=>{
  if(event.target!==drawer)return;
  const {left,right,top,bottom}=drawer.getBoundingClientRect();
  if(event.clientX<left||event.clientX>right||event.clientY<top||event.clientY>bottom)leaveStep();
 });
 drawer.addEventListener('close',()=>{viewRevision++;drawer.remove();if(trigger?.isConnected)trigger.focus({preventScroll:true});},{once:true});
 document.body.append(drawer);
 showChoices();
 drawer.showModal();
}
function openItem(x){if(!x)return;
 activeTitleMenu?.close();
 document.querySelector('.modal-back #close')?.click();state.modal=x;
 const back=document.createElement('div');back.className='modal-back detail-overlay';
 const kind=mediaKind(),year=x.release_date?.slice(0,4)||x.first_air_date?.slice(0,4)||x.startDate?.year||x.year||'';
 const image=pic(x),score=Number(x.vote_average)||0,animeScore=Number(x.averageScore)||0;
 const mediaLabel=kind==='movie'?'Movie':kind==='tv'?'TV show':'Anime';
 const status=x.status&&kind==='anime'?animeEntryStatus(x):'';
 back.innerHTML=`<article class="modal detail-modal detail-screen" role="dialog" aria-modal="true" aria-label="${esc(title(x))}" tabindex="-1">
 <header class="detail-topbar"><button class="close" id="close" aria-label="Back to ${esc(state.section)}">${uiIcon('chevron-right')}<span>Back</span></button><span class="detail-topbar-title">${esc(title(x))}</span><div class="detail-topbar-tools"><span class="detail-topbar-category">${esc(mediaLabel)}</span><button type="button" class="detail-share" id="detail-share" aria-label="Share ${esc(title(x))}" title="Share this title"><svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 15V3m0 0L8 7m4-4 4 4"/><path d="M5 11H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2h-1"/></svg></button></div></header>
 <div class="detail-hero" style="--detail-image:url('${esc(backdrop(x))}')"><div class="detail-hero-inner">
 <div class="detail-poster-frame">${image?`<img class="detail-poster" src="${esc(image)}" alt="${esc(title(x))} poster">`:`<div class="detail-poster detail-poster-empty">${uiIcon('film')}</div>`}</div>
 <div class="detail-head"><span class="eyebrow detail-type-label">${kind==='anime'?'ANILIST · ANIME':esc(mediaLabel)}</span><h2>${esc(title(x))}</h2><p id="detail-byline" class="detail-byline"></p>
 <div class="detail-metrics"><span>${esc(year)}</span><span id="detail-runtime">${x.runtime?esc(x.runtime)+' min':x.episodes?esc(x.episodes)+' episodes':''}</span><span id="detail-certification"></span><span id="detail-genres">${esc((x.genres||[]).slice(0,2).map(z=>typeof z==='string'?z:z.name).filter(Boolean).join(' · '))}</span></div>
 <div class="detail-ratings" aria-label="Ratings">${score?`<span class="detail-rating">${uiIcon('star')} <b>${score.toFixed(1)}</b><small>TMDB</small></span>`:''}${animeScore?`<span class="detail-rating">${uiIcon('star')} <b>${animeScore}%</b><small>AniList</small></span>`:''}${!score&&!animeScore?'<span class="muted">No rating yet</span>':''}${status?`<span class="detail-status">${esc(status)}</span>`:''}</div>
 <div class="detail-actions" role="group" aria-label="Tracking and title actions"><button type="button" class="action secondary" id="watched" aria-label="Mark watched" title="Mark watched">${uiIcon('check')} <span>Mark Watched</span></button><button type="button" class="action" id="watchlist" aria-label="Add to Watchlist" title="Add to Watchlist">${uiIcon('bookmark')} <span>Add to Watchlist</span></button><a id="detail-header-trailer" class="detail-icon-action" href="#detail-overview" aria-label="Watch trailer, if available" hidden>${uiIcon('circle-play')}</a><button type="button" class="detail-icon-action" id="detail-options" aria-expanded="false" aria-controls="detail-secondary-actions" aria-label="More title actions" title="More title actions">${uiIcon('dot-menu')}</button></div>
 </div></div></div>
 <div class="title-popover" id="detail-secondary-actions" role="group" aria-label="More title actions" aria-hidden="true" hidden inert><button type="button" id="more">${uiIcon('star')} More like this</button><button type="button" id="not">${uiIcon('xmark')} Not interested</button></div>
 <div class="detail-main"><nav class="detail-tabs" role="tablist" aria-label="Title details">${detailTab('overview','Overview')}${state.section==='Movies'?'':detailTab('episodes',state.section==='Anime'?'Episodes':'Seasons & episodes')}${detailTab('cast',state.section==='Anime'?'Characters & staff':'Cast & crew')}${detailTab('related',state.section==='Anime'?'Franchise & related':'Related')}</nav>
 <div id="detail-content" class="detail-content" aria-live="polite"></div></div></article>`;
 const previouslyFocused=document.activeElement;document.body.append(back);document.body.classList.add('detail-open');
 const menuButton=back.querySelector('#detail-options'),extraActions=back.querySelector('#detail-secondary-actions');
 menuButton.onclick=()=>openTitleMenu(menuButton,extraActions);
 back.querySelector('#detail-share').onclick=async()=>{
  const id=kind==='anime'?Number(x.id):mediaId(x);
  const link=kind==='anime'&&id?`https://anilist.co/anime/${id}`:kind!=='anime'&&id?`https://www.themoviedb.org/${kind==='tv'?'tv':'movie'}/${id}`:window.location.href;
  try{
   if(navigator.share)await navigator.share({title:title(x),url:link});
   else if(navigator.clipboard?.writeText){await navigator.clipboard.writeText(link);toast('Title link copied')}
   else toast('Sharing is not available in this browser');
  }catch(error){if(error?.name!=='AbortError')toast('Could not share this title')}
 };
 const dismiss=()=>{if(!back.isConnected)return;if(activeTitleMenu&&back.contains(activeTitleMenu.trigger))activeTitleMenu.close();back.remove();if(state.modal===x)state.modal=null;document.body.classList.remove('detail-open');if(previouslyFocused?.isConnected)previouslyFocused.focus()};back.onclick=e=>{if(e.target===back)dismiss()};back.querySelector('#close').onclick=dismiss;back.querySelector('#close').focus();back.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();e.stopPropagation();dismiss();return}if(e.key==='Tab'){const focusable=[...back.querySelectorAll('button:not([disabled]),a[href],select,input')].filter(el=>el.getClientRects().length);if(!focusable.length)return;const first=focusable[0],last=focusable[focusable.length-1];if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus()}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus()}}});
 let detailRequest=0;
 const showTab=async (tab,wasSelected=false)=>{
  const request=++detailRequest;
  back.querySelectorAll('[data-detail-tab]').forEach(b=>{const selected=b.dataset.detailTab===tab;b.classList.toggle('active',selected);b.setAttribute('aria-selected',String(selected));b.tabIndex=selected?0:-1});
  const viewport=back.querySelector('.detail-screen'),tabsBar=back.querySelector('.detail-tabs');
  if(wasSelected){
   const y=viewport.scrollTop+(tabsBar.getBoundingClientRect().top-viewport.getBoundingClientRect().top)-back.querySelector('.detail-topbar').offsetHeight-8;
   viewport.scrollTo({top:Math.max(0,y),behavior:'instant'});
   const activeTab=tabsBar.querySelector('.active');activeTab?.scrollIntoView({inline:'nearest',block:'nearest'});
  }
  const box=back.querySelector('#detail-content');box.innerHTML='<div class="detail-loading">Loading details…</div>';
  const staged=tab==='episodes'&&state.section==='Anime'?box:document.createElement('div');
  try{await renderDetailTab(x,tab,staged,back);if(request===detailRequest&&back.isConnected){if(staged!==box)box.replaceChildren(...staged.childNodes);wireDetailSections(box);requestAnimationFrame(()=>enhanceHorizontalRails(box))}}
  catch(e){if(request===detailRequest&&back.isConnected)box.innerHTML=`<div class="detail-error">${esc(e.message)}</div>`}
 };
 back.querySelectorAll('[data-detail-tab]').forEach(b=>b.onclick=()=>showTab(b.dataset.detailTab,true));
 // WAI-ARIA tab navigation: arrow keys move between available tabs; Home/End jump to boundaries.
 back.querySelector('.detail-tabs').addEventListener('keydown',e=>{
  if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;
  const tabs=[...back.querySelectorAll('[data-detail-tab]')];
  const current=tabs.indexOf(document.activeElement);
  if(current<0)return;
  e.preventDefault();
  const next=e.key==='Home'?0:e.key==='End'?tabs.length-1:(current+(e.key==='ArrowRight'?1:-1)+tabs.length)%tabs.length;
  tabs[next].focus();tabs[next].click();
 });
 const watchlistButton=back.querySelector('#watchlist'),watchedButton=back.querySelector('#watched');
 let watchlistPending=false;
 watchlistButton.disabled=true;
 watchedButton.disabled=true;
 const trackingTarget=()=>traktTrackTarget(x,kind==='movie'?'Movies':'TV Shows');
 const updateButtons=async()=>{
  const tracking=await getItemTracking(x);
  if(!back.isConnected)return;
  const isAnime=kind==='anime';
  const canTrack=tracking.available&&(isAnime?!tracking.watched:Boolean(state.trakt&&trackingTarget()));
  watchlistButton.disabled=!tracking.available||watchlistPending;
  const watchlistLabel=tracking.watchlist?'Remove from Watchlist':'Add to Watchlist';
  watchlistButton.querySelector('span').textContent=watchlistLabel;
  watchlistButton.dataset.inWatchlist=String(tracking.watchlist);
  watchlistButton.querySelector('use').setAttribute('href',`/assets/trakt-icons.svg#${tracking.watchlist?'bookmark-filled':'bookmark'}`);
  watchlistButton.setAttribute('aria-label',watchlistLabel);
  watchlistButton.title=tracking.available?watchlistLabel:tracking.error||'Connect your account to manage the Watchlist';
  watchedButton.disabled=!canTrack;
  const watched=tracking.watched?'Watched':'Mark Watched';
  const trackLabel=tracking.watched&&!isAnime?'Track another watch':watched;
  watchedButton.querySelector('span').textContent=watched;
  watchedButton.querySelector('use').setAttribute('href',`/assets/trakt-icons.svg#${tracking.watched?'circle-check':'check'}`);
  watchedButton.setAttribute('aria-label',trackLabel);
  watchedButton.title=tracking.available?trackLabel:tracking.error||'Connect your account to manage watch tracking';
 };
 watchlistButton.onclick=async()=>{
  if(watchlistButton.disabled||watchlistPending)return;
  watchlistPending=true;
  watchlistButton.disabled=true;
  try{await changeStatus(x,watchlistButton.dataset.inWatchlist==='true'?'remove-watchlist':'watchlist');}
  finally{
   watchlistPending=false;
   if(back.isConnected)await updateButtons();
  }
 };
 watchedButton.onclick=async()=>{
  if(kind!=='anime'){openTraktTrackDrawer(trackingTarget(),watchedButton,updateButtons);return;}
  const ok=await changeStatus(x,'watched');
  if(back.isConnected){
   await updateButtons();
   if(ok)back.querySelectorAll('.anime-tracker').forEach(tracker=>syncAnimeTrackingDetails(tracker.parentElement,x));
  }
 };
 back.querySelector('#more').onclick=()=>{saveRecommendationFeedback(x,'more');activeTitleMenu?.close(true);toast('Preference saved')};
 back.querySelector('#not').onclick=()=>{saveRecommendationFeedback(x,'not');dismiss();void load()};
 showTab('overview');updateButtons();
}
const trackingCache={movies:null,shows:null};
let trackingCacheToken=state.trakt;
function clearTrackingCache(){trackingCache.movies=null;trackingCache.shows=null;trackingCacheToken=state.trakt;clearShowProgressCache();}
async function getItemTracking(x){
 if(state.section==='Anime')return {watchlist:x.status==='PLANNING',watched:x.status==='COMPLETED',available:!!state.anilist};
 if(trackingCacheToken!==state.trakt)clearTrackingCache();
 if(!state.trakt)return {watchlist:false,watched:false,available:false};
 const kind=state.section==='Movies'?'movies':'shows',ids=x.ids||{};
 const tmdbId=Number(ids.tmdb||x.tmdb_id||((ids.trakt||x.trakt_id)?0:x.id));
 const traktId=Number(ids.trakt||x.trakt_id);
 if(!(tmdbId>0||traktId>0))return {watchlist:false,watched:false,available:false,error:'Trakt or TMDB identity unavailable for this title.'};
 const revision=traktAccountRevision;
 try{
  if(!trackingCache[kind]){
   const w=await traktPagedRead('/sync/watchlist/'+kind);
   const watched=await traktPagedRead('/sync/watched/'+kind);
   if(revision!==traktAccountRevision)throw Error('Trakt account changed');
   trackingCache[kind]={watchlist:w,watched};
  }
  const cache=trackingCache[kind];
  const find=rows=>rows.find(entry=>{
   const entity=entry[kind==='movies'?'movie':'show']||entry,identity=entity?.ids||{};
   return (tmdbId>0&&Number(identity.tmdb)===tmdbId)||(traktId>0&&Number(identity.trakt)===traktId);
  });
  const watchlist=!!find(cache.watchlist);
  if(kind==='movies')return {watchlist,watched:!!find(cache.watched),available:true};
  const watchedEntry=find(cache.watched);
  const showTraktId=traktId||Number(watchedEntry?.show?.ids?.trakt);
  const complete=showTraktId>0?classifyTraktShowProgress(await traktShowProgress(showTraktId)).status==='Completed':false;
  if(revision!==traktAccountRevision)throw Error('Trakt account changed');
  return {watchlist,watched:complete,available:true};
 }catch(e){console.warn('Tracking status unavailable',e);return {watchlist:false,watched:false,available:false,error:'Tracking status could not be verified. Please retry.'}}
}
// AniList detail metadata is fetched by AniList media ID only. Trakt/TMDB IDs
// are never passed to this provider, and no parallel anime-list store is used.
const animeDetailCache=new Map();
async function fetchAnimeDetails(id){
 const numeric=Number(id);
 if(!Number.isSafeInteger(numeric)||numeric<1)throw Error('Invalid AniList title identifier');
 const key=anilistAccountRevision+':'+numeric;
 const cached=animeDetailCache.get(key);
 if(cached?.until>Date.now())return cached.promise;
 const query=`query($id:Int!){Media(id:$id,type:ANIME){${animeMediaFields}
  source synonyms trailer{id site} studios(isMain:true){nodes{name}}
  characters(perPage:18){edges{role node{id name{full} image{large}}}}
  staff(perPage:18){edges{role node{id name{full} image{large}}}}
  relations{edges{relationType node{id type title{english romaji native} coverImage{large} bannerImage episodes format startDate{year}}}}
  recommendations(sort:RATING_DESC,perPage:12){nodes{mediaRecommendation{id type title{english romaji native} coverImage{large} bannerImage episodes format startDate{year}}}}}}`;
 const promise=ani(query,{id:numeric}).then(result=>{
  if(!result?.Media||Number(result.Media.id)!==numeric)throw Error('AniList did not return this title');
  return result.Media;
 });
 animeDetailCache.set(key,{until:Date.now()+5*60*1000,promise});
 promise.catch(()=>{if(animeDetailCache.get(key)?.promise===promise)animeDetailCache.delete(key)});
 if(animeDetailCache.size>50)animeDetailCache.delete(animeDetailCache.keys().next().value);
 return promise;
}
function animeRelatedMedia(m){return normaliseAnimeMedia(m)}
function animeRailCard(z,relation=''){
 const m=animeRelatedMedia(z);
 return `<button type="button" class="detail-related-card" data-anime-open="${esc(m.id)}">${pic(m)?`<img src="${esc(pic(m))}" loading="lazy" alt="">`:`<div class="detail-related-placeholder">${uiIcon('film')}</div>`}<strong>${esc(title(m))}</strong><small>${esc(relation.replaceAll('_',' ').toLowerCase())}${relation?' · ':''}${esc(m.startDate?.year||m.format||'')}</small></button>`;
}
function animeCreditCard(node,role=''){
 return `<div class="detail-person anime-credit">${node?.image?.large?`<img src="${esc(node.image.large)}" loading="lazy" alt="">`:`<div class="detail-person-placeholder">${uiIcon('person')}</div>`}<strong>${esc(node?.name?.full||'Unknown')}</strong><small>${esc(String(role).replaceAll('_',' ').toLowerCase())}</small></div>`;
}
async function renderAniListDetailTab(x,tab,box,back){
 let d=x,metadataError='';
 try{d={...x,...await fetchAnimeDetails(x.id)}}catch(e){metadataError=e.message}
 if(!back.isConnected)return;
 const media=normaliseAnimeMedia(d);
 const genres=(media.genres||[]).filter(Boolean);
 const characters=(d.characters?.edges||[]).filter(c=>c?.node);
 const staff=(d.staff?.edges||[]).filter(c=>c?.node);
 const studios=(d.studios?.nodes||[]).filter(n=>n?.name).map(n=>n.name);
 const relations=(d.relations?.edges||[]).filter(e=>e?.node?.id&&e.node.type==='ANIME');
 const recommendations=(d.recommendations?.nodes||[]).map(n=>n?.mediaRecommendation).filter(n=>n?.id&&n.type==='ANIME'&&n.id!==Number(x.id));
 const relSeen=new Set(relations.map(e=>e.node.id));
 const related=[...relations.map(e=>({node:e.node,label:e.relationType||'Related'})),...recommendations.filter(r=>!relSeen.has(r.id)).map(r=>({node:r,label:'Recommended'}))];
 const studioByline=studios.length?'Studio: '+studios.slice(0,2).join(', '):'';
 const header=back.querySelector('.detail-head');
 if(header){
  header.querySelector('#detail-byline').textContent=studioByline;
  const format=header.querySelector('#detail-certification');if(format)format.textContent=animeFormats[d.format]||d.format||'';
  const time=header.querySelector('#detail-runtime');if(time)time.textContent=(d.episodes?d.episodes+' episodes':'Episodes TBA')+(d.duration?' · '+d.duration+' min':'');
  const genre=header.querySelector('#detail-genres');if(genre)genre.textContent=genres.slice(0,3).join(' · ');
  const trailer=header.querySelector('#detail-header-trailer');
  if(trailer&&d.trailer?.site==='youtube'&&/^[A-Za-z0-9_-]{11}$/.test(d.trailer.id||'')){trailer.hidden=false;trailer.href='https://www.youtube.com/watch?v='+encodeURIComponent(d.trailer.id);trailer.target='_blank';trailer.rel='noopener noreferrer';}
 }
 const hero=back.querySelector('.detail-hero'),poster=back.querySelector('.detail-poster-frame');
 if(hero&&d.bannerImage)hero.style.setProperty('--detail-image',`url("${String(d.bannerImage).replace(/["'\\]/g,'')}")`);
 if(poster&&pic(media)&&!poster.querySelector('img'))poster.innerHTML=`<img class="detail-poster" src="${esc(pic(media))}" alt="${esc(title(media))} poster">`;
 const statusLabel=animeReleaseStatuses[d.releaseStatus]||d.releaseStatus||'Unknown';
 const seasonLabel=(animeSeasons[d.season]||'')+(d.seasonYear?' '+d.seasonYear:'');
 const nextAiring=d.nextAiringEpisode?.airingAt?new Date(Number(d.nextAiringEpisode.airingAt)*1000).toLocaleString('en-GB',{dateStyle:'medium',timeStyle:'short'}):'';
 const facts=[['Format',animeFormats[d.format]||d.format],['Episodes',d.episodes||'Unknown'],['Duration',d.duration?d.duration+' min / episode':''],['Season',seasonLabel],['Release status',statusLabel],['Studios',studios.join(', ')],['Source',d.source?.replaceAll('_',' ').toLowerCase()],['Popularity',Number(d.popularity)>0?Number(d.popularity).toLocaleString('en-GB'):''],['Next episode',nextAiring?(d.nextAiringEpisode.episode+' · '+nextAiring):'']].filter(x=>x[1]);
 const synopsisText=synopsis(d);
 const tags=(d.tags||[]).filter(t=>t?.name&&Number(t.rank)>=65&&!t.isMediaSpoiler).slice(0,14).map(t=>t.name);
 const fallback=metadataError?`<p class="muted anime-metadata-warning" role="status">Additional AniList metadata unavailable; showing known title information. ${esc(metadataError)}</p>`:'';
 const showRelations=related.length?`<section class="detail-section"><div class="detail-section-heading"><h3>Franchise & related</h3><button type="button" class="detail-view-all" data-jump="related">View all ${uiIcon('chevron-right')}</button></div><div class="detail-related-rail">${related.slice(0,16).map(r=>animeRailCard(r.node,r.label)).join('')}</div></section>`:'';
 const showCharacters=characters.length?`<section class="detail-section"><div class="detail-section-heading"><h3>Characters</h3><button type="button" class="detail-view-all" data-jump="cast">View characters & staff ${uiIcon('chevron-right')}</button></div><div class="detail-people-rail">${characters.slice(0,12).map(c=>animeCreditCard(c.node,c.role)).join('')}</div></section>`:'';
 const showStaff=staff.length?`<section class="detail-section detail-staff-section"><div class="detail-section-heading"><h3>Staff</h3><button type="button" class="detail-view-all" data-jump="cast">View all ${uiIcon('chevron-right')}</button></div><div class="detail-people-rail">${staff.slice(0,12).map(c=>animeCreditCard(c.node,c.role)).join('')}</div></section>`:'';
 if(tab==='overview'){
  box.innerHTML=`<div class="detail-overview anime-detail-overview" id="detail-overview"><div class="detail-overview-primary">
   ${fallback}<section class="detail-section detail-story"><div class="detail-section-heading"><h3>Overview</h3></div><p class="detail-synopsis" id="detail-synopsis">${esc(synopsisText)}</p><div class="detail-tags">${[...genres,...tags].slice(0,20).map(t=>`<span>${esc(t)}</span>`).join('')}</div></section>
   <section class="detail-section detail-anime-section"><div class="detail-section-heading"><h3>Episode progress</h3><button type="button" class="detail-view-all" data-jump="episodes">Track episodes ${uiIcon('chevron-right')}</button></div><div class="detail-inline-anime"></div></section>
   ${showCharacters}${showStaff}${showRelations}
  </div><aside class="detail-side anime-facts"><h3>Anime information</h3><dl class="detail-fact-list">${facts.map(([k,v])=>`<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join('')}</dl><a href="https://anilist.co/anime/${Number(x.id)}" target="_blank" rel="noopener noreferrer">View on AniList</a></aside></div>`;
  renderAnimeTracking(x,box.querySelector('.detail-inline-anime'),back);
 }else if(tab==='episodes'){
  box.innerHTML=`<div class="anime-tracking-page"><p class="muted anime-tracking-source">Your progress and list status are stored on AniList. Episode-by-episode metadata is not supplied by this AniList endpoint.</p><div id="anime-tracker-content"></div></div>`;
  renderAnimeTracking(x,box.querySelector('#anime-tracker-content'),back);
 }else if(tab==='cast'){
  box.innerHTML=`${fallback}${characters.length?`<h3>Characters</h3><div class="anime-credits-grid">${characters.map(c=>animeCreditCard(c.node,c.role)).join('')}</div>`:''}${staff.length?`<h3>Staff</h3><div class="anime-credits-grid">${staff.map(c=>animeCreditCard(c.node,c.role)).join('')}</div>`:''}${!characters.length&&!staff.length?'<p class="muted">Characters and staff are unavailable for this title.</p>':''}`;
 }else if(tab==='related'){
  box.innerHTML=`${fallback}${related.length?`<div class="anime-related-groups"><h3>Franchise & recommendations</h3><div class="anime-related-grid">${related.map(r=>animeRailCard(r.node,r.label)).join('')}</div></div>`:'<p class="muted">No related anime are available for this title.</p>'}`;
 }
 box.querySelectorAll('[data-anime-open]').forEach(button=>button.onclick=()=>{
  const id=Number(button.dataset.animeOpen),match=related.find(r=>r.node.id===id);
  if(match)openItem(animeRelatedMedia(match.node));
 });
 box.querySelectorAll('[data-jump]').forEach(button=>button.onclick=()=>back.querySelector('[data-detail-tab="'+button.dataset.jump+'"]')?.click());
}

async function renderDetailTab(x,tab,box,back){const kind=mediaKind();if(kind==='anime')return renderAniListDetailTab(x,tab,box,back);let id=mediaId(x);
 if(kind!=='anime'&&!id){try{id=await resolveTmdbIdentity(x,kind)}catch{}}
 if(tab==='overview'){
 let d=x;if(kind!=='anime'&&id){try{d=await tmdb('/'+kind+'/'+id,{append_to_response:kind==='movie'?'credits,videos,external_ids,release_dates':'credits,videos,external_ids,content_ratings'})}catch(e){console.info('Full metadata unavailable; using cached summary:',e.message)}}
 // Detail responses can restore hero art when the original Trakt listing had none.
 if(back.isConnected){
  const hero=back.querySelector('.detail-hero'),poster=back.querySelector('.detail-poster-frame');
  if(hero&&d.backdrop_path)hero.style.setProperty('--detail-image',`url("${backdrop(d)}")`);
  const existingPoster=poster?.querySelector('img.detail-poster');
  if(poster&&d.poster_path&&(!existingPoster||existingPoster.getAttribute('src')!==pic(d)))
   poster.innerHTML=`<img class="detail-poster" src="${esc(pic(d))}" alt="${esc(title(x))} poster">`;
  const ratings=back.querySelector('.detail-ratings'),ratingEl=ratings?.querySelector('.detail-rating b');
  if(Number(d.vote_average)>0){
   if(ratingEl)ratingEl.textContent=Number(d.vote_average).toFixed(1);
   else if(ratings){ratings.querySelector('.muted')?.remove();ratings.insertAdjacentHTML('afterbegin',`<span class="detail-rating">${uiIcon('star')} <b>${Number(d.vote_average).toFixed(1)}</b><small>TMDB</small></span>`)}
  }
 }
 const tags=(d.genres||x.genres||[]).map(z=>typeof z==='string'?z:z.name).filter(Boolean);
 const credits=d.credits||{};
 const directors=(credits.crew||[]).filter(z=>z.job==='Director').slice(0,3);
 const creators=(d.created_by||[]).slice(0,3);
 const keyPeople=kind==='movie'?directors:creators;
 const videos=(d.videos?.results||[]).filter(z=>z.site==='YouTube'&&/^[A-Za-z0-9_-]{11}$/.test(z.key));
 const trailer=videos.find(z=>z.type==='Trailer'&&z.official)||videos.find(z=>z.type==='Trailer')||videos[0];
 const productionCompanies=(d.production_companies||[]).slice(0,4).map(z=>z.name).filter(Boolean);
 const [relatedItems,watchProviders]=kind!=='anime'&&id?await Promise.all([tmdbRelated(kind,id),tmdbWatchProviders(kind,id)]):[[],[]];
 const head=back.querySelector('.detail-head');if(head){
  const byline=head.querySelector('#detail-byline');if(byline)byline.textContent=keyPeople.length?(kind==='movie'?'Directed by ':'Created by ')+keyPeople.map(z=>z.name).join(', '):'';
  const trailerLink=head.querySelector('#detail-header-trailer');if(trailerLink&&trailer){trailerLink.href='https://www.youtube.com/watch?v='+encodeURIComponent(trailer.key);trailerLink.target='_blank';trailerLink.rel='noopener noreferrer';trailerLink.hidden=false}
  const genreEl=head.querySelector('#detail-genres');if(genreEl&&tags.length)genreEl.textContent=tags.slice(0,3).join(' · ');
 }
 const date=d.release_date||d.first_air_date||x.release_date||x.first_air_date||'';
 const rating=Number(d.vote_average||x.vote_average||0);
 const runtime=d.runtime||(d.episode_run_time||[])[0];
 const runEl=back.querySelector('#detail-runtime');if(runEl&&runtime)runEl.textContent=Number(runtime)+' min';
 const certification=kind==='movie'?(d.release_dates?.results||[]).flatMap(z=>z.iso_3166_1==='GB'?z.release_dates||[]:[]).find(z=>z.certification)?.certification:
  (d.content_ratings?.results||[]).find(z=>z.iso_3166_1==='GB')?.rating;
 const age=back.querySelector('#detail-certification');if(age&&certification)age.textContent=certification;

 const description=synopsis(d.overview?d:x);
 const showSummary=kind==='tv'?(d.number_of_seasons||d.number_of_episodes?`<div class="detail-series-summary"><strong>Series guide</strong><span>${d.number_of_seasons?d.number_of_seasons+' seasons':''}${d.number_of_seasons&&d.number_of_episodes?' · ':''}${d.number_of_episodes?d.number_of_episodes+' episodes':''}</span><span>Open Seasons & episodes to track individual episodes.</span></div>`:''):'';
 const cast=credits.cast||[];
 const personCard=z=>`<div class="detail-person">${z.profile_path?`<img loading="lazy" src="https://image.tmdb.org/t/p/w185${esc(z.profile_path)}" alt="">`:`<div class="detail-person-placeholder">${uiIcon('person')}</div>`}<strong>${esc(z.name)}</strong><small>${esc(z.character||'')}</small></div>`;
 const relatedCard=z=>`<button class="detail-related-card" type="button" data-related-id="${esc(z.id)}">${pic(z)?`<img loading="lazy" src="${esc(pic(z))}" alt="">`:`<div class="detail-related-placeholder">${uiIcon('film')}</div>`}<strong>${esc(title(z))}</strong><small>${esc((z.release_date||z.first_air_date||'').slice(0,4))}</small></button>`;
 box.innerHTML=`<div class="detail-overview" id="detail-overview"><div class="detail-overview-primary">
  <section class="detail-story detail-section"><div class="detail-section-heading"><h3>Overview</h3>${trailer?`<a class="detail-trailer" href="https://www.youtube.com/watch?v=${esc(trailer.key)}" target="_blank" rel="noopener noreferrer">${uiIcon('circle-play')} Trailer</a>`:''}</div><p class="detail-synopsis" id="detail-synopsis">${esc(description||'No synopsis is available for this title yet.')}</p>${description.length>440?'<button class="chip detail-readmore" type="button" aria-expanded="false">Read full synopsis</button>':''}<div class="detail-tags">${tags.map(z=>`<span>${esc(z)}</span>`).join('')}</div></section>
  ${watchProviders.length?`<section class="detail-section detail-streaming-section"><div class="detail-section-heading"><h3>Where to watch <small>· United Kingdom</small></h3></div><div class="detail-provider-rail">${watchProviders.map(z=>`<div class="detail-provider-card">${z.logo?`<img loading="lazy" src="https://image.tmdb.org/t/p/w92${esc(z.logo)}" alt="">`:''}<strong>${esc(z.name)}</strong><small>${esc(z.method)}</small></div>`).join('')}</div><p class="muted detail-provider-attribution">Streaming availability: <a href="https://www.justwatch.com/uk" target="_blank" rel="noopener noreferrer">JustWatch</a> via TMDB · Offers may change${watchProviders.link?` · <a href="${esc(watchProviders.link)}" target="_blank" rel="noopener noreferrer">View availability</a>`:''}</p></section>`:''}
  ${kind==='tv'?`<section class="detail-section detail-episodes-section"><div class="detail-section-heading"><h3>Seasons & episodes</h3><button type="button" class="detail-view-all" data-jump="episodes">Full episode guide ${uiIcon('chevron-right')}</button></div><div class="detail-inline-episodes"></div></section>`:''}
  ${kind==='anime'?`<section class="detail-section detail-anime-section"><div class="detail-section-heading"><h3>Anime progress</h3></div><div class="detail-inline-anime"></div></section>`:''}
  ${cast.length?`<section class="detail-section detail-cast-section"><div class="detail-section-heading"><h3>Actors</h3><button type="button" class="detail-view-all" data-jump="cast">View all ${uiIcon('chevron-right')}</button></div><div class="detail-people-rail">${cast.slice(0,14).map(personCard).join('')}</div></section>`:''}
  <section class="detail-section detail-reviews-section"><div class="detail-section-heading"><h3>Reviews</h3><small class="detail-review-source">Trakt community · spoiler-free</small></div><div class="detail-reviews-rail" aria-live="polite"><p class="muted">${state.trakt?'Loading reviews…':'Connect Trakt to read community reviews.'}</p></div></section>
  ${videos.length?`<section class="detail-section detail-extras-section"><div class="detail-section-heading"><h3>Extras</h3></div><div class="detail-extras-rail">${videos.slice(0,8).map(v=>`<a class="detail-extra-card" target="_blank" rel="noopener noreferrer" href="https://www.youtube.com/watch?v=${encodeURIComponent(v.key)}"><span class="detail-extra-art">${uiIcon('circle-play')}</span><strong>${esc(v.name||v.type||'Video')}</strong><small>${esc(v.type||'Video')}</small></a>`).join('')}</div></section>`:''}
  ${relatedItems.length?`<section class="detail-section detail-related-section"><div class="detail-section-heading"><h3>Related ${kind==='movie'?'movies':'shows'}</h3><button type="button" class="detail-view-all" data-jump="related">View all ${uiIcon('chevron-right')}</button></div><div class="detail-related-rail">${relatedItems.map(relatedCard).join('')}</div></section>`:''}
  </div><aside class="detail-side"><h3>Details</h3>${d.tagline?`<p class="detail-tagline">${esc(d.tagline)}</p>`:''}<dl class="detail-fact-list"><dt>Release</dt><dd>${esc(date||'Unknown')}</dd>${runtime?`<dt>Runtime</dt><dd>${Number(runtime)} minutes</dd>`:''}${d.number_of_seasons?`<dt>Seasons</dt><dd>${d.number_of_seasons}</dd>`:''}${d.number_of_episodes?`<dt>Episodes</dt><dd>${d.number_of_episodes}</dd>`:''}${d.status?`<dt>Status</dt><dd>${esc(d.status)}</dd>`:''}${keyPeople.length?`<dt>${kind==='movie'?'Director':'Created by'}</dt><dd>${esc(keyPeople.map(z=>z.name).join(', '))}</dd>`:''}${d.original_language?`<dt>Original language</dt><dd>${esc(d.original_language.toUpperCase())}</dd>`:''}${productionCompanies.length?`<dt>Production</dt><dd>${esc(productionCompanies.join(', '))}</dd>`:''}${rating?`<dt>TMDB rating</dt><dd>${rating.toFixed(1)} / 10</dd>`:''}</dl>${/^https:\/\/[^\s]+$/.test(d.homepage||'')?`<a href="${esc(d.homepage)}" target="_blank" rel="noopener noreferrer">Official website</a>`:''}</aside></div>`;
 if(state.trakt&&Number(x.ids?.trakt||x.trakt_id)>0){void loadTraktDetailReviews(kind,Number(x.ids?.trakt||x.trakt_id),box.querySelector('.detail-reviews-rail'))}
 box.querySelectorAll('[data-related-id]').forEach(b=>b.onclick=()=>{const z=relatedItems.find(z=>String(z.id)===b.dataset.relatedId);if(z)openItem({...z,_key:z.id})});
 box.querySelectorAll('[data-jump]').forEach(b=>b.onclick=()=>back.querySelector('[data-detail-tab="'+b.dataset.jump+'"]')?.click());
 if(kind==='tv'){await renderShowEpisodes(x,box.querySelector('.detail-inline-episodes'))}
 if(kind==='anime'){renderAnimeTracking(x,box.querySelector('.detail-inline-anime'),back)}
 const more=box.querySelector('.detail-readmore');if(more){more.onclick=()=>{const expanded=more.getAttribute('aria-expanded')==='true';more.setAttribute('aria-expanded',String(!expanded));more.textContent=expanded?'Read full synopsis':'Show less';box.querySelector('#detail-synopsis').classList.toggle('expanded',!expanded)}};
 }else if(tab==='episodes'){if(kind==='anime'){renderAnimeTracking(x,box,back)}else await renderShowEpisodes(x,box)}
 else if(tab==='cast'){let d=null;if(kind!=='anime'&&id){try{d=await tmdb('/'+kind+'/'+id+'/credits')}catch{try{d=await tmdb('/'+kind+'/'+id,{append_to_response:'credits'})}catch{}}}
 const people=d?.cast||d?.credits?.cast||[];
 const crew=(d?.crew||d?.credits?.crew||[]).filter(z=>['Director','Writer','Screenplay','Executive Producer','Producer'].includes(z.job));
 const selectedCrew=[...new Map(crew.map(z=>[z.id+':'+z.job,z])).values()].slice(0,18);
 const person=z=>`<div class="person">${z.profile_path?`<img loading="lazy" src="https://image.tmdb.org/t/p/w185${esc(z.profile_path)}" alt="">`:uiIcon('person')}<strong>${esc(z.name)}</strong><small>${esc(z.character||z.job||'')}</small></div>`;
 box.innerHTML=people.length||selectedCrew.length?`${people.length?`<h3>Cast</h3><div class="people-grid">${people.slice(0,24).map(person).join('')}</div>`:''}${selectedCrew.length?`<h3>Key crew</h3><div class="people-grid">${selectedCrew.map(person).join('')}</div>`:''}`:'<p class="muted">Cast and crew information is not available from the current metadata service.</p>'}
 else if(tab==='related'){const items=kind!=='anime'?await tmdbRelated(kind,id):[];box.innerHTML=items.length?`<div class="grid related-grid">${items.slice(0,12).map(z=>card({...z,_key:z.id})).join('')}</div>`:'<p class="muted">No related titles available yet.</p>';box.querySelectorAll('[data-open]').forEach(b=>b.onclick=()=>{const y=items.find(z=>String(z.id)===b.dataset.open);if(y)openItem({...y,_key:y.id})})}
}
async function renderShowEpisodes(x,box){
 const ids=x.ids||{};
 // TMDB IDs and Trakt IDs are different namespaces; never use one as the other.
 const traktId=ids.trakt||x.trakt_id||null,tmdbId=mediaId(x);
 let seasons=[],source='trakt';
 if(traktId){try{seasons=await trakt('/shows/'+encodeURIComponent(traktId)+'/seasons?extended=full')}catch(e){console.warn('Trakt seasons unavailable',e)}}
 if(!seasons.length&&tmdbId){source='tmdb';try{const d=await tmdb('/tv/'+tmdbId);seasons=d.seasons||[]}catch(e){console.warn('TMDB seasons unavailable',e)}}
 if(!seasons.length){box.innerHTML='<p class="muted">Season data is unavailable. Check your Trakt connection or TMDB metadata access.</p>';return}
 box.innerHTML=`<div class="season-head"><div><h3>Episode guide</h3><p class="muted">Episode progress is read from Trakt when a matching Trakt show ID is available.</p></div><select id="season-select" aria-label="Choose season">${seasons.filter(z=>z.number!==undefined||z.season_number!==undefined).map(z=>`<option value="${z.number??z.season_number}">${(z.number??z.season_number)===0?'Specials':'Season '+(z.number??z.season_number)} · ${z.episode_count??z.aired_episodes??'?'} episodes</option>`).join('')}</select></div><div id="episode-list"></div>`;
 const selector=box.querySelector('#season-select'),list=box.querySelector('#episode-list');
 const valid=seasons.filter(z=>(z.number??z.season_number)>0);if(valid.length)selector.value=String(valid[0].number??valid[0].season_number);
 let generation=0;
 const loadSeason=async()=>{const current=++generation,n=Number(selector.value);list.innerHTML='<div class="detail-loading">Loading episodes…</div>';
 try{
  let episodes=[];
  if(source==='trakt')episodes=await trakt('/shows/'+encodeURIComponent(traktId)+'/seasons/'+n+'?extended=full');
  else {const d=await tmdb('/tv/'+tmdbId+'/season/'+n);episodes=d.episodes||[]}
  if(current!==generation)return;
  if(!Array.isArray(episodes))throw Error('Episode data is invalid');
  // Trakt is the authority for episode IDs and watched progress; TMDB supplies artwork and summaries.
  if(source==='trakt'&&tmdbId){try{const art=await tmdb('/tv/'+tmdbId+'/season/'+n);const byNumber=new Map((art?.episodes||[]).map(e=>[Number(e.episode_number),e]));episodes=episodes.map(e=>{const more=byNumber.get(Number(e.number));return more?{...more,...e,still_path:more.still_path,overview:e.overview||more.overview,runtime:e.runtime||more.runtime}:e})}catch{}}
  if(current!==generation)return;
  let watched=new Set(),progressAvailable=false;
  if(traktId&&state.trakt){try{const progress=await trakt('/shows/'+encodeURIComponent(traktId)+'/progress/watched');progressAvailable=true;for(const season of progress.seasons||[])if(Number(season.number)===n)for(const ep of season.episodes||[])if(ep.completed)watched.add(Number(ep.number))}catch(e){console.warn('Trakt progress unavailable',e)}}
  if(current!==generation)return;
  const render=()=>{
   const count=episodes.filter(e=>watched.has(Number(e.number??e.episode_number))).length;
   const canTrack=!!state.trakt&&progressAvailable;
   list.innerHTML=`<div class="episode-summary"><strong>${progressAvailable?count+' watched · '+Math.max(0,episodes.length-count)+' remaining':'Watched progress unavailable'}</strong>${progressAvailable?`<span class="episode-completion-percent">${episodes.length?Math.round(count/episodes.length*100):0}% complete</span><div class="progress-track"><span style="width:${episodes.length?count/episodes.length*100:0}%"></span></div>`:''}</div><div class="episode-rail" role="list">${episodes.map(e=>{const en=Number(e.number??e.episode_number),isWatched=watched.has(en),dateTarget=traktEpisodeTrackTarget(x,e,n);return `<div class="episode-card" role="listitem"><div class="episode-thumb">${e.still_path?`<img loading="lazy" src="https://image.tmdb.org/t/p/w300${esc(e.still_path)}" alt="">`:uiIcon('tv')}${e.runtime?`<span class="episode-runtime">${Number(e.runtime)}m</span>`:''}</div><div class="episode-copy"><strong>${esc(e.title||e.name||'Episode '+en)}</strong><small>S${n} · E${en}${e.first_aired||e.air_date?' · '+esc((e.first_aired||e.air_date).slice(0,10)):''}</small><p>${esc(e.overview||'No episode synopsis available.')}</p></div><div class="episode-actions"><button type="button" aria-label="${isWatched?'Mark episode '+en+' unwatched':'Mark episode '+en+' watched'}" title="${isWatched?'Mark unwatched':'Mark watched'}" class="chip episode-toggle ${isWatched?'is-watched':''}" data-episode="${en}" ${!canTrack?'disabled title="Trakt episode progress unavailable"':''}>${uiIcon(isWatched?'circle-check':'check')}<span>${isWatched?'Watched':'Mark watched'}</span></button><button type="button" class="chip episode-track-date" data-episode-track="${en}" aria-label="Track episode ${en} by date" ${state.trakt&&dateTarget?'':'disabled'}>${uiIcon('dot-menu')}</button></div></div>`}).join('')}</div>`;
   requestAnimationFrame(()=>enhanceHorizontalRails(list));
   list.querySelectorAll('[data-episode-track]').forEach(button=>button.onclick=()=>{
    const number=Number(button.dataset.episodeTrack);
    const episode=episodes.find(e=>Number(e.number??e.episode_number)===number);
    openTraktTrackDrawer(traktEpisodeTrackTarget(x,episode,n),button,async()=>{
     if(!list.isConnected||current!==generation)return;
     await loadSeason();
     list.querySelector(`[data-episode-track="${number}"]`)?.focus({preventScroll:true});
    });
   });
   list.querySelectorAll('[data-episode]').forEach(button=>button.onclick=async()=>{
    const number=Number(button.dataset.episode),episode=episodes.find(e=>Number(e.number??e.episode_number)===number);
    const episodeIds=episode?.ids||{};
    const showIds={};if(traktId)showIds.trakt=Number(traktId);else if(tmdbId)showIds.tmdb=Number(tmdbId);
    const payload=episodeIds.trakt?{episodes:[{ids:{trakt:episodeIds.trakt}}]}:
      {shows:[{ids:showIds,seasons:[{number:n,episodes:[{number}]}]}]};
    const was=watched.has(number);
    // Keep the UI unchanged until a fresh Trakt progress response confirms the write.
    list.querySelectorAll('[data-episode]').forEach(b=>b.disabled=true);
    try{
     const result=await trakt(was?'/sync/history/remove':'/sync/history',{method:'POST',body:JSON.stringify(payload)});
     if((result?.not_found?.episodes?.length||0)||(result?.not_found?.shows?.length||0))throw Error('Trakt could not identify this episode');
     const confirmed=await trakt('/shows/'+encodeURIComponent(traktId)+'/progress/watched');
     const refreshed=new Set();
     for(const season of confirmed.seasons||[])if(Number(season.number)===n)
      for(const ep of season.episodes||[])if(ep.completed)refreshed.add(Number(ep.number));
     if(refreshed.has(number)===was)throw Error('Trakt did not confirm the episode change. Please retry.');
     if(current!==generation)return;
     watched=refreshed;
     trackingCache.shows=null;clearShowProgressCache();
     render();toast(was?'Episode marked unwatched':'Episode marked watched');
    }catch(err){if(current===generation){render();toast(err.message)}}
   });
  };
  render();
 }catch(e){if(current===generation)list.innerHTML=`<p class="muted">Could not load episodes: ${esc(e.message)}</p>`}
 };
 selector.onchange=loadSeason;await loadSeason();
}
function syncAnimeTrackingDetails(box,item){
 if(!box?.isConnected)return;
 const progress=Number(item.progress)||0;
 const total=Number(item.episodes)>0?Number(item.episodes):null;
 const busy=box.dataset.syncBusy==='true';
 const controls=box.querySelectorAll('#episode-minus,#episode-edit,#episode-plus,[data-anime-status]');
 controls.forEach(b=>b.disabled=busy||!state.anilist);
 const minus=box.querySelector('#episode-minus'),plus=box.querySelector('#episode-plus');
 if(minus)minus.disabled ||= progress<=0;
 if(plus)plus.disabled ||= total!==null&&progress>=total;
 const count=box.querySelector('#progress-count');
 if(count)count.textContent=progress+' / '+(total??'?');
 const track=box.querySelector('.progress-track span');
 if(track)track.style.width=(total?Math.min(100,100*progress/total):0)+'%';
 const bar=box.querySelector('.replica-anime-progress-track');
 if(bar)bar.setAttribute('aria-valuenow',String(progress));
 box.querySelectorAll('[data-anime-status]').forEach(button=>{
  const active=button.dataset.animeStatus===item.status;
  button.classList.toggle('active',active);
  button.setAttribute('aria-pressed',String(active));
 });
}
function renderAnimeTracking(x,box,back){
 const total=Number.isInteger(Number(x.episodes))&&Number(x.episodes)>0?Number(x.episodes):null;
 const progress=Math.max(0,Number(x.progress)||0);
 box.innerHTML=`<div class="anime-tracker replica-anime-tracker" aria-label="AniList episode tracking">
 <div class="replica-anime-progress-head"><div><span class="replica-anime-source">ANILIST · WATCH HISTORY</span><h3>Episode progress</h3></div><div class="replica-anime-count"><strong id="progress-count" aria-live="polite">${progress} / ${total??'?'}</strong><small>episodes watched</small></div></div>
 <div class="progress-track replica-anime-progress-track" role="progressbar" aria-label="Episodes watched" aria-valuemin="0" aria-valuenow="${progress}" ${total?'aria-valuemax="'+total+'"':''}><span style="width:${total?Math.min(100,100*progress/total):0}%"></span></div>
 <div class="replica-anime-actions" role="group" aria-label="Change episode progress"><button type="button" class="chip replica-anime-step" id="episode-minus" aria-label="Mark previous episode">${uiIcon('minus')} <span>−1</span></button><button type="button" class="action replica-anime-step replica-anime-next" id="episode-plus" aria-label="Mark next episode watched">${uiIcon('circle-check')} <span>+1 episode</span></button><button type="button" class="chip replica-anime-edit" id="episode-edit" aria-label="Set watched episode count">${uiIcon('sliders')} <span>Set progress</span></button></div>
 <div class="replica-anime-status-head"><h3>My Anime</h3><span>List status</span></div><div class="replica-anime-status" role="group" aria-label="AniList watch status">${[['CURRENT','Watching'],['PLANNING','Planning'],['COMPLETED','Completed'],['PAUSED','Paused'],['DROPPED','Dropped'],['REPEATING','Rewatching']].map(([v,l])=>`<button type="button" class="chip ${x.status===v?'active':''}" data-anime-status="${v}" aria-pressed="${x.status===v}">${l}</button>`).join('')}</div>
 <p class="muted replica-anime-sync-note" id="anime-sync-note" role="status">${state.anilist?'Changes are saved only after AniList confirms them.':'Connect AniList in Settings to edit tracking.'}</p></div>`;
 const syncControls=()=>syncAnimeTrackingDetails(box,x);
 const run=async action=>{if(box.dataset.syncBusy==='true'||!state.anilist)return;box.dataset.syncBusy='true';syncControls();try{await action()}finally{box.dataset.syncBusy='false';if(box.isConnected)syncControls()}};
 const setProgress=n=>run(()=>updateAnimeProgress(x,n,box));
 box.querySelector('#episode-plus').onclick=()=>setProgress(Number(x.progress||0)+1);
 box.querySelector('#episode-minus').onclick=()=>setProgress(Number(x.progress||0)-1);
 box.querySelector('#episode-edit').onclick=()=>{const v=prompt('Episodes watched',String(x.progress||0));if(v!==null&&/^\d+$/.test(v.trim()))setProgress(Number(v))};
 box.querySelectorAll('[data-anime-status]').forEach(b=>b.onclick=()=>run(async()=>{
  const ok=await changeStatus(x,b.dataset.animeStatus);
  if(ok&&box.isConnected)syncAnimeTrackingDetails(box,x);
 }));
 syncControls();
}
async function changeStatus(x,status){
 let animeLock=null;
 try{
  if(state.section==='Anime'){
   if(!state.anilist)throw Error('Connect AniList in Settings first');
   const mediaId=Number(x.id);
   if(!Number.isSafeInteger(mediaId)||mediaId<1)throw Error('Invalid AniList media identifier');
   const lock='anime:'+anilistAccountRevision+':'+mediaId;
   if(episodeWritesInFlight.has(lock))throw Error('An AniList update is already being saved');
   episodeWritesInFlight.add(lock);
   animeLock=lock;
   if(status==='remove-watchlist'){
    // AniList removes a planning entry by its MediaList ID, not by setting an invented status.
    const viewer=await ani('query{Viewer{id}}');
    const userId=viewer?.Viewer?.id;
    if(!userId)throw Error('Could not identify your AniList account');
    const existing=await ani('query($mediaId:Int,$userId:Int){MediaList(mediaId:$mediaId,userId:$userId){id status}}',{mediaId:Number(x.id),userId});
    const entry=existing?.MediaList;
    if(!entry?.id||entry.status!=='PLANNING')throw Error('This anime is not confirmed in your AniList planning list');
    const deleted=await ani('mutation($id:Int){DeleteMediaListEntry(id:$id){deleted}}',{id:entry.id});
    if(deleted?.DeleteMediaListEntry?.deleted!==true)throw Error('AniList did not confirm removal');
    x.status=null;
   }else{
    const requested=status==='watched'?'COMPLETED':status==='watchlist'?'PLANNING':status;
    const q=`mutation($mediaId:Int,$status:MediaListStatus){SaveMediaListEntry(mediaId:$mediaId,status:$status){id progress status repeat}}`;
    const mutation=await ani(q,{mediaId:Number(x.id),status:requested});
    if(!mutation?.SaveMediaListEntry?.id||mutation.SaveMediaListEntry.status!==requested)throw Error('AniList did not confirm the requested status');
    const saved=mutation.SaveMediaListEntry;
    Object.assign(x,reconcileAnimeProgress(x.id,saved.progress,saved.status,saved.repeat));
   }
   state.animeLibraryLoaded=false;animeLibraryPending=null;
   toast(status==='remove-watchlist'?'Removed from AniList planning list':'AniList updated');await load();return true;
  }
  if(!state.trakt)throw Error('Connect Trakt in Settings first');
  // Trakt accepts TMDB IDs directly. Never mistake a TMDB ID for a Trakt ID.
  const ids=x.ids||{};
  const tmdbId=Number(ids.tmdb||x.tmdb_id||(x.poster_path||x.backdrop_path?x.id:0));
  const traktId=Number(ids.trakt||x.trakt_id||0);
  if(!tmdbId&&!traktId)throw Error('No TMDB or Trakt identifier for this title');
  const kind=state.section==='Movies'?'movies':'shows';
  const entry={ids:tmdbId?{tmdb:tmdbId}:{trakt:traktId}};
  const path=status==='remove-watchlist'?'/sync/watchlist/remove':status==='watchlist'?'/sync/watchlist':'/sync/history';
  const result=await trakt(path,{method:'POST',body:JSON.stringify({[kind]:[entry]})});
  if(result?.not_found?.[kind]?.length)throw Error('Trakt could not match this title');
  const confirmedCount=status==='remove-watchlist'?result?.deleted?.[kind]:status==='watched'&&kind==='shows'?result?.added?.episodes:result?.added?.[kind];
  if(typeof confirmedCount!=='number'||confirmedCount<1)throw Error('Trakt did not confirm the update');
  trackingCache[kind]=null;clearShowProgressCache();toast(status==='remove-watchlist'?'Removed from Trakt watchlist':status==='watchlist'?'Added to Trakt watchlist':'Marked watched on Trakt');
  await load();return true;
 }catch(e){toast(e.message);return false}
 finally{if(animeLock!==null)episodeWritesInFlight.delete(animeLock)}
}
// mokumokuren_rc2_enrichment
// Step 6: keep TMDB identities alongside their artwork. Trakt IDs are never
// interchangeable with TMDB IDs; title search requires a defensible match.
const metadataCacheKey='mokumokuren_tmdb_metadata_v3';
let metadataCache=read(metadataCacheKey,{});
let enrichmentFailures=[];
function tmdbYear(item){
 const year=Number(item.year||item.release_date?.slice(0,4)||item.first_air_date?.slice(0,4)||0);
 return Number.isInteger(year)&&year>=1870&&year<=2200?year:0;
}
function tmdbSearchMatch(item,results,kind){
 const name=String(title(item)).trim().toLocaleLowerCase('en-US');
 if(!name)return null;
 const year=tmdbYear(item);
 const exact=(Array.isArray(results)?results:[]).filter(candidate=>{
  if(candidate.media_type&&candidate.media_type!==kind)return false;
  const candidateName=String(candidate.title||candidate.name||'').trim().toLocaleLowerCase('en-US');
  if(candidateName!==name)return false;
  const candidateYear=tmdbYear(candidate);
  // Never silently match a different adaptation or remake in another year.
  return !year||!!candidateYear&&Math.abs(candidateYear-year)<=1;
 });
 // Without a year, only an unambiguous exact-title match is safe to enrich.
 if(!year&&exact.length!==1)return null;
 return exact.find(z=>z.poster_path)||exact[0]||null;
}
const tmdbIdentity=x=>Number(x.tmdb_id||x.ids?.tmdb||0);
async function resolveTmdbIdentity(item,kind){
 const known=tmdbIdentity(item);
 if(Number.isSafeInteger(known)&&known>0)return known;
 const name=title(item);
 if(!name||name==='Untitled')return 0;
 const found=await tmdb('/search/multi',{query:name});
 const match=tmdbSearchMatch(item,found?.results,kind);
 const id=Number(match?.id);
 if(!Number.isSafeInteger(id)||id<1)return 0;
 item.tmdb_id=id;
 // Search is usable metadata even if a legacy deployment rejects detail routes.
 if(match.poster_path&&!item.poster_path)item.poster_path=match.poster_path;
 if(match.backdrop_path&&!item.backdrop_path)item.backdrop_path=match.backdrop_path;
 if(match.overview&&!item.overview)item.overview=match.overview;
 if(Number(match.vote_average)>0&&!item.vote_average)item.vote_average=match.vote_average;
 return id;
}
async function enrichTraktItem(item,kind){
 let id=tmdbIdentity(item);
 const traktId=item.trakt_id||item.ids?.trakt||'';
 const key=kind+':'+(id?'tmdb:'+id:traktId?'trakt:'+traktId:'title')+':'+title(item).toLocaleLowerCase('en-US')+':'+tmdbYear(item);
 const cached=metadataCache[key];
 if(cached?.data&&Date.now()-cached.saved<7*86400000)return {...item,...cached.data};
 let data=null,detailError='';
 if(id){try{data=await tmdb('/'+kind+'/'+id)}catch(e){detailError=e.message}}
 if(!data?.poster_path||!id){
  try{
   const search=await tmdb('/search/multi',{query:title(item)});
   const match=tmdbSearchMatch(item,search?.results,kind);
   if(match&&(!id||Number(match.id)===id)){
    if(!id){id=Number(match.id)||0;if(!Number.isSafeInteger(id)||id<1)id=0}
    // Keep full detail fields when a search record only adds missing artwork.
    if(!data)data=match;
    else data={...data,poster_path:data.poster_path||match.poster_path,backdrop_path:data.backdrop_path||match.backdrop_path};
   } else if(!data)enrichmentFailures.push(title(item)+': no matching TMDB title'+(detailError?' ('+detailError+')':''));
  }catch(e){if(!data)enrichmentFailures.push(title(item)+': '+e.message+(detailError?' | '+detailError:''))}
 }
 if(!data)return item;
 const fields={tmdb_id:id||undefined,poster_path:data.poster_path||null,backdrop_path:data.backdrop_path||null,
  overview:data.overview||item.overview||'',vote_average:data.vote_average||item.vote_average||0,
  release_date:data.release_date||item.release_date||'',first_air_date:data.first_air_date||item.first_air_date||'',
  runtime:data.runtime||data.episode_run_time?.find(minutes=>minutes>0)||item.runtime,
  genres:data.genres||item.genres||[],number_of_seasons:data.number_of_seasons,number_of_episodes:data.number_of_episodes};
 metadataCache[key]={saved:Date.now(),data:fields};
 const keys=Object.keys(metadataCache);if(keys.length>400){keys.sort((a,b)=>metadataCache[a].saved-metadataCache[b].saved).slice(0,keys.length-400).forEach(k=>delete metadataCache[k])}
 try{store(metadataCacheKey,metadataCache)}catch{}
 return {...item,...fields};
}
async function enrichTraktCollection(items,kind){
 enrichmentFailures=[];
 const enriched=new Array(items.length);let index=0;
 async function worker(){while(index<items.length){const i=index++;enriched[i]=await enrichTraktItem(items[i],kind)}}
 await Promise.all(Array.from({length:Math.min(3,items.length)},worker));
 if(enrichmentFailures.length){console.warn('Mokumokuren TMDB enrichment issues:',enrichmentFailures);toast('Some artwork could not load. See browser Console for details.');}
 return enriched;
}
// Read-only recovery is deliberately bounded. A write's outcome can be unknown
// after a transport failure, so POST mutations must never be automatically replayed.
const transientReadStatuses=new Set([429,502,503,504]);
let activeProviderWrites=0;
const providerWriteListeners=new Set();
function beginProviderWrite(){
 const notify=()=>providerWriteListeners.forEach(listener=>{
  try{listener()}catch(error){console.warn('Update notice unavailable:',error)}
 });
 activeProviderWrites++;notify();
 let finished=false;
 return ()=>{if(finished)return;finished=true;activeProviderWrites--;notify()};
}
// All normal API calls have a finite deadline. A timed-out write is NOT retried.
// The fallback only exists for synthetic tests that omit AbortController.
async function fetchWithDeadline(url,options={},timeoutMs=12000){
 if(typeof AbortController==='undefined')return fetch(url,options);
 const controller=new AbortController();
 const timeout=setTimeout(()=>controller.abort(),timeoutMs);
 try{return await fetch(url,{...options,signal:controller.signal})}
 finally{clearTimeout(timeout)}
}
function retryAfterSeconds(response){
 const value=response?.headers?.get?.('retry-after');
 if(!value||!/^\d{1,4}$/.test(value.trim()))return null;
 const seconds=Number(value);
 return Number.isFinite(seconds)&&seconds>=0&&seconds<=3600?seconds:null;
}
function retryAfterHint(response){
 const seconds=retryAfterSeconds(response);
 return seconds===null?'Please try again later.':'Please try again in '+seconds+' second'+(seconds===1?'':'s')+'.';
}
async function safeReadRequest(requestOnce,{readOnly=true}={}){
 for(let attempt=0;attempt<2;attempt++){
  let response;
  try{response=await requestOnce()}
  catch(error){
   if(!readOnly||attempt||(typeof navigator!=='undefined'&&navigator.onLine===false))throw error;
   await new Promise(resolve=>setTimeout(resolve,250));
   continue;
  }
  if(!readOnly||attempt||!transientReadStatuses.has(response.status)||
     (typeof navigator!=='undefined'&&navigator.onLine===false))return response;
  const after=retryAfterSeconds(response);
  // Without a valid retry hint, don't immediately repeat a throttled request.
  // Respect longer rate limits instead of leaving a button spinning for minutes.
  if((response.status===429&&after===null)||(after!==null&&after>2))return response;
  await new Promise(resolve=>setTimeout(resolve,after===null?250:after*1000));
 }
 throw Error('The read request could not be completed.');
}
// Step 6: deduplicate short-lived metadata requests; failed requests are never cached.
const tmdbReadCache=new Map();
async function tmdb(path,params={}){
 const p=new URLSearchParams({path,...params});
 const key=p.toString(),isDetail=/^\/(?:movie|tv)\/\d+(?:\/|$)/.test(path);
 const cached=isDetail?tmdbReadCache.get(key):null;
 if(cached&&cached.until>Date.now())return cached.promise;
 if(cached)tmdbReadCache.delete(key);
 const request=async()=>{
  let r;
  try{r=await safeReadRequest(()=>fetchWithDeadline('/api/tmdb?'+p))}
  catch{throw Error('TMDB is unreachable. Check your connection and retry.')}
  let d;try{d=await r.json()}catch{throw Error('TMDB proxy returned invalid JSON (HTTP '+r.status+')')}
  if(!r.ok){
   if(r.status===429)throw Error('TMDB rate limit reached (429). '+retryAfterHint(r));
   if(r.status===401||r.status===403)throw Error('TMDB configuration or permissions need attention (HTTP '+r.status+').');
   // A 400 can be an unsupported proxy route OR a TMDB-specific bad request.
   // It must not disable metadata for every other title or endpoint.
   if(r.status===400)throw Error((d?.error||'TMDB request rejected')+' (HTTP 400: '+path+').');
   throw Error(d?.error||'TMDB request failed (HTTP '+r.status+')');
  }
  return d;
 };
 const promise=request();
 if(isDetail){
  tmdbReadCache.set(key,{promise,until:Date.now()+120000});
  promise.catch(()=>{if(tmdbReadCache.get(key)?.promise===promise)tmdbReadCache.delete(key)});
  if(tmdbReadCache.size>100)tmdbReadCache.delete(tmdbReadCache.keys().next().value);
 }
 return promise;
}
async function tmdbRelated(kind,id){
 if(!id)return [];
 for(const route of ['recommendations','similar']){
  try{const result=await tmdb('/'+kind+'/'+id+'/'+route);if(Array.isArray(result?.results)&&result.results.length)return result.results.slice(0,12)}catch{}
 }
 return [];
}
async function tmdbWatchProviders(kind,id,region='GB'){
 if(!id)return [];
 try{
  const result=await tmdb('/'+kind+'/'+id+'/watch/providers');
  const country=result?.results?.[region];if(!country)return [];
  const seen=new Set(),available=[];
  for(const [key,label] of [['flatrate','Stream'],['free','Free'],['ads','With ads'],['rent','Rent'],['buy','Buy']]){
   for(const item of (Array.isArray(country[key])?country[key]:[])){
    const id=Number(item.provider_id);if(!Number.isSafeInteger(id)||id<1||seen.has(key+':'+id))continue;
    seen.add(key+':'+id);available.push({name:item.provider_name,logo:item.logo_path,method:label});
   }
  }
  const items=available.slice(0,16);
  try{const link=new URL(country.link);if(link.origin==='https://www.themoviedb.org'&&/^\/(?:movie|tv)\/\d+\/watch$/.test(link.pathname))items.link=link.href}catch{}
  return items;
 }catch{return []}
}
async function ani(query,variables={}){
 // Bind every query and mutation to the account that initiated it. In
 // particular, a retried read must never silently use another user's token.
 const requestedToken=state.anilist;
 const accountRevision=anilistAccountRevision;
 const assertSameAccount=()=>{
  if(state.anilist!==requestedToken||anilistAccountRevision!==accountRevision)
   throw Error('AniList account changed during the request. Reload this screen.');
 };
 // GraphQL uses POST for queries and mutations. Retry only explicit reads.
 const readOnly=/^\s*(?:query\b|\{)/.test(query);
 const finishWrite=readOnly?null:beginProviderWrite();
 try{
 const requestOnce=()=>{
  assertSameAccount();
  return fetchWithDeadline('/api/anilist',{method:'POST',headers:{'content-type':'application/json',...(requestedToken?{authorization:'Bearer '+requestedToken}:{})},body:JSON.stringify({query,variables}),cache:'no-store'});
 };
 let r;
 try{r=await safeReadRequest(requestOnce,{readOnly})}
 catch(error){
  assertSameAccount();
  throw Error(readOnly?'AniList is unreachable. Check your connection and retry.':'AniList update outcome is unknown. Refresh your list before retrying.');
 }
 assertSameAccount();
 let d;try{d=await r.json()}catch{assertSameAccount();throw Error('AniList returned an invalid response (HTTP '+r.status+').');}
 assertSameAccount();
 if(r.status===429)throw Error('AniList rate limit reached (429). '+retryAfterHint(r));
 if(r.status===401)throw Error('AniList session expired or unauthorized. Reconnect AniList in Settings.');
 if(r.status===403)throw Error('AniList denied this request (403). Verify the connected account and its permissions; a network restriction is also possible.');
 if(r.status===502&&d?.upstream_status===403)throw Error('AniList blocked the server connection (upstream 403). This does not necessarily mean your token expired.');
 if(!r.ok||d.errors)throw Error(d.errors?.[0]?.message||d.error||'AniList error (HTTP '+r.status+')');
 return d.data;
 }finally{finishWrite?.()}
}
// Browser-first requests avoid Cloudflare blocks against shared Netlify outbound IPs.
// The server fallback is only allowed for failed browser reads, never uncertain writes.
async function readTraktResponse(r){
 if(r.ok&&r.status===204)return null;
 const raw=await r.text();let data;
 try{data=JSON.parse(raw)}catch{
  if(r.status===429)throw Error('Trakt rate limit reached (429). '+retryAfterHint(r));
  const cloudflare=/cloudflare|sorry, you have been blocked|attention required/i.test(raw);
  throw Error(cloudflare?'Trakt blocked this API request (Cloudflare HTTP '+r.status+').':'Trakt returned a non-JSON response (HTTP '+r.status+').');
 }
 if(!r.ok){
  const message=typeof data==='object'?(data.error_description||data.message||data.error):'';
  if(r.status===401)throw Error('Trakt session expired or unauthorized (401). Reconnect Trakt.');
  if(r.status===403)throw Error('Trakt denied this request (403): '+String(message||'access restricted'));
  if(r.status===429)throw Error('Trakt rate limit reached (429). '+retryAfterHint(r));
  throw Error('Trakt API HTTP '+r.status+': '+String(message||'request failed').slice(0,160));
 }
 return data;
}
// If Trakt explicitly denies a browser *read* with a recognizable edge
// challenge, one GET through our same-origin proxy can recover the request.
// A JSON 403, rate limit, authorization error, or write is never rerouted.
async function isTraktReadGatewayBlock(response){
 if(![403,502,503].includes(response?.status))return false;
 const type=(response.headers?.get?.('content-type')||'').toLowerCase();
 if(type.includes('json')||typeof response.clone!=='function')return false;
 try{
  const raw=await response.clone().text();
  return /cloudflare|sorry, you have been blocked|attention required|captcha challenge|access denied/i.test(raw.slice(0,2048));
 }catch{return false;}
}
// Single-flight token renewal prevents replaying Trakt's single-use refresh token.
let traktRefreshPending=null;
function saveTraktCredentials(credentials,{rotation=false}={}){
 if(typeof credentials?.access_token!=='string'||!credentials.access_token.trim())throw Error('Trakt access token missing');
 sessionStorage.setItem('trakt_token',credentials.access_token);
 if(typeof credentials.refresh_token==='string'&&credentials.refresh_token.trim())sessionStorage.setItem('trakt_refresh_token',credentials.refresh_token);
 else sessionStorage.removeItem('trakt_refresh_token');
 const duration=Number(credentials.expires_in);
 if(Number.isFinite(duration)&&duration>0)sessionStorage.setItem('trakt_expires_at',String(Date.now()+duration*1000));
 else sessionStorage.removeItem('trakt_expires_at');
 state.trakt=credentials.access_token;
 if(!rotation)traktAccountRevision++;
 clearTrackingCache();
}
async function refreshTraktToken(){
 if(traktRefreshPending)return traktRefreshPending;
 const usedRefresh=sessionStorage.getItem('trakt_refresh_token');
 if(!state.trakt||!usedRefresh)throw Error('Trakt session expired. Reconnect Trakt.');
 if(['127.0.0.1','localhost'].includes(location.hostname))throw Error('Trakt renewal needs the deployed site. Reconnect there.');
 const existingAccess=state.trakt;
 const pending=(async()=>{
  let response;
  try{response=await fetchWithDeadline('/api/trakt-token',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({grant_type:'refresh_token',refresh_token:usedRefresh}),cache:'no-store'})}
  catch{throw Error('Trakt renewal service is unreachable. Retry when connected.');}
  let credentials;
  try{credentials=await response.json()}catch{throw Error('Trakt renewal returned an invalid response.');}
  if(!response.ok||typeof credentials?.access_token!=='string'||!credentials.access_token.trim()||
     typeof credentials.refresh_token!=='string'||!credentials.refresh_token.trim())
    throw Error('Trakt renewal failed ('+response.status+'). Reconnect Trakt if it persists.');
  // A logout or another login while the request was in flight must not restore the old account.
  if(state.trakt!==existingAccess||sessionStorage.getItem('trakt_refresh_token')!==usedRefresh)
    throw Error('Trakt account changed while renewing.');
  saveTraktCredentials(credentials,{rotation:true});
  return credentials.access_token;
 })();
 traktRefreshPending=pending;
 try{return await pending}finally{if(traktRefreshPending===pending)traktRefreshPending=null}
}
async function trakt(path,options={}){
 if(!state.trakt)throw Error('Connect Trakt first');
 const finishWrite=(options.method||'GET').toUpperCase()==='GET'?null:beginProviderWrite();
 try{
 const accountRevision=traktAccountRevision;
 const assertSameAccount=()=>{
  if(traktAccountRevision!==accountRevision||!state.trakt)
   throw Error('Trakt account changed during the request. Reload this screen.');
 };
 const expiry=Number(sessionStorage.getItem('trakt_expires_at')||0);
 if(sessionStorage.getItem('trakt_refresh_token')&&expiry&&Date.now()>expiry-60000)await refreshTraktToken();
 assertSameAccount();
 const readOnly=(options.method||'GET').toUpperCase()==='GET';
 // Following a direct edge rejection, retry only through our proxy.
 let preferProxy=false;
 const proxyRead=()=>{
  assertSameAccount();
  return fetchWithDeadline('/api/trakt?path='+encodeURIComponent(path),{
   method:'GET',headers:{authorization:'Bearer '+state.trakt},cache:'no-store'
  });
 };
 const requestOnce=async()=>{
  assertSameAccount();
  if(readOnly&&preferProxy)return proxyRead();
  const headers={authorization:'Bearer '+state.trakt,'trakt-api-key':TRAKT_ID,'trakt-api-version':'2',accept:'application/json',...(options.body?{'content-type':'application/json'}:{})};
  const request={method:options.method||'GET',headers,mode:'cors',cache:'no-store',...(options.body?{body:options.body}:{})};
  let browserResponse;
  try{browserResponse=await fetchWithDeadline('https://api.trakt.tv'+path,request)}
  catch(browserError){
   assertSameAccount();
   // The outcome of a write is unknown after a network exception: no replay.
   if(!readOnly)throw Error('Trakt write outcome unknown after a connection error. Refresh your Trakt list to verify before retrying.');
   preferProxy=true;
   try{return await proxyRead()}
   catch(error){assertSameAccount();throw Error('Trakt browser request failed (possibly CORS), and Netlify fallback is unreachable.')}
  }
  assertSameAccount();
  if(readOnly&&await isTraktReadGatewayBlock(browserResponse)){
   assertSameAccount();
   preferProxy=true;
   try{return await proxyRead()}
   catch(error){assertSameAccount();throw Error('Trakt gateway rejected the browser read, and Netlify fallback is unreachable.')}
  }
  return browserResponse;
 };
 const requestedAccess=state.trakt;
 let response;
 try{response=await safeReadRequest(requestOnce,{readOnly})}
 catch(error){assertSameAccount();throw error}
 assertSameAccount();
 // A definite 401 is safe to retry once after a single-flight token refresh.
 if(response.status===401&&sessionStorage.getItem('trakt_refresh_token')){
  if(state.trakt===requestedAccess)await refreshTraktToken();
  assertSameAccount();
  response=await requestOnce();
  assertSameAccount();
 }
 const result=await readTraktResponse(response);
 assertSameAccount();
 return result;
 }finally{finishWrite?.()}
}
let animeLibraryToken = state.anilist;
let animeLibraryPending=null;
function clearAnimeLibraryCache(){
 state.animeLibrary=[];
 state.animeLibraryLoaded=false;
 state.animeLibraryError='';
 animeLibraryToken=state.anilist;
 animeLibraryPending=null;
}
async function fetchAnimeLibrary(){
 if(animeLibraryToken!==state.anilist)clearAnimeLibraryCache();
 if(!state.anilist)return [];
 if(state.animeLibraryLoaded)return state.animeLibrary;
 // Reuse one pending collection fetch for simultaneous home/list requests.
 if(animeLibraryPending?.token===state.anilist)return animeLibraryPending.promise;
 const requestedToken=state.anilist;
 const pending=(async()=>{
  const v=await ani('query{Viewer{id}}');
  if(state.anilist!==requestedToken||animeLibraryPending?.promise!==pending)return [];
  const d=await ani(`query($id:Int){MediaListCollection(userId:$id,type:ANIME){lists{entries{id progress status repeat media{id title{romaji english native} coverImage{large extraLarge} bannerImage description(asHtml:false) startDate{year month day} season seasonYear format releaseStatus:status duration episodes genres tags{name rank} averageScore popularity nextAiringEpisode{episode airingAt}}}}}}`,{id:v.Viewer.id});
  const unique=new Map();
  for(const e of (d.MediaListCollection?.lists||[]).flatMap(l=>l.entries||[]))if(e.media?.id){const prev=unique.get(e.media.id);if(!prev||(!prev.status&&e.status))unique.set(e.media.id,e)}
  const result=[...unique.values()];
  if(state.anilist!==requestedToken||animeLibraryPending?.promise!==pending)return [];
  state.animeLibrary=result;state.animeLibraryLoaded=true;return state.animeLibrary;
 })();
 animeLibraryPending={token:requestedToken,promise:pending};
 try{return await pending}finally{if(animeLibraryPending?.promise===pending)animeLibraryPending=null}
}
// Step 9: provider-backed progress synchronization. This timestamp only throttles
// automatic reads; the lists themselves remain on Trakt and AniList.
let lastRemoteTrackingRefresh=Date.now();
const episodeWritesInFlight=new Set();
async function refreshRemoteTracking({force=false}={}){
 const now=Date.now();
 if(!force&&now-lastRemoteTrackingRefresh<90000)return;
 if(!state.anilist&& !state.trakt)return;
 lastRemoteTrackingRefresh=now;
 if(state.section==='Anime'){
  if(!state.anilist)return;
  clearAnimeLibraryCache();
 }else{
  if(!state.trakt)return;
  clearTrackingCache();
 }
 if(state.tab==='Recommended')await renderHomeDashboard();
 else if(state.tab!=='Discover'||state.section==='Anime')await load();
}
// Browsers can return from sleep while another device has changed the library.
// Reload only after a meaningful interval to avoid unnecessary provider calls.
if(typeof document!=='undefined')document.addEventListener('visibilitychange',()=>{
 if(document.visibilityState==='visible')void refreshRemoteTracking();
});
if(typeof window!=='undefined')window.addEventListener('focus',()=>{
 if(document.visibilityState==='visible')void refreshRemoteTracking();
});
function reconcileAnimeProgress(mediaId,progress,status,repeat){
 const id=Number(mediaId);
 const confirmed={status};
 if(Number.isSafeInteger(progress)&&progress>=0)confirmed.progress=progress;
 if(Number.isSafeInteger(repeat)&&repeat>=0)confirmed.repeat=repeat;
 const update=record=>{
  if(Number(record?.id)!==id)return;
  Object.assign(record,confirmed);
 };
 if(state.section==='Anime'){
  state.items.forEach(update);
  (state.recommendationPool||[]).forEach(update);
  if(state.modal)update(state.modal);
 }
 for(const entry of state.animeLibrary){
  if(Number(entry?.media?.id)===id)Object.assign(entry,confirmed);
 }
 state.animeLibraryLoaded=false;
 animeLibraryPending=null;
 return confirmed;
}
function refreshAfterEpisodeConfirmation(section,accountRevision){
 if(section!==state.section)return;
 if((section==='Anime'?anilistAccountRevision:traktAccountRevision)!==accountRevision)return;
 if(state.tab==='Recommended')void renderHomeDashboard();
 else if(['In Progress','Watched','Watchlist'].includes(state.tab))void load();
 else if(section==='Anime')renderMain();
}
function rankRecommendations(pool,section){
 const balance=state.balance[section]/100;
 const watched=state.animeLibrary.filter(e=>['COMPLETED','CURRENT','REPEATING'].includes(e.status));
 const weights={};for(const e of watched){const weight=e.status==='COMPLETED'?2:1;for(const g of e.media?.genres||[])weights[g]=(weights[g]||0)+weight;}
 const max=Math.max(1,...Object.values(weights));
 return [...pool].map(x=>{const genres=x.genres||[];const familiar=genres.length?genres.reduce((a,g)=>a+(weights[g]||0)/max,0)/genres.length:0;
 const novelty=1-familiar;const quality=(x.averageScore||x.vote_average*10||60)/100;
 const preference=state.feedback[x.id]==='more'?0.2:0;
 const score=(1-balance)*familiar+balance*novelty+quality*0.28+preference;
 return {x,score};}).sort((a,b)=>b.score-a.score).map(y=>y.x);
}
async function markNextTraktEpisode(item){
 const ep=item.nextEpisode,show=Number(item.trakt_id),revision=traktAccountRevision;
 if(!state.trakt||!Number.isSafeInteger(show)||show<1||!ep||!Number.isInteger(Number(ep.season))||Number(ep.season)<0||!Number.isInteger(Number(ep.number))||Number(ep.number)<1)return false;
 const lock='trakt:'+revision+':'+show;
 if(episodeWritesInFlight.has(lock))return false;
 episodeWritesInFlight.add(lock);
 try{
  const payload={shows:[{ids:{trakt:show},seasons:[{number:Number(ep.season),episodes:[{number:Number(ep.number)}]}]}]};
  const result=await trakt('/sync/history',{method:'POST',body:JSON.stringify(payload)});
  if(revision!==traktAccountRevision)throw Error('Trakt account changed during the update');
  const added=result?.added?.episodes;
  if(['shows','seasons','episodes'].some(kind=>result?.not_found?.[kind]?.length)||!Number.isSafeInteger(added)||added<1)
   throw Error('Trakt did not confirm the episode');
  clearTrackingCache();
  // Do not guess the next episode; read it back from Trakt's progress endpoint.
  item.nextEpisode=null;
  toast('Episode marked watched in Trakt');
  refreshAfterEpisodeConfirmation('TV Shows',revision);
  return true;
 }catch(e){toast('Episode update failed: '+e.message);return false}
 finally{episodeWritesInFlight.delete(lock)}
}
async function performQuickEpisode(item,button,isAnime){
 if(!button.isConnected||button.disabled)return;
 const label=button.textContent;
 button.disabled=true;button.textContent='Saving…';
 const ok=isAnime?await updateAnimeProgress(item,Number(item.progress||0)+1,null):await markNextTraktEpisode(item);
 if(button.isConnected){
  button.textContent=ok?'✓ Saved':label;
  if(!ok)button.disabled=false;
 }
}
function wireQuickProgress(){
 if((state.section!=='Anime'&&state.section!=='TV Shows')||state.tab==='Recommended'||state.tab==='Discover')return;
 if(state.section==='Anime'&&!state.anilist||state.section==='TV Shows'&&!state.trakt)return;
 document.querySelectorAll('.poster[data-open]').forEach(p=>{
  const item=state.items.find(x=>String(x._key||x.id)===p.dataset.open);
  if(!item)return;
  const isAnime=state.section==='Anime';
  if(isAnime&&!Number.isFinite(Number(item.progress)))return;
  if(!isAnime&&(!item.nextEpisode||!item.trakt_id))return;
  const parent=p.parentElement;
  if(!parent||parent.querySelector('.quick-episode'))return;
  const total=Number(item.episodes)||null;
  if(isAnime&&total!==null&&Number(item.progress)>=total)return;
  const b=document.createElement('button');b.type='button';b.className='quick-episode';
  b.setAttribute('aria-label','Mark next episode watched for '+title(item));
  b.textContent=isAnime?'+1 episode':'+ Watch next';const wrap=document.createElement('div');wrap.className='episode-poster-wrap';p.replaceWith(wrap);wrap.append(p,b);
  b.onclick=()=>performQuickEpisode(item,b,isAnime);
 });
}
function wireCards(){wireQuickProgress();document.querySelectorAll('[data-open]').forEach(b=>{if(b.closest('.home-dashboard'))return;b.onclick=()=>{const item=state.items.find(x=>String(x._key||x.id)===b.dataset.open);openItem(item)}})}
async function updateAnimeProgress(x,next,modal){
 if(!state.anilist){toast('Connect AniList first');return false}
 const mediaId=Number(x.id),revision=anilistAccountRevision;
 if(!Number.isSafeInteger(mediaId)||mediaId<1){toast('Invalid AniList media identifier');return false}
 const max=Number(x.episodes)>0?Number(x.episodes):null;
 next=Math.max(0,Math.min(max??99999,Math.floor(Number(next))));
 if(!Number.isFinite(next))return false;
 const old=Number(x.progress)||0;
 if(next===old)return true;
 const lock='anime:'+revision+':'+mediaId;
 if(episodeWritesInFlight.has(lock)){toast('An episode update is already being saved');return false}
 episodeWritesInFlight.add(lock);
 try{
  const newStatus=next>0&&(!x.status||['PLANNING','PAUSED','DROPPED'].includes(x.status))?'CURRENT':x.status;
  const query=`mutation($mediaId:Int,$progress:Int,$status:MediaListStatus){SaveMediaListEntry(mediaId:$mediaId,progress:$progress,status:$status){id progress status}}`;
  const d=await ani(query,{mediaId,progress:next,...(newStatus?{status:newStatus}:{})});
  const saved=d?.SaveMediaListEntry;
  if(!saved?.id||saved.progress!==next||(newStatus&&saved.status!==newStatus))throw Error('AniList did not confirm the requested episode progress');
  if(revision!==anilistAccountRevision)throw Error('AniList account changed during the update');
  reconcileAnimeProgress(mediaId,saved.progress,saved.status);
  x.progress=saved.progress;x.status=saved.status;
  syncAnimeTrackingDetails(modal,x);
  toast(max&&next===max?'All episodes tracked. Set Completed when ready.':'Episode progress synced to AniList');
  refreshAfterEpisodeConfirmation('Anime',revision);
  return true;
 }catch(e){toast('Could not sync progress: '+e.message);return false}
 finally{episodeWritesInFlight.delete(lock)}
}

// Personalised home rails: real account data only, never pretend trending titles are in a library.
let homeDashboardRequest=0;
function homeRailCard(x,label){
 if(label!=='Continue Watching')return card(x);
 // Continue Watching is a landscape episode/movie card like Trakt; all click handling
 // still resolves through the original movie/show data, never an episode identifier.
 const image=backdrop(x);
 const episode=x.nextEpisode;
 const episodeLabel=episode?`S${episode.season} · E${episode.number}${episode.title?' · '+episode.title:''}`:(state.section==='Anime'&&x.progress!=null?`${x.progress}/${x.episodes??'?'} episodes`:(x.progress||'Continue watching'));
 const numericProgress=Number.parseFloat(x.progress);
 const episodeTotal=Number(x.episodes);
 // Trakt playback is a percentage. AniList progress is an episode COUNT.
 const progress=typeof x.progress==='string'&&x.progress.endsWith('%')?numericProgress:
  state.section==='Anime'&&episodeTotal>0?100*numericProgress/episodeTotal:
  state.section==='Movies'?numericProgress:NaN;
 const percent=Number.isFinite(progress)?Math.max(0,Math.min(100,Math.round(progress))):null;
 const metadata=cardMetadata(x);
 const frontTag=percent!==null?`<span class="rail-progress"><span style="width:${percent}%"></span></span>`:'';
 const art=cardArtwork(x,image,metadata,{artClass:'rail-art',frontTag,note:episodeLabel});
 const description=[metadata.titleText,episodeLabel,metadata.genre,metadata.certification,metadata.score!==null?`${metadata.score}% community rating`:''].filter(Boolean).join('. ');
 return `<button type="button" class="poster poster-landscape" data-open="${esc(x._key||x.id)}" aria-label="${esc(description)}">${art}<span class="poster-body"><strong>${esc(metadata.titleText)}</strong><small>${esc(episodeLabel)}</small></span></button>`;
}
function homeRail(label,items,description){
 if(!items.length)return '';
 const view=label==='Continue Watching'?'In Progress':'Watchlist';
 return `<section class="home-rail ${label==='Continue Watching'?'home-rail-continue':'home-rail-posters'} replica-home-rail" aria-label="${esc(label)}">
 <header class="section-title replica-rail-heading"><div class="replica-rail-title"><button type="button" class="replica-rail-link" data-replica-view="${view}" aria-label="View all ${esc(label)}"><span>${esc(label)}</span>${uiIcon('chevron-right')}</button><small class="muted">${esc(description)}</small></div><div class="replica-rail-actions"><button type="button" class="replica-rail-step" data-replica-scroll="-1" aria-label="Previous ${esc(label)} titles">${uiIcon('chevron-right')}</button><button type="button" class="replica-rail-step" data-replica-scroll="1" aria-label="Next ${esc(label)} titles">${uiIcon('chevron-right')}</button><button type="button" class="replica-rail-collapse" data-replica-collapse aria-expanded="true" aria-label="Collapse ${esc(label)}">${uiIcon('chevron-up')}</button></div></header>
 <div class="home-rail-track" role="group" aria-label="${esc(label)} titles">${items.slice(0,18).map((x,i)=>`<div class="home-rail-entry" data-home-index="${i}" data-home-rail="${esc(label)}">${homeRailCard(x,label)}${label==='Continue Watching'&&((state.section==='Anime'&&state.anilist&&(Number(x.episodes)||0)===0)||(state.section==='Anime'&&state.anilist&&Number(x.progress||0)<Number(x.episodes))||(state.section==='TV Shows'&&state.trakt&&x.nextEpisode&&x.trakt_id))?`<button type="button" class="quick-episode home-quick-episode" data-home-quick="${i}" aria-label="Mark next episode watched for ${esc(title(x))}">+1 episode</button>`:''}</div>`).join('')}</div></section>`;
}
function normalizeTraktLibraryItem(x,kind,i=0){
 // Playback entries identify a show and an episode separately; cards always open the show.
 const y=kind==='tv'?(x.show||x):(x.movie||x);
 const ids=y.ids||{};
 const rawProgress=Number(x.progress);
 const progress=typeof x.progress==='string'&&/^\d{1,3}%$/.test(x.progress)?x.progress:x.progress!=null&&Number.isFinite(rawProgress)?Math.max(0,Math.min(100,Math.round(rawProgress)))+'%':undefined;
 return {...y,name:y.title||y.name,tmdb_id:ids.tmdb||undefined,
  trakt_id:ids.trakt||undefined,id:ids.tmdb||ids.trakt||undefined,
  _key:ids.trakt||ids.tmdb||i,progress,listedAt:x.listed_at,watchlistRank:x.rank,
  nextEpisode:kind==='tv'&&x.episode?{season:x.episode.season,number:x.episode.number,title:x.episode.title}:x._nextEpisode||undefined,watchedCount:x._watchedCount};
}
// Trakt changed watched endpoints to paginated results in 2026. Read every page,
// never silently present the first page as the entire account history.
async function traktPagedRead(path,{pageSize=100,maxPages=30}={}){
 const rows=[];
 for(let page=1;page<=maxPages;page++){
  const separator=path.includes('?')?'&':'?';
  const result=await trakt(path+separator+'page='+page+'&limit='+pageSize);
  if(!Array.isArray(result))throw Error('Trakt returned an invalid paginated library response.');
  rows.push(...result);
  if(result.length<pageSize)return rows;
 }
 throw Error('Your Trakt library exceeds the current safe pagination limit; no incomplete results were displayed.');
}
// A show only belongs to one of these categories. One endpoint response is
// the authority for completion, not its presence in /sync/watched/shows.
function classifyTraktShowProgress(progress){
 if(!progress||typeof progress!=='object')throw Error('Missing Trakt show progress');
 const episodes=Number(progress.completed_episodes);
 const counted=Array.isArray(progress.seasons)?progress.seasons.reduce((sum,season)=>sum+(season.episodes||[]).filter(e=>e.completed).length,0):0;
 const watched=Number.isFinite(episodes)&&episodes>=0?episodes:counted;
 const aired=Number(progress.aired);
 const completed=progress.completed===true;
 return {status:completed?'Completed':watched>0?'In Progress':'Unstarted',
  watchedCount:watched, nextEpisode:progress.next_episode||null,
  progress:Number.isFinite(aired)&&aired>0?Math.round(Math.min(100,watched/ aired*100))+'%':undefined};
}
const showProgressCache=new Map();
function clearShowProgressCache(){showProgressCache.clear()}
async function traktShowProgress(traktId){
 const key=traktAccountRevision+':'+String(traktId),cached=showProgressCache.get(key);
 if(cached&&cached.until>Date.now())return cached.promise;
 if(cached)showProgressCache.delete(key);
 const promise=trakt('/shows/'+encodeURIComponent(String(traktId))+'/progress/watched');
 showProgressCache.set(key,{until:Date.now()+60000,promise});
 promise.catch(()=>{if(showProgressCache.get(key)?.promise===promise)showProgressCache.delete(key)});
 return promise;
}
function uniqueTraktEntries(rows,kind){
 const seen=new Set();return rows.filter((entry,index)=>{
  const media=kind==='tv'?(entry.show||entry):(entry.movie||entry);
  const ids=media?.ids||{};
  const key=ids.trakt?'trakt:'+ids.trakt:ids.tmdb?'tmdb:'+ids.tmdb:ids.imdb?'imdb:'+ids.imdb:'row:'+index;
  if(seen.has(key))return false;seen.add(key);return true;
 });
}
async function trackedTraktShows(){
 const watched=await traktPagedRead('/sync/watched/shows');
 const unique=uniqueTraktEntries(watched,'tv');
 const records=new Array(unique.length),failed=[];
 let index=0;
 async function worker(){while(index<unique.length){const i=index++,record=unique[i];const id=record.show?.ids?.trakt||record.ids?.trakt;
  if(!id){failed.push('missing Trakt show identifier');continue}
  try{const status=classifyTraktShowProgress(await traktShowProgress(id));records[i]={...record,...status,_nextEpisode:status.nextEpisode,_watchedCount:status.watchedCount}}catch(e){failed.push(String(id))}
 }}
 await Promise.all(Array.from({length:Math.min(4,unique.length)},worker));
 if(failed.length===unique.length&&unique.length)throw Error('Trakt show progress could not be verified. Try again.');
 return {records:records.filter(Boolean),failed:failed.length};
}
async function renderHomeDashboard(){
 const target=document.querySelector('#home-dashboard');if(!target)return;
 const request=++homeDashboardRequest,section=state.section;
 const accountRevision=section==='Anime'?anilistAccountRevision:traktAccountRevision;
 const isCurrent=()=>request===homeDashboardRequest&&state.section===section&&state.tab==='Recommended'&&
  (section==='Anime'?anilistAccountRevision:traktAccountRevision)===accountRevision&&target.isConnected;
 const connected=section==='Anime'?!!state.anilist:!!state.trakt;
 if(!connected){target.innerHTML='<p class="muted home-rail-hint">Connect Trakt or AniList in Settings to see your Continue Watching and Watchlist rows here.</p>';return;}
 target.innerHTML='<p class="muted home-rail-hint">Loading your library rows…</p>';
 try{
  let inProgress=[],watchlist=[],libraryWarnings=[],failedRails=new Set();
  if(section==='Anime'){
   const entries=await fetchAnimeLibrary();
   const normalize=e=>normaliseAnimeMedia(e.media,e);
   inProgress=entries.filter(e=>['CURRENT','REPEATING'].includes(e.status)).map(normalize);
   watchlist=entries.filter(e=>e.status==='PLANNING').map(normalize);
  }else{
   const kind=section==='Movies'?'movie':'tv';
   const results=await Promise.allSettled([kind==='tv'?trackedTraktShows():trakt('/sync/playback'),traktPagedRead('/sync/watchlist/'+(kind==='movie'?'movies':'shows'))]);
   const playback=results[0].status==='fulfilled'?(kind==='tv'?results[0].value.records:results[0].value):[];
   const saved=results[1].status==='fulfilled'&&Array.isArray(results[1].value)?results[1].value:[];
   if(results.every(r=>r.status==='rejected'))throw Error('Trakt library could not be loaded');
   if(results[0].status==='rejected'){libraryWarnings.push('Continue Watching could not be loaded from Trakt.');failedRails.add('Continue Watching');}
   if(results[1].status==='rejected'){libraryWarnings.push('Watchlist could not be loaded from Trakt.');failedRails.add('Your Watchlist');}
   if(kind==='tv'&&results[0].status==='fulfilled'&&results[0].value.failed)libraryWarnings.push(results[0].value.failed+' shows have unavailable progress and are omitted until verification succeeds.');
   const map=(x,i)=>normalizeTraktLibraryItem(x,kind,i);
   inProgress=(kind==='tv'?playback.filter(x=>x.status==='In Progress'):playback.filter(x=>x.type==='movie'&&Number(x.progress)>0&&Number(x.progress)<100)).map(map);
   watchlist=uniqueTraktEntries(saved,kind).map(map);
   const enriched=await Promise.allSettled([enrichTraktCollection(inProgress,kind),enrichTraktCollection(watchlist,kind)]);
   if(enriched[0].status==='fulfilled')inProgress=enriched[0].value;
   if(enriched[1].status==='fulfilled')watchlist=enriched[1].value;
  }
  if(!isCurrent())return;
  const rails=[{label:'Continue Watching',items:inProgress,description:'Pick up where you left off'},{label:'Your Watchlist',items:watchlist,description:'Saved for later'}];
  const railMarkup=rails.filter(r=>!failedRails.has(r.label)).map(r=>homeRail(r.label,r.items,r.description)).join('');
  const warningMarkup=libraryWarnings.map(message=>`<p class="muted home-rail-hint" role="status">${esc(message)}</p>`).join('');
  target.innerHTML=warningMarkup+(railMarkup||(!libraryWarnings.length?'<p class="muted home-rail-hint">Your connected library has no in-progress or watchlisted titles yet.</p>':''))+(libraryWarnings.length?'<button type="button" class="chip" data-retry-home>Retry failed library requests</button>':'');
  target.querySelector('[data-retry-home]')?.addEventListener('click',()=>void renderHomeDashboard());
  target.querySelectorAll('[data-home-quick]').forEach(button=>{
   const item=inProgress[Number(button.dataset.homeQuick)];
   if(item)button.onclick=()=>performQuickEpisode(item,button,section==='Anime');
  });
  requestAnimationFrame(()=>enhanceHorizontalRails(target));
  for(const rail of rails.filter(r=>!failedRails.has(r.label))){target.querySelectorAll('[data-home-rail="'+rail.label+'"] .poster').forEach((button,i,buttons)=>{button.onclick=()=>openItem(rail.items[i]);button.addEventListener('keydown',event=>{if(event.key!=='ArrowRight'&&event.key!=='ArrowLeft')return;const next=i+(event.key==='ArrowRight'?1:-1);if(next<0||next>=buttons.length)return;event.preventDefault();buttons[next].focus();buttons[next].scrollIntoView({block:'nearest',inline:'nearest',behavior:'auto'});})})}
 }catch(e){if(isCurrent()){target.innerHTML=`<p class="muted home-rail-hint" role="alert">Library rows unavailable: ${esc(e.message)}</p><button type="button" class="chip" data-retry-home>Retry library loading</button>`;target.querySelector('[data-retry-home]').addEventListener('click',()=>void renderHomeDashboard())}}
}
// Commit async discovery/library results only for the section, view and account
// that started the request. In particular, old Trakt/AniList responses must
// never repopulate the UI after a logout or a different account connects.
async function load(){
 if(state.tab==='Profile'){++loadGeneration;state.loading=false;state.loadError='';state.items=[];renderMain();return;}
 const request=++loadGeneration;
 const section=state.section, tab=state.tab;
 const accountRevision=section==='Anime'?anilistAccountRevision:traktAccountRevision;
 const isCurrent=()=>request===loadGeneration && state.section===section && state.tab===tab &&
   (section==='Anime'?anilistAccountRevision:traktAccountRevision)===accountRevision;
 state.loading=true;
 state.loadError='';state.libraryWarning='';
 state.items=[];
 renderMain();
 let nextItems=[], nextPool=null;
 try{
  if(section==='Anime'){
   let library=[];
   if(state.anilist){
    try{library=await fetchAnimeLibrary()}
    catch(e){
     if(!isCurrent())return;
     state.animeLibraryError=e.message;
     toast('AniList library unavailable: '+e.message);
    }
   }
   if(tab==='Recommended'||tab==='Discover'){
    const d=await queryAnimeBrowse(1);
    if(!isCurrent())return;
    const pool=mergeAnimeBrowseMedia(d.Page?.media||[],library,tab==='Recommended');
    animeBrowsePage=1;animeBrowseHasMore=tab==='Discover'&&!!d.Page?.pageInfo?.hasNextPage;
    nextPool=pool;
    nextItems=tab==='Recommended'?rankRecommendations(pool,section):pool;
   }else{
    if(!state.anilist)throw Error('Connect AniList to load your library');
    const statuses=tab==='Watchlist'?['PLANNING']:tab==='Watched'?['COMPLETED']:['CURRENT','PAUSED','REPEATING','DROPPED'];
    nextItems=library.filter(e=>statuses.includes(e.status)).map(e=>normaliseAnimeMedia(e.media,e));
   }
  }else if(tab==='Recommended'||tab==='Discover'){
   const kind=section==='Movies'?'movie':'tv';
   const path=state.query?'/search/multi':tab==='Recommended'?'/trending/'+kind+'/week':'/discover/'+kind;
   const params=state.query?{query:state.query}:{sort_by:state.sort,...(state.genre?{with_genres:state.genre}:{}),...(state.year?{[kind==='movie'?'primary_release_year':'first_air_date_year']:state.year}:{})};
   const d=await tmdb(path,params);
   if(!isCurrent())return;
   nextItems=(d.results||[]).filter(x=>!x.media_type||x.media_type===kind).filter(x=>state.feedback[x.id]!=='not').map(x=>({...x,_key:x.id}));
  }else{
   if(!state.trakt)throw Error('Connect Trakt to load your library');
   let entries=[];
   if(tab==='Watchlist')entries=await traktPagedRead('/sync/watchlist/'+(section==='Movies'?'movies':'shows'));
   else if(section==='Movies'){
    entries=tab==='Watched'?await traktPagedRead('/sync/watched/movies'):await trakt('/sync/playback');
    if(tab==='In Progress')entries=(Array.isArray(entries)?entries:[]).filter(x=>x.type==='movie'&&Number(x.progress)>0&&Number(x.progress)<100);
   }else{
    const shows=await trackedTraktShows();
    if(!isCurrent())return;
    state.libraryWarning=shows.failed?shows.failed+' shows have unavailable progress and cannot be classified until Trakt responds.':'';
    entries=shows.records.filter(x=>x.status===(tab==='Watched'?'Completed':'In Progress'));
   }
   if(!isCurrent())return;
   entries=uniqueTraktEntries(Array.isArray(entries)?entries:[],section==='Movies'?'movie':'tv');
   const mapped=entries.filter(x=>tab!=='In Progress'||section!=='Movies'||x.type==='movie').map((x,i)=>normalizeTraktLibraryItem(x,section==='Movies'?'movie':'tv',i));
   nextItems=await enrichTraktCollection(mapped,section==='Movies'?'movie':'tv');
  }
  if(!isCurrent())return;
  if(nextPool!==null)state.recommendationPool=nextPool;
  state.items=nextItems;
  if(state.demo&&!state.items.length)state.items=sample.filter(x=>state.feedback[x.id]!=='not').map(x=>({...x,_key:x.id,previewItem:true}));
 }catch(e){
  if(!isCurrent())return;
  if(state.demo)state.items=sample.filter(x=>state.feedback[x.id]!=='not').map(x=>({...x,_key:x.id,previewItem:true}));
  else{state.loadError=e.message;toast(e.message)}
 }finally{
  if(!isCurrent())return;
  state.loading=false;
  renderMain();
  if(state.tab==='Recommended')void renderHomeDashboard();
 }
}
async function verifyAccounts(){
 // Neither provider's slow/failed identity call should block the other.
 const checks=[];
 if(state.anilist){
  const revision=anilistAccountRevision;
  checks.push((async()=>{
   try{
    const d=await ani('query{Viewer{id name}}');
    if(revision!==anilistAccountRevision)return;
    if(!d?.Viewer?.id)throw Error('Viewer missing');
    state.aniUser=d.Viewer.name;
   }catch(e){
    if(revision!==anilistAccountRevision)return;
    state.aniUser=null;
    toast('AniList verification failed: '+e.message);
   }
  })());
 }
 if(state.trakt){
  const revision=traktAccountRevision;
  checks.push((async()=>{
   try{
    const d=await trakt('/users/settings');
    if(revision!==traktAccountRevision)return;
    state.traktUser=d?.user?.username||d?.user?.name||null;
    state.traktVerifyError='';
    if(!state.traktUser)throw Error('Username missing');
   }catch(e){
    if(revision!==traktAccountRevision)return;
    state.traktUser=null;
    state.traktVerifyError=e.message;
    toast('Trakt verification failed: '+e.message);
   }
  })());
 }
 await Promise.all(checks);
}
// Custom list UI is deferred to v2.0.0. This code has no v1.0.0 entry point.
// Legacy device-only lists are deliberately left untouched, never silently deleted or uploaded.
function traktListId(list){return encodeURIComponent(String(list.ids?.trakt||list.ids?.slug||list.id||''))}
function traktListPayload(x){
 const kind=state.section==='Movies'?'movies':state.section==='TV Shows'?'shows':null;
 if(!kind)return null;
 const tmdb=Number(x.tmdb_id||x.ids?.tmdb||(!(x.trakt_id||x.ids?.trakt)?x.id:0));
 const trakt=Number(x.trakt_id||x.ids?.trakt);
 const ids=Number.isSafeInteger(tmdb)&&tmdb>0?{tmdb}:Number.isSafeInteger(trakt)&&trakt>0?{trakt}:null;
 return ids?{[kind]:[{ids}]}:null;
}
function traktListContains(items,x){
 const kind=state.section==='Movies'?'movie':state.section==='TV Shows'?'show':null;
 if(!kind||!Array.isArray(items))return false;
 // Trakt IDs and TMDB IDs are different namespaces. Match either trustworthy ID
 // when both are available so a title is not incorrectly added twice.
 const ids={tmdb:Number(x.tmdb_id||x.ids?.tmdb||(!(x.trakt_id||x.ids?.trakt)?x.id:0)),trakt:Number(x.trakt_id||x.ids?.trakt)};
 const expected=Object.entries(ids).filter(([,id])=>Number.isSafeInteger(id)&&id>0);
 if(!expected.length)return false;
 return items.some(entry=>entry?.type===kind&&expected.some(([ns,id])=>Number(entry[kind]?.ids?.[ns])===id));
}
function showPersonalLists(selected=null){
 const previous=document.activeElement,back=document.createElement('div');back.className='modal-back personal-list-overlay trakt-lists-page replica-lists-surface';
 const sidebar=document.querySelector('.desktop-sidebar'),previousSideActive=sidebar?.querySelector('button.active'),listSideButton=sidebar?.querySelector('[data-side-action="lists"]');
 previousSideActive?.classList.remove('active');listSideButton?.classList.add('active');
 back.innerHTML=`<section class="modal settings personal-list-modal" role="dialog" aria-modal="true" aria-label="Trakt Lists"><button class="close" aria-label="Close Trakt Lists">${uiIcon('xmark')}</button><div class="trakt-list-page-heading"><span class="eyebrow">YOUR COLLECTION / TRAKT</span><h2>My Lists</h2><p class="muted">Organize movies and shows in lists that stay synchronized across your devices.</p></div><p class="muted trakt-list-support">Lists are stored in your Trakt account and sync across devices. Anime without a matching Trakt movie or show cannot be added here.</p><form id="create-personal-list"><label for="personal-list-name">New Trakt list</label><div class="personal-list-create"><input id="personal-list-name" maxlength="70" required placeholder="e.g. Weekend watchlist"><button class="action" type="submit">Create list</button></div></form><p id="personal-list-feedback" role="status" aria-live="polite"></p><button type="button" class="chip" id="refresh-personal-lists">Refresh lists</button><div class="trakt-list-tools"><label>Search lists and titles<input id="personal-list-search" type="search" placeholder="Find a list or title…" autocomplete="off"></label><label>Sort lists<select id="personal-list-sort"><option value="original">Trakt order</option><option value="name">Name A–Z</option><option value="size">Most titles</option></select></label><span id="personal-list-count" class="muted" role="status" aria-live="polite"></span></div><div id="personal-list-entries"></div></section>`;
 document.body.append(back);
 const dismiss=()=>{back.remove();listSideButton?.classList.remove('active');if(previousSideActive?.isConnected)previousSideActive.classList.add('active');if(previous?.isConnected)previous.focus()};
 back.querySelector('.close').onclick=dismiss;back.onclick=e=>{if(e.target===back)dismiss()};
 back.addEventListener('keydown',e=>{if(e.key==='Escape'){e.stopPropagation();dismiss()}if(e.key==='Tab'){const controls=[...back.querySelectorAll('button:not(:disabled),input:not(:disabled)')];if(!controls.length)return;const first=controls[0],last=controls.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus()}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus()}}});
 const feedback=back.querySelector('#personal-list-feedback'),container=back.querySelector('#personal-list-entries'),form=back.querySelector('form');
 let lists=[],itemsById=new Map(),busy=false,listQuery="",listSort="original";const accountRevision=traktAccountRevision;
 const report=message=>{feedback.textContent=message};
 const setBusy=value=>{busy=value;back.querySelectorAll('button:not(.close),input').forEach(el=>el.disabled=value)};
 const run=async(task)=>{if(busy)return;setBusy(true);try{if(traktAccountRevision!==accountRevision)throw Error('Trakt account changed. Close and reopen lists.');await task()}catch(e){report(e.message||'Trakt request failed')}finally{if(back.isConnected)setBusy(false)}};
 const load=async()=>{
  if(traktAccountRevision!==accountRevision)throw Error('Trakt account changed. Close and reopen My Lists.');
  if(!state.trakt){form.hidden=true;container.innerHTML='<p class="muted">Connect Trakt in Settings to manage your synced lists.</p>';return}
  report('Loading Trakt lists…');
  const response=await traktPagedRead('/users/me/lists');
  if(!Array.isArray(response))throw Error('Trakt returned an invalid lists response');
  if(traktAccountRevision!==accountRevision||!back.isConnected)return;
  lists=response;itemsById=new Map();
  // Limit parallel list reads to avoid bursting the provider with large libraries.
  const results=[];
  for(let start=0;start<lists.length;start+=4){
   if(traktAccountRevision!==accountRevision||!back.isConnected)return;
   const batch=lists.slice(start,start+4).map(l=>traktPagedRead('/users/me/lists/'+traktListId(l)+'/items'));
   results.push(...await Promise.allSettled(batch));
  }
  if(traktAccountRevision!==accountRevision||!back.isConnected)return;
  results.forEach((r,i)=>{if(r.status==='fulfilled'&&Array.isArray(r.value))itemsById.set(traktListId(lists[i]),r.value)});
  render();report(results.some(r=>r.status==='rejected'||!Array.isArray(r.value))?'Some list items could not be loaded. Use Refresh lists to retry.':'');
 };
 back.querySelector('#refresh-personal-lists').onclick=()=>void run(load);
 const render=()=>{
  const payload=selected?traktListPayload(selected):null;
  const query=listQuery.toLocaleLowerCase().trim();
  const visible=lists.map((list,i)=>({list,i,entries:itemsById.get(traktListId(list))})).filter(({list,entries})=>
   !query||String(list.name||'').toLocaleLowerCase().includes(query)||
    (entries||[]).some(item=>String(item.movie?.title||item.show?.title||'').toLocaleLowerCase().includes(query)));
  if(listSort==='name')visible.sort((a,b)=>String(a.list.name||'').localeCompare(String(b.list.name||'')));
  else if(listSort==='size')visible.sort((a,b)=>(b.entries?.length||0)-(a.entries?.length||0));
  back.querySelector('#personal-list-count').textContent=`${visible.length} of ${lists.length} lists`;
  container.innerHTML=visible.length?visible.map(({list,i,entries})=>{
   const id=traktListId(list),has=entries&&selected&&traktListContains(entries,selected);
   const matching=entries?.map((item,j)=>({item,j})).filter(({item})=>!query||String(list.name||'').toLocaleLowerCase().includes(query)||String(item.movie?.title||item.show?.title||'').toLocaleLowerCase().includes(query));
   return `<section class="personal-list-group"><div class="personal-list-heading"><h3>${esc(list.name)} <small>(${entries?entries.length:'?'})</small></h3><button class="chip" data-delete-list="${i}">Delete list</button></div>${selected&&payload&&entries?`<button class="chip" data-toggle-list="${i}">${has?'Remove title from list':'Add title to list'}</button>`:''}<div class="personal-list-items">${entries?matching.map(({item,j})=>`<div class="personal-list-item"><span>${esc(item.movie?.title||item.show?.title||'Untitled')} <small>· ${esc(item.type)}</small></span><button class="chip" data-remove-entry="${i}:${j}">Remove</button></div>`).join('')||'<p class="muted">No matching titles.</p>':'<p class="muted">List items unavailable.</p>'}</div></section>`
  }).join(''):lists.length?'<p class="muted">No Trakt lists or titles match this search.</p>':'<p class="muted">Create your first Trakt list to get started.</p>';
  if(selected&&!payload)report('This title cannot be matched to a Trakt movie or show.');
  container.querySelectorAll('[data-delete-list]').forEach(button=>button.onclick=()=>run(async()=>{
   const list=lists[Number(button.dataset.deleteList)];if(!confirm('Delete Trakt list "'+list.name+'"? This affects every device.'))return;
   if(traktAccountRevision!==accountRevision)throw Error('Trakt account changed');await trakt('/users/me/lists/'+traktListId(list),{method:'DELETE'});await load();
  }));
  container.querySelectorAll('[data-toggle-list]').forEach(button=>button.onclick=()=>run(async()=>{
   const list=lists[Number(button.dataset.toggleList)],id=traktListId(list);if(!itemsById.has(id))throw Error('List contents have not loaded. Refresh before editing.');const has=traktListContains(itemsById.get(id),selected);
   if(traktAccountRevision!==accountRevision)throw Error('Trakt account changed');await trakt('/users/me/lists/'+id+'/items',{method:has?'DELETE':'POST',body:JSON.stringify(payload)});await load();
  }));
  container.querySelectorAll('[data-remove-entry]').forEach(button=>button.onclick=()=>run(async()=>{
   const [i,j]=button.dataset.removeEntry.split(':').map(Number),list=lists[i],entry=itemsById.get(traktListId(list))?.[j];
   if(!entry)return;const kind=entry.type==='movie'?'movies':entry.type==='show'?'shows':null;if(!kind)return;
   if(traktAccountRevision!==accountRevision)throw Error('Trakt account changed');await trakt('/users/me/lists/'+traktListId(list)+'/items',{method:'DELETE',body:JSON.stringify({[kind]:[{ids:entry[entry.type].ids}]})});await load();
  }));
 };
 back.querySelector('#personal-list-search').oninput=e=>{listQuery=e.target.value;render()};back.querySelector('#personal-list-sort').onchange=e=>{listSort=e.target.value;render()};
 form.onsubmit=e=>{e.preventDefault();void run(async()=>{
  const input=back.querySelector('#personal-list-name'),name=input.value.trim();if(!name)return;
  if(traktAccountRevision!==accountRevision)throw Error('Trakt account changed');await trakt('/users/me/lists',{method:'POST',body:JSON.stringify({name,privacy:'private'})});input.value='';await load();
 })};
 void run(load);back.querySelector('.close').focus();
}
function showSettings(){let back=document.createElement('div');back.className='modal-back';back.innerHTML=`<div class="modal settings" role="dialog" aria-modal="true" aria-label="Settings" tabindex="-1"><button class="close" aria-label="Close settings">${uiIcon('xmark')}</button><h2>Settings</h2><p>Connect accounts and configure discovery. Credentials remain in your browser session.</p><div class="panel"><h3>Trakt</h3>${sessionStorage.getItem('last_auth_error')?`<p class="footnote" style="overflow-wrap:anywhere;color:#f3b6b6">Last login error: ${esc(sessionStorage.getItem('last_auth_error'))}</p>`:''}<p>${state.trakt?(state.traktUser?'Connected as '+esc(state.traktUser):'Token saved — '+esc(state.traktVerifyError||'account not verified')):'Not connected'}</p><button class="action" id="trakt-login">${state.trakt?'Reconnect':'Connect Trakt'}</button> <button class="chip" id="trakt-out">Disconnect</button></div><div class="panel"><h3>AniList</h3><p>${state.anilist?(state.aniUser?'Connected as '+esc(state.aniUser):'Token saved — account not verified'):'Not connected'}</p><button class="action" id="ani-login">${state.anilist?'Reconnect':'Connect AniList'}</button> <button class="chip" id="ani-out">Disconnect</button></div><div class="panel home-settings"><h3>Homepage layout</h3><p>Choose which sections appear on your home dashboard. Saved on this device.</p>${[['featured','Featured title'],['library','Continue Watching and Watchlist'],['discovery','Discovery balance'],['explanation','Recommendation explanation']].map(([key,label])=>`<label class="setting-switch"><input type="checkbox" data-home-pref="${key}" ${homePrefs[key]?'checked':''}><span>${label}</span></label>`).join('')}<label class="setting-switch"><span>Poster density</span><select id="home-density"><option value="comfortable" ${homePrefs.density==='comfortable'?'selected':''}>Comfortable</option><option value="compact" ${homePrefs.density==='compact'?'selected':''}>Compact</option></select></label><label class="setting-switch"><span>First homepage section</span><select id="home-priority"><option value="featured" ${homePrefs.priority==='featured'?'selected':''}>Featured title</option><option value="library" ${homePrefs.priority==='library'?'selected':''}>My library rows</option></select></label><button class="chip" id="home-reset" type="button">Restore homepage defaults</button></div><div class="panel"><h3>Preview data</h3><p>Use fictional placeholder titles if APIs are not configured.</p><button class="chip" id="demo">${state.demo?'Disable':'Enable'} preview data</button></div><p class="footnote">TMDB requires the TMDB_READ_TOKEN Netlify environment variable. Trakt requires TRAKT_CLIENT_ID; AniList requires ANILIST_CLIENT_ID and ANILIST_CLIENT_SECRET (server-side only). OAuth redirect URLs must match this site's HTTPS address. No account passwords are requested.</p><p class="footnote">Movie/TV posters and metadata: TMDB. This product uses the TMDB API but is not endorsed or certified by TMDB. Anime data: AniList.</p><p class="footnote">Interface icon assets: Arctic Fuse by jurialmunkey (CC BY-NC-SA 4.0); source and derivative credits are in the licence file. <a href="/ARCTIC-FUSE-LICENSE.txt" target="_blank" rel="noopener noreferrer">Read the icon licence</a>.</p></div>`;document.body.append(back);const settingsOrigin=document.activeElement;const settingsDialog=back.querySelector('.settings');const closeSettings=()=>{if(!back.isConnected)return;back.remove();document.removeEventListener('keydown',settingsKeydown,true);if(settingsOrigin?.isConnected)settingsOrigin.focus()};const settingsKeydown=e=>{if(!back.isConnected)return;if(e.key==='Escape'){e.preventDefault();e.stopPropagation();closeSettings();return}if(e.key!=='Tab')return;const focusable=[...settingsDialog.querySelectorAll('button:not([disabled]),input:not([disabled]),select:not([disabled]),a[href]')].filter(el=>el.getClientRects().length);if(!focusable.length){e.preventDefault();settingsDialog.focus();return}const first=focusable[0],last=focusable.at(-1);if(e.shiftKey&&(document.activeElement===first||!settingsDialog.contains(document.activeElement))){e.preventDefault();last.focus()}else if(!e.shiftKey&&(document.activeElement===last||!settingsDialog.contains(document.activeElement))){e.preventDefault();first.focus()}};document.addEventListener('keydown',settingsKeydown,true);settingsDialog.querySelector('.close').focus();back.querySelectorAll('[data-home-pref]').forEach(input=>input.onchange=()=>{homePrefs[input.dataset.homePref]=input.checked;saveHomePrefs();renderMain();if(state.tab==='Recommended'&&homePrefs.library)void renderHomeDashboard()});back.querySelector('#home-priority').onchange=e=>{homePrefs.priority=e.target.value==='library'?'library':'featured';saveHomePrefs();applyHomePriority()};back.querySelector('#home-density').onchange=e=>{homePrefs.density=e.target.value;saveHomePrefs();renderMain();if(state.tab==='Recommended'&&homePrefs.library)void renderHomeDashboard()};back.querySelector('#home-reset').onclick=()=>{homePrefs={...defaultHomePrefs};saveHomePrefs();closeSettings();showSettings();renderMain();if(state.tab==='Recommended')void renderHomeDashboard()};back.querySelector('.close').onclick=closeSettings;back.onclick=e=>{if(e.target===back)closeSettings()};back.querySelector('#trakt-login').onclick=loginTrakt;back.querySelector('#ani-login').onclick=loginAni;back.querySelector('#trakt-out').onclick=()=>{sessionStorage.removeItem('trakt_token');sessionStorage.removeItem('trakt_refresh_token');sessionStorage.removeItem('trakt_expires_at');state.trakt='';traktAccountRevision++;state.traktUser=null;clearTrackingCache();closeSettings();toast('Trakt disconnected');load()};back.querySelector('#ani-out').onclick=()=>{sessionStorage.removeItem('anilist_token');state.anilist='';anilistAccountRevision++;state.aniUser=null;clearAnimeLibraryCache();closeSettings();toast('AniList disconnected');load()};back.querySelector('#demo').onclick=()=>{state.demo=!state.demo;store('demo',state.demo);closeSettings();load()}}
function randomString(){let b=crypto.getRandomValues(new Uint8Array(32));return Array.from(b,x=>('0'+x.toString(16)).slice(-2)).join('')}
async function loginTrakt(){
  if(['127.0.0.1','localhost'].includes(location.hostname)){toast('Local test: use local-login.html to connect with an existing Trakt token. OAuth sign-in is available on the deployed site.');return}
  if(!TRAKT_ID){toast('Trakt Client ID is missing');return}
  if(!crypto?.subtle){toast('Secure browser context required for Trakt PKCE');return}
  const oauthState=randomString();
  const verifier=randomString()+randomString();
  const hash=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(verifier));
  const challenge=btoa(String.fromCharCode(...new Uint8Array(hash))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
  sessionStorage.setItem('oauth_trakt_state',oauthState);
  sessionStorage.setItem('oauth_trakt_verifier',verifier);
  const redirect=location.origin+'/callback';
  location.href='https://auth.trakt.tv/oauth/authorize?'+new URLSearchParams({response_type:'code',client_id:TRAKT_ID,redirect_uri:redirect,state:oauthState,code_challenge:challenge,code_challenge_method:'S256'}).toString();
}
function loginAni(){
  if(['127.0.0.1','localhost'].includes(location.hostname)){toast('AniList OAuth requires the deployed site. The local test server cannot exchange AniList authorization codes.');return}
  const oauthState=randomString();sessionStorage.setItem('oauth_anilist_state',oauthState);
  const redirect=location.origin+'/callback';
  location.href='https://anilist.co/api/v2/oauth/authorize?'+new URLSearchParams({client_id:ANILIST_ID,response_type:'code',redirect_uri:redirect,state:oauthState}).toString();
}
// A gateway challenge is a definite rejection before the OAuth code reached
// Trakt. Only in that narrow case may the browser-side exchange use the server
// route. Never replay an authorization code after ambiguous success, a JSON
// OAuth error, or an HTTP rate limit.
function isTraktGatewayBlocked(response,raw){
 if(![403,502,503].includes(response.status))return false;
 const type=(response.headers?.get?.('content-type')||'').toLowerCase();
 if(type.includes('json'))return false;
 return /cloudflare|sorry, you have been blocked|attention required|captcha challenge|access denied/i.test(String(raw).slice(0,2048));
}
async function callback(){
  if(location.pathname!=='/callback')return;
  const p=new URLSearchParams(location.search),code=p.get('code'),returnedState=p.get('state');
  const traktState=sessionStorage.getItem('oauth_trakt_state'),aniState=sessionStorage.getItem('oauth_anilist_state');
  history.replaceState({},'', '/');
  const clearPendingOAuth=()=>{for(const key of ['oauth_trakt_state','oauth_trakt_verifier','oauth_anilist_state'])sessionStorage.removeItem(key)};
  if(p.get('error')){clearPendingOAuth();authFailure('Authorization rejected: '+p.get('error'));return}
  if(!code){clearPendingOAuth();authFailure('No authorization code returned');return}
  let service='',endpoint='',body={code,redirect_uri:location.origin+'/callback'};
  if(returnedState&&traktState&&returnedState===traktState){service='Trakt';endpoint='/api/trakt-token';body.code_verifier=sessionStorage.getItem('oauth_trakt_verifier');if(!body.code_verifier){authFailure('Trakt PKCE verifier missing; sign in again in the same Safari tab.');return}}
  else if(returnedState&&aniState&&returnedState===aniState){service='AniList';endpoint='/api/anilist-token'}
  else {clearPendingOAuth();authFailure('OAuth state mismatch. Return to Settings and reconnect in the same Safari tab.');return}
  let stage='request';
  try{
    let r,raw;
    if(service==='Trakt'){
      // Try the browser-side PKCE exchange first to avoid shared server IP
      // gateway challenges. Use Netlify for CORS failure or a *recognizable*
      // gateway rejection, not for a consumed code or a JSON OAuth failure.
      const payload={...body,client_id:TRAKT_ID,grant_type:'authorization_code'};
      let needsServer=false;
      try{
        stage='browser exchange';
        r=await fetch('https://api.trakt.tv/oauth/token',{method:'POST',mode:'cors',headers:{'content-type':'application/json','accept':'application/json'},body:JSON.stringify(payload),cache:'no-store'});
      }catch(browserError){needsServer=true}
      if(!needsServer){
        raw=await r.text();
        needsServer=isTraktGatewayBlocked(r,raw);
      }
      if(needsServer){
        stage='server fallback';
        r=await fetch(new URL(endpoint,location.origin).href,{method:'POST',headers:{'content-type':'application/json','accept':'application/json'},body:JSON.stringify(body),cache:'no-store'});
        raw=await r.text();
      }
    }else{
      r=await fetch(new URL(endpoint,location.origin).href,{method:'POST',headers:{'content-type':'application/json','accept':'application/json'},body:JSON.stringify(body),cache:'no-store'});
      raw=await r.text();
    }
    stage+=' response';
    let d;
    try{d=JSON.parse(raw)}catch{throw Error('Token exchange returned HTML/non-JSON (HTTP '+r.status+', '+(r.headers.get('content-type')||'unknown type')+'). Trakt may be blocking this network request.')} 
    if(!r.ok||!d.access_token)throw Error('HTTP '+r.status+': '+String(d.error_description||d.message||d.error||'Token exchange failed').slice(0,220));
    const key=service==='Trakt'?'trakt':'anilist';if(key==='trakt')saveTraktCredentials(d);else{sessionStorage.setItem('anilist_token',d.access_token);state.anilist=d.access_token;anilistAccountRevision++;clearAnimeLibraryCache()}
    sessionStorage.removeItem('last_auth_error');
    toast(service+' token saved; verifying account…');
    stage='verification';
    try{await verifyAccounts()}catch(e){toast(service+' token saved, but verification failed: '+e.message)}
    if(service==='Trakt'&&!state.traktUser)toast('Trakt token saved, but account verification failed.');else toast(service+' connected'+(service==='Trakt'?' as '+state.traktUser:state.aniUser?' as '+state.aniUser:''));
  }catch(e){authFailure(service+' login failed ['+stage+']: '+(e?.message||String(e)))}
  finally{if(service==='Trakt'){sessionStorage.removeItem('oauth_trakt_state');sessionStorage.removeItem('oauth_trakt_verifier')}else sessionStorage.removeItem('oauth_anilist_state')}
}
function authFailure(message){sessionStorage.setItem('last_auth_error',message);toast(message);}

// Make PWA updates explicit. A waiting worker must never replace an in-use
// mobile/desktop page silently, particularly while an account write is running.
function setupPwaUpdates(registration, serviceWorker=navigator.serviceWorker, reload=()=>window.location.reload(), writeActivity={
 isBusy:()=>typeof activeProviderWrites!=='undefined'&&activeProviderWrites>0,
 subscribe:listener=>{if(typeof providerWriteListeners!=='undefined')providerWriteListeners.add(listener)}
}){
 const notice=document.createElement('div');notice.id='update-banner';notice.className='update-banner';
 notice.hidden=true;notice.setAttribute('role','status');notice.setAttribute('aria-live','polite');
 const message=document.createElement('span');
 const button=document.createElement('button');button.type='button';button.textContent='Reload to update';
 notice.append(message,button);document.body.append(notice);
 let accepted=false,reloaded=false,updatedElsewhere=false;
 let hadController=Boolean(serviceWorker.controller),activationReady=false;
 const busy=()=>writeActivity.isBusy();
 const reloadWhenReady=()=>{
  if(!accepted||!activationReady||reloaded||busy())return false;
  reloaded=true;reload();return true;
 };
 const show=()=>{
  if(reloaded||!serviceWorker.controller)return;
  if(!accepted&&!updatedElsewhere&&!registration.waiting){notice.hidden=true;return;}
  message.textContent=busy()?'Finish saving your tracking changes before updating.':
   accepted?'Applying update…':updatedElsewhere?'A newer version is active in another tab.':'A new Mokumokuren version is ready.';
  button.disabled=accepted||busy();notice.hidden=false;
 };
 const sync=()=>{if(!reloadWhenReady())show()};
 writeActivity.subscribe(sync);
 button.addEventListener('click',()=>{
  if(accepted||busy())return;
  accepted=true;button.disabled=true;
  if(registration.waiting && !updatedElsewhere){
   // Only the explicit user action activates the staged service worker.
   const worker=registration.waiting;
   try{
    worker.addEventListener?.('statechange',()=>{
     if(worker.state==='redundant'&&!activationReady&&!reloaded){accepted=false;show()}
    });
    worker.postMessage({type:'ACTIVATE_UPDATE'});show();
   }catch{
    accepted=false;show();message.textContent='Update could not start. Try again.';
   }
  }else{
   activationReady=true;sync();
  }
 });
 serviceWorker.addEventListener('controllerchange',()=>{
  if(reloaded||!serviceWorker.controller)return;
  // Claiming the first installation is expected and needs no update notice.
  if(!hadController){hadController=true;show();return;}
  if(accepted){activationReady=true;sync();return;}
  updatedElsewhere=true;show();
 });
 registration.addEventListener('updatefound',()=>{
  const worker=registration.installing;
  if(!worker)return;
  worker.addEventListener('statechange',()=>{
   if(worker.state==='installed')show();
  });
 });
 show();
 // The browser checks for a new SW on registration; check again when the app
 // returns to the foreground after prolonged use. Never poll while offline.
 let lastCheck=Date.now();
 const check=()=>{
  if(document.visibilityState!=='visible'||navigator.onLine===false||Date.now()-lastCheck<30*60*1000)return;
  lastCheck=Date.now();
  registration.update().catch(error=>console.warn('Update check unavailable:',error));
 };
 document.addEventListener('visibilitychange',check);
 window.addEventListener('online',check);
}

// Mobile and desktop offline support: the service worker only stores public app assets.
// Account data, OAuth callbacks and API mutations remain strictly network-only.
function setupConnectivity(){
 const banner=document.createElement('div');
 banner.id='connection-banner';banner.className='connection-banner';
 banner.setAttribute('role','status');banner.setAttribute('aria-live','polite');
 document.body.append(banner);
 const update=()=>{
  const offline=navigator.onLine===false;
  banner.hidden=!offline;
  banner.textContent=offline?'Offline: you can open the app, but Trakt and AniList changes require a connection.':'';
 };
 window.addEventListener('online',update);
 window.addEventListener('offline',update);
 update();
 if('serviceWorker' in navigator && (location.protocol==='https:' || ['localhost','127.0.0.1'].includes(location.hostname))){
  navigator.serviceWorker.register('/service-worker.js',{scope:'/'}).then(registration=>setupPwaUpdates(registration)).catch(error=>console.warn('Offline shell unavailable:',error));
 }
}

await callback();layout();setupConnectivity();await verifyAccounts();load();
