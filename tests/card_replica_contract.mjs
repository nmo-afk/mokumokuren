import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const source=readFileSync(new URL('../app.js',import.meta.url),'utf8');
function excerpt(start,end){
 const from=source.indexOf(start),to=source.indexOf(end,from+start.length);
 assert.ok(from>=0&&to>from,`Missing source between ${start} and ${end}`);
 return source.slice(from,to);
}

class TestElement extends EventTarget {
 constructor({left=0,top=0,width=224,height=160}={}){
  super();
  this.attributes=new Map();
  this.style={};
  this.hidden=true;
  this.inert=true;
  this.isConnected=true;
  this.offsetWidth=width;
  this.offsetHeight=height;
  this.bounds={left,top,right:left+width,bottom:top+height};
 }
 setAttribute(name,value){this.attributes.set(name,value);}
 getAttribute(name){return this.attributes.get(name);}
 contains(target){return target===this||target===this.firstButton;}
 getClientRects(){return this.isConnected?[this.bounds]:[];}
 getBoundingClientRect(){return this.bounds;}
 querySelector(){return this.firstButton;}
 focus(){document.activeElement=this;}
 matches(name){return name===':popover-open'&&this.popoverOpen;}
 showPopover(){this.popoverOpen=true;}
 hidePopover(){this.popoverOpen=false;}
 remove(){this.isConnected=false;}
}
const document=new EventTarget();
const window=Object.assign(new EventTarget(),{innerWidth:375,innerHeight:640});
const sandbox={AbortController,document,window,state:{section:'Movies'},
 title:item=>item.title,
 pic:item=>item.image||'',
 backdrop:item=>item.backdrop_image||item.image||'',
 uiIcon:name=>`<svg data-icon="${name}"></svg>`,
 esc:value=>String(value??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;'),
 animeEntryStatus:item=>item.status==='CURRENT'?'Watching':'',
};
vm.createContext(sandbox);
vm.runInContext(excerpt('const tmdbDiscoveryGenres=','const TRAKT_ICONS =')+'\n'+
 excerpt('let activeTitleMenu=null;','function saveRecommendationFeedback(')+
 '\nglobalThis.api={card,cardCommunityScore,openTitleMenu};',sandbox);
const {card,cardCommunityScore,openTitleMenu}=sandbox.api;
const portrait=card({id:22,title:'The "title" <tag>',genre_ids:[18],certification:'PG-13',vote_average:8.35,
 release_date:'2026-02-11',runtime:104,image:'/poster.webp',backdrop_image:'/fanart.webp'},3);
assert.match(portrait,/data-open="22" data-library-index="3"/);
assert.match(portrait,/aria-label="The &quot;title&quot; &lt;tag&gt;\. 2026 · 104 min\. Drama\. PG-13\. 84% community rating"/);
assert.match(portrait,/card-flip-front[\s\S]*?src="\/poster\.webp"/);
assert.match(portrait,/card-flip-backdrop" loading="lazy" src="\/fanart\.webp"/);
assert.match(portrait,/card-flip-score[\s\S]*84%/);
const missing=card({id:36,title:'Unavailable metadata',vote_average:-2});
assert.match(missing,/class="placeholder"/);
assert.doesNotMatch(missing,/card-flip-score|class="card-flip-backdrop"|\bNaN\b/);
assert.equal(cardCommunityScore({averageScore:93,vote_average:7}),93);

const trigger=new TestElement({left:333,top:605,width:32,height:32});
const panel=new TestElement();
panel.firstButton=new TestElement();
assert.ok(openTitleMenu(trigger,panel));
assert.equal(trigger.getAttribute('aria-expanded'),'true');
assert.equal(panel.hidden,false);
assert.equal(panel.style.left,'141px');
assert.equal(panel.style.top,'472px');
assert.equal(document.activeElement,panel.firstButton);
const escape=Object.assign(new Event('keydown',{cancelable:true}),{key:'Escape'});
document.dispatchEvent(escape);
assert.equal(escape.defaultPrevented,true);
assert.equal(panel.popoverOpen,false);
assert.equal(panel.inert,true);
assert.equal(document.activeElement,trigger);

const fallback=new TestElement();
fallback.showPopover=undefined;
assert.ok(openTitleMenu(trigger,fallback,{removeOnClose:true}));
assert.equal(openTitleMenu(trigger,fallback),null);
assert.equal(fallback.isConnected,false);
assert.equal(trigger.getAttribute('aria-expanded'),'false');

assert.ok(openTitleMenu(trigger,panel));
document.dispatchEvent(new Event('pointerdown'));
assert.equal(panel.hidden,true);
assert.equal(trigger.getAttribute('aria-expanded'),'false');
assert.ok(openTitleMenu(trigger,panel));
trigger.isConnected=false;
window.dispatchEvent(new Event('scroll'));
assert.equal(panel.hidden,true);
console.log('PASS card media, real metadata, missing artwork, menu bounds, focus, Escape and dismissal');
