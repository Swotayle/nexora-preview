import {types,lots,initial,load,stats,advance,modify} from './simulation.js';
import {createView} from './scene.js';

const $=id=>document.getElementById(id);
const fmt=new Intl.NumberFormat('tr-TR'), period=72;
let city=load(),selected=null,view,mode='overview';
const timeLabels={auto:'Otomatik',day:'Gündüz',night:'Gece'};
const cityNames=['','Yerleşim','İlçe','Bölge merkezi','Metropol'];
function save(){
  try{localStorage.setItem('nexora.neocity.v1',JSON.stringify(city));}
  catch{$('message').textContent='Tarayıcı depolama alanı kullanılamıyor.';}
}
function paintSelection(){
  const slot=$('selection');slot.replaceChildren();
  const p=document.createElement('p'), current=city.lots[selected],t=current?types[current.type]:null;
  p.textContent=selected===null?'Arsa seçilmedi':t?t.name+' · Seviye '+current.level:'Arsa '+(selected+1)+' · İnşa edilebilir';
  slot.append(p);
  if(t){
    const meta=document.createElement('p');
    meta.textContent='Enerji '+(t.energy>0?'+':'')+t.energy*current.level+' · Su '+(t.water>0?'+':'')+t.water*current.level+(t.capacity?' · Kapasite '+t.capacity*current.level:'');
    slot.append(meta);
  }
  $('lot').value=selected??'';
  $('build').disabled=selected===null||Boolean(t);
  $('upgrade').disabled=!t||current.level>=4;
  $('remove').disabled=!t;
  $('upgrade').textContent=t&&current.level<4?'Geliştir · '+fmt.format(Math.ceil(t.cost*.6*current.level)):'Geliştir';
  $('remove').textContent=t?'Kaldır · +'+fmt.format(Math.floor(t.cost*.25*current.level)):'Kaldır';
}
function select(id){
  selected=id;view?.mark(id);paintSelection();
}
function showClock(){
  const minutes=Math.floor(city.phase*24*60);
  const hh=String(Math.floor(minutes/60)%24).padStart(2,'0'),mm=String(minutes%60).padStart(2,'0');
  $('cityClock').textContent=city.day+'. gün · '+hh+':'+mm+(city.light==='auto'?'':' · '+timeLabels[city.light]);
}
function paint(){
  const s=stats(city);
  $('cityLevel').textContent=cityNames[s.level]+' · Seviye '+s.level;
  const readouts=[['Nüfus / kapasite',fmt.format(city.pop)+' / '+fmt.format(s.capacity)],['Bütçe',fmt.format(city.budget)+' kredi',city.budget<0],['Günlük denge',(s.net>=0?'+':'')+fmt.format(s.net)+' kredi',s.net<0],['İstihdam kapasitesi',fmt.format(s.jobs)],['Enerji üretim / talep',s.production+' / '+s.demand,s.energyDeficit>0],['Su arzı / talep',s.supply+' / '+s.usage,s.waterDeficit>0],['Yenilenebilir enerji',s.renewable+' birim'],['Çevre',s.green+' / 100'],['Mutluluk',s.happy+' / 100'],['Dolu arsalar',s.size+' / '+lots.length]];
  const statsNode=$('stats');statsNode.replaceChildren();
  for(const [label,value,warning] of readouts){
    const wrap=document.createElement('div'),dt=document.createElement('dt'),dd=document.createElement('dd');
    dt.textContent=label;dd.textContent=value;if(warning)dd.className='warning';wrap.append(dt,dd);statsNode.append(wrap);
  }
  $('activity').replaceChildren(...city.events.map(msg=>{const li=document.createElement('li');li.textContent=msg;return li;}));
  $('quality').value=city.quality;$('populationPolicy').value=city.policy;
  $('lightMode').textContent='Işık · '+timeLabels[city.light];
  $('toggle').textContent=city.paused?'Simülasyonu sürdür':'Simülasyonu duraklat';
  showClock();paintSelection();
}
function transact(action){
  const message=modify(city,selected,action,$('building').value);
  if(message){$('message').textContent=message;return;}
  view?.sync(city);paint();$('message').textContent=city.events[0];save();
}
$('lot').add(new Option('Arsa seç',''));
lots.forEach(lot=>$('lot').add(new Option('Arsa '+(lot.id+1),lot.id)));
for(const [key,b] of Object.entries(types))$('building').add(new Option(b.name+' · '+b.cost+' kredi',key));
$('lot').onchange=e=>select(e.target.value===''?null:Number(e.target.value));
for(const action of ['build','upgrade','remove'])$(action).onclick=()=>transact(action);
try{
  view=createView($('viewport'),select,()=>city);
  view.sync(city);view.setQuality(city.quality);
}catch{
  $('message').textContent='3B görünüm için WebGL gerekiyor. Arsa listesinden şehir yönetimine devam edebilirsin.';
  for(const id of ['overview','street','closer','farther'])$(id).disabled=true;
  document.querySelectorAll('[data-move]').forEach(b=>b.disabled=true);
}
for(const choice of ['overview','street'])$(choice).onclick=()=>{
  mode=choice;view?.setMode(choice,selected);
  for(const id of ['overview','street'])$(id).setAttribute('aria-pressed',String(mode===id));
};
$('closer').onclick=()=>view?.zoom(.79);$('farther').onclick=()=>view?.zoom(1.26);
document.querySelectorAll('[data-move]').forEach(button=>{
  const dir=button.dataset.move;
  button.onpointerdown=e=>{button.setPointerCapture(e.pointerId);view?.hold(dir,true);};
  for(const name of ['pointerup','lostpointercapture','pointercancel'])button.addEventListener(name,()=>view?.hold(dir,false));
  button.onclick=e=>{if(e.detail===0){view?.hold(dir,true);setTimeout(()=>view?.hold(dir,false),180);}};
});
$('quality').onchange=e=>{city.quality=e.target.value;view?.setQuality(city.quality);save();};
$('populationPolicy').onchange=e=>{city.policy=e.target.value;paint();save();};
$('lightMode').onclick=()=>{
  const modes=Object.keys(timeLabels);city.light=modes[(modes.indexOf(city.light)+1)%modes.length];paint();save();
};
$('toggle').onclick=()=>{city.paused=!city.paused;paint();save();};
$('nextDay').onclick=()=>{advance(city);paint();save();};
$('reset').onclick=()=>{
  if(!confirm('Bu şehir ve tüm belediye kayıtları sıfırlansın mı?'))return;
  city=initial();select(null);view?.sync(city);view?.setQuality(city.quality);view?.setMode('overview');
  $('overview').setAttribute('aria-pressed','true');$('street').setAttribute('aria-pressed','false');
  mode='overview';paint();save();$('message').textContent='Yeni şehir oluşturuldu.';
};
let last=performance.now();
setInterval(()=>{
  const now=performance.now(),dt=Math.min(1,(now-last)/1000);last=now;
  if(city.paused||document.hidden)return;
  city.phase+=dt/period;
  if(city.phase>=1){city.phase%=1;advance(city);paint();save();}
  else showClock();
},240);
document.addEventListener('visibilitychange',()=>{if(document.hidden)save();});
window.addEventListener('pagehide',save);
paint();
