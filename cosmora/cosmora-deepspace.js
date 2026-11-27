import { constellationLines } from './constellation-lines.mjs';
import { constellationLabels } from './constellation-labels.mjs';
import { celestialHours, constellationSegments } from './constellation-geometry.mjs?v=02g-16';
import { renderQuality, sceneLoop, listenForTap, qualityOptions, reducedMotion } from './runtime-ui.js';
import { advanceJourney, createJourney, flightMode, integrateFlight, movementSpeed, resolveFlight, validPosition } from './flight.mjs';
import { mountFlightHud } from './flight-hud.js';
import { createDeepModel } from './deep-visuals.js?v=02g-17';
import { qualityProfile, minimumDistance, isDeepMode, planTravel } from './deep-math.mjs';
import './cosmora-astronomy.js?v=02g-18a';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { brightStars } from './hipparcos-bright-stars.js';

// COSMORA Deep Space: educational, artistically scaled representations.
const A = window.Astronomy;
const root = document.querySelector('#space');
const simulator = document.querySelector('.simulator');
const nav = document.querySelector('#skyExperience .mode-bar');
if (!root || !nav) throw new Error('COSMORA keşif arayüzü yüklenemedi.');

const targets = [
  {id:'milky-way',name:'Samanyolu',category:'Galaksi',distance:null,unit:'Güneş galaksi merkezine yaklaşık 26.000 ışık yılı uzakta',type:'Çubuklu sarmal galaksi',ra:17.76,dec:-29,detail:'Güneş Sistemi, Samanyolu’nun Orion Kolu yakınındaki bir bölgesindedir. Buradaki görünüm galaksinin sanatsal, ölçeği sıkıştırılmış temsili modelidir.'},
  {id:'andromeda',name:'Andromeda Galaksisi',category:'Galaksi',distance:2500000,unit:'2,5 milyon ışık yılı',type:'Sarmal galaksi (M31)',ra:.71,dec:41.27,detail:'Samanyolu’nun büyük komşularından biridir. Görsel, fotoğraf veya hassas dinamik simülasyon değil; sarmal yapıyı anlatan prosedürel bir temsildir.'},
  {id:'triangulum',name:'Üçgen Galaksisi',category:'Galaksi',distance:2730000,unit:'yaklaşık 2,73 milyon ışık yılı',type:'Sarmal galaksi (M33)',ra:1.56,dec:30.66,detail:'Yerel Grup içindeki sarmal galaksilerden biridir. Spiral kollar bilimsel görüntü verisi değil, biçimsel bir görselleştirmedir.'},
  {id:'sombrero',name:'Sombrero Galaksisi',category:'Galaksi',distance:30000000,unit:'yaklaşık 30 milyon ışık yılı',type:'Galaksi (M104)',ra:12.67,dec:-11.62,detail:'Gökbilimciler bu galaksiyi neredeyse yandan görür; belirgin toz şeridi görünüşüne “Sombrero” adını vermiştir.'},
  {id:'whirlpool',name:'Girdap Galaksisi',category:'Galaksi',distance:31000000,unit:'yaklaşık 31 milyon ışık yılı',type:'Sarmal galaksi (M51)',ra:13.50,dec:47.20,detail:'Sarmal kolları yıldız oluşum bölgeleri barındırır. Bu 3D model, gözlemsel görüntüden türetilmiş bir doku değildir.'},
  {id:'orion-nebula',name:'Orion Bulutsusu',category:'Bulutsu',distance:1500,unit:'yaklaşık 1.500 ışık yılı',type:'Yıldız oluşum bölgesi (M42)',ra:5.59,dec:-5.39,detail:'Yakın yıldız oluşum bölgelerinden biri olan Orion Bulutsusu, yeni yıldızların gaz ve toz bulutları içinde oluştuğu bir laboratuvardır.'},
  {id:'eagle-nebula',name:'Kartal Bulutsusu',category:'Bulutsu',distance:7000,unit:'yaklaşık 7.000 ışık yılı',type:'Yıldız oluşum bölgesi (M16)',ra:18.31,dec:-13.79,detail:'Kartal Bulutsusu’ndaki yoğun gaz ve toz sütunları genç yıldızların etkisiyle şekillenir.'},
  {id:'crab-nebula',name:'Yengeç Bulutsusu',category:'Bulutsu',distance:6500,unit:'yaklaşık 6.500 ışık yılı',type:'Süpernova kalıntısı (M1)',ra:5.58,dec:22.01,detail:'1054 yılında gözlenen süpernova patlamasının kalıntısıdır. Merkezinde hızlı dönen bir nötron yıldızı bulunur.'},
  {id:'ring-nebula',name:'Halka Bulutsusu',category:'Bulutsu',distance:2300,unit:'yaklaşık 2.300 ışık yılı',type:'Gezegenimsi bulutsu (M57)',ra:18.89,dec:33.03,detail:'Güneş benzeri bir yıldızın dış katmanlarını uzaya bırakmasının ardından oluşan gaz kabuğudur.'},
  {id:'horsehead-nebula',name:'Atbaşı Bulutsusu',category:'Bulutsu',distance:null,unit:'yaklaşık 1.300 ışık yılı (farklı kaynaklar 1.500–1.600 de verir)',type:'Karanlık bulutsu (Barnard 33)',ra:5.68,dec:-2.46,detail:'Parlak arka plan bulutsusunun önündeki yoğun toz, karakteristik silüeti oluşturur. Görsel şekil temsili üretimdir.'},
  {id:'sirius',name:'Sirius',category:'Yıldız',distance:8.6,unit:'8,6 ışık yılı',type:'İkili yıldız sistemi',ra:6.75,dec:-16.72,detail:'Gece göğünün en parlak yıldızıdır. Sirius A ve beyaz cüce eşlikçisi Sirius B’den oluşan bir sistemdir.'},
  {id:'betelgeuse',name:'Betelgeuse',category:'Yıldız',distance:550,unit:'yaklaşık 550 ışık yılı; tahminler değişir',type:'Kırmızı süperdev',ra:5.92,dec:7.41,detail:'Orion’un omzundaki değişen parlaklıklı kırmızı süperdevdir. Uzaklığı ölçüm yöntemine ve modele göre belirsizlik taşır.'},
  {id:'vega',name:'Vega',category:'Yıldız',distance:25,unit:'yaklaşık 25 ışık yılı',type:'A tipi ana kol yıldızı',ra:18.62,dec:38.78,detail:'Lir takımyıldızının parlak yıldızıdır ve fotometrik sistemlerde tarihsel bir referans olarak kullanılmıştır.'},
  {id:'rigel',name:'Rigel',category:'Yıldız',distance:860,unit:'yaklaşık 860 ışık yılı; katalog tahminleri değişir',type:'Mavi süperdev',ra:5.24,dec:-8.20,detail:'Orion’un parlak mavi yıldızlarından biridir. Uzaklık değeri ölçüm ve kataloglara bağlı yaklaşık bir değerdir.'},
  {id:'proxima-centauri',name:'Proxima Centauri',category:'Yıldız',distance:4.24,unit:'yaklaşık 4,24 ışık yılı',type:'Kırmızı cüce; Alpha Centauri sistemi üyesi',ra:14.50,dec:-62.68,detail:'Güneş’e bilinen en yakın yıldızdır. Sönük bir kırmızı cücedir ve yıldız etkinliği gösterebilir.'},
  {id:'antares',name:'Antares',category:'Yıldız',distance:550,unit:'yaklaşık 550 ışık yılı; tahmin belirsizliği yüksek',type:'Kırmızı süperdev',ra:16.49,dec:-26.43,detail:'Akrep takımyıldızının kırmızı süperdev yıldızıdır. Uzaklık değeri önemli ölçüm belirsizliği taşır.'},
  {id:'sgr-a',name:'Sagittarius A*',category:'Kara delik',distance:26000,unit:'yaklaşık 26.000 ışık yılı',type:'Samanyolu merkezindeki süper kütleli kara delik',ra:17.76,dec:-29.01,detail:'Samanyolu merkezinde yer alan ve kütlesi yaklaşık 4,3 milyon Güneş kütlesi olarak ölçülen kara deliktir. Disk ve merceklenme bilimsel veri değil, görsel anlatımdır.'},
  {id:'m87-star',name:'M87*',category:'Kara delik',distance:54000000,unit:'yaklaşık 54 milyon ışık yılı',type:'M87 galaksisindeki süper kütleli kara delik',ra:12.51,dec:12.39,detail:'Event Horizon Telescope işbirliği tarafından gölgesi görüntülenen ilk kara deliktir. Akresyon diski ve ışık bükülmesi bu uygulamada temsili çizilir.'},
  {id:'cygnus-x1',name:'Cygnus X-1',category:'Kara delik',distance:6000,unit:'yaklaşık 6.000 ışık yılı',type:'Yıldız kütleli kara delik ve eş yıldız sistemi',ra:19.97,dec:35.20,detail:'Bir eş yıldızdan madde alan, güçlü X-ışını kaynağı olan yıldız kütleli kara delik sistemidir.'}
];
// Reuse the existing real Hipparcos subset in the combined Deep Space search.
// Unknown stellar distances stay unknown; these entries are placed on a display-only sky shell.
targets.push(...brightStars.map(s=>({id:`hip-${s.hip}`,name:s.name||`HIP ${s.hip}`,category:'Yıldız',distance:null,unit:'Bu 60 yıldızlık seçkide uzaklık verisi yok',type:`Hipparcos yıldızı · HIP ${s.hip}`,ra:s.ra,dec:s.dec,magnitude:s.magnitude,detail:`Gerçek Hipparcos yıldız seçkisinden HIP ${s.hip}. J2000 koordinatları: ${s.ra.toFixed(3)} saat sağ açıklık, ${s.dec.toFixed(2)}° dik açıklık. Bu kayıtta uzaklık bulunmadığından tahmin edilmez.`})));

