
'use strict';
const fmt=new Intl.NumberFormat('tr-TR',{maximumFractionDigits:2});
let gradeId=null;
const currentRules=()=>state.gradeRules??learning.gradeRules;
const metric=(label,value,sub='')=>'<article class="stat"><span>'+e(label)+'</span><strong>'+e(value)+'</strong><small>'+e(sub)+'</small></article>';
function gradePart(part){
  const row=document.createElement('div');
  row.className='grade-part';
  row.innerHTML='<label class="field">Tür<select aria-label="Değerlendirme türü">'+learning.gradeTypes.map(type=>
    '<option'+(part.type===type?' selected':'')+'>'+e(type)+'</option>').join('')+
    '</select></label><label class="field">Ağırlık %<input class="weight" type="number" min="0" max="100" step=".01" required></label>'+
    '<label class="field">Not<input class="score" type="number" min="0" max="100" step=".01" placeholder="Bekleniyor"></label>'+
    '<button class="mini danger" type="button" aria-label="Değerlendirmeyi kaldır">×</button>';
  row.querySelector('.weight').value=part.weight;
  row.querySelector('.score').value=part.score??'';
  const type=row.querySelector('select'), weight=row.querySelector('.weight');
  const sync=()=>{weight.readOnly=type.value==='Bütünleme';if(weight.readOnly)weight.value=0;};
  type.onchange=()=>{sync();paintGradeResult();};sync();
  row.querySelector('button').onclick=()=>{row.remove();paintGradeResult();};
  $('#gradeParts').append(row);
}
function editGrade(g=null){
  gradeId=g?.id??null;
  $('#gradeEditTitle').textContent=g?'Ders notunu düzenle':'Yeni ders hesabı';
  $('#gradeName').value=g?.name??'';
  $('#gradePeriod').value=g?.term??'';
  $('#gradeEcts').value=g?.ects??5;
  $('#gradeParts').replaceChildren();
  (g?.parts??[{type:'Vize',weight:40,score:null},{type:'Final',weight:60,score:null}]).forEach(gradePart);
  $('#gradeFeedback').textContent='';
  paintGradeResult();
}
function readGrade(){
  const parts=[...$('#gradeParts').children].map(row=>{
    const score=row.querySelector('.score').value;
    return {type:row.querySelector('select').value,weight:row.querySelector('.weight').valueAsNumber,score:score===''?null:Number(score)};
  });
  return {name:$('#gradeName').value.trim(),term:$('#gradePeriod').value.trim(),ects:$('#gradeEcts').valueAsNumber,parts};
}
function paintGradeResult(){
  const draft=readGrade();
  const demo={...draft,name:'Ders',term:'Dönem',ects:5};
  const out=$('#gradeResult');
  if(!learning.validGrade(demo)){
    out.textContent='Hesaplamak için bir final ve toplam %100 ağırlık gir.';return;
  }
  const result=learning.gradeResult(draft,currentRules());
  const minimum=result.minimum===null?'Önce diğer ağırlıklı notları gir.':result.minimum>100?'Mevcut notlarla geçmek mümkün değil.':'Geçmek için gereken final: '+result.minimum+' / 100';
  out.innerHTML='<strong>'+e(result.mean===null?'Ortalama bekleniyor':fmt.format(result.mean)+' / 100 · '+result.letter+' · '+(result.passed?'Geçti':'Kaldı'))+
    '</strong><small>'+e(minimum)+'</small>';
}
function paintGrades(){
  const selector=$('#gradeTerm'), selection=selector.value;
  const terms=[...new Set(state.grades.map(g=>g.term))].sort((a,b)=>b.localeCompare(a,'tr'));
  selector.innerHTML='<option value="">Tüm dönemler</option>'+terms.map(term=>'<option value="'+e(term)+'">'+e(term)+'</option>').join('');
  if(terms.includes(selection))selector.value=selection;
  $('#gradeCourses').innerHTML=state.lessons.map(x=>'<option value="'+e(x.name)+'"></option>').join('');
  const current=selector.value?state.grades.filter(g=>g.term===selector.value):state.grades;
  const result=learning.weightedGrades(current,currentRules()), overall=learning.weightedGrades(state.grades,currentRules());
  $('#gradeSummary').innerHTML=[
    metric('AKTS ağırlıklı ortalama',result.mean===null?'—':fmt.format(result.mean)+' / 100','Seçili dönem görünümü'),
    metric('Genel not ortalaması',overall.gpa===null?'—':fmt.format(overall.gpa)+' / 4','Tüm tamamlanan kayıtlar'),
    metric('Hesaba katılan AKTS',fmt.format(result.ects),result.count+' notu tamamlanmış ders')
  ].join('');
  $('#gradeList').innerHTML=current.map(g=>{
    const result=learning.gradeResult(g,currentRules());
    const detail=[g.term,g.ects+' AKTS',result.mean===null?'Not bekleniyor':fmt.format(result.mean)+' · '+result.letter].join(' · ');
    return record(g.name,detail,'<div class="actions"><button class="mini" data-grade-edit="'+e(g.id)+'">Düzenle</button><button class="mini danger" data-grade-delete="'+e(g.id)+'">Sil</button></div>');
  }).join('')||empty('Henüz ders notu kaydı yok.');
}
function gradeBand(band){
  const row=document.createElement('div');
  row.className='grade-part';
  row.innerHTML='<label class="field">Harf<input class="letter" maxlength="12" required></label><label class="field">Alt eşik<input class="min" type="number" min="0" max="100" step=".01" required></label><label class="field">4’lük karşılık<input class="points" type="number" min="0" max="4" step=".01" required></label><button type="button" class="mini danger" aria-label="Harf notunu kaldır">×</button>';
  for(const k of ['letter','min','points'])row.querySelector('.'+k).value=band[k];
  row.querySelector('button').onclick=()=>row.remove();
  $('#gradeScale').append(row);
}
function paintRules(){
  const rules=currentRules();
  $('#gradePass').value=rules.pass;$('#gradeFinalMin').value=rules.finalMin;
  $('#gradeScale').replaceChildren();rules.scale.forEach(gradeBand);
}
$('#newGrade').onclick=()=>{editGrade();$('#gradeName').focus();};
$('#gradeTerm').onchange=paintGrades;
$('#addGradePart').onclick=()=>{if($('#gradeParts').children.length<16)gradePart({type:'Ödev',weight:0,score:null});};
$('#gradeForm').oninput=paintGradeResult;
$('#gradeForm').onsubmit=event=>{
  event.preventDefault();syncStoredState();
  const g=readGrade();
  if(!learning.validGrade(g)){$('#gradeFeedback').textContent='Ders, dönem, AKTS ve ağırlıkları kontrol et. Bir final ve en fazla bir bütünleme gir.';return;}
  if(state.grades.some(x=>x.id!==gradeId&&x.name.toLocaleLowerCase('tr')===g.name.toLocaleLowerCase('tr')&&x.term.toLocaleLowerCase('tr')===g.term.toLocaleLowerCase('tr'))){
    $('#gradeFeedback').textContent='Bu ders ve dönem için bir kayıt zaten var.';return;
  }
  const rows=state.grades.filter(x=>x.id!==gradeId);
  if(persist({grades:[...rows,{...g,id:gradeId??uniqueId()}]})){editGrade();paintGrades();notify('Ders notu kaydedildi.');}
};
$('#gradeList').onclick=event=>{
  const edit=event.target.closest('[data-grade-edit]'), del=event.target.closest('[data-grade-delete]');
  syncStoredState();
  if(edit){editGrade(state.grades.find(g=>g.id===edit.dataset.gradeEdit));$('#gradeName').focus();}
  if(del&&confirm('Ders notu silinsin mi?')&&persist({grades:state.grades.filter(g=>g.id!==del.dataset.gradeDelete)})){
    if(gradeId===del.dataset.gradeDelete)editGrade();paintGrades();
  }
};
$('#addGradeBand').onclick=()=>{if($('#gradeScale').children.length<20)gradeBand({letter:'',min:0,points:0});};
$('#gradeRulesForm').onsubmit=event=>{
  event.preventDefault();
  const rules={pass:$('#gradePass').valueAsNumber,finalMin:$('#gradeFinalMin').valueAsNumber,
    scale:[...$('#gradeScale').children].map(row=>({letter:row.querySelector('.letter').value.trim().toLocaleUpperCase('tr'),
      min:row.querySelector('.min').valueAsNumber,points:row.querySelector('.points').valueAsNumber})).sort((a,b)=>b.min-a.min)};
  if(!learning.validRules(rules)){
    $('#rulesFeedback').textContent='Harfler ve eşikler benzersiz olmalı. En düşük eşik 0 olmalı ve puanlar eşik sırasını izlemeli.';return;
  }
  if(persist({gradeRules:rules})){$('#rulesFeedback').textContent='Kurallar kaydedildi.';paintGrades();paintGradeResult();paintRules();}
};

