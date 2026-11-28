
'use strict';
const $=s=>document.querySelector(s);
const e=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const {events,periods,sources,visuals}=chronovaData;
const byPeriod=new Map(periods.map(p=>[p.id,p]));
const storeKey='nexora.chronova.v1';
const now=new Date().getFullYear();
const turkish=new Intl.NumberFormat('tr-TR');
let visits=[],favorites=[],discoveries=[],quizRuns=[],bestQuiz=0;
try{
  const saved=JSON.parse(localStorage.getItem(storeKey)??'{}');
  if(Array.isArray(saved.visits))visits=saved.visits.filter(id=>byPeriod.has(id));
  if(Array.isArray(saved.favorites))favorites=saved.favorites.filter(id=>events.some(ev=>ev.id===id));
  if(Array.isArray(saved.discoveries))discoveries=[...new Set(saved.discoveries.filter(id=>events.some(ev=>ev.id===id)))];
  if(Array.isArray(saved.quizRuns))quizRuns=saved.quizRuns.filter(run=>run&&Number.isInteger(run.score)&&run.score>=0&&run.score<=100&&Number.isInteger(run.total)&&run.total>=1&&run.total<=10&&Number.isInteger(run.correct)&&run.correct>=0&&run.correct<=run.total&&typeof run.date==='string'&&Number.isFinite(Date.parse(run.date)));
  bestQuiz=quizRuns.reduce((best,run)=>run.total===10?Math.max(best,run.score):best,0);
}catch{}
function save(){
  try{localStorage.setItem(storeKey,JSON.stringify({visits,favorites,discoveries,quizRuns}));}
  catch{$('#jumpError').textContent='Tarayıcı arşivi kaydedilemedi.';}
  window.dispatchEvent(new Event('chronova-records'));
}
const display=y=>(y<0?'MÖ ':'MS ')+turkish.format(Math.abs(y));
const range=$('#timeline'), dialog=$('#detail');
range.max=String(events.length-1);
let selected=0,year=1453,animationFrame=0,scenePeriod=null;
function ageDistance(a,b){
  return Math.abs((a<0?a+1:a)-(b<0?b+1:b));
}
function nearest(y){
  return events.reduce((best,item,i)=>ageDistance(item.year,y)<ageDistance(events[best].year,y)?i:best,0);
}
function paintImage(period){
  if(scenePeriod===period.id)return;
  scenePeriod=period.id;
  const image=$('#periodImage'),credit=$('#imageCredit'),note=$('#visualNote'), symbolic=$('#sceneSymbol');
  const visual=visuals[period.id];
  symbolic.textContent=period.icon;
  const showSymbol=()=>{image.hidden=true;credit.hidden=true;note.hidden=false;symbolic.hidden=false;};
  if(!visual){image.removeAttribute('src');showSymbol();return;}
  image.onload=()=>{
    if(scenePeriod!==period.id)return;
    image.hidden=false;symbolic.hidden=true;note.hidden=true;credit.hidden=false;
  };
  image.onerror=()=>{if(scenePeriod===period.id)showSymbol();};
  image.alt=visual.caption;
  image.src=visual.file;
  credit.textContent=visual.caption+' · '+visual.credit+' · '+visual.license;
  credit.href=visual.url;
  symbolic.hidden=true;note.hidden=true;credit.hidden=true;image.hidden=true;
}
function favoriteButton(){
  const saved=favorites.includes(events[selected].id);
  $('#favorite').textContent=saved?'★ Kaydedildi':'☆ Kaydet';
  $('#favorite').setAttribute('aria-pressed',String(saved));
}
function moveTo(y,index=nearest(y),exact=false){
  year=y;selected=index;
  const event=events[index],period=byPeriod.get(event.period);
  $('#year').value=Math.abs(y);
  $('#calendar').value=y<0?'BC':'AD';
  $('#displayYear').textContent=exact?event.date:display(y);
  $('#displayEra').textContent=period.name+' · '+event.location;
  $('#eventTitle').textContent=event.title;
  $('#eventContext').textContent=event.year===year?'TARİHÎ OLAY':'SEÇİLEN YILA EN YAKIN KAYIT';
  $('#eventMeta').textContent=event.date+' · '+event.location;
  $('#description').textContent=event.description;
  $('#significance').textContent=event.importance;
  const source=sources[event.source];
  $('#eventSource').href=source.url;
  $('#eventSource').textContent=source.label+' ↗';
  range.value=String(index);
  range.setAttribute('aria-valuetext',event.date+' · '+event.title);
  $('#previous').disabled=index<=0;$('#next').disabled=index>=events.length-1;
  $('#jumpError').textContent='';
  document.documentElement.style.setProperty('--accent',period.tint);
  paintImage(period);
  visits=[period.id,...visits.filter(id=>id!==period.id)];
  if(event.year===y&&!discoveries.includes(event.id))discoveries.push(event.id);
  save();favoriteButton();
  window.dispatchEvent(new Event('chronova-move'));
  document.querySelectorAll('[data-quick]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.quick===period.id)));
  document.querySelectorAll('[data-era]').forEach(b=>b.dataset.active=String(b.dataset.era===period.id));
  const machine=$('.machine');
  machine.classList.remove('travel');
  cancelAnimationFrame(animationFrame);
  animationFrame=requestAnimationFrame(()=>machine.classList.add('travel'));
}
function stop(index){
  const i=Math.max(0,Math.min(events.length-1,index));
  moveTo(events[i].year,i,true);
}
function visit(period){
  const index=events.findIndex(ev=>ev.period===period.id&&ev.year===period.feature);
  if(index!==-1)stop(index);
}
$('#jumpForm').onsubmit=event=>{
  event.preventDefault();
  const value=$('#year').valueAsNumber, before=$('#calendar').value==='BC';
  if(!Number.isInteger(value)||value<1||value>(before?4000000:now)){
    $('#jumpError').textContent='MÖ 4.000.000 ile MS '+now+' arasında bir yıl gir. Takvimde yıl 0 yoktur.';return;
  }
  moveTo(before?-value:value);
};
$('#previous').onclick=()=>stop(selected-1);$('#next').onclick=()=>stop(selected+1);
range.oninput=()=>stop(Number(range.value));
$('#favorite').onclick=()=>{
  const id=events[selected].id;
  favorites=favorites.includes(id)?favorites.filter(x=>x!==id):[...favorites,id];
  save();favoriteButton();
};
function resultButtons(items){
  return items.map(item=>'<button type="button" class="result" data-event="'+e(item.id)+'"><strong>'+e(item.title)+'</strong><span>'+e(item.date+' · '+item.location)+'</span></button>').join('');
}
function normalized(s){
  return s.toLocaleLowerCase('tr').normalize('NFD').replace(/\p{Diacritic}/gu,'').replaceAll('ı','i');
}
function renderSearch(){
  const raw=$('#search').value.trim(), q=normalized(raw);
  if(!q){$('#results').innerHTML='<p class="empty">Bir olay adı, yer veya yıl ile arşivde ara.</p>';return;}
  const compact=q.replace(/[.\s]/g,'');
  const dateMatch=/^(mo|ms)?(-?\d+)(mo|ms)?$/.exec(compact);
  let results;
  if(dateMatch){
    const marker=dateMatch[1]??dateMatch[3];
    const number=Number(dateMatch[2]);
    const target=marker==='mo'?-Math.abs(number):number;
    results=events.filter(ev=>marker||number<0?ev.year===target:Math.abs(ev.year)===target);
    if(!results.length&&target!==0&&target>=-4000000&&target<=now){
      const button=document.createElement('button');
      button.className='result';button.textContent=display(target)+' yılına git';button.onclick=()=>moveTo(target);
      $('#results').replaceChildren(button);return;
    }
  }else{
    results=events.filter(ev=>normalized([ev.title,ev.location,ev.date,byPeriod.get(ev.period).name].join(' ')).includes(q));
  }
  $('#results').innerHTML=resultButtons(results.slice(0,16))||'<p class="empty">Eşleşen olay bulunamadı.</p>';
}
$('#search').oninput=renderSearch;
$('#stops').innerHTML=periods.map(p=>'<button type="button" data-quick="'+p.id+'">'+e(p.name)+'</button>').join('');
$('#eraGrid').innerHTML=periods.map(p=>'<button class="era-card" type="button" data-era="'+p.id+'" style="--tint:'+p.tint+'"><i aria-hidden="true">'+p.icon+'</i><strong>'+e(p.name)+'</strong><small>'+e(p.range)+'</small></button>').join('');
function showPeriod(period){
  $('#detailTitle').textContent=period.name;
  const labels=[['Tarih aralığı',period.range],['Coğrafya',period.location],['Kültür',period.culture],['Mimari',period.architecture],
    ['Önemli kişilikler',period.people],['Bilimsel ve kültürel katkılar',period.contributions]];
  const visual=visuals[period.id];
  const img=visual?'<figure class="detail-image"><img src="'+e(visual.file)+'" alt="'+e(visual.caption)+'"><figcaption><a href="'+e(visual.url)+'" target="_blank" rel="noopener">'+e(visual.caption+' · '+visual.credit+' · '+visual.license)+'</a></figcaption></figure>':'';
  $('#detailBody').innerHTML=img+'<dl>'+labels.map(([label,value])=>'<div><dt>'+label+'</dt><dd>'+e(value)+'</dd></div>').join('')+
    '</dl><button class="primary" data-quick="'+period.id+'">Bu döneme git</button><h3>Önemli olaylar</h3>'+resultButtons(events.filter(x=>x.period===period.id));
  dialog.showModal();
}
$('#openArchive').onclick=()=>{
  $('#detailTitle').textContent='Kaydettiklerim';
  const available=favorites.map(id=>events.find(ev=>ev.id===id)).filter(Boolean);
  $('#detailBody').innerHTML='<h3>Favori olaylar</h3>'+(resultButtons(available)||'<p class="empty">Henüz favori olay yok.</p>')+
    '<h3>Ziyaret edilen dönemler</h3>'+(visits.map(id=>'<button class="result" data-quick="'+id+'">'+e(byPeriod.get(id).name)+'</button>').join('')||'<p class="empty">Henüz ziyaret yok.</p>');
  dialog.showModal();
};
$('#closeDetail').onclick=()=>dialog.close();
document.addEventListener('click',event=>{
  const eventLink=event.target.closest('[data-event]'), quick=event.target.closest('[data-quick]'), card=event.target.closest('[data-era]');
  if(eventLink){
    const i=events.findIndex(ev=>ev.id===eventLink.dataset.event);
    if(i!==-1){if(dialog.open)dialog.close();stop(i);$('.event').scrollIntoView({block:'nearest'});}
  }else if(quick){
    if(dialog.open)dialog.close();
    visit(byPeriod.get(quick.dataset.quick));$('.machine').scrollIntoView({block:'nearest'});
  }else if(card)showPeriod(byPeriod.get(card.dataset.era));
});
renderSearch();
stop(events.findIndex(ev=>ev.period==='ottoman'&&ev.year===1453));