const ds = document.createElement('section');
ds.id = 'deepSpace'; ds.setAttribute('aria-label','Derin Uzay keşif modu'); ds.innerHTML = `
 <canvas class="deep-canvas" aria-label="Etkileşimli derin uzay sahnesi"></canvas>
 <section class="deep-location" aria-live="polite"><span id="deepRegion">SAMANYOLU · GALAKTİK ÖLÇEK</span><strong id="deepSubject">Samanyolu</strong><small id="deepScale">Güneş’ten merkeze yaklaşık 26.000 ışık yılı</small></section>
 <aside class="deep-tools glass">
  <header><div><small class="deep-kicker">DERİN UZAY KEŞFİ</small><h2>Evren atlası</h2></div><button class="deep-collapse" aria-label="Paneli daralt">−</button></header>
  <div class="deep-tool-body">
   <label for="deepSearch">Gök cismi ara</label><input id="deepSearch" type="search" placeholder="Örn. Andromeda, M87*" autocomplete="off">
   <div class="deep-filter" id="deepFilters"></div><div class="deep-list" id="deepList"></div><details class="deep-recent"><summary>Son ziyaret edilenler</summary><div id="deepRecent"></div></details>
   <div class="deep-toggles"><label><input id="constLines" type="checkbox"> Takımyıldızı çizgileri</label><label><input id="constNames" type="checkbox"> Takımyıldızı adları</label><label><input id="constBounds" type="checkbox"> Yaklaşık IAU bölge sınırları</label><label><input id="decorStars" type="checkbox" checked> Dekoratif yıldız alanı</label></div>
   <label class="quality-label">Grafik kalitesi<select id="deepQuality">${qualityOptions}</select></label>
  </div>
  <small class="deep-data-note">Konumlar katalogdan alınır. Galaksiler, bulutsular ve kara delikler temsili 3D modellerdir.</small>
 </aside>
 <aside class="deep-card glass" id="deepCard"><button id="deepClose" aria-label="Bilgiyi kapat">×</button><small id="deepType">GÖK CİSMİ</small><h2 id="deepName">Hedef seç</h2><p id="deepText">Aramadan, listeden veya sahneden bir gök cismi seç.</p><dl><div><dt>Tür</dt><dd id="deepKind">—</dd></div><div><dt>Dünya’ya uzaklık</dt><dd id="deepDistance">—</dd></div><div><dt>Görsel</dt><dd id="deepRepresentation">Temsili 3B model</dd></div></dl><figure id="deepObservation" hidden><img alt=""><figcaption><a target="_blank" rel="noopener"></a> · <a href="https://www.eso.org/public/copyright/" target="_blank" rel="noopener">CC BY 4.0</a></figcaption></figure><button class="deep-favorite" id="favoriteTarget">☆ Favorilere ekle</button></aside>
 <div class="deep-hud"><span id="travelStatus">SERBEST KEŞİF</span><span id="distanceReadout">Hedef seçilmedi</span><label>Görüş açısı <input id="fovRange" type="range" min="32" max="82" value="54"><b id="fovValue">54°</b></label></div>
 <div class="travel-dock glass">
  <div class="travel-actions"><button id="exploreDeep">Keşfet</button><button id="travelBtn">Hedefe git</button><button id="inspectDeep">Serbest incele</button><button id="homeSpace">Geri dön</button><button id="earthReturn">Dünya’ya dön</button><button id="deepFullscreen">Tam ekran</button><button id="cancelTravel" hidden>İptal</button>
  <details class="deep-advanced"><summary>Gelişmiş</summary><div><button id="stopTravel">Durdur</button><button id="trackDeep">Takip et</button><button id="previousDeep">Önceki hedef</button><button id="favoriteJump">Favoriler</button><button id="solarOverview">Güneş Sistemi</button><button id="followTarget" aria-pressed="false">Otomatik dolaş</button><button id="cinematicTravel" aria-pressed="false">Sinematik</button><label>Kamera hızı <input id="cameraSpeed" type="range" min="1" max="10" value="5"><b id="cameraSpeedValue">5</b></label></div></details></div>
  <small>Görsel simülasyon · Model boyutları ve kamera mesafesi temsilidir.</small>
 </div>
 <div class="deep-toast" role="status" aria-live="polite"></div>`;
