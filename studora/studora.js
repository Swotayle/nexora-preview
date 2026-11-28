
'use strict';
const $=selector=>document.querySelector(selector);
const key='nexora.studora.v1';
const days=['Pazartesi','Salı','Çarşamba','Perşembe','Cuma','Cumartesi','Pazar'];
const shortDays=['Pzt','Sal','Çar','Per','Cum','Cmt','Paz'];
const priority={low:'Düşük',medium:'Orta',high:'Yüksek'};
const headings={merkez:'Kontrol Merkezi',dersler:'Ders Programı',sinavlar:'Sınav Takvimi',gorevler:'Görevler',odak:'Odak Merkezi',notlar:'Akıllı Not Defteri','not-hesaplama':'Not Hesaplama',istatistikler:'İstatistikler',basarilar:'Başarılar',veriler:'Veri Yönetimi'};
const titles={lessons:'Ders',exams:'Sınav',tasks:'Görev',study:'Çalışma kaydı',goal:'Günlük çalışma hedefi'};
const storageDefaults={lessons:[],exams:[],tasks:[],study:[],goal:0,theme:'dark',compact:false,notes:[],timer:null,focusPrefs:{},grades:[],gradeRules:learning.gradeRules,rewards:null};
let state={...storageDefaults};
let storageProblem=false;
try { state={...storageDefaults,...JSON.parse(localStorage.getItem(key)??'{}')}; }
catch { storageProblem=true; }

function syncStoredState(){
  try { state={...storageDefaults,...JSON.parse(localStorage.getItem(key)??'{}')}; }
  catch { return false; }
  return true;
}
function persist(changes,replace=false){
  if(!syncStoredState()){notify('Önceki kayıtlar okunamadı.');return false;}
  const next={...(replace?storageDefaults:state),...changes};
  next.rewards=learning.earn(next,dayKey(),!replace&&Object.hasOwn(changes,'goal'));
  try{localStorage.setItem(key,JSON.stringify(next));}
  catch { notify('Kayıt yapılamadı. Tarayıcı depolamasını kontrol et.');return false; }
  state=next;
  window.dispatchEvent(new Event('studora-saved'));
  return true;
}
let noticeTimer;
function notify(message){
  $('#notice').textContent=message;
  clearTimeout(noticeTimer);
  noticeTimer=setTimeout(()=>$('#notice').textContent='',4000);
}
function escapeText(value){
  return String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[char]);
}
const e=escapeText;
function dayKey(d=new Date()){
  return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');
}
const weekday=(d=new Date())=>(d.getDay()+6)%7;
const dateText=(d,extra={})=>new Intl.DateTimeFormat('tr-TR',extra).format(d);
const examAt=x=>new Date(x.date+'T'+x.time);
function remaining(x){
  const minutes=Math.ceil((examAt(x)-Date.now())/60000);
  if(minutes<=0)return 'Tarihi geçti';
  const hours=Math.floor(minutes/60), days=Math.floor(hours/24);
  return hours?(days?days+' gün ':'')+hours%24+' saat kaldı':minutes+' dakika kaldı';
}
function duration(minutes){
  return minutes>=60?Math.floor(minutes/60)+' sa '+minutes%60+' dk':minutes+' dk';
}
const isLate=x=>!x.done&&x.due<dayKey();
const allExams=()=>[...state.exams].sort((a,b)=>examAt(a)-examAt(b));
const allTasks=()=>[...state.tasks].sort((a,b)=>Number(a.done)-Number(b.done)||a.due.localeCompare(b.due));
const empty=text=>'<p class="empty">'+e(text)+'</p>';
const actions=(kind,id,extra='')=>'<div class="actions">'+extra+
  '<button class="mini" data-action="edit" data-kind="'+kind+'" data-id="'+e(id)+'">Düzenle</button>'+
  '<button class="mini danger" data-action="delete" data-kind="'+kind+'" data-id="'+e(id)+'">Sil</button></div>';
