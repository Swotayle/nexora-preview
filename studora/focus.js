
'use strict';
const phases={work:'Çalışma',short:'Kısa mola',long:'Uzun mola'};
const focusDefaults={work:25,short:5,long:15,course:'',sound:false};
const phaseInputs={work:$('#workMinutes'),short:$('#shortMinutes'),long:$('#longMinutes')};
const focusPrefs=()=>({...focusDefaults,...state.focusPrefs});
const idleTimer=(phase='work')=>({phase,status:'idle'});
const activeTimer=()=>state.timer??idleTimer();
const uniqueId=()=>globalThis.crypto.randomUUID?.()??Date.now().toString(36)+'-'+Math.random().toString(36).slice(2);
const ttl=(timer,now=Date.now())=>timer.status==='running'?Math.max(0,timer.endsAt-now):
  timer.status==='paused'?timer.remainingMs:timer.status==='finished'?0:focusPrefs()[timer.phase]*60000;
let audio;
function unlockSound(){
  if(!focusPrefs().sound||!window.AudioContext)return;
  try{audio??=new AudioContext();audio.resume().catch(()=>{});}catch{}
}
function finishSound(){
  if(!focusPrefs().sound||audio?.state!=='running')return;
  for(const [index,hz] of [523.25,659.25,783.99].entries()){
    const oscillator=audio.createOscillator(), volume=audio.createGain(), t=audio.currentTime+index*.12;
    oscillator.frequency.value=hz;
    volume.gain.setValueAtTime(.0001,t);
    volume.gain.exponentialRampToValueAtTime(.105,t+.025);
    volume.gain.exponentialRampToValueAtTime(.0001,t+.26);
    oscillator.connect(volume).connect(audio.destination);
    oscillator.start(t);oscillator.stop(t+.28);
  }
}
function refreshFocusSettings(){
  const settings=focusPrefs();
  for(const [phase,input] of Object.entries(phaseInputs))input.value=settings[phase];
  $('#focusSound').checked=settings.sound;
  const course=$('#focusCourse');
  const options=state.lessons.map(x=>[x.id,x.name]);
  if(settings.course&&!options.some(([id])=>id===settings.course))options.unshift([settings.course,'Kaldırılmış ders']);
  course.innerHTML='<option value="">Ders seçilmedi</option>'+options.map(([id,name])=>'<option value="'+e(id)+'">'+e(name)+'</option>').join('');
  course.value=settings.course;
}
function refreshFocusHistory(){
  const sessions=state.study.filter(x=>x.source==='pomodoro').sort((a,b)=>b.completedAt-a.completedAt);
  const todayMinutes=state.study.filter(x=>x.date===dayKey()).reduce((sum,x)=>sum+Number(x.minutes),0);
  $('#focusGoal').textContent=state.goal?'Bugün '+duration(todayMinutes)+' / '+duration(state.goal):'Günlük hedef henüz belirlenmedi.';
  $('#focusHistory').innerHTML=sessions.map(x=>record(x.course||'Genel çalışma',
    [dateText(new Date(x.completedAt),{dateStyle:'medium',timeStyle:'short'}),duration(Number(x.minutes))].join(' · '))).join('')||empty('Tamamlanan çalışma seansların burada görünecek.');
}
function paintTimer(){
  const timer=activeTimer(), seconds=Math.ceil(ttl(timer)/1000);
  const text=String(Math.floor(seconds/60)).padStart(2,'0')+':'+String(seconds%60).padStart(2,'0');
  if($('#timerClock').textContent!==text)$('#timerClock').textContent=text;
  $('#timerPhase').textContent=phases[timer.phase];
  $('#timerStatus').textContent=({idle:'Başlamaya hazır',running:'Seans sürüyor',paused:'Duraklatıldı',finished:'Seans tamamlandı'})[timer.status];
  $('#timerMain').textContent=({idle:'Başlat',running:'Duraklat',paused:'Devam et',finished:'Yeniden başlat'})[timer.status];
  const busy=['running','paused'].includes(timer.status);
  for(const control of [...Object.values(phaseInputs),$('#focusCourse')])control.disabled=busy;
  for(const button of document.querySelectorAll('[data-phase]')){
    button.setAttribute('aria-pressed',String(button.dataset.phase===timer.phase));
    button.disabled=busy;
  }
  const total=(timer.minutes??focusPrefs()[timer.phase])*60000;
  $('#focusRing').style.setProperty('--progress',Math.min(1,Math.max(0,1-ttl(timer)/total)));
}
function completeExpired(now){
  const timer=activeTimer();
  if(timer.status!=='running'||now<timer.endsAt)return false;
  const changes={timer:{...timer,status:'finished'}};
  if(timer.phase==='work'&&!state.study.some(x=>x.id===timer.id)){
    const completedAt=timer.endsAt;
    changes.study=[...state.study,{id:timer.id,date:dayKey(new Date(completedAt)),minutes:timer.minutes,
      course:timer.courseName,source:'pomodoro',completedAt}];
  }
  if(!persist(changes))return false;
  renderDashboard();refreshFocusHistory();finishSound();
  return true;
}
function timerTransaction(action=()=>{}){
  const update=()=>{
    syncStoredState();
    const now=Date.now();
    completeExpired(now);
    action(now);
    paintTimer();
  };
  if(navigator.locks)return navigator.locks.request(key+'.timer',update);
  update();
}
function tick(){
  paintTimer();
  const timer=activeTimer();
  if(timer.status==='running'&&ttl(timer)===0)timerTransaction();
}
$('#timerMain').onclick=()=>{
  unlockSound();
  const expected=activeTimer().status;
  timerTransaction(now=>{
    const timer=activeTimer();
    if(timer.status!==expected)return;
    if(timer.status==='running')persist({timer:{...timer,status:'paused',remainingMs:ttl(timer,now),endsAt:null}});
    else if(timer.status==='paused')persist({timer:{...timer,status:'running',endsAt:now+timer.remainingMs}});
    else{
      const prefs=focusPrefs(),minutes=prefs[timer.phase];
      const courseName=state.lessons.find(x=>x.id===prefs.course)?.name??'';
      persist({timer:{id:uniqueId(),phase:timer.phase,status:'running',endsAt:now+minutes*60000,minutes,courseName}});
    }
  });
};
$('#timerReset').onclick=()=>timerTransaction(()=>persist({timer:idleTimer(activeTimer().phase)}));
for(const button of document.querySelectorAll('[data-phase]'))button.onclick=()=>timerTransaction(()=>{
  if(!['running','paused'].includes(activeTimer().status))persist({timer:idleTimer(button.dataset.phase)});
});
for(const [phase,input] of Object.entries(phaseInputs))input.onchange=()=>{
  if(!input.checkValidity()||!Number.isInteger(input.valueAsNumber)||!input.value){input.value=focusPrefs()[phase];return;}
  persist({focusPrefs:{...focusPrefs(),[phase]:input.valueAsNumber}});
  paintTimer();
};
$('#focusCourse').onchange=event=>persist({focusPrefs:{...focusPrefs(),course:event.target.value}});
$('#focusSound').onchange=event=>{persist({focusPrefs:{...focusPrefs(),sound:event.target.checked}});unlockSound();};
$('#focusFullscreen').onclick=async()=>{
  try{await $('#focusStage').requestFullscreen();}catch{notify('Tam ekran bu tarayıcıda açılamadı.');}
};
$('#focusExit').onclick=()=>document.exitFullscreen?.();
document.addEventListener('fullscreenchange',()=>$('#focusExit').hidden=document.fullscreenElement!==$('#focusStage'));
document.addEventListener('visibilitychange',tick);
window.addEventListener('pageshow',tick);
window.addEventListener('storage',event=>{
  if(event.key!==key)return;
  syncStoredState();refreshFocusSettings();refreshFocusHistory();renderDashboard();tick();
});
window.addEventListener('studora-change',()=>{
  refreshFocusSettings();refreshFocusHistory();
});
refreshFocusSettings();refreshFocusHistory();tick();
setInterval(tick,250);
