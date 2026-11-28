export const types={
  homes:{name:'Konut Kulesi',cost:220,color:0x50d3ee,height:5.6,capacity:44,energy:-8,water:-10,expense:10,green:0},
  offices:{name:'Teknoloji Merkezi',cost:290,color:0xae91ff,height:8.6,capacity:0,jobs:32,energy:-12,water:-5,expense:17,green:-4},
  solar:{name:'Güneş Parkı',cost:155,color:0x55a7ed,height:1.5,capacity:0,energy:29,water:0,expense:5,green:8},
  wind:{name:'Rüzgâr Türbini',cost:190,color:0xc2f2ff,height:5.6,capacity:0,energy:38,water:0,expense:7,green:9},
  water:{name:'Su Tesisi',cost:170,color:0x49d6b6,height:2.6,capacity:0,energy:-3,water:45,expense:6,green:5},
  park:{name:'Kent Parkı',cost:125,color:0x65d18d,height:1.2,capacity:0,energy:-1,water:-3,expense:4,green:16},
  plaza:{name:'Kent Meydanı',cost:135,color:0xd98dec,height:1.3,capacity:0,energy:-2,water:-2,expense:4,green:5}
};
export const lots=Array.from({length:36},(_,i)=>({id:i,x:(i%6-2.5)*9,z:(Math.floor(i/6)-2.5)*9}));
const startBuildings={7:{type:'homes',level:1},8:{type:'offices',level:1},9:{type:'plaza',level:1},10:{type:'solar',level:1},13:{type:'homes',level:1},14:{type:'offices',level:1},15:{type:'homes',level:1},16:{type:'park',level:1},19:{type:'offices',level:1},20:{type:'park',level:1},21:{type:'offices',level:1},22:{type:'homes',level:1},25:{type:'wind',level:1},26:{type:'homes',level:1},27:{type:'water',level:1},28:{type:'park',level:1}};
export function initial(){
  return {lots:structuredClone(startBuildings),budget:1850,pop:76,day:1,phase:.35,quality:'medium',light:'auto',policy:'balanced',paused:false,events:['1. gün · Şehir yönetimi başladı.']};
}
const validKey=(object,key)=>typeof key==='string'&&Object.hasOwn(object,key);
const cap=(value,min,max)=>Math.min(max,Math.max(min,value));
export function load(){
  const base=initial();
  try{
    const stored=JSON.parse(localStorage.getItem('nexora.neocity.v1'));
    if(!stored||typeof stored.lots!=='object'||!stored.lots)return base;
    const entries=Object.entries(stored.lots).filter(([k,b])=>/^\d+$/.test(k)&&Number(k)<lots.length&&b&&validKey(types,b.type)&&Number.isInteger(b.level)&&b.level>=1&&b.level<=4);
    const valid={...base,lots:Object.fromEntries(entries)};
    for(const k of ['budget','pop','day','phase'])if(Number.isFinite(stored[k]))valid[k]=stored[k];
    valid.pop=cap(Math.floor(valid.pop),0,99999);valid.day=Math.max(1,Math.floor(valid.day));valid.phase=cap(valid.phase,0,1);
    if(['low','medium','high'].includes(stored.quality))valid.quality=stored.quality;
    if(['auto','day','night'].includes(stored.light))valid.light=stored.light;
    if(['balanced','growth','quiet'].includes(stored.policy))valid.policy=stored.policy;
    valid.paused=stored.paused===true;
    if(Array.isArray(stored.events))valid.events=stored.events.filter(s=>typeof s==='string').slice(0,12);
    return valid;
  }catch{return base;}
}
export function stats(city){
  const result={capacity:0,jobs:0,production:10,renewable:0,demand:0,supply:28,usage:0,green:47,happy:58,expense:0,size:0};
  for(const {type,level} of Object.values(city.lots)){
    const t=types[type];
    result.size++;result.capacity+=t.capacity*level;result.jobs+=(t.jobs||0)*level;
    if(t.energy>0){result.production+=t.energy*level;result.renewable+=t.energy*level;}
    else result.demand-=t.energy*level;
    if(t.water>0)result.supply+=t.water*level;else result.usage-=t.water*level;
    result.green+=t.green*level;result.expense+=t.expense*level;
    if(type==='park'||type==='plaza')result.happy+=(type==='park'?6:5)*level;
  }
  result.demand+=Math.ceil(city.pop*.10);result.usage+=Math.ceil(city.pop*.13);
  result.energyDeficit=Math.max(0,result.demand-result.production);
  result.waterDeficit=Math.max(0,result.usage-result.supply);
  result.green=cap(result.green-Math.floor(city.pop/28),0,100);
  result.happy=cap(result.happy-Math.ceil(result.energyDeficit*.6+result.waterDeficit*.6)-Math.max(0,Math.floor((city.pop-result.jobs)/25)),0,100);
  const income=Math.round(city.pop*.68+Math.min(city.pop,result.jobs)*.44);
  result.net=income-result.expense-(city.policy==='growth'?14:0);
  result.level=city.pop>=290&&result.happy>=75&&result.size>=20?4:city.pop>=160&&result.size>=17?3:city.pop>=75&&result.size>=12?2:1;
  return result;
}
export function log(city,message){city.events.unshift(city.day+'. gün · '+message);city.events=city.events.slice(0,12);}
export function advance(city){
  const s=stats(city),coefficient={balanced:1,growth:1.7,quiet:0}[city.policy];
  city.day++;city.budget+=s.net;
  const change=s.happy>=55&&city.budget>=0?Math.floor((s.happy-45)*.22*coefficient):-Math.ceil((Math.max(0,60-s.happy)+(city.budget<0?12:0))*.12);
  city.pop=cap(city.pop+change,0,s.capacity);
  if(s.energyDeficit||s.waterDeficit)log(city,'Şehir altyapısı talebi karşılayamıyor.');
}
export function modify(city,id,action,type){
  if(!lots[id])return 'Önce bir arsa seç.';
  const current=city.lots[id];
  if(action==='build'){
    if(current||!validKey(types,type))return 'İnşa için boş bir arsa seç.';
    const t=types[type];
    if(city.budget<t.cost)return 'Bütçe bu inşaat için yeterli değil.';
    city.budget-=t.cost;city.lots[id]={type,level:1};log(city,t.name+' inşa edildi.');return null;
  }
  if(!current)return 'Bu arsa boş.';
  const t=types[current.type];
  if(action==='upgrade'){
    if(current.level>=4)return 'Bina en yüksek seviyede.';
    const cost=Math.ceil(t.cost*.6*current.level);
    if(city.budget<cost)return 'Bütçe geliştirme için yeterli değil.';
    city.budget-=cost;current.level++;log(city,t.name+' seviye '+current.level+' oldu.');return null;
  }
  if(action==='remove'){
    const refund=Math.floor(t.cost*.25*current.level);
    delete city.lots[id];city.budget+=refund;city.pop=Math.min(city.pop,stats(city).capacity);log(city,t.name+' kaldırıldı.');return null;
  }
  return 'Geçersiz işlem.';
}