simulator.append(ds); const fpsMeter=document.createElement('span');fpsMeter.id='deepFps';fpsMeter.className='cosmora-fps';fpsMeter.textContent='— FPS';ds.querySelector('.deep-hud').prepend(fpsMeter);
const deepButton = document.createElement('button');
deepButton.type='button'; deepButton.className='mode-choice'; deepButton.dataset.mode='deep'; deepButton.innerHTML='<svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="5.8"/><path d="M2 8h12M8 2c2.4 2 2.4 10 0 12M8 2c-2.4 2-2.4 10 0 12"/></svg><span>Derin Uzay</span>';
nav.insertBefore(deepButton,nav.querySelector('.night-toggle'));

const $=s=>ds.querySelector(s), canvas=$('.deep-canvas');
let quality=matchMedia('(max-width:760px)').matches?'low':'medium'; 
if(matchMedia('(max-width:760px)').matches) $('.deep-tools').classList.add('collapsed');
const renderer=new THREE.WebGLRenderer({canvas,alpha:true,antialias:quality!=='low',powerPreference:'low-power'});
const scene=new THREE.Scene(); scene.background=new THREE.Color(0x030713); scene.fog=new THREE.FogExp2(0x030713,.0018);
const camera=new THREE.PerspectiveCamera(54,innerWidth/innerHeight,.1,1800); camera.position.set(0,48,67);
const controls=new OrbitControls(camera,canvas); controls.enableDamping=true; controls.dampingFactor=.075; controls.minDistance=4; controls.maxDistance=420; controls.rotateSpeed=.48; controls.enablePan=true;
const starfield=new THREE.BufferGeometry(); const count=qualityProfile('high').background; const arr=new Float32Array(count*3); let seed=2086; const rand=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
for(let i=0;i<count;i++){const z=rand()*2-1,a=rand()*Math.PI*2,r=rand()*550,s=Math.sqrt(1-z*z);arr.set([r*s*Math.cos(a),r*z,r*s*Math.sin(a)],i*3);}
starfield.setDrawRange(0,qualityProfile(quality).background);starfield.setAttribute('position',new THREE.BufferAttribute(arr,3)); const bgMat=new THREE.PointsMaterial({color:0xa9bde6,size:.42,transparent:true,opacity:.34,sizeAttenuation:false,depthWrite:false});const bgStars=new THREE.Points(starfield,bgMat);scene.add(bgStars);
const objectRoot=new THREE.Group();scene.add(objectRoot); let active=false, selected=null, travel=null, following=false, animTime=0, picked=[];
const disposeGroup=group=>{group.traverse(o=>{o.geometry?.dispose();const ms=Array.isArray(o.material)?o.material:[o.material];ms.forEach(m=>{if(m){Object.values(m).forEach(v=>v?.isTexture&&v.dispose());m.dispose();}});});};
const shaderClock = {value: 0};
const observations={
  'milky-way':['eso0932a','ESO/S. Brunier'],
  'orion-nebula':['eso1103a','ESO/Igor Chekalin'],
  'm87-star':['eso1907a','EHT Collaboration']
};
function createObjects(item=selected??targets[0]){
  disposeGroup(objectRoot);
  objectRoot.clear();
  picked=[];
  if(item.id.startsWith('hip-'))return;
  const model=createDeepModel(item,quality,shaderClock);
  model.userData.target=item;
  objectRoot.add(model);
  picked.push(model);
}
function updatePresentation(item){
  const overview=!item||item.id==='milky-way';
  $('#deepRegion').textContent=overview?'SAMANYOLU · GALAKTİK ÖLÇEK':item.category.toLocaleUpperCase('tr');
  $('#deepSubject').textContent=item?.name??'Samanyolu';
  $('#deepScale').textContent=item?.unit??'Güneş’ten merkeze yaklaşık 26.000 ışık yılı';
  const figure=$('#deepObservation'), source=observations[item?.id];
  figure.hidden=!source;
  if(source){
    const [id,credit]=source;
    const img=figure.querySelector('img'), link=figure.querySelector('a');
    img.src='./assets/textures/'+id+'.jpg';
    img.alt=item.name+' · gözlem görüntüsü';
    link.href='https://www.eso.org/public/images/'+id+'/';
    link.textContent='Gözlem görüntüsü · '+credit;
  }
  $('#deepRepresentation').textContent=item?.id.startsWith('hip-')?'Katalog kaydı':'Temsili 3B model';
  $('#travelBtn').disabled=!item||item.id.startsWith('hip-');
}

