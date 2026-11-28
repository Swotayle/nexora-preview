import {space,memory,defense} from './games.js';
const $=id=>document.getElementById(id);
const board=$('board'),ctx=board.getContext('2d'),memoryBoard=$('memory'),runnerBoard=$('runner');
const games={
  space:{name:'Space Survivor',genre:'UZAY / AKSİYON',create:space,keys:['left','right','up','down','fire'],help:'Ok tuşları veya WASD ile hareket et, Boşluk ile ateş et. Kalkan darbeleri emer. Parlak güçlendirmeleri topla.'},
  runner:{name:'Neon Runner',genre:'3D / SONSUZ KOŞU',keys:['left','right','jump'],help:'Sol ve sağ ile şerit değiştir. Boşluk veya Yukarı ile zıpla. Kristalleri topla, pembe bariyerlerden kaç.'},
  memory:{name:'Memory Matrix',genre:'HAFIZA / BULMACA',create:memory,keys:[],help:'Eş sembolleri bul. Klavyeyle gezin ve Enter ile aç veya karta dokun.'},
  defense:{name:'Cyber Defense',genre:'DALGALAR / STRATEJİ',create:defense,keys:['left','right','up','down','fire'],help:'Hücreye tıkla veya oklarla seçip Boşluk tuşuna bas. Kule 35 enerji, geliştirme seviyeye göre 30–90 enerji. Yol boş kalmalı.'}
};
const storageKey='nexora.pixelverse.v1', difficulties={easy:'Kolay',medium:'Orta',hard:'Zor'};
let save={sound:true,records:{},history:[],results:0};
try{const data=JSON.parse(localStorage.getItem(storageKey));if(data)save={...save,...data};}catch{}
let id='space',level='easy',game=null,state='idle',generation=0,audio,lastHud='';
const keys=new Set(), mapping={ArrowLeft:'left',KeyA:'left',ArrowRight:'right',KeyD:'right',ArrowUp:'up',KeyW:'up',ArrowDown:'down',KeyS:'down',Space:'fire'};
const labels={left:'←',right:'→',up:'↑',down:'↓',fire:'Ateş',jump:'Zıpla'};
function persist(){
  try{localStorage.setItem(storageKey,JSON.stringify(save));}
  catch{$('instructions').textContent='Tarayıcı kayıt alanı kullanılamıyor.';}
}
function scores(){
  const list=items=>{const ul=document.createElement('ul');for(const txt of items){const li=document.createElement('li');li.textContent=txt;ul.append(li);}return ul;};
  const entries=Object.entries(save.records).map(([key,score])=>{
    const [gameId,mode]=key.split(':');return games[gameId]?.name+' '+(mode?'· '+difficulties[mode]+' ':'')+'· '+score;
  });
  $('bests').replaceChildren(entries.length?list(entries):'Henüz rekor yok.');
  const badges=[['✦ İlk Tur',save.results>0],['◆ Dört Dünya',Object.keys(games).every(k=>Object.keys(save.records).some(x=>x.split(':')[0]===k))],['◇ Hafıza Ustası',Boolean(save.records['memory:hard'])],['⬡ Savunma Hattı',save.records.defense>=100],['⟫ Hız Ustası',save.records.runner>=500]];
  const earned=badges.filter(b=>b[1]).map(b=>b[0]);
  $('badges').replaceChildren(earned.length?list(earned):'İlk oyununu tamamlayarak başla.');
  $('history').replaceChildren(save.history.length?list(save.history.slice(0,8).map(r=>games[r.id].name+' · '+r.score+' puan · '+new Date(r.date).toLocaleDateString('tr-TR'))):'Henüz tamamlanan oyun yok.');
}
function beep(freq,length){
  if(!save.sound||!audio||audio.state!=='running')return;
  const oscillator=audio.createOscillator(),gain=audio.createGain();
  oscillator.frequency.value=freq;gain.gain.setValueAtTime(.045,audio.currentTime);gain.gain.exponentialRampToValueAtTime(.001,audio.currentTime+length);
  oscillator.connect(gain).connect(audio.destination);oscillator.start();oscillator.stop(audio.currentTime+length);
}
function enableAudio(){
  if(!save.sound)return;
  try{audio??=new AudioContext();if(audio.state==='suspended')void audio.resume().catch(()=>{});}catch{}
}
function paintSound(){
  $('sound').textContent=save.sound?'Ses açık':'Ses kapalı';$('sound').setAttribute('aria-pressed',String(save.sound));
}
function hud(text){if(lastHud!==text){lastHud=text;$('hud').textContent=text;}}
function display(message=''){
  $('overlay').hidden=state==='running';
  $('status').textContent=message;
  $('pause').disabled=!['running','paused'].includes(state);
  $('pause').textContent=state==='paused'?'Devam et':'Duraklat';
  $('start').disabled=['running','paused','loading'].includes(state);
  $('restart').disabled=['idle','loading'].includes(state);
  memoryBoard.inert=state!=='running';
  if(state!=='running')keys.clear();
}
function finish(score,message){
  if(state!=='running')return;
  state='ended';
  const key=id==='memory'?id+':'+level:id;
  save.records[key]=Math.max(score,save.records[key]??0);
  save.results++;save.history.unshift({id,score,date:new Date().toISOString()});save.history=save.history.slice(0,80);
  persist();scores();beep(260,.18);display(message+' · '+score+' puan');
}
function clearGame(){game?.destroy?.();game=null;keys.clear();}
function switchGame(next){
  generation++;clearGame();id=next;state='idle';
  for(const b of document.querySelectorAll('[data-game]'))b.setAttribute('aria-pressed',String(b.dataset.game===id));
  const data=games[id];
  $('genre').textContent=data.genre;$('gameTitle').textContent=data.name;$('instructions').textContent=data.help;
  board.hidden=id==='memory'||id==='runner';runnerBoard.hidden=id!=='runner';memoryBoard.hidden=id!=='memory';
  ctx.fillStyle='#070d22';ctx.fillRect(0,0,800,450);
  const options=$('options');options.replaceChildren();
  if(id==='memory'){
    const label=document.createElement('label');label.textContent='Zorluk ';
    const select=document.createElement('select');
    for(const [value,name] of Object.entries(difficulties))select.add(new Option(name,value));
    select.value=level;select.onchange=()=>{level=select.value;switchGame('memory');};label.append(select);options.append(label);
  }
  if(id==='defense'){
    for(const [name,method] of [['Yeni dalga','next'],['Kule kur / geliştir','build']]){
      const b=document.createElement('button');b.textContent=name;b.onclick=()=>{if(state==='running')game[method]();};options.append(b);
    }
  }
  $('touch').replaceChildren();
  for(const key of data.keys){
    const b=document.createElement('button');b.textContent=id==='defense'&&key==='fire'?'Kule':labels[key];b.setAttribute('aria-label',b.textContent);
    b.onpointerdown=ev=>{if(state!=='running')return;b.setPointerCapture(ev.pointerId);press(key);};
    for(const type of ['pointerup','pointercancel','lostpointercapture'])b.addEventListener(type,()=>keys.delete(key));
    b.onclick=ev=>{if(ev.detail===0&&state==='running'){press(key);setTimeout(()=>keys.delete(key),150);}};
    $('touch').append(b);
  }
  hud('Başlamaya hazır');display('Başlat düğmesiyle oyuna gir');
}
async function start(){
  const ticket=++generation;
  enableAudio();clearGame();state='loading';display('Yükleniyor…');
  try{
    const create=id==='runner'?(await import('./runner.js')).runner:games[id].create;
    if(ticket!==generation)return;
    game=create({ctx,runnerBoard,memoryBoard,level,keys,finish,hud,beep,notify:text=>{$('instructions').textContent=text;}});
    state='running';display();
    if(id==='memory')memoryBoard.querySelector('button')?.focus({preventScroll:true});
    else if(id!=='runner')board.focus({preventScroll:true});
  }catch(error){
    if(ticket!==generation)return;
    state='idle';display('3D oyun açılamadı. Bu tarayıcıda WebGL kullanılabilir olmalı.');
  }
}
function press(key){keys.add(key);game?.press?.(key);}
function togglePause(){
  if(state==='running'){state='paused';display('Oyun duraklatıldı');}
  else if(state==='paused'){state='running';display();enableAudio();}
}
document.addEventListener('keydown',ev=>{
  if(ev.code==='KeyP'&&!ev.repeat){togglePause();return;}
  const key=mapping[ev.code];
  if(state!=='running'||!key||ev.target.closest('select,input')||(ev.target.closest('button,a')&&ev.code==='Space'))return;
  ev.preventDefault();
  if(!ev.repeat||id!=='runner')press(id==='runner'&&key==='fire'?'jump':key);
});
document.addEventListener('keyup',ev=>{keys.delete(mapping[ev.code]);if(ev.code==='Space')keys.delete('jump');});
document.addEventListener('visibilitychange',()=>{if(document.hidden&&state==='running')togglePause();});
window.addEventListener('blur',()=>keys.clear());
board.onpointerdown=ev=>{
  if(state!=='running'||id!=='defense')return;
  const rect=board.getBoundingClientRect();game.point((ev.clientX-rect.left)*800/rect.width,(ev.clientY-rect.top)*450/rect.height);
};
for(const b of document.querySelectorAll('[data-game]'))b.onclick=()=>switchGame(b.dataset.game);
$('start').onclick=$('restart').onclick=start;
$('pause').onclick=togglePause;
$('sound').onclick=()=>{save.sound=!save.sound;enableAudio();paintSound();persist();if(save.sound)beep(500,.07);};
$('fullscreen').onclick=async()=>{
  try{if(document.fullscreenElement)await document.exitFullscreen();else await $('play').requestFullscreen();}
  catch{$('instructions').textContent='Tam ekran bu tarayıcıda kullanılamıyor.';}
};
document.addEventListener('fullscreenchange',()=>{$('fullscreen').textContent=document.fullscreenElement?'Tam ekrandan çık':'Tam ekran';});
let last=performance.now();
function frame(now){
  const dt=Math.min(.04,Math.max(0,(now-last)/1000));last=now;
  if(state==='running')game?.tick(dt);
  if(state==='running'||state==='ended')game?.draw?.();
  requestAnimationFrame(frame);
}
paintSound();scores();switchGame(id);requestAnimationFrame(frame);
