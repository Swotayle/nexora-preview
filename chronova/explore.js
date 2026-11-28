'use strict';
{
const {land,locations,people}=exploreData;
const periodOptions=(first,extra='')=>'<option value="">'+first+'</option>'+extra+periods.map(p=>'<option value="'+p.id+'">'+e(p.name)+'</option>').join('');
$('#mapPeriod').innerHTML=periodOptions('Tüm dönemler','<option value="current" selected>Zaman makinesindeki dönem</option>');
$('#quizPeriod').innerHTML=periodOptions('Tüm dönemler');
$('#peoplePeriod').innerHTML=periodOptions('Tüm dönemler');
const map=$('#worldMap'), layer=$('#worldLayer');
$('#worldLand').setAttribute('d',land);
$('#worldGrid').setAttribute('d',Array.from({length:11},(_,i)=>'M'+((i+1)*1000/12)+' 0v500').join('')+Array.from({length:5},(_,i)=>'M0 '+((i+1)*500/6)+'h1000').join(''));
let zoom=1,x=0,y=0,drag;
const project=([lon,lat])=>[(lon+180)*1000/360,(90-lat)*500/180];
const svgPoint=(cx,cy)=>new DOMPoint(cx,cy).matrixTransform(map.getScreenCTM().inverse());
function view(z,nx,ny){
  zoom=z;x=Math.min(0,Math.max(1000*(1-z),nx));y=Math.min(0,Math.max(500*(1-z),ny));
  layer.setAttribute('transform','translate('+x+' '+y+') scale('+z+')');
  map.style.setProperty('--pin-scale',1/z);
  $('#mapMinus').disabled=z===1;$('#mapPlus').disabled=z===10;
}
function magnify(factor,point={x:500,y:250}){
  const z=Math.min(10,Math.max(1,zoom*factor)), ratio=z/zoom;
  view(z,point.x-(point.x-x)*ratio,point.y-(point.y-y)*ratio);
}
$('#mapPlus').onclick=()=>magnify(1.5);
$('#mapMinus').onclick=()=>magnify(1/1.5);
$('#mapReset').onclick=()=>view(1,0,0);
map.addEventListener('wheel',ev=>{ev.preventDefault();magnify(ev.deltaY<0?1.2:1/1.2,svgPoint(ev.clientX,ev.clientY));},{passive:false});
map.addEventListener('keydown',ev=>{
  const delta={ArrowLeft:[70,0],ArrowRight:[-70,0],ArrowUp:[0,70],ArrowDown:[0,-70]}[ev.key];
  if(ev.key==='+'||ev.key==='=')magnify(1.5);
  else if(ev.key==='-')magnify(1/1.5);
  else if(delta)view(zoom,x+delta[0],y+delta[1]);
  else return;
  ev.preventDefault();
});
map.addEventListener('pointerdown',ev=>{
  if(ev.button!==0||ev.target.closest('[data-pin]'))return;
  const p=svgPoint(ev.clientX,ev.clientY);
  drag={id:ev.pointerId,x:p.x-x,y:p.y-y};
  map.setPointerCapture(ev.pointerId);
});
map.addEventListener('pointermove',ev=>{
  if(drag?.id!==ev.pointerId)return;
  const p=svgPoint(ev.clientX,ev.clientY);view(zoom,p.x-drag.x,p.y-drag.y);
});
for(const type of ['pointerup','pointercancel','lostpointercapture'])map.addEventListener(type,ev=>{if(drag?.id===ev.pointerId)drag=null;});
function pin(event,period){
  const [px,py]=project(locations[event.id]);
  const title=period?period.name:event.title;
  return '<g class="map-pin '+(period?'era-pin':'event-pin')+'" transform="translate('+px+' '+py+')" data-pin="'+(period?period.id:event.id)+'" role="button" tabindex="0" aria-label="'+e(title)+'"><g class="pin-shape"><title>'+e(title)+'</title><circle class="tap-area" r="14"/>'+(period?'<path d="M0 -8L8 0 0 8 -8 0Z"/>':'<circle class="dot" r="4.5"/>')+'</g></g>';
}
function renderMap(){
  const pick=$('#mapPeriod').value, filter=pick==='current'?events[selected].period:pick, mode=$('#mapLayer').value,q=normalized($('#mapQuery').value.trim());
  const active=events.filter(ev=>(!filter||ev.period===filter)&&normalized(ev.title+' '+ev.location).includes(q));
  const eraPins=periods.filter(p=>(!filter||p.id===filter)&&(!q||active.some(ev=>ev.period===p.id)));
  const centers=mode==='events'?[]:eraPins;
  const sites=mode==='periods'?[]:active;
  $('#worldPins').innerHTML=centers.map(p=>pin(events.find(ev=>ev.period===p.id&&ev.year===p.feature)??events.find(ev=>ev.period===p.id),p)).join('')+sites.map(ev=>pin(ev)).join('');
  $('#mapStatus').textContent=sites.length+' olay · '+centers.length+' dönem merkezi · '+(filter?byPeriod.get(filter).name:'Dünya');
  $('#mapMatches').innerHTML=sites.map(ev=>'<button type="button" data-map-event="'+ev.id+'">'+e(ev.title)+'</button>').join('')+centers.map(p=>'<button type="button" data-map-era="'+p.id+'">◆ '+e(p.name)+'</button>').join('');
}
function openMap(id){
  if(byPeriod.has(id)){showPeriod(byPeriod.get(id));return;}
  const index=events.findIndex(ev=>ev.id===id);
  if(index<0)return;
  stop(index);
  const ev=events[index], source=sources[ev.source];
  $('#detailTitle').textContent=ev.title;
  $('#detailBody').innerHTML='<p class="meta">'+e(ev.date+' · '+ev.location)+'</p><p>'+e(ev.description)+'</p><h3>Neden önemli?</h3><p>'+e(ev.importance)+'</p><p class="muted">'+e(locations[id][2]||'Haritadaki konum yaklaşıktır.')+'</p><a class="source" target="_blank" rel="noopener" href="'+e(source.url)+'">'+e(source.label)+' ↗</a>';
  dialog.showModal();
}
$('#worldPins').onclick=ev=>{const target=ev.target.closest('[data-pin]');if(target)openMap(target.dataset.pin);};
$('#worldPins').onkeydown=ev=>{if((ev.key==='Enter'||ev.key===' ')&&ev.target.dataset.pin){ev.preventDefault();openMap(ev.target.dataset.pin);}};
$('#mapMatches').onclick=ev=>{const id=ev.target.dataset.mapEvent||ev.target.dataset.mapEra;if(id)openMap(id);};
for(const id of ['mapPeriod','mapLayer','mapQuery'])$('#'+id).addEventListener('input',renderMap);
window.addEventListener('chronova-move',renderMap);
view(1,0,0);renderMap();

function shuffled(items){
  const copy=[...items];
  for(let i=copy.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[copy[i],copy[j]]=[copy[j],copy[i]];}
  return copy;
}
const levels=[
  {name:'Kolay',field:'location',prompt:ev=>ev.title+' — Arşiv bu olayı hangi konumla ilişkilendiriyor?'},
  {name:'Orta',field:'date',prompt:ev=>ev.title+' — Bu olayın tarih kaydı hangisi?'},
  {name:'Zor',field:'title',prompt:ev=>'Bu tarihsel önem hangi olaya ait? '+ev.importance}
];
const bank=events.flatMap(ev=>levels.map(level=>({ev,level,key:ev.id+'-'+level.name})));
let round=[],position=0,right=0,answered=false,quizFilter;
const eligible=()=>bank.filter(q=>(!$('#quizPeriod').value||q.ev.period===$('#quizPeriod').value)&&(!$('#quizLevel').value||q.level.name===$('#quizLevel').value));
function quizAvailability(){
  const count=eligible().length;
  $('#quizAvailability').textContent=count+' soru mevcut. '+(count<10?'Bu filtreyle '+count+' soruluk alıştırma yapılır.':'Her turda 10 farklı soru gelir.');
  $('#quizStart').disabled=!count;
}
$('#quizLevel').onchange=$('#quizPeriod').onchange=quizAvailability;
function showQuestion(){
  const q=round[position],ev=q.ev,field=q.level.field, correct=ev[field];
  const distractors=[...new Set([...shuffled(events.filter(item=>item.period===ev.period)),...shuffled(events)].map(item=>item[field]).filter(value=>value!==correct))].slice(0,3);
  const options=shuffled([correct,...distractors]);
  answered=false;
  const pane=$('#quizRound');
  pane.innerHTML='<p class="meta">Soru '+(position+1)+' / '+round.length+' · '+q.level.name+'</p><h3 tabindex="-1">'+e(q.level.prompt(ev))+'</h3><div class="quiz-options">'+options.map((option,i)=>'<button type="button" data-answer="'+i+'">'+e(option)+'</button>').join('')+'</div><div class="quiz-feedback" aria-live="polite"></div><button type="button" class="primary quiz-next" hidden>'+(position+1===round.length?'Sonucu gör':'Sonraki soru')+'</button>';
  pane.querySelector('h3').focus();
  const next=pane.querySelector('.quiz-next');
  pane.querySelectorAll('[data-answer]').forEach(button=>button.onclick=()=>{
    if(answered)return;
    answered=true;
    const hit=options[Number(button.dataset.answer)]===correct;
    if(hit)right++;
    pane.querySelectorAll('[data-answer]').forEach(b=>{b.disabled=true;b.classList.toggle('correct',options[Number(b.dataset.answer)]===correct);});
    const source=sources[ev.source];
    pane.querySelector('.quiz-feedback').innerHTML='<strong>'+(hit?'Doğru!':'Doğru cevap · '+e(correct))+'</strong><p>'+e(ev.description)+'</p><a target="_blank" rel="noopener" href="'+e(source.url)+'">'+e(source.label)+' ↗</a>';
    next.hidden=false;next.focus();
  });
  next.onclick=()=>{position++;if(position===round.length)finishRound();else showQuestion();};
}
function finishRound(){
  const total=round.length,score=Math.round(100*right/total);
  if(total===10)bestQuiz=Math.max(bestQuiz,score);
  quizRuns.push({correct:right,total,score,date:new Date().toISOString(),...quizFilter});
  save();
  $('#quizRound').hidden=true;
  const result=$('#quizResult');
  result.hidden=false;
  result.innerHTML='<h3 tabindex="-1">'+score+' / 100 puan</h3><p>'+right+' / '+total+' doğru · En iyi 10 soruluk tur: '+bestQuiz+' / 100</p><button type="button" class="primary">Yeni tur seç</button>';
  result.querySelector('h3').focus();
  result.querySelector('button').onclick=()=>{result.hidden=true;$('#quizSetup').hidden=false;$('#quizStart').focus();};
}
$('#quizStart').onclick=()=>{
  round=shuffled(eligible()).slice(0,10);
  if(!round.length)return;
  quizFilter={period:$('#quizPeriod').value,level:$('#quizLevel').value};
  position=0;right=0;$('#quizSetup').hidden=true;$('#quizRound').hidden=false;showQuestion();
};
quizAvailability();

const empty='<p class="muted">Henüz kayıt yok.</p>';
function paintJournal(){
  const percent=Math.round(discoveries.length*100/events.length);
  $('#journalStats').innerHTML='<div><strong>'+percent+'%</strong><span>Keşif</span></div><div><strong>'+visits.length+' / '+periods.length+'</strong><span>Dönem</span></div><div><strong>'+discoveries.length+' / '+events.length+'</strong><span>Olay</span></div>';
  $('#exploreProgress').value=percent;
  const badges=[['✦','İlk Yolculuk',discoveries.length>0],['◇','Dönem Gezgini',visits.length>=7],['◈','Arşiv Ustası',discoveries.length>=25],['★','Koleksiyoncu',favorites.length>=5],['✶','Tam İsabet',bestQuiz===100]];
  $('#journalBadges').innerHTML=badges.filter(b=>b[2]).map(b=>'<span>'+b[0]+' '+b[1]+'</span>').join('')||empty;
  $('#journalPeriods').innerHTML=visits.map(id=>'<button type="button" class="result" data-quick="'+e(id)+'">'+e(byPeriod.get(id).name)+'</button>').join('')||empty;
  for(const [id,ids] of [['journalEvents',discoveries],['journalFavorites',favorites]])$('#'+id).innerHTML=resultButtons(ids.map(item=>events.find(ev=>ev.id===item)).filter(Boolean).reverse())||empty;
  const dates=new Intl.DateTimeFormat('tr-TR',{dateStyle:'medium',timeStyle:'short'});
  $('#journalRuns').innerHTML=quizRuns.slice().reverse().map(run=>'<p>'+e(dates.format(new Date(run.date)))+' · '+run.correct+'/'+run.total+' doğru · '+run.score+' puan · '+e(byPeriod.get(run.period)?.name||'Tüm dönemler')+' · '+e(run.level||'Tüm seviyeler')+'</p>').join('')||empty;
}
window.addEventListener('chronova-records',paintJournal);paintJournal();

const initials=name=>name.split(/\s+/).slice(0,2).map(word=>word[0]).join('');
function portrait(person){
  const [file,caption]=person.portrait;
  return file?'<img src="'+e(file)+'" loading="lazy" alt="'+e(caption)+'">':'<span class="monogram" aria-label="Portre yok, baş harfler">'+e(initials(person.name))+'</span>';
}
function paintPeople(){
  const q=normalized($('#peopleQuery').value.trim()), period=$('#peoplePeriod').value;
  $('#peopleGrid').innerHTML=people.map((p,i)=>({p,i})).filter(({p})=>(!period||p.period===period)&&normalized(p.name+' '+p.description).includes(q)).map(({p,i})=>'<button type="button" class="person-card" data-person="'+i+'">'+portrait(p)+'<span><strong>'+e(p.name)+'</strong><small>'+e(byPeriod.get(p.period).name)+'</small><small>'+e(p.dates)+'</small></span></button>').join('')||empty;
}
$('#peoplePeriod').onchange=$('#peopleQuery').oninput=paintPeople;
$('#peopleGrid').onclick=ev=>{
  const button=ev.target.closest('[data-person]');
  if(!button)return;
  const p=people[Number(button.dataset.person)];
  $('#detailTitle').textContent=p.name;
  $('#detailBody').innerHTML='<div class="person-detail">'+portrait(p)+'<div><p class="meta">'+e(p.dates+' · '+byPeriod.get(p.period).name)+'</p><p>'+e(p.description)+'</p><p class="muted">'+e(p.portrait[1]||'Portre yok · Baş harfler')+'</p>'+(p.portrait[2]?'<a target="_blank" rel="noopener" href="'+e(p.portrait[2])+'">Portre kaynağı ↗</a>':'')+'</div></div><h3>İlişkili olaylar</h3>'+resultButtons(p.events.map(id=>events.find(ev=>ev.id===id)).filter(Boolean))+'<p><a class="source" target="_blank" rel="noopener" href="'+e(p.url)+'">Biyografi kaynağı ↗</a></p>';
  dialog.showModal();
};
paintPeople();
}