const favoriteStore='cosmora-deep-favorites-v1';let favorites=new Set(JSON.parse(localStorage.getItem(favoriteStore)||'[]'));const visitStore='cosmora-deep-visits-v1';let visits=JSON.parse(localStorage.getItem(visitStore)||'[]');
let category='Tümü';function paintFilters(){const cats=['Tümü','Galaksi','Bulutsu','Yıldız','Kara delik','Favoriler'];$('#deepFilters').innerHTML=cats.map(c=>`<button type="button" class="${category===c?'selected':''}" data-category="${c}">${c}</button>`).join('');$('#deepFilters').querySelectorAll('button').forEach(b=>b.onclick=()=>{category=b.dataset.category;paintFilters();paintList($('#deepSearch').value);});}
function paintList(query=''){const q=query.trim().toLocaleLowerCase('tr');const list=targets.filter(x=>(category==='Tümü'||category==='Favoriler'&&favorites.has(x.id)||x.category===category)&&(!q||`${x.name} ${x.category} ${x.type}`.toLocaleLowerCase('tr').includes(q)));$('#deepList').innerHTML=list.map(x=>`<button class="deep-row ${selected?.id===x.id?'active':''}" data-id="${x.id}"><i class="kind-${x.category==='Kara delik'?'hole':x.category==='Galaksi'?'galaxy':x.category==='Bulutsu'?'nebula':'star'}"></i><span>${x.name}<small>${x.category}</small></span><b>${favorites.has(x.id)?'★':'›'}</b></button>`).join('')||'<p class="deep-empty">Eşleşen cisim bulunamadı.</p>';$('#deepList').querySelectorAll('[data-id]').forEach(b=>b.onclick=()=>selectTarget(targets.find(x=>x.id===b.dataset.id)));}
function paintRecent(){const recent=visits.map(id=>targets.find(x=>x.id===id)).filter(Boolean);$('#deepRecent').innerHTML=recent.length?recent.map(x=>`<button class="deep-recent-row" data-id="${x.id}">${x.name}<small>${x.category}</small></button>`).join(''):'<small>Henüz ziyaret yok.</small>';$('#deepRecent').querySelectorAll('[data-id]').forEach(b=>b.onclick=()=>selectTarget(targets.find(x=>x.id===b.dataset.id)));}
let previousTarget=null, tracking=false;
function selectTarget(item){if(!item)return;if(selected?.id!==item.id){previousTarget=selected;selected=item;createObjects();}updatePresentation(item);paintList($('#deepSearch').value);$('#deepType').textContent=item.category.toLocaleUpperCase('tr');$('#deepName').textContent=item.name;$('#deepText').textContent=item.detail;$('#deepKind').textContent=item.type;$('#deepDistance').textContent=item.unit;$('#deepCard').classList.add('open');$('#favoriteTarget').textContent=favorites.has(item.id)?'★ Favorilerden çıkar':'☆ Favorilere ekle';travelTo(item);visits=[item.id,...visits.filter(id=>id!==item.id)].slice(0,8);localStorage.setItem(visitStore,JSON.stringify(visits));paintRecent();}
function stopOrbit() {
  following = false;
  tracking = false;
  $('#followTarget').setAttribute('aria-pressed','false');
}
function startTravel(target, approach) {
  const path = planTravel(camera.position.toArray(), controls.target.toArray(), target.toArray(), approach);
  travel = createJourney(path.start,path.startLook,path.end,path.target,Number($('#cameraSpeed').value));
  movementVelocity.set(0,0,0);
  controls.minDistance = 0;
  stopOrbit();
  $('#travelStatus').textContent = 'HEDEFE YOLCULUK';
}
function travelTo(item, factor=1) {
  const model = picked.find(object => object.userData.target.id === item.id);
  if(!model){manualDeep();return;}
  const approach=({'Galaksi':64,'Bulutsu':31,'Kara delik':22})[item.category]??10;
  const view=item.category==='Galaksi'?new THREE.Vector3(0,52,65):new THREE.Vector3(0,18,85);
  const distance=camera.position.length();
  camera.position.copy(view.normalize()).multiplyScalar(Math.max(approach*1.8,distance));
  controls.target.set(0,0,0);
  lastSafe=camera.position.toArray();
  startTravel(model.position,approach*factor);
}
function toast(s){const el=$('.deep-toast');el.textContent=s;el.classList.add('show');clearTimeout(toast.timer);toast.timer=setTimeout(()=>el.classList.remove('show'),2400);}
function setupConstellations(){
  if(!A)return;
  function skyPosition([longitude,latitude],radius){
    const ra=celestialHours(longitude)*Math.PI/12,dec=latitude*Math.PI/180;
    return new THREE.Vector3(-radius*Math.cos(dec)*Math.cos(ra),radius*Math.sin(dec),radius*Math.cos(dec)*Math.sin(ra));
  }
  const vertices=[];
  for(const segment of constellationSegments(constellationLines)){
    vertices.push(...segment.map(point=>skyPosition(point,100)));
  }
  const lines=new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(vertices),
    new THREE.LineBasicMaterial({color:0x8cb8ce,transparent:true,opacity:.13}));
  lines.visible=false;scene.add(lines);
  $('#constLines').onchange=event=>lines.visible=event.target.checked;
 const names=new THREE.Group();scene.add(names);const label=txt=>{const c=document.createElement('canvas');c.width=256;c.height=64;const x=c.getContext('2d');x.fillStyle='rgba(196,215,235,.66)';x.font='500 19px Manrope, Georgia, serif';x.shadowColor='rgba(0,0,0,.8)';x.shadowBlur=6;x.textAlign='center';x.fillText(txt,128,40);const t=new THREE.CanvasTexture(c);const s=new THREE.Sprite(new THREE.SpriteMaterial({map:t,transparent:true,depthTest:false}));s.scale.set(13,3.25,1);return s;};
 for(const [,name,position] of constellationLabels){const sprite=label(name);sprite.position.copy(skyPosition(position,119));names.add(sprite);}
 $('#constNames').onchange=e=>names.visible=e.target.checked;names.visible=false;
 const bounds=new THREE.Group();scene.add(bounds);bounds.visible=false;$('#constBounds').onchange=e=>bounds.visible=e.target.checked;
 // Render IAU region transitions by sampling the MIT-licensed Astronomy Engine classifier on the celestial sphere.
 const geo=new THREE.BufferGeometry(),segments=[];let raStep=2,decStep=2,raN=180,decN=90,grid=new Array(raN*decN),row=0;
 const classify=(rh,dd)=>{try{return A.Constellation(((rh%24)+24)%24,Math.max(-89.99,Math.min(89.99,dd)));}catch{return null}};
 const buildChunk=()=>{const stop=Math.min(decN,row+5);for(;row<stop;row++){for(let x=0;x<raN;x++)grid[row*raN+x]=classify(x*raStep/15,-90+row*decStep+1);}
  if(row<decN){requestAnimationFrame(buildChunk);return;}for(let y=0;y<decN;y++)for(let x=0;x<raN;x++){
      const symbol=grid[y*raN+x]?.symbol,nx=(x+1)%raN;
      if(symbol!==grid[y*raN+nx]?.symbol)addEdge(x*raStep+raStep,-90+y*decStep,x*raStep+raStep,-90+(y+1)*decStep);
      if(y<decN-1&&symbol!==grid[(y+1)*raN+x]?.symbol)addEdge(x*raStep,-90+(y+1)*decStep,(x+1)*raStep,-90+(y+1)*decStep);
    }const flat=segments.flat();geo.setAttribute('position',new THREE.Float32BufferAttribute(flat,3));const lines=new THREE.LineSegments(geo,new THREE.LineBasicMaterial({color:0x9ebce2,transparent:true,opacity:.12}));bounds.add(lines);bounds.userData.ready=true;};
 const addEdge=(r1,d1,r2,d2)=>{for(const [rh,dd] of [[r1/15,d1],[r2/15,d2]]){const r=115,a=rh*Math.PI/12,d=dd*Math.PI/180;segments.push([-r*Math.cos(d)*Math.cos(a),r*Math.sin(d),r*Math.cos(d)*Math.sin(a)]);}};requestAnimationFrame(buildChunk);
}
setupConstellations();
function setDeepMode(mode){
 const on=isDeepMode(mode); if(!on){ fromSky=false;travel=null; stopOrbit(); movementKeys.clear(); movementVelocity.set(0,0,0); }
 active=on;ds.classList.toggle('visible',on);const sky=document.querySelector('#skyExperience');sky?.classList.toggle('deep-active',on);document.querySelector('#skyExperience [data-mode="deep"]')?.classList.toggle('active',on);
 if(on){if(!picked.length&&!selected)createObjects();updatePresentation(selected);for(const selector of ['.intro','.planet-panel','.info-panel','.scene-tools','.scale-note','.camera-hint','.control-dock','.mobile-body-picker','.sim-footer','#skyExperience .sky-left','#skyExperience .sky-info','#skyExperience .sky-hud','#skyExperience .time-dock','#skyExperience .sky-canvas'])document.querySelector(selector)?.classList.add('mode-hidden');root.querySelector('canvas:not(.deep-canvas)')?.classList.add('mode-hidden');renderer.setSize(innerWidth,innerHeight);deepQuality.resize();}
}
deepButton.addEventListener('click',()=>{document.querySelectorAll('#skyExperience [data-mode]').forEach(b=>b.classList.toggle('active',b===deepButton));document.querySelector('.sky-canvas')?.classList.add('mode-hidden');root.querySelector('canvas:not(.deep-canvas)')?.classList.add('mode-hidden');document.querySelectorAll('#skyExperience .sky-left,#skyExperience .sky-info,#skyExperience .sky-hud,#skyExperience .time-dock').forEach(el=>el.classList.add('mode-hidden'));document.querySelector('.planet-panel')?.classList.add('mode-hidden');document.querySelector('.info-panel')?.classList.add('mode-hidden');document.querySelector('.control-dock')?.classList.add('mode-hidden');setDeepMode(deepButton.dataset.mode);});
nav.querySelectorAll('[data-mode]:not([data-mode="deep"])').forEach(b=>b.addEventListener('click',()=>setDeepMode(b.dataset.mode)));
$('#deepSearch').addEventListener('input',e=>paintList(e.target.value));paintFilters();paintList();paintRecent();$('#deepClose').onclick=()=>$('#deepCard').classList.remove('open');$('.deep-collapse').onclick=()=>$('.deep-tools').classList.toggle('collapsed');
document.querySelector('#nightToggle').addEventListener('click',()=>ds.classList.toggle('night-vision',document.querySelector('#nightToggle').getAttribute('aria-pressed')==='true'));
$('#favoriteTarget').onclick=()=>{if(!selected)return;if(favorites.has(selected.id))favorites.delete(selected.id);else favorites.add(selected.id);localStorage.setItem(favoriteStore,JSON.stringify([...favorites]));$('#favoriteTarget').textContent=favorites.has(selected.id)?'★ Favorilerden çıkar':'☆ Favorilere ekle';paintList($('#deepSearch').value);};
 $('#earthReturn').onclick=()=>{const solarMode=document.querySelector('#skyExperience [data-mode="solar"]');if(!solarMode||!window.COSMORA_SOLAR_API){toast('Güneş Sistemi henüz hazır değil.');return;}solarMode.click();window.COSMORA_SOLAR_API.selectBody('earth');$('#deepCard').classList.remove('open');$('#travelStatus').textContent='DÜNYA MODELİNE DÖNÜŞ';};
