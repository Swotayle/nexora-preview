
'use strict';
const learning=(()=>{
  const defaultScale=[
    {letter:'AA',min:90,points:4},{letter:'BA',min:85,points:3.5},{letter:'BB',min:80,points:3},
    {letter:'CB',min:75,points:2.5},{letter:'CC',min:70,points:2},{letter:'DC',min:65,points:1.5},
    {letter:'DD',min:60,points:1},{letter:'FF',min:0,points:0}
  ];
  const gradeRules={pass:60,finalMin:0,scale:defaultScale};
  const gradeTypes=['Vize','Final','Ödev','Proje','Kısa sınav','Bütünleme'];
  const number=(n,min,max)=>typeof n==='number'&&Number.isFinite(n)&&n>=min&&n<=max;
  const text=(s,max=120)=>typeof s==='string'&&s.length<=max;
  const ownId=s=>text(s,128)&&s.length>0;
  const date=s=>{
    if(!text(s,10)||!/^\d{4}-\d{2}-\d{2}$/.test(s))return false;
    const d=new Date(s+'T00:00:00Z');
    return Number.isFinite(+d)&&d.toISOString().slice(0,10)===s;
  };
  const clock=s=>text(s,5)&&/^([01]\d|2[0-3]):[0-5]\d$/.test(s);
  const scalar=(v,min,max)=>v!==''&&(typeof v==='number'||typeof v==='string'&&/^\d+(\.\d+)?$/.test(v))&&number(Number(v),min,max);
  const bool=x=>typeof x==='boolean';
  const obj=x=>x&&typeof x==='object'&&!Array.isArray(x)&&Object.getPrototypeOf(x)===Object.prototype;
  function rows(x,validate,max=10000){
    return Array.isArray(x)&&x.length<=max&&x.every(i=>obj(i)&&ownId(i.id)&&validate(i))&&new Set(x.map(i=>i.id)).size===x.length;
  }
  function validRules(r){
    return obj(r)&&number(r.pass,0,100)&&number(r.finalMin,0,100)&&Array.isArray(r.scale)&&r.scale.length>=2&&r.scale.length<=20&&
      r.scale.every((x,i,a)=>obj(x)&&text(x.letter,12)&&x.letter.trim()&&number(x.min,0,100)&&number(x.points,0,4)&&
        (!i||a[i-1].min>x.min&&a[i-1].points>=x.points))&&r.scale.at(-1).min===0&&new Set(r.scale.map(x=>x.letter)).size===r.scale.length;
  }
  function validGrade(g){
    return text(g.name)&&g.name.trim()&&text(g.term,60)&&g.term.trim()&&number(g.ects,0.5,60)&&Array.isArray(g.parts)&&
      g.parts.length>=2&&g.parts.length<=16&&g.parts.every(p=>obj(p)&&gradeTypes.includes(p.type)&&number(p.weight,0,100)&&(p.score===null||number(p.score,0,100)))&&
      g.parts.filter(p=>p.type==='Final').length===1&&g.parts.filter(p=>p.type==='Bütünleme').length<=1&&
      g.parts.every(p=>p.type!=='Bütünleme'||p.weight===0)&&
      Math.abs(g.parts.reduce((sum,p)=>sum+p.weight,0)-100)<1e-6&&g.parts.find(p=>p.type==='Final').weight>0;
  }
  function gradeResult(g,r=gradeRules){
    const final=g.parts.find(x=>x.type==='Final');
    const retake=g.parts.find(x=>x.type==='Bütünleme');
    const others=g.parts.filter(x=>!['Final','Bütünleme'].includes(x.type)&&x.weight>0);
    if(others.some(x=>x.score===null))return {mean:null,minimum:null,passed:null,letter:null,points:null};
    const base=others.reduce((sum,x)=>sum+x.score*x.weight/100,0);
    const minimum=Math.max(0,Math.ceil(Math.max(r.finalMin,(r.pass-base)*100/final.weight)-1e-9));
    const finalScore=retake?.score??final.score;
    if(finalScore===null)return {mean:null,minimum,passed:null,letter:null,points:null};
    const mean=base+finalScore*final.weight/100;
    const passed=mean+1e-8>=r.pass&&finalScore>=r.finalMin;
    const band=r.scale.find(x=>mean+1e-8>=x.min);
    return {mean,minimum,passed,letter:passed?band.letter:r.scale.at(-1).letter,points:passed?band.points:r.scale.at(-1).points};
  }
  function weightedGrades(grades,rules){
    const items=grades.map(g=>({g,result:gradeResult(g,rules)})).filter(x=>x.result.mean!==null);
    const ects=items.reduce((n,x)=>n+x.g.ects,0);
    return {ects,count:items.length,mean:ects?items.reduce((n,x)=>n+x.result.mean*x.g.ects,0)/ects:null,
      gpa:ects?items.reduce((n,x)=>n+x.result.points*x.g.ects,0)/ects:null};
  }
  function totals(study){
    const days=new Map();
    for(const record of study)days.set(record.date,(days.get(record.date)??0)+Number(record.minutes));
    return days;
  }
  function shifted(day,count){
    const d=new Date(day+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+count);
    return d.toISOString().slice(0,10);
  }
  function streaks(dates,today){
    const days=new Set(dates.filter(d=>d<=today));
    let current=0,d=days.has(today)?today:shifted(today,-1);
    for(;days.has(d);d=shifted(d,-1))current++;
    let previous='',run=0,best=0;
    for(const day of [...days].sort()){
      run=previous&&shifted(previous,1)===day?run+1:1;
      best=Math.max(best,run);previous=day;
    }
    return {current,best};
  }
  const badges=[
    ['first','İlk Adım','İlk çalışma seansını kaydet','✦','violet'],
    ['focus','Odak Ustası','10 odak seansı tamamla','◉','blue'],
    ['streak','Disiplinli Öğrenci','7 gün üst üste çalış','≋','mint'],
    ['tasks','Görev Avcısı','25 görev tamamla','✓','amber'],
    ['notes','Bilgi Arşivcisi','20 not oluştur','▤','violet'],
    ['time','Zaman Ustası','Toplam 10 saat çalış','◷','blue'],
    ['goal','Hedef Şampiyonu','10 farklı günde hedefe ulaş','⚑','amber']
  ];
  const ledgerKeys=['work','focus','tasks','notes','goalDays','badges'];
  function earn(state,today,goalChanged=false){
    const old=state.rewards??{};
    const sets=Object.fromEntries(ledgerKeys.map(k=>[k,new Set(old[k]??[])]));
    const days=totals(state.study);
    const targets={...old.targets};
    if(!old.targets&&state.goal>0){
      for(const day of days.keys())if(day<=today)targets[day]=state.goal;
    }
    if(goalChanged||!(today in targets))targets[today]=state.goal;
    for(const [day,minutes] of days){
      if(day>today)continue;
      if(!(day in targets))targets[day]=state.goal;
      if(targets[day]>0&&minutes>=targets[day])sets.goalDays.add(day);
    }
    for(const item of state.study){
      if(Number(item.minutes)>=25)sets.work.add(item.id);
      if(item.source==='pomodoro')sets.focus.add(item.id);
    }
    for(const item of state.tasks)if(item.done)sets.tasks.add(item.id);
    for(const item of state.notes)sets.notes.add(item.id);
    const checks={
      first:state.study.length>=1,focus:sets.focus.size>=10,streak:streaks([...days.keys()],today).best>=7,
      tasks:sets.tasks.size>=25,notes:sets.notes.size>=20,
      time:[...days.values()].reduce((a,b)=>a+b,0)>=600,goal:sets.goalDays.size>=10
    };
    for(const [id,earned] of Object.entries(checks))if(earned)sets.badges.add(id);
    return {...Object.fromEntries(ledgerKeys.map(k=>[k,[...sets[k]]])),targets};
  }
  function validateBackup(data){
    if(!obj(data))return false;
    const {lessons,exams,tasks,study}=data;
    if(!rows(lessons,x=>text(x.name)&&x.name.trim()&&text(x.teacher??'')&&text(x.room??'')&&
      scalar(x.day,0,6)&&Number.isInteger(Number(x.day))&&clock(x.start)&&clock(x.end)&&x.start<x.end&&/^#[0-9a-f]{6}$/i.test(x.color)))return false;
    if(!rows(exams,x=>text(x.name)&&x.name.trim()&&['Vize','Final','Bütünleme','Kısa sınav'].includes(x.type)&&
      date(x.date)&&clock(x.time)&&(x.done===undefined||bool(x.done))))return false;
    if(!rows(tasks,x=>text(x.name)&&x.name.trim()&&['Ödev','Çalışma'].includes(x.type)&&text(x.course??'')&&
      date(x.due)&&['low','medium','high'].includes(x.priority)&&(x.done===undefined||bool(x.done))))return false;
    if(!rows(study,x=>date(x.date)&&scalar(x.minutes,1,1440)&&Number.isInteger(Number(x.minutes))&&text(x.course??'')&&
      (x.source===undefined||x.source==='pomodoro'&&number(x.completedAt,0,8640000000000000))))return false;
    if(!number(data.goal??0,0,1440)||data.theme!==undefined&&!['light','dark'].includes(data.theme)||data.compact!==undefined&&!bool(data.compact))return false;
    if(data.notes!==undefined&&!rows(data.notes,x=>text(x.title)&&text(x.body,60000)&&text(x.course,128)&&
      text(x.courseName??'')&&['violet','blue','mint','amber'].includes(x.color)&&bool(x.favorite)&&bool(x.pinned)&&
      number(x.createdAt,0,8640000000000000)&&number(x.updatedAt,0,8640000000000000),4000))return false;
    const p=data.focusPrefs,t=data.timer;
    if(p!==undefined&&(!obj(p)||['work','short','long'].some(k=>p[k]!==undefined&&(!number(p[k],1,180)||!Number.isInteger(p[k])))||
      p.course!==undefined&&!text(p.course,128)||p.sound!==undefined&&!bool(p.sound)))return false;
    if(t!=null&&(!obj(t)||!['work','short','long'].includes(t.phase)||!['idle','running','paused','finished'].includes(t.status)||
      t.status!=='idle'&&(!ownId(t.id)||!number(t.minutes,1,180)||!text(t.courseName??''))||
      t.status==='running'&&!number(t.endsAt,0,8640000000000000)||
      t.status==='paused'&&!number(t.remainingMs,0,10800000)))return false;
    if(data.grades!==undefined&&!rows(data.grades,validGrade,3000)||data.gradeRules!==undefined&&!validRules(data.gradeRules))return false;
    const r=data.rewards;
    return r==null||obj(r)&&ledgerKeys.every(k=>Array.isArray(r[k])&&r[k].length<=30000&&r[k].every(ownId)&&new Set(r[k]).size===r[k].length)&&
      r.goalDays.every(date)&&r.badges.every(id=>badges.some(b=>b[0]===id))&&obj(r.targets)&&Object.entries(r.targets).every(([day,goal])=>date(day)&&number(goal,0,1440));
  }
  return {gradeRules,gradeTypes,validRules,validGrade,gradeResult,weightedGrades,totals,shifted,streaks,badges,earn,validateBackup};
})();