const toggle=(kind,id,label)=>'<button class="mini" data-action="toggle" data-kind="'+kind+'" data-id="'+e(id)+'">'+label+'</button>';
function record(title,detail,buttons='',classes=''){
  return '<article class="record '+classes+'"><div><h3>'+e(title)+'</h3><p>'+e(detail)+'</p></div>'+buttons+'</article>';
}
function lessonCard(x,buttons=false){
  const color=/^#[0-9a-f]{6}$/i.test(x.color)?x.color:'#8b6dff';
  const detail=[x.start+'–'+x.end,x.teacher,x.room].filter(Boolean).join(' · ');
  const html=record(x.name,detail,buttons?actions('lessons',x.id):'');
  return html.replace('class="record "','class="record " style="--lesson:'+color+'"');
}
function examCard(x,buttons=false){
  const detail=[x.type,dateText(examAt(x),{dateStyle:'medium',timeStyle:'short'}),x.done?'Arşivlendi':remaining(x)].join(' · ');
  return record(x.name,detail,buttons?actions('exams',x.id,toggle('exams',x.id,x.done?'Arşivden çıkar':'Tamamla ve arşivle')):'',x.done?'done':'');
}
function taskCard(x,buttons=false){
  const detail=[x.type,x.course,priority[x.priority],dateText(new Date(x.due+'T12:00')),isLate(x)?'Gecikti':null].filter(Boolean).join(' · ');
  return record(x.name,detail,buttons?actions('tasks',x.id,toggle('tasks',x.id,x.done?'Geri aç':'Tamamla')):'',x.done?'done':isLate(x)?'late':'');
}
function renderDashboard(){
  const now=new Date(),today=dayKey(now);
  const lessons=state.lessons.filter(x=>Number(x.day)===weekday(now)).sort((a,b)=>a.start.localeCompare(b.start));
  const exams=allExams().filter(x=>!x.done&&examAt(x)>=now);
  const pending=allTasks().filter(x=>!x.done);
  const sum=list=>list.reduce((total,x)=>total+Number(x.minutes),0);
  const todayMinutes=sum(state.study.filter(x=>x.date===today));
  $('#today').textContent=dateText(now,{dateStyle:'full'});
  const stats=[
    ['Bugünkü dersler',lessons.length,'Haftalık programdan'],
    ['Günlük hedef',state.goal?duration(todayMinutes)+' / '+duration(state.goal):'Belirlenmedi',state.goal?'Bugünkü ilerleme':'Bir süre hedefi seç'],
    ['Toplam çalışma',duration(sum(state.study)),'Kaydedilmiş çalışma'],
    ['Tamamlanan görevler',state.tasks.filter(x=>x.done).length,pending.length+' görev bekliyor']
  ];
  $('#stats').innerHTML=stats.map(([label,value,sub])=>'<article class="stat"><span>'+e(label)+'</span><strong>'+e(value)+'</strong><small>'+e(sub)+'</small></article>').join('');
  $('#todayLessons').innerHTML=lessons.map(x=>lessonCard(x)).join('')||empty('Bugün için kayıtlı ders yok.');
  $('#nextExams').innerHTML=exams.slice(0,4).map(x=>examCard(x)).join('')||empty('Yaklaşan sınav kaydın yok.');
  $('#pendingTasks').innerHTML=pending.slice(0,4).map(x=>taskCard(x)).join('')||empty('Bekleyen görev yok.');
  const monday=new Date(now);monday.setDate(now.getDate()-weekday(now));
  const week=days.map((name,index)=>{
    const d=new Date(monday);d.setDate(monday.getDate()+index);
    const date=dayKey(d);return {name,date,total:sum(state.study.filter(x=>x.date===date))};
  });
  const scale=Math.max(1,...week.map(x=>x.total));
  $('#studyHistory').hidden=!state.study.length;
  $('#studyList').innerHTML=[...state.study].sort((a,b)=>b.date.localeCompare(a.date)).map(x=>
    record(dateText(new Date(x.date+'T12:00')),duration(Number(x.minutes)),actions('study',x.id))).join('');
  $('#chart').innerHTML='<div class="chart-bars">'+week.map(({name,date,total},index)=>
    '<div class="chart-column '+(date===today?'today':'')+'" aria-label="'+e(name+' '+duration(total))+'"><strong>'+total+' dk</strong><div class="chart-track"><i style="height:'+total/scale*100+'%"></i></div>'+shortDays[index]+'</div>').join('')+'</div>'+
    (week.some(x=>x.total)?'':empty('Bu hafta henüz çalışma süresi kaydetmedin.'));
}
function renderTasks(){
  const query=$('#search').value.trim().toLocaleLowerCase('tr');
  const status=$('#status').value, rank=$('#priority').value;
  const items=allTasks().filter(x=>
    (rank==='all'||x.priority===rank) &&
    (status==='all'||status==='done'&&x.done||status==='pending'&&!x.done||status==='late'&&isLate(x)) &&
    [x.name,x.course,x.type].join(' ').toLocaleLowerCase('tr').includes(query)
  );
  $('#taskList').innerHTML=items.map(x=>taskCard(x,true)).join('')||empty('Bu görünüme uyan görev yok.');
}
function render(){
  renderDashboard();
  $('#week').innerHTML=days.map((name,index)=>{
    const items=state.lessons.filter(x=>Number(x.day)===index).sort((a,b)=>a.start.localeCompare(b.start));
    const today=index===weekday();
    return '<section class="day '+(today?'today':'')+'"><h2>'+name+(today?' · Bugün':'')+'</h2>'+
      (items.map(x=>lessonCard(x,true)).join('')||empty('Ders yok'))+'</section>';
  }).join('');
  const exams=allExams();
  const archived=exams.filter(x=>x.done);
  $('#examList').innerHTML=exams.filter(x=>!x.done).map(x=>examCard(x,true)).join('')||empty('Kayıtlı sınav yok.');
  $('#examArchive').innerHTML=archived.map(x=>examCard(x,true)).join('')||empty('Arşiv boş.');
  $('#archiveCount').textContent='('+archived.length+')';
  renderTasks();
  window.dispatchEvent(new Event('studora-change'));
}
const app=$('#app'), menu=$('#menu'), mobile=matchMedia('(max-width:850px)');
function updateMenu(){
  const expanded=mobile.matches?app.classList.contains('mobile-open'):!state.compact;
  menu.setAttribute('aria-expanded',String(expanded));
  $('#sidebar').inert=mobile.matches&&!expanded;
}
function navigate(){
  const requested=location.hash.slice(1);
  const page=Object.hasOwn(headings,requested)?requested:'merkez';
  document.querySelectorAll('.page').forEach(p=>p.hidden=p.id!==page);
  document.querySelectorAll('.sidebar nav a').forEach(a=>{
    if(a.hash==='#'+page)a.setAttribute('aria-current','page');
    else a.removeAttribute('aria-current');
  });
  $('#breadcrumb').textContent=headings[page];
  window.scrollTo(0,0);
  app.classList.remove('mobile-open');
  updateMenu();
}
window.addEventListener('hashchange',navigate);
mobile.addEventListener('change',updateMenu);
menu.onclick=()=>{
  if(mobile.matches)app.classList.toggle('mobile-open');
  else if(persist({compact:!state.compact}))app.classList.toggle('compact',state.compact);
  updateMenu();
};
$('#closeMenu').onclick=()=>{app.classList.remove('mobile-open');updateMenu();menu.focus();};
function applyTheme(){
  document.documentElement.dataset.theme=state.theme;
  $('#theme').textContent=state.theme==='dark'?'Açık tema':'Koyu tema';
}
$('#theme').onclick=()=>{if(persist({theme:state.theme==='dark'?'light':'dark'}))applyTheme();};
$('#search').addEventListener('input',renderTasks);
for(const selector of ['#status','#priority'])$(selector).addEventListener('change',renderTasks);