function rangeBins(period,today){
  const bins=[];
  if(period==='day')for(let i=-6;i<=0;i++){
    const d=learning.shifted(today,i);
    bins.push({start:d,end:d,label:dateText(new Date(d+'T12:00'),{weekday:'short'})});
  }
  if(period==='week'){
    const monday=learning.shifted(today,-weekday());
    for(let i=-7;i<=0;i++){
      const start=learning.shifted(monday,i*7);
      bins.push({start,end:learning.shifted(start,6),label:dateText(new Date(start+'T12:00'),{day:'numeric',month:'short'})});
    }
  }
  if(period==='month'){
    const base=new Date(today+'T12:00');
    for(let i=-5;i<=0;i++){
      const start=new Date(base.getFullYear(),base.getMonth()+i,1), end=new Date(base.getFullYear(),base.getMonth()+i+1,0);
      bins.push({start:dayKey(start),end:dayKey(end),label:dateText(start,{month:'short'})});
    }
  }
  return bins;
}
function paintAnalytics(){
  const today=dayKey(), sums=learning.totals(state.study);
  const range=(start,end)=>[...sums].filter(([date])=>date>=start&&date<=end).reduce((n,[,minutes])=>n+minutes,0);
  const monday=learning.shifted(today,-weekday());
  const month=today.slice(0,7)+'-01';
  const best=[...sums].sort((a,b)=>b[1]-a[1]||b[0].localeCompare(a[0]))[0];
  const targets=Object.entries(state.rewards?.targets??{}).filter(([date,goal])=>date<=today&&goal>0);
  const goalHits=targets.filter(([date,goal])=>(sums.get(date)??0)>=goal).length;
  const streak=learning.streaks([...sums.keys()],today);
  $('#analyticsSummary').innerHTML=[
    metric('Bugün',duration(sums.get(today)??0)),metric('Bu hafta',duration(range(monday,today))),
    metric('Bu ay',duration(range(month,today))),metric('Hedef başarı oranı',targets.length?fmt.format(100*goalHits/targets.length)+'%':'—',targets.length?goalHits+' / '+targets.length+' hedef günü':'Kayıtlı hedef günü yok'),
    metric('Tamamlanan görevler',state.tasks.filter(x=>x.done).length),metric('En verimli gün',best?duration(best[1]):'—',best?dateText(new Date(best[0]+'T12:00')):'Çalışma kaydı yok'),
    metric('Odak seansı',state.study.filter(x=>x.source==='pomodoro').length),metric('Çalışma serisi',streak.current+' gün','En uzun '+streak.best+' gün')
  ].join('');
  const bins=rangeBins($('#trendPeriod').value,today).map(b=>({...b,value:range(b.start,b.end<today?b.end:today)}));
  const chart=$('#trendChart'), max=Math.max(1,...bins.map(x=>x.value));
  chart.innerHTML='<div class="insight-bars" style="--count:'+bins.length+'">'+bins.map((b,i)=>
    '<button type="button" data-bin="'+i+'" aria-label="'+e(b.label+' '+duration(b.value))+'"><span>'+b.value+' dk</span><i style="--height:'+100*b.value/max+'%"></i><small>'+e(b.label)+'</small></button>').join('')+'</div>';
  $('#trendDetail').textContent=bins.some(b=>b.value)?'Ayrıntı için bir sütun seç.':'Bu aralıkta çalışma kaydı yok.';
  chart.onclick=event=>{
    const button=event.target.closest('[data-bin]');
    if(!button)return;
    const b=bins[Number(button.dataset.bin)];
    $('#trendDetail').textContent=b.start+(b.end!==b.start?' – '+(b.end<today?b.end:today):'')+' · '+duration(b.value);
    chart.querySelectorAll('button').forEach(x=>x.setAttribute('aria-pressed',String(x===button)));
  };
  const courses=new Map();
  for(const x of state.study){
    if(x.date<bins[0].start||x.date>today)continue;
    const course=x.course||'Genel çalışma';
    courses.set(course,(courses.get(course)??0)+Number(x.minutes));
  }
  const total=[...courses.values()].reduce((a,b)=>a+b,0);
  $('#courseBreakdown').innerHTML=[...courses].sort((a,b)=>b[1]-a[1]).map(([name,minutes])=>
    '<div class="course-bar"><div><strong>'+e(name)+'</strong><span>'+e(duration(minutes))+'</span></div><progress max="'+total+'" value="'+minutes+'" aria-label="'+e(name)+'"></progress></div>'
  ).join('')||empty('Seçili aralıkta ders dağılımı oluşmadı.');
}
$('#trendPeriod').onchange=paintAnalytics;
function paintRewards(){
  const r=state.rewards??learning.earn(state,dayKey());
  const counts=[r.work.length,r.tasks.length,r.goalDays.length];
  const xp=counts[0]*25+counts[1]*15+counts[2]*30;
  $('#levelTitle').textContent='Seviye '+(Math.floor(xp/100)+1);
  $('#xpTotal').textContent=xp+' XP';
  $('#xpProgress').value=xp%100;
  $('#levelNext').textContent='Sonraki seviyeye '+(100-xp%100)+' XP';
  $('#xpBreakdown').innerHTML=[metric('En az 25 dakikalık çalışma',counts[0],'+25 XP / kayıt'),metric('Tamamlanan görev',counts[1],'+15 XP / görev'),
    metric('Tamamlanan günlük hedef',counts[2],'+30 XP / gün')].join('');
  $('#badgeGrid').innerHTML=learning.badges.map(([id,name,description,icon,color])=>{
    const earned=r.badges.includes(id);
    return '<article class="panel badge '+color+(earned?' earned':'')+'" data-badge="'+id+'" data-earned="'+earned+'"><i aria-hidden="true">'+icon+
      '</i><div><h2>'+name+'</h2><p>'+description+'</p><small>'+(earned?'Kazanıldı':'Henüz kazanılmadı')+'</small></div></article>';
  }).join('');
}
$('#backupDownload').onclick=()=>{
  syncStoredState();
  const blob=new Blob([JSON.stringify({format:'STUDORA',version:1,data:state},null,2)],{type:'application/json'});
  const url=URL.createObjectURL(blob), link=document.createElement('a');
  link.href=url;link.download='studora-yedek-'+dayKey()+'.json';link.click();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
};
$('#backupFile').onchange=async event=>{
  const input=event.target, file=input.files[0], message=$('#backupFeedback');
  if(!file)return;
  try{
    if(file.size>8*1024*1024)throw Error('Boyut');
    const json=JSON.parse(await file.text());
    const data=json?.format==='STUDORA'&&json.version===1?json.data:json;
    if(!learning.validateBackup(data))throw Error('Biçim');
    if(!confirm('Doğrulanan yedek mevcut STUDORA kayıtlarının üzerine yazılacak. Devam edilsin mi?')){
      message.textContent='Geri yükleme iptal edildi.';return;
    }
    const restored={...storageDefaults};
    for(const k of Object.keys(storageDefaults))if(Object.hasOwn(data,k))restored[k]=data[k];
    if(persist(restored,true)){location.reload();return;}
    message.textContent='Yedek kaydedilemedi.';
  }catch{message.textContent='Geçersiz veya çok büyük yedek. Mevcut kayıtlar korundu.';}
  finally{input.value='';}
};
function refreshLearningView(){
  if(location.hash==='#not-hesaplama')paintGrades();
  if(location.hash==='#istatistikler')paintAnalytics();
  if(location.hash==='#basarilar')paintRewards();
}
if(!state.rewards)persist({});
editGrade();paintRules();refreshLearningView();
window.addEventListener('hashchange',refreshLearningView);
window.addEventListener('studora-saved',refreshLearningView);
window.addEventListener('storage',event=>{if(event.key===key){syncStoredState();refreshLearningView();}});