$('#deepFullscreen').onclick=async()=>{try{if(document.fullscreenElement){await document.exitFullscreen();toast('Tam ekrandan çıkıldı.');}else{await document.querySelector('#simulator').requestFullscreen();toast(document.fullscreenElement?'Tam ekran açıldı.':'Bu tarayıcı tam ekran kipini etkinleştirmedi.');}}catch{toast('Tam ekran bu tarayıcıda kullanılamıyor.');}};
$('#fovRange').oninput=e=>{camera.fov=Number(e.target.value);camera.updateProjectionMatrix();$('#fovValue').textContent=`${camera.fov}°`;};$('#cameraSpeed').oninput=e=>$('#cameraSpeedValue').textContent=e.target.value;
$('#decorStars').onchange=e=>bgStars.visible=e.target.checked;
$('.deep-tools').classList.remove('collapsed');
listenForTap(canvas,e=>{if(!active||travel)return;const rect=canvas.getBoundingClientRect(),m=new THREE.Vector2((e.clientX-rect.left)/rect.width*2-1,-(e.clientY-rect.top)/rect.height*2+1),ray=new THREE.Raycaster();ray.params.Points.threshold=1.5;ray.setFromCamera(m,camera);const [hit]=ray.intersectObjects(picked,true);if(hit){let obj=hit.object;while(obj&&!obj.userData.target)obj=obj.parent;if(obj?.userData.target)selectTarget(obj.userData.target);}});
const movementKeys=new Set(),movementVelocity=new THREE.Vector3(),movementIntent=new THREE.Vector3();
window.addEventListener('keydown',e=>{if(e.key==='Escape'&&active){cancelMotion();ds.classList.remove('cinematic-deep');$('#cinematicTravel').setAttribute('aria-pressed','false');$('#travelStatus').textContent='SERBEST KEŞİF';return;}if(!active||e.target?.closest?.('input,select,textarea,button,[contenteditable]'))return;const key=e.key.toLowerCase();if(['w','a','s','d','q','e','shift','control'].includes(key)){if(key!=='shift'&&key!=='control'&&(travel||following||tracking||ds.classList.contains('cinematic-deep')))manualDeep();movementKeys.add(key);e.preventDefault();}});
window.addEventListener('keyup',e=>movementKeys.delete(e.key.toLowerCase()));window.addEventListener('blur',()=>movementKeys.clear());
function resize(){camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);deepQuality.resize();}window.addEventListener('resize',resize);
function cancelMotion() {
  travel = null;
  stopOrbit();
  movementKeys.clear();
  movementVelocity.set(0,0,0);
}
const deepHud=mountFlightHud(ds,movementKeys,manualDeep);
function manualDeep() {
  cancelMotion();
  controls.enabled=true;
  ds.classList.remove('cinematic-deep');
  $('#cinematicTravel').setAttribute('aria-pressed','false');
  $('#travelStatus').textContent='SERBEST KEŞİF';
}
for(const event of ['pointerdown','wheel'])canvas.addEventListener(event,()=>{
  if(travel||following||tracking||ds.classList.contains('cinematic-deep'))manualDeep();
},{capture:true,passive:true});
$('#cancelTravel').onclick=manualDeep;
$('#trackDeep').onclick=()=>{
  if(!selected){toast('Önce bir hedef seç.');return;}
  const enable=!tracking;
  cancelMotion();
  tracking=enable;
  $('#travelStatus').textContent=tracking?'HEDEF TAKİPTE':'SERBEST KEŞİF';
};
$('#inspectDeep').onclick=manualDeep;
$('#exploreDeep').onclick=()=>{
  $('.deep-tools').classList.remove('collapsed');
  simulator.classList.add('mobile-panels-open');
  $('#deepSearch').focus();
};
$('#previousDeep').onclick=()=>{if(previousTarget)selectTarget(previousTarget);else toast('Önceki hedef yok.');};
$('#favoriteJump').onclick=()=>{
  category='Favoriler';
  $('#deepSearch').value='';
  paintFilters();paintList();
  $('.deep-tools').classList.remove('collapsed');
  simulator.classList.add('mobile-panels-open');
  $('#deepSearch').focus();
};
$('#solarOverview').onclick=()=>{
  nav.querySelector('[data-mode="solar"]').click();
  document.querySelector('#overviewBtn').click();
};
$('#travelBtn').onclick = () => { if (selected) travelTo(selected); else toast('Önce bir hedef seç.'); };
$('#stopTravel').onclick = () => { cancelMotion(); $('#travelStatus').textContent = 'SERBEST KEŞİF'; };
$('#followTarget').onclick = () => {
  if (!selected || travel) { toast('Bir hedef seç ve yolculuğun bitmesini bekle.'); return; }
  following = !following;
  $('#followTarget').setAttribute('aria-pressed', String(following));
  $('#travelStatus').textContent = following ? 'OTOMATİK DOLAŞMA' : 'SERBEST KEŞİF';
};
$('#cinematicTravel').onclick = () => {
  $('#cinematicTravel').setAttribute('aria-pressed', String(ds.classList.toggle('cinematic-deep')));
};
let fromSky=false;
window.addEventListener('cosmora-deep-journey',event=>{
  const id={32349:'sirius',27989:'betelgeuse',91262:'vega',24436:'rigel',70890:'proxima-centauri',80763:'antares'}[event.detail.hip];
  const target=targets.find(item=>item.id===id);
  if(!target)return;
  event.preventDefault();
  deepButton.click();
  fromSky=true;
  selectTarget(target);
});
$('#homeSpace').onclick=()=>{
  manualDeep();
  if(fromSky){
    fromSky=false;
    nav.querySelector('[data-mode="sky"]').click();
    return;
  }
  selected=null;
  createObjects();
  updatePresentation(null);
  paintList($('#deepSearch').value);
  $('#deepCard').classList.remove('open');
  startTravel(new THREE.Vector3(),82);
  travel.end=[0,48,67];
};