const input=(name,label,type='text',wide=false,required=true,attrs='')=>({name,label,type,wide,required,attrs});
const select=(name,label,options)=>({name,label,options,required:true});
const fields={
  lessons:[input('name','Ders adı','text',true),input('teacher','Öğretim elemanı','text',true,false),select('day','Gün',days.map((d,i)=>[i,d])),
    input('room','Derslik','text',false,false),input('start','Başlangıç','time'),input('end','Bitiş','time'),input('color','Ders rengi','color')],
  exams:[input('name','Ders veya sınav adı','text',true),select('type','Sınav türü',['Vize','Final','Bütünleme','Kısa sınav'].map(x=>[x,x])),input('date','Tarih','date'),input('time','Saat','time')],
  tasks:[input('name','Görev adı','text',true),select('type','Görev türü',['Ödev','Çalışma'].map(x=>[x,x])),input('course','Ders kategorisi','text',false,false),input('due','Son teslim tarihi','date'),select('priority','Öncelik',Object.entries(priority))],
  study:[input('course','Ders (isteğe bağlı)','text',true,false),input('date','Çalışma tarihi','date'),input('minutes','Süre (dakika)','number',false,true,'min="1" max="1440" step="1"')],
  goal:[input('minutes','Dakika (0 = hedefi kaldır)','number',true,true,'min="0" max="1440" step="1"')]
};