const up = new THREE.Vector3(0,1,0);
const forward = new THREE.Vector3(), right = new THREE.Vector3();
const offset = new THREE.Vector3(), previous = new THREE.Vector3(), movement = new THREE.Vector3();
let lastSafe=camera.position.toArray();
let last = performance.now(), hudStamp = 0;

function frame(now) {

  const dt = Math.min((now-last)/1000,.05);
  last = now;

  shaderClock.value = animTime += dt;
  previous.copy(camera.position);
  const speed = Number($('#cameraSpeed').value);
  const model = selected && picked.find(object => object.userData.target.id === selected.id);
  if (travel) {
    const state=advanceJourney(travel,dt);
    travel.elapsed=state.elapsed;
    camera.position.fromArray(state.position);
    controls.target.fromArray(state.look);
    if(state.done){
      travel = null;
      $('#travelStatus').textContent = model ? 'HEDEFE ULAŞILDI' : 'SERBEST KEŞİF';
    }
  } else if ((following||tracking||(!reducedMotion.matches&&ds.classList.contains("cinematic-deep"))) && model) {
    controls.target.lerp(model.position,1-Math.exp(-3*dt));
    offset.copy(camera.position).sub(model.position).applyAxisAngle(up,tracking?0:dt*(.1+speed*.025));
    if(!reducedMotion.matches&&ds.classList.contains("cinematic-deep")){const base=minimumDistance(selected.category)*3.1;offset.setLength(THREE.MathUtils.lerp(offset.length(),base*(1+Math.sin(animTime*.55)*.24),1-Math.exp(-.55*dt)));}
    camera.position.copy(model.position).add(offset);
  } else {
    movementIntent.set(0,0,0);
    camera.getWorldDirection(forward);
    right.crossVectors(forward,camera.up).normalize();
    if (movementKeys.has('w')) movementIntent.add(forward);
    if (movementKeys.has('s')) movementIntent.sub(forward);
    if (movementKeys.has('d')) movementIntent.add(right);
    if (movementKeys.has('a')) movementIntent.sub(right);
    if (movementKeys.has('q')) movementIntent.y += 1;
    if (movementKeys.has('e')) movementIntent.y -= 1;
    movementIntent.normalize().multiplyScalar(movementSpeed(speed*2.2,movementKeys));
    const step=integrateFlight(movementVelocity.toArray(),movementIntent.toArray(),dt);
    movementVelocity.fromArray(step.velocity);
    movement.fromArray(step.displacement);
    camera.position.add(movement);
    controls.target.add(movement);
  }
  $('#cancelTravel').hidden=!travel;
  controls.enabled = !travel;
  controls.enableDamping = !travel;
  controls.update();
  const desired=camera.position.toArray();
  const colliders=picked.filter(object=>object===model||object.userData.target.id==='milky-way')
    .map(object=>({center:object.position.toArray(),radius:minimumDistance(object.userData.target.category)}));
  const safe=resolveFlight(previous.toArray(),desired,colliders,lastSafe);
  if(!validPosition(desired)||!validPosition(controls.target.toArray())){
    cancelMotion();
    controls.target.set(0,0,0);
  }
  if(travel && validPosition(desired) && offset.fromArray(safe).distanceTo(camera.position)>.05){
    cancelMotion();
    $('#travelStatus').textContent='GÜVENLİ SINIRDA DURDU';
  }
  camera.position.fromArray(safe);
  camera.lookAt(controls.target);
  lastSafe=safe;
  for (const object of objectRoot.children) {
    const {points, detailMaterial, flares, activity} = object.userData;
    if (!points && !detailMaterial && !flares) continue;
    const distance = camera.position.distanceTo(object.position);
    if (points) {
      const total = points.geometry.attributes.position.count;
      points.geometry.setDrawRange(0,Math.ceil(total*(distance>170?.35:distance>95?.68:1)));
    }
    if (detailMaterial) detailMaterial.uniforms.detail.value = quality==='low'?0:1-THREE.MathUtils.smoothstep(distance,9,45);
    if (flares) {
      flares.visible = distance < (quality==='low'?24:58);
      flares.rotation.y = animTime*.08*activity;
      flares.scale.setScalar(1+Math.sin(animTime*activity)*.06);
    }
  }
  if (now-hudStamp >= 100) {
    hudStamp=now;
    const direction=camera.getWorldDirection(forward);
    deepHud.update({mode:flightMode({travel,cinematic:ds.classList.contains('cinematic-deep'),orbit:following,tracking}),
      target:selected?.name,velocity:dt>0?camera.position.distanceTo(previous)/dt:0,
      range:model?camera.position.distanceTo(model.position):null,astronomical:selected?.unit,
      bearing:(Math.atan2(direction.x,-direction.z)*180/Math.PI+360)%360,fov:camera.fov,
      fraction:travel?travel.elapsed/travel.duration:null});
    $('#distanceReadout').textContent = model
      ? `Kamera mesafesi (görsel ölçek): ${camera.position.distanceTo(model.position).toFixed(1)} birim`
      : 'Hedef seçilmedi';
  }
  renderer.render(scene,camera);
  deepQuality.frame(now);
}
const deepQuality=renderQuality($('#deepQuality'),fpsMeter,(level,ratio)=>{
  renderer.setPixelRatio(ratio);
  if(level===quality)return;
  quality=level;
  starfield.setDrawRange(0,qualityProfile(level).background);
  if(picked.length)createObjects();
});
resize();
const stopDeep=sceneLoop(ds,()=>active,frame,()=>{
  last=performance.now();deepQuality.pause();movementKeys.clear();movementVelocity.set(0,0,0);
},()=>renderer);
window.addEventListener('pagehide',event=>{if(event.persisted)return;stopDeep();window.removeEventListener('resize',resize);controls.dispose();disposeGroup(scene);renderer.dispose();renderer.forceContextLoss();});