const editor=$('#editor');
let editing=null, overlapAck=null;
function openEditor(kind,item=null){
  editing={kind,item};overlapAck=null;
  const defaults={day:weekday(),date:dayKey(),due:dayKey(),color:'#8b6dff',priority:'medium'};
  $('#editorTitle').textContent=titles[kind]+(item?' düzenle':kind==='goal'?'':' ekle');
  $('#formError').hidden=true;
  $('#save').textContent='Kaydet';
  $('#fields').innerHTML=fields[kind].map(f=>{
    const value=item?.[f.name]??(kind==='goal'?state.goal:defaults[f.name])??'';
    const tag=f.options
      ?'<select name="'+f.name+'" required>'+f.options.map(([id,label])=>'<option value="'+e(id)+'"'+(String(value)===String(id)?' selected':'')+'>'+e(label)+'</option>').join('')+'</select>'
      :'<input name="'+f.name+'" type="'+f.type+'" value="'+e(value)+'" '+(f.required?'required ':'')+(f.type==='text'?'maxlength="100" ':'')+(f.attrs??'')+(kind==='study'&&f.name==='date'?' max="'+dayKey()+'"':'')+'>';
    return '<label class="field '+(f.wide?'wide':'')+'">'+e(f.label)+tag+'</label>';
  }).join('');
  editor.showModal();
}
for(const id of ['#closeEditor','#cancelEditor'])$(id).onclick=()=>editor.close();
$('#editorForm').addEventListener('input',()=>{
  overlapAck=null;$('#formError').hidden=true;$('#save').textContent='Kaydet';
});
function formError(message){
  $('#formError').textContent=message;$('#formError').hidden=false;
}
$('#editorForm').onsubmit=event=>{
  event.preventDefault();
  const {kind,item}=editing;
  const values=Object.fromEntries([...new FormData(event.target)].map(([name,value])=>[name,String(value).trim()]));
  if('name' in values&&!values.name){formError('Bir ad gir.');return;}
  if(kind==='lessons'){
    if(values.start>=values.end){formError('Bitiş saati başlangıçtan sonra olmalı.');return;}
    const clash=state.lessons.find(x=>x.id!==item?.id&&x.day===values.day&&x.start<values.end&&values.start<x.end);
    if(clash&&overlapAck!==clash.id){
      overlapAck=clash.id;formError('Saat aralığı '+clash.name+' ile çakışıyor. Yine de kaydedebilirsin.');
      $('#save').textContent='Yine de kaydet';return;
    }
  }
  const id=item?.id??(globalThis.crypto?.randomUUID?.()??Date.now().toString(36)+Math.random().toString(36).slice(2));
  let changes;
  if(kind==='goal')changes={goal:Number(values.minutes)};
  else{
    const result={...item,...values,id};
    changes={[kind]:item?state[kind].map(x=>x.id===id?result:x):[...state[kind],result]};
  }
  if(!persist(changes))return;
  editor.close();render();notify('Kaydedildi.');
};
document.addEventListener('click',event=>{
  if(mobile.matches&&event.target.closest('.sidebar nav a, .sidebar .brand')){app.classList.remove('mobile-open');updateMenu();}
  const add=event.target.closest('[data-add]');
  if(add){openEditor(add.dataset.add);return;}
  const button=event.target.closest('[data-action]');
  if(!button)return;
  const {kind,id,action}=button.dataset;
  const item=state[kind].find(x=>x.id===id);
  if(!item)return;
  if(action==='edit'){openEditor(kind,item);return;}
  if(action==='delete'&&!window.confirm((item.name??'Çalışma kaydı')+' silinsin mi?'))return;
  const next=action==='delete'?state[kind].filter(x=>x.id!==id):state[kind].map(x=>x.id===id?{...x,done:!x.done}:x);
  if(persist({[kind]:next})){render();notify(action==='delete'?'Silindi.':'Güncellendi.');}
});
app.classList.toggle('compact',!!state.compact);
applyTheme();navigate();render();
if(storageProblem)notify('Önceki kayıtlar okunamadı.');
setInterval(()=>{if(!editor.open&&!document.activeElement?.matches('button,input,select'))render();},60000);
