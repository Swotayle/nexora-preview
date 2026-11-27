import { constellationLines } from './constellation-lines.mjs';
import { constellationLabels } from './constellation-labels.mjs';
import { celestialHours, constellationSegments } from './constellation-geometry.mjs';
import { makeJ2000Horizon } from './constellation-geometry.mjs';
import { renderQuality, sceneLoop, listenForTap, qualityOptions } from './runtime-ui.js';
import { calibrationOffset, relativePose, screenDegrees, sensorReading, smoothing } from './runtime-math.mjs';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { brightStars } from './hipparcos-bright-stars.js?v=02g';
import { loadStarCatalog } from './star-catalog.mjs';
import { horizonCartesian } from './sky-math.mjs';
const Astronomy = window.Astronomy;
if (!Astronomy) { window.cosmoraModuleFallback?.('astronomy'); throw new Error('Astronomy Engine yüklenemedi. İnternet bağlantısını kontrol et.'); }

const $ = (s, root = document) => root.querySelector(s);
const host = $('#space');
let solarCanvas = $('canvas:not(.sky-canvas)', host);
const ui = document.createElement('div');
ui.id = 'skyExperience';
ui.innerHTML = `
  <nav class="mode-bar" aria-label="Keşif modu">
    <button type="button" class="mode-choice active" data-mode="sky"><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 1.5 9.7 6.3 14.5 8l-4.8 1.7L8 14.5l-1.7-4.8L1.5 8l4.8-1.7L8 1.5Z"/></svg><span>Gökyüzü</span></button>
    <button type="button" class="mode-choice" data-mode="solar"><svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="2.1"/><ellipse cx="8" cy="8" rx="6.4" ry="2.7" transform="rotate(-25 8 8)"/></svg><span>Güneş Sistemi</span></button>
    <button type="button" class="night-toggle" id="nightToggle" aria-pressed="false"><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M11.9 10.8A6 6 0 0 1 5.2 4.1a6 6 0 1 0 6.7 6.7Z"/></svg><span>Gece görüşü</span></button>
  </nav>
  <section class="sky-left glass" id="skyLeft">
    <header><div><small class="eyebrow">GÖKYÜZÜ KEŞFİ</small><h2>Yıldız atlası</h2></div><button class="sky-icon" id="collapseLeft" aria-label="Yıldız panelini daralt">−</button></header>
    <div class="sky-left-content">
      <label class="sky-search-label" for="skySearch">Yıldız veya takımyıldız ara</label>
      <input id="skySearch" class="sky-search" type="search" placeholder="Örn. Vega, Orion, HIP 91262" autocomplete="off">
      <div class="sky-filter-row"><span>PARLAK YILDIZ SEÇKİSİ</span><b id="starCount">0</b></div>
      <div class="sky-results" id="skyResults" role="listbox" aria-label="Gökyüzü arama sonuçları"></div>
      <details class="constellation-browser"><summary>88 resmî takımyıldızı</summary><div id="constellationList"></div></details>
      <details class="location-box"><summary>Gözlem yeri <span id="locationSummary">İstanbul</span></summary>
        <label>Şehir <select id="citySelect"><option value="41.0082,28.9784,İstanbul">İstanbul</option><option value="39.9334,32.8597,Ankara">Ankara</option><option value="38.4237,27.1428,İzmir">İzmir</option><option value="40.1885,29.0610,Bursa">Bursa</option><option value="36.8969,30.7133,Antalya">Antalya</option><option value="manual">Koordinatları kendim gireceğim</option></select></label>
        <div class="coordinate-row"><label>Enlem <input id="latitudeInput" type="number" min="-90" max="90" step="0.0001" value="41.0082"></label><label>Boylam <input id="longitudeInput" type="number" min="-180" max="180" step="0.0001" value="28.9784"></label></div>
        <div class="location-actions"><button id="applyLocation">Konumu uygula</button><button id="geoLocation">Konumumu kullan</button></div>
        <small>Konum yalnızca bu cihazda hesaplanır; hiçbir sunucuya gönderilmez.</small>
      </details>
      <label class="sky-check"><input id="constellationToggle" type="checkbox" checked> Takımyıldızı çizgileri</label>
      <label class="sky-check"><input id="constellationNamesToggle" type="checkbox" checked> Takımyıldızı adları</label>
      <label class="sky-check"><input id="labelToggle" type="checkbox"> Yıldız adları</label>
      <label class="sky-check">Grafik kalitesi <select id="qualityToggle">${qualityOptions}</select></label>
    </div>
  </section>
  <aside class="sky-info glass" id="skyInfo" aria-live="polite">
    <button id="closeSkyInfo" class="sky-icon sky-info-close" aria-label="Bilgi panelini kapat">×</button>
    <small class="eyebrow" id="skyInfoType">SEÇİLİ GÖK CİSMİ</small><h2 id="skyInfoName">Gökyüzünü keşfet</h2>
    <p id="skyInfoText">Bir yıldıza dokun veya arama alanından seç. Gökyüzü konuma ve seçilen tarihe göre hesaplanır.</p>
    <dl><div><dt>Takımyıldız</dt><dd id="skyConstellation">—</dd></div><div><dt>HIP katalog no.</dt><dd id="skyHip">—</dd></div><div><dt>Parlaklık</dt><dd id="skyMagnitude">—</dd></div><div><dt>Sağ açıklık / dik açıklık</dt><dd id="skyCoords">—</dd></div><div><dt>Azimut / yükseklik</dt><dd id="skyHorizon">—</dd></div></dl><section id="starExtras" hidden><p id="physical"></p><button id="aimStar">Odaklan</button> <button id="trackStar">Takip et</button> <button id="favStar">Favorilere ekle</button></section>
  </aside>
  <div id="starPointer" hidden><span></span></div><div class="sky-hud" id="skyHud"><span>KUZEY <b>N</b></span><i></i><span>DOĞU <b>E</b></span><i></i><span>GÜNEY <b>S</b></span><i></i><span>BATI <b>W</b></span></div>
  <div class="milky-way-note">SAMANYOLU · YILDIZ TOZU</div>
  <section class="time-dock glass" aria-label="Astronomik zaman kontrolü">
    <div class="time-label"><small>GÖZLEM ZAMANI · YEREL</small><strong id="skyDateLabel"></strong></div>
    <div class="time-actions"><button id="nowBtn">ŞİMDİ</button><button id="reverseBtn" aria-label="Zamanı geriye oynat">◀◀</button><button id="timePlay" aria-label="Zamanı duraklat">Ⅱ</button><button id="forwardBtn" aria-label="Zamanı ileri oynat">▶▶</button><select id="timeSpeed" aria-label="Zaman akış hızı"><option value="60">1 dk/sn</option><option value="3600" selected>1 sa/sn</option><option value="86400">1 gün/sn</option><option value="604800">1 hafta/sn</option></select><input id="datePicker" type="datetime-local" aria-label="Gözlem tarihi ve saati"></div>
    <small class="time-disclaimer">Fotoğrafın katalogla hizalaması doğrulanmamıştır. Yalnızca katalog yıldızları seçilebilir. HYG v4.1 · Astronexus · CC BY-SA 4.0. Katalog koordinatları J2000'dir.</small>
  </section>
  <div class="sky-toast" id="skyToast" role="status"></div>`;
document.querySelector('.simulator').append(ui);
const mobilePanelToggle=document.createElement('button');mobilePanelToggle.type='button';mobilePanelToggle.id='mobilePanelToggle';mobilePanelToggle.className='mobile-panel-toggle';mobilePanelToggle.setAttribute('aria-expanded','false');mobilePanelToggle.textContent='Ara / kontroller';document.querySelector('.simulator').append(mobilePanelToggle);
mobilePanelToggle.addEventListener('click',()=>{const open=document.querySelector('.simulator').classList.toggle('mobile-panels-open');mobilePanelToggle.setAttribute('aria-expanded',String(open));mobilePanelToggle.textContent=open?'Kontrolleri gizle':'Ara / kontroller';if(open){const mode=document.querySelector('#skyExperience [data-mode].active')?.dataset.mode;if(mode==='deep')document.querySelector('#deepSearch')?.focus();else if(mode==='sky')$('#skySearch').focus();}});

let toastTimer=0;
window.addEventListener("cosmora-catalog-fallback",()=>showToast("Ek yıldız kataloğu yüklenemedi. Yerel Hipparcos seçkisi kullanılacak."),{once:true});
const stars = await loadStarCatalog(new URL('./assets/catalog/hip-stars.json', import.meta.url), brightStars);
const objectList = stars.map(star => {
  const constellation = Astronomy.Constellation(star.ra, star.dec);
  return {...star, constellation: constellation.name, abbreviation: constellation.symbol};
});
const officialConstellations = `Andromeda|And,Antlia|Ant,Apus|Aps,Aquarius|Aqr,Aquila|Aql,Ara|Ara,Aries|Ari,Auriga|Aur,Bootes|Boo,Caelum|Cae,Camelopardalis|Cam,Cancer|Cnc,Canes Venatici|CVn,Canis Major|CMa,Canis Minor|CMi,Capricornus|Cap,Carina|Car, Cassiopeia|Cas,Centaurus|Cen,Cepheus|Cep,Cetus|Cet,Chamaeleon|Cha,Circinus|Cir,Columba|Col,Coma Berenices|Com,Corona Australis|CrA,Corona Borealis|CrB,Corvus|Crv,Crater|Crt,Crux|Cru,Cygnus|Cyg,Delphinus|Del,Dorado|Dor,Draco|Dra,Equuleus|Equ,Eridanus|Eri,Fornax|For,Gemini|Gem,Grus|Gru,Hercules|Her,Horologium|Hor,Hydra|Hya,Hydrus|Hyi,Indus|Ind,Lacerta|Lac,Leo|Leo,Leo Minor|LMi,Lepus|Lep,Libra|Lib,Lupus|Lup,Lynx|Lyn,Lyra|Lyr,Mensa|Men,Microscopium|Mic,Monoceros|Mon,Musca|Mus,Norma|Nor,Octans|Oct,Ophiuchus|Oph,Orion|Ori,Pavo|Pav,Pegasus|Peg,Perseus|Per,Phoenix|Phe,Pictor|Pic,Piscis Austrinus|PsA,Pisces|Psc,Puppis|Pup,Pyxis|Pyx,Reticulum|Ret,Sagitta|Sge,Sagittarius|Sgr,Scorpius|Sco,Sculptor|Scl,Scutum|Sct,Serpens|Ser,Sextans|Sex,Taurus|Tau,Telescopium|Tel,Triangulum|Tri,Triangulum Australe|TrA,Tucana|Tuc,Ursa Major|UMa,Ursa Minor|UMi,Vela|Vel,Virgo|Vir,Volans|Vol,Vulpecula|Vul`.split(',').map(row=>{const [name,abbreviation]=row.trim().split('|');return{name,abbreviation};});
const labelledStarIndices = objectList.map((_, index) => index)
  .filter(index => objectList[index].magnitude < 1.9)
  .sort((a, b) => objectList[a].magnitude - objectList[b].magnitude)
  .slice(0, 18);
const starByHip = new Map(objectList.map(s=>[s.hip,s]));
const skyBodies=[['Sun','Güneş'],['Moon','Ay'],['Mercury','Merkür'],['Venus','Venüs'],['Mars','Mars'],['Jupiter','Jüpiter'],['Saturn','Satürn'],['Uranus','Uranüs'],['Neptune','Neptün']];
let selectedStar = null;
let observer = new Astronomy.Observer(41.0082,28.9784,0);
let placeName = 'İstanbul';
let observationDate = new Date();
let timeDirection = 1;
let timePlaying = false;
let nightVision = false;
let lowQuality = matchMedia('(max-width: 760px)').matches || (navigator.hardwareConcurrency||8)<=4;
let controlsCollapsed = !matchMedia('(max-width:760px)').matches;
$('#skyLeft').classList.toggle('collapsed',controlsCollapsed);
$('#collapseLeft').textContent=controlsCollapsed?'+':'−';
let renderActive = false;
let calculationStamp = 0;


const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(68, innerWidth/innerHeight, 0.1, 900);
camera.position.set(0,0,0);
const renderer = new THREE.WebGLRenderer({alpha:true, antialias:!lowQuality, powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(devicePixelRatio||1,lowQuality?1:1.6));
renderer.setSize(innerWidth,innerHeight);renderer.domElement.className='sky-canvas';renderer.domElement.setAttribute('aria-label','Hesaplanmış astronomik yıldız gökyüzü');
const skyFps=document.createElement('small');skyFps.id='skyFps';skyFps.className='cosmora-fps';skyFps.textContent='— FPS';ui.querySelector('.sky-hud').append(skyFps);
$('#space').append(renderer.domElement);
const controls = new OrbitControls(camera,renderer.domElement);
controls.enableDamping=true;controls.dampingFactor=.07;controls.rotateSpeed=.42;controls.enablePan=false;controls.minDistance=10;controls.maxDistance=10;controls.enableZoom=false;controls.target.set(0,0,-10);controls.update();
let sensorActive=false,sensorReference=null,lastOrientation=null;
const sensorToggle=document.createElement('button');sensorToggle.id='orientationToggle';sensorToggle.type='button';sensorToggle.textContent='Telefon yönü';sensorToggle.setAttribute('aria-pressed','false');
const sensorCalibrate=document.createElement('button');sensorCalibrate.id='orientationCalibrate';sensorCalibrate.type='button';sensorCalibrate.textContent='Kalibre';sensorCalibrate.disabled=true;
$('#skyHud').append(sensorToggle,sensorCalibrate);
const sensorPose=new THREE.Quaternion();
let sensorOffset;
const sensorDesired=new THREE.Quaternion(), sensorEuler=new THREE.Euler(0,0,0,'YXZ');
const screenAxis=new THREE.Vector3(0,0,1), screenRotation=new THREE.Quaternion();
const lensRotation=new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1,0,0),-Math.PI/2);
let sensorTimeout, sensorAngle, waitingPermission=false;
function readPose({alpha,beta,gamma}, angle) {
  const radians=Math.PI/180;
  sensorEuler.set(beta*radians,alpha*radians,-gamma*radians);
  sensorPose.setFromEuler(sensorEuler).multiply(lensRotation);
  screenRotation.setFromAxisAngle(screenAxis,-angle*radians);
  return sensorPose.multiply(screenRotation);
}
function calibrateSensor(){
  if(!lastOrientation)return;
  sensorOffset=calibrationOffset(camera.quaternion.toArray(),readPose(lastOrientation,sensorAngle).toArray());
  sensorDesired.copy(camera.quaternion);
  sensorReference=true;
}
function onOrientation(event){
  const reading=sensorReading(event);
  if(!reading)return;
  clearTimeout(sensorTimeout);
  lastOrientation=reading;
  const angle=screenDegrees(screen.orientation?.angle ?? window.orientation ?? 0);
  if(!sensorReference||angle!==sensorAngle){sensorAngle=angle;calibrateSensor();}
  sensorDesired.fromArray(relativePose(sensorOffset,readPose(reading,angle).toArray()));
  sensorCalibrate.disabled=false;
}
function disableSensor(){
  window.removeEventListener('deviceorientation',onOrientation);
  clearTimeout(sensorTimeout);
  if(sensorActive){
    const direction=camera.getWorldDirection(new THREE.Vector3());
    controls.target.copy(camera.position).addScaledVector(direction,10);
    controls.enabled=true;controls.update();
  }
  sensorActive=false;sensorReference=null;lastOrientation=null;
  sensorToggle.textContent='Telefon yönü';sensorToggle.setAttribute('aria-pressed','false');
  sensorCalibrate.disabled=true;
}
sensorToggle.addEventListener('click',async()=>{
  if(sensorActive){disableSensor();return;}
  if(waitingPermission)return;
  if(!window.DeviceOrientationEvent){showToast('Yön sensörü desteklenmiyor. Dokunmatik kamera kullanılabilir.');return;}
  if(!isSecureContext){showToast('Yön sensörü için HTTPS gerekir. Dokunmatik kamera kullanılabilir.');return;}
  waitingPermission=true;
  try{
    if(typeof DeviceOrientationEvent.requestPermission==='function'&&await DeviceOrientationEvent.requestPermission()!=='granted'){
      showToast('Sensör izni verilmedi. Dokunmatik kamera kullanılabilir.');return;
    }
    if(!renderActive||renderer.domElement.classList.contains('mode-hidden')||document.hidden)return;
    sensorActive=true;controls.enabled=false;
    window.addEventListener('deviceorientation',onOrientation,{passive:true});
    sensorToggle.textContent='Sensörü kapat';sensorToggle.setAttribute('aria-pressed','true');
    sensorTimeout=setTimeout(()=>{disableSensor();showToast('Sensör verisi alınamadı. Dokunmatik kamera yeniden etkin.');},3500);
  }catch{showToast('Sensör açılamadı. Dokunmatik kamera kullanılabilir.');}
  finally{waitingPermission=false;}
});
sensorCalibrate.addEventListener('click',calibrateSensor);

const starRoot=new THREE.Group();
scene.add(starRoot);
const pointGeometry = new THREE.BufferGeometry();
const pointPositions = new Float32Array(objectList.length * 3);
const pointSizes = new Float32Array(objectList.length);
const pointBrightness = new Float32Array(objectList.length);
for (const [index, {magnitude}] of objectList.entries()) {
  pointBrightness[index] = THREE.MathUtils.clamp(1.15 - magnitude * .11, .18, 1);
  pointSizes[index] = THREE.MathUtils.clamp(1.65 - magnitude * .16, .72, 3.2);
}
pointGeometry.setAttribute('position', new THREE.BufferAttribute(pointPositions, 3).setUsage(THREE.DynamicDrawUsage));
const colorIndices = Float32Array.from(objectList, star => star.ci ?? .55);
pointGeometry.setAttribute('bv', new THREE.BufferAttribute(colorIndices, 1));
pointGeometry.setAttribute('pointSize', new THREE.BufferAttribute(pointSizes, 1));
pointGeometry.setAttribute('pointBrightness', new THREE.BufferAttribute(pointBrightness, 1));
const starMaterial = new THREE.ShaderMaterial({
  uniforms: {pixelRatio: {value: renderer.getPixelRatio()}},
  transparent: true,
  depthWrite: false,
  vertexShader: `
    attribute float pointSize; attribute float bv; varying float colorIndex;
    attribute float pointBrightness;
    uniform float pixelRatio;
    varying float vBrightness;
    void main() {
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      colorIndex = bv; vBrightness = pointBrightness;
      gl_PointSize = (pointSize + pointBrightness * 1.4) * pixelRatio * 3.0;
    }
  `,
  fragmentShader: `
    varying float colorIndex; varying float vBrightness;
    void main() {
      float radius = length(gl_PointCoord * 2.0 - 1.0);
      float halo = exp(-radius * radius * 5.5) * 0.22;
      float core = 1.0 - smoothstep(0.0, 0.22, radius);
      if(radius>=1.0) discard;
      float alpha = (halo*1.5 + exp(-12.0*radius*radius)) * (0.24 + 0.76 * vBrightness);
      vec3 tint = mix(vec3(0.72, 0.82, 1.0), vec3(1.0, 0.76, 0.58), smoothstep(-0.32,1.65,colorIndex));
      gl_FragColor = vec4(tint, alpha);
    }
  `
});
const points = new THREE.Points(pointGeometry, starMaterial);
starRoot.add(points);
const lineMaterial=new THREE.LineBasicMaterial({color:0x9bc8dc,transparent:true,opacity:.15,depthWrite:false});
const figureGroup=new THREE.Group();scene.add(figureGroup);
const earthSkyRadius=220;
pointGeometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(), earthSkyRadius + 1);
const horizonGround=new THREE.Mesh(new THREE.SphereGeometry(earthSkyRadius*.9,96,32,0,2*Math.PI,Math.PI/2,Math.PI/2),new THREE.ShaderMaterial({
  vertexShader:`varying vec3 vWorldPosition;void main(){vec4 world=modelMatrix*vec4(position,1.0);vWorldPosition=world.xyz;gl_Position=projectionMatrix*viewMatrix*world;}`,
  fragmentShader:`varying vec3 vWorldPosition;void main(){float altitude=clamp(vWorldPosition.y/length(vWorldPosition),-1.0,0.0);float rim=1.0-smoothstep(0.015,0.28,abs(altitude));float depth=smoothstep(-0.72,-0.02,altitude);vec3 deep=vec3(0.002,0.005,0.014);vec3 horizon=vec3(0.018,0.035,0.078);vec3 color=mix(deep,horizon,depth*0.42+rim*0.42);color+=vec3(0.008,0.018,0.036)*rim;gl_FragColor=vec4(color,1.0);}`,
  side:THREE.BackSide,depthTest:true,depthWrite:true
}));
horizonGround.renderOrder=-1;scene.add(horizonGround);
const gridGroup=createHorizonGrid();scene.add(gridGroup);
const milkyWayGeometry=new THREE.BufferGeometry();
const milkyWaySegments=96,milkyWayRows=24;
const milkyWayPositions=new Float32Array((milkyWaySegments+1)*(milkyWayRows+1)*3),milkyWayUvs=new Float32Array((milkyWaySegments+1)*(milkyWayRows+1)*2),milkyWayIndices=[];
for(let i=0;i<=milkyWaySegments;i++)for(let row=0;row<=milkyWayRows;row++){const vertex=i*(milkyWayRows+1)+row;milkyWayUvs.set([i/milkyWaySegments,row/milkyWayRows],vertex*2);if(i<milkyWaySegments&&row<milkyWayRows){const a=vertex,b=vertex+milkyWayRows+1,c=vertex+1,d=b+1;milkyWayIndices.push(a,b,c,b,d,c);}}
milkyWayGeometry.setAttribute('position',new THREE.BufferAttribute(milkyWayPositions,3).setUsage(THREE.DynamicDrawUsage));milkyWayGeometry.setAttribute('uv',new THREE.BufferAttribute(milkyWayUvs,2));milkyWayGeometry.setIndex(milkyWayIndices);
const panorama = new THREE.TextureLoader().load('./assets/textures/eso0932a.jpg');
panorama.wrapS = THREE.RepeatWrapping;
panorama.repeat.x = -1;
panorama.offset.x = .5;
panorama.colorSpace = THREE.SRGBColorSpace;
const milkyWayMaterial = new THREE.MeshBasicMaterial({map:panorama,side:THREE.DoubleSide,transparent:true,opacity:.38,depthWrite:false});
const milkyWay=new THREE.Mesh(milkyWayGeometry,milkyWayMaterial);milkyWay.renderOrder=-2;scene.add(milkyWay);
const nameSprites=new THREE.Group();scene.add(nameSprites);
const constellationNameSprites=new THREE.Group();scene.add(constellationNameSprites);
const celestialMarkers=[];
const raycaster=new THREE.Raycaster();raycaster.params.Points.threshold=.75;const pointer=new THREE.Vector2();
let lastFrame=performance.now();

function horizonVector(azimuth, altitude, radius = earthSkyRadius) {
  return new THREE.Vector3(...horizonCartesian(azimuth, altitude, radius));
}
function createHorizonGrid(){
  const group=new THREE.Group();const material=new THREE.LineBasicMaterial({color:0x8ba7c8,transparent:true,opacity:.055,depthWrite:false});
    const labels=[[0,'N'],[90,'E'],[180,'S'],[270,'W']];labels.forEach(([az,label])=>{const text=makeLabel(label);text.position.copy(horizonVector(az,1.6,earthSkyRadius*.9));group.add(text);});return group;
}
function makeLabel(text){const canvas=document.createElement('canvas');canvas.width=256;canvas.height=64;const ctx=canvas.getContext('2d');ctx.font='500 27px Manrope, Georgia, serif';ctx.fillStyle='rgba(218,231,246,.82)';ctx.shadowColor='rgba(3,9,21,.92)';ctx.shadowBlur=8;ctx.textAlign='center';ctx.fillText(text,128,42);const texture=new THREE.CanvasTexture(canvas);const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:texture,transparent:true,depthTest:false,depthWrite:false}));sprite.scale.set(12,3,1);return sprite;}
function observerSky(date,ra,dec){return Astronomy.Horizon(date,observer,ra,dec,'normal');}
function galacticToEquatorial(longitude,latitude){const l=THREE.MathUtils.degToRad(longitude),b=THREE.MathUtils.degToRad(latitude),gx=Math.cos(b)*Math.cos(l),gy=Math.cos(b)*Math.sin(l),gz=Math.sin(b);const x=-.0548755604*gx+.4941094279*gy-.8676661490*gz;const y=-.8734370902*gx-.4448296300*gy-.1980763734*gz;const z=-.4838350155*gx+.7469822445*gy+.4559837762*gz;return{ra:(THREE.MathUtils.euclideanModulo(THREE.MathUtils.radToDeg(Math.atan2(y,x)),360))/15,dec:THREE.MathUtils.radToDeg(Math.asin(THREE.MathUtils.clamp(z,-1,1)))};}
function updateMilkyWay(project){const positions=milkyWayGeometry.attributes.position.array;for(let i=0;i<=milkyWaySegments;i++){const longitude=i/milkyWaySegments*360;for(let row=0;row<=milkyWayRows;row++){const latitude=(row/milkyWayRows-.5)*180,eq=galacticToEquatorial(longitude,latitude),h=project(eq.ra,eq.dec),p=horizonVector(h.azimuth,h.altitude,earthSkyRadius*.994);p.toArray(positions,(i*(milkyWayRows+1)+row)*3);}}milkyWayGeometry.attributes.position.needsUpdate=true;milkyWayGeometry.computeBoundingSphere();}

function calculateSky() {
  const project = makeJ2000Horizon(Astronomy, observationDate, observer);
  updateMilkyWay(project);
  const horizon = objectList.map(star => project(star.ra, star.dec));
  let visibleCount = 0;
  for (const [index, {azimuth, altitude}] of horizon.entries()) {
    const position = horizonVector(azimuth, altitude);
    position.toArray(pointPositions, index * 3);
    if (altitude >= 0) visibleCount++;
  }
  pointGeometry.attributes.position.needsUpdate = true;

  figureGroup.children.forEach(line => line.geometry.dispose());
  figureGroup.clear();
  if (selectedStar && $('#constellationToggle').checked) {
    const vertices = [];
    const cache=new Map();
    function position([longitude,latitude]){
      const key=longitude+','+latitude;
      if(!cache.has(key))cache.set(key,project(celestialHours(longitude),latitude));
      return cache.get(key);
    }
    for(const [first,second] of constellationSegments(constellationLines.filter(([id]) => id === selectedStar.abbreviation))){
      const a=position(first),b=position(second);
      if(a.altitude<-5||b.altitude<-5)continue;
      vertices.push(horizonVector(a.azimuth,a.altitude),horizonVector(b.azimuth,b.altitude));
    }
    if (vertices.length) {
      figureGroup.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(vertices), lineMaterial));
    }
  }

  nameSprites.children.forEach(sprite => { sprite.material.map?.dispose(); sprite.material.dispose(); });
  nameSprites.clear();
  if ($('#labelToggle').checked) {
    for (const index of labelledStarIndices) {
      const {azimuth, altitude} = horizon[index];
      if (altitude <= 3) continue;
      const label = makeLabel(objectList[index].name);
      label.scale.set(13, 3.2, 1);
      label.position.copy(horizonVector(azimuth, altitude, earthSkyRadius * .96));
      nameSprites.add(label);
    }
  }

  constellationNameSprites.children.forEach(sprite => { sprite.material.map?.dispose(); sprite.material.dispose(); });
  constellationNameSprites.clear();
  if ($('#constellationNamesToggle').checked) {
    for(const [id,name,[longitude,latitude]] of constellationLabels){
      if(id !== selectedStar?.abbreviation) continue;
      const {azimuth,altitude}=project(celestialHours(longitude),latitude);
      if(altitude<=5)continue;
      const label=makeLabel(name);
      label.scale.set(18,4,1);
      label.position.copy(horizonVector(azimuth,altitude,earthSkyRadius*.91));
      constellationNameSprites.add(label);
    }
  }
  updateSolarMarkers();
  $('#starCount').textContent=visibleCount+' görünür';
  $('#skyDateLabel').textContent=new Intl.DateTimeFormat('tr-TR',{dateStyle:'medium',timeStyle:'medium'}).format(observationDate);
  $('#datePicker').value=toLocalInput(observationDate);
  if (selectedStar && $('#skyInfo').classList.contains('open')) showStar(selectedStar, false);
}
function updateSolarMarkers(){
  celestialMarkers.forEach(item=>{item.sprite.removeFromParent();item.sprite.material.dispose();});celestialMarkers.length=0;
  const bodies=[['Sun','Güneş','☼'],['Moon','Ay','●'],['Mercury','Merkür','·'],['Venus','Venüs','·'],['Mars','Mars','·'],['Jupiter','Jüpiter','·'],['Saturn','Satürn','·'],['Uranus','Uranüs','·'],['Neptune','Neptün','·']];
  bodies.forEach(([body,name,glyph])=>{try{const eq=Astronomy.Equator(Astronomy.Body[body],observationDate,observer,true,true);const h=observerSky(observationDate,eq.ra,eq.dec);if(h.altitude<0)return;const sprite=new THREE.Sprite(new THREE.SpriteMaterial({color:body==='Sun'?0xffce76:body==='Moon'?0xdce7ff:0x9deaf0,transparent:true,depthTest:false}));sprite.scale.set(body==='Sun'||body==='Moon'?4:2.5,body==='Sun'||body==='Moon'?4:2.5,1);sprite.position.copy(horizonVector(h.azimuth,h.altitude));sprite.userData.celestial={body,name,ra:eq.ra,dec:eq.dec,h};sprite.userData.pickable=true;scene.add(sprite);celestialMarkers.push({sprite});}catch{}});
}
function toLocalInput(date){const shift=date.getTimezoneOffset()*60000;return new Date(date.getTime()-shift).toISOString().slice(0,16);}
function fromLocalInput(value){return new Date(value);}
function formatSexagesimal(ra,dec){const hours=Math.floor(ra),minutes=Math.floor((ra-hours)*60),seconds=(((ra-hours)*60)-minutes)*60;const sign=dec<0?'−':'+';const abs=Math.abs(dec),degrees=Math.floor(abs),dm=Math.floor((abs-degrees)*60),ds=((abs-degrees)*60-dm)*60;return `${hours}h ${minutes}m ${seconds.toFixed(1)}s · ${sign}${degrees}° ${dm}′ ${ds.toFixed(0)}″`;}
function refreshSelection(){
  objectList.forEach((star,i)=>{
    pointBrightness[i] = THREE.MathUtils.clamp(1.15-star.magnitude*.11,.18,1) *
      (selectedStar && star.abbreviation === selectedStar.abbreviation ? 1.3 : 1);
  });
  pointGeometry.attributes.pointBrightness.needsUpdate=true;
  calculateSky();
}
const marker=$('#starPointer'), projected=new THREE.Vector3();
const indices=new Map(objectList.map((s,i)=>[s.hip,i]));
const favorites=new Set(JSON.parse(localStorage.getItem('cosmora-star-favorites')||'[]'));
let tracking=false;
function placeMarker(){
  marker.hidden=true;
  if(!selectedStar)return;
  projected.fromArray(pointPositions,indices.get(selectedStar.hip)*3);
  if(projected.y<0)return;
  projected.project(camera);
  if(Math.max(Math.abs(projected.x),Math.abs(projected.y),Math.abs(projected.z))>1)return;
  const rect=renderer.domElement.getBoundingClientRect();
  marker.style.left=(rect.left+(1+projected.x)*rect.width/2)+'px';
  marker.style.top=(rect.top+(1-projected.y)*rect.height/2)+'px';
  marker.hidden=false;
}
$('#aimStar').onclick=()=>showStar(selectedStar,true);
$('#trackStar').onclick=()=>{tracking=!tracking;showStar(selectedStar,tracking)};
$('#favStar').onclick=()=>{
  const hip=selectedStar.hip;
  if(favorites.has(hip)) favorites.delete(hip); else favorites.add(hip);
  localStorage.setItem('cosmora-star-favorites',JSON.stringify([...favorites]));
  showStar(selectedStar,false);
};
function clearSelection(){
  tracking=false;marker.hidden=true;$('#starExtras').hidden=true;
  selectedStar=null;
  $('#skyInfo').classList.remove('open');
  refreshSelection();
}
function showStar(star,focus=true){const changed = selectedStar !== star;
  selectedStar = star;
  if(changed){tracking=false;refreshSelection();}
  marker.firstElementChild.textContent=star.name;
  $('#starExtras').hidden=false;
  $('#favStar').textContent=favorites.has(star.hip)?'Favoriden çıkar':'Favorilere ekle';
  $('#trackStar').textContent=tracking?'Takibi durdur':'Takip et';
  const type={III:'Dev',IV:'Altdev',V:'Ana kol',II:'Parlak dev',Ia:'Süperdev',Ib:'Süperdev'}[star.spectrum?.match(/(III|IV|II|V|Ia|Ib)$/)?.[1]];
  $('#physical').textContent=['Tür: '+(type||'Veri yok'),'Uzaklık: '+(star.distancePc?(star.distancePc*3.26156).toFixed(1)+' ışık yılı':'Veri yok'),'Spektral sınıf: '+(star.spectrum||'Veri yok'),'Renk (B−V): '+(star.ci?.toFixed(2)??'Veri yok'),'Yüzey sıcaklığı: Veri yok'].join(' · ');
  const h=makeJ2000Horizon(Astronomy,observationDate,observer)(star.ra,star.dec);$('#skyInfoType').textContent='HIPPARCOS KATALOĞU';$('#skyInfoName').textContent=star.name;$('#skyInfoText').textContent=`${star.name}, Hipparcos kataloğundaki parlak yıldız seçkisinde yer alır. Koordinatlar J2000 dönemine aittir; ufka göre görünen yeri tarih ve gözlemci konumuyla hesaplanır.`;$('#skyConstellation').textContent=star.constellation;$('#skyHip').textContent=`HIP ${star.hip}`;$('#skyMagnitude').textContent=`${star.magnitude.toFixed(2)} kadir`;$('#skyCoords').textContent=formatSexagesimal(star.ra,star.dec);$('#skyHorizon').textContent=`${h.azimuth.toFixed(1)}° / ${h.altitude.toFixed(1)}°${h.altitude<0?' · ufkun altında':''}`;$('#skyInfo').classList.add('open');if((focus||tracking)&&h.altitude>=0){const direction=horizonVector(h.azimuth,h.altitude,1).normalize();controls.target.copy(direction).multiplyScalar(10);camera.position.set(0,0,0);controls.update();}}
function showCelestialData(c){if(selectedStar)clearSelection();$('#skyInfoType').textContent='ASTRONOMY ENGINE';$('#skyInfoName').textContent=c.name;$('#skyInfoText').textContent=`${c.name} için görünür gök koordinatları Astronomy Engine ile seçilen tarih ve gözlem konumunda hesaplanır.`;$('#skyConstellation').textContent=Astronomy.Constellation(c.ra,c.dec).name;$('#skyHip').textContent='—';$('#skyMagnitude').textContent='Bu görünümde gösterilmiyor';$('#skyCoords').textContent=`${c.ra.toFixed(3)}h · ${c.dec.toFixed(2)}°`;$('#skyHorizon').textContent=`${c.h.azimuth.toFixed(1)}° / ${c.h.altitude.toFixed(1)}°${c.h.altitude<0?' · ufkun altında':''}`;$('#skyInfo').classList.add('open');if(c.h.altitude>-2){const direction=horizonVector(c.h.azimuth,c.h.altitude,1).normalize();controls.target.copy(direction).multiplyScalar(10);camera.position.set(0,0,0);controls.update();}}
function showCelestial(item){showCelestialData(item.sprite.userData.celestial);}
function showToast(message){const el=$('#skyToast');el.textContent=message;el.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('show'),2400);}
function updateResults(query=''){
  const q=query.trim().toLocaleLowerCase('tr-TR');const matching=objectList.filter(s=>!q||s.name.toLocaleLowerCase('tr-TR').includes(q)||s.constellation.toLocaleLowerCase('tr-TR').includes(q)||s.abbreviation.toLowerCase().includes(q)||String(s.hip).includes(q)||`hip ${s.hip}`.includes(q)).slice(0,18);
  const bodies=skyBodies.filter(([id,name])=>!q||name.toLocaleLowerCase('tr-TR').includes(q)||id.toLowerCase().includes(q));
  const starsHtml=matching.map(s=>`<button class="sky-result" type="button" data-hip="${s.hip}"><span class="result-star">✦</span><span><b></b><small>${s.constellation}</small></span><small>HIP ${s.hip}</small></button>`).join('');
  const bodiesHtml=bodies.map(([id,name])=>`<button class="sky-result" type="button" data-solar-body="${id}"><span class="result-star">◎</span><span><b>${name}</b><small>Güneş Sistemi cismi</small></span><small>Astronomy Engine</small></button>`).join('');
  $('#skyResults').innerHTML=starsHtml+bodiesHtml||(q?'<p class="empty-search">Eşleşen kayıt yerel yıldız seçkisinde bulunamadı.</p>':'');
  $('#skyResults').querySelectorAll('[data-hip] b').forEach((label, index) => {
    label.textContent = matching[index].name;
  });
}
function renderConstellationList(){const list=$('#constellationList');list.innerHTML=officialConstellations.map(c=>`<button type="button" class="constellation-option" data-constellation="${c.name}"><span>${c.name}</span><small>${c.abbreviation}</small></button>`).join('');list.addEventListener('click',event=>{const button=event.target.closest('[data-constellation]');if(!button)return;const name=button.dataset.constellation;$('#skySearch').value=name;updateResults(name);const found=objectList.find(star=>star.constellation===name);if(found)showStar(found);else{selectedStar=null;$('#skyInfoType').textContent='IAU TAKIMYILDIZI';$('#skyInfoName').textContent=name;$('#skyInfoText').textContent='Bu bölge IAU’nun 88 resmî takımyıldızından biridir. Yerel parlak yıldız seçkisinde bu bölgeden listelenecek kayıt bulunmuyor; dekoratif yıldız eklenmedi.';$('#skyConstellation').textContent=name;$('#skyHip').textContent='Katalog seçkisinde yok';$('#skyMagnitude').textContent='—';$('#skyCoords').textContent='—';$('#skyHorizon').textContent='—';$('#skyInfo').classList.add('open');}});}
renderConstellationList();

$('#skyResults').addEventListener('click',event=>{const solar=event.target.closest('[data-solar-body]');if(solar){const body=solar.dataset.solarBody;const eq=Astronomy.Equator(Astronomy.Body[body],observationDate,observer,true,true);const h=observerSky(observationDate,eq.ra,eq.dec);showCelestialData({body,name:skyBodies.find(item=>item[0]===body)?.[1]||body,ra:eq.ra,dec:eq.dec,h});return;}const b=event.target.closest('[data-hip]');if(!b)return;const star=starByHip.get(Number(b.dataset.hip));if(star)showStar(star);});
$('#skySearch').addEventListener('input',event=>updateResults(event.target.value));updateResults();
$('#constellationToggle').addEventListener('change',calculateSky);$('#constellationNamesToggle').addEventListener('change',calculateSky);$('#labelToggle').addEventListener('change',calculateSky);
$('#timePlay').addEventListener('click',()=>{timePlaying=!timePlaying;$('#timePlay').textContent=timePlaying?'Ⅱ':'▶';$('#timePlay').setAttribute('aria-label',timePlaying?'Zamanı duraklat':'Zamanı oynat');});
$('#reverseBtn').addEventListener('click',()=>{timeDirection=-1;timePlaying=true;$('#timePlay').textContent='Ⅱ';});$('#forwardBtn').addEventListener('click',()=>{timeDirection=1;timePlaying=true;$('#timePlay').textContent='Ⅱ';});
$('#nowBtn').addEventListener('click',()=>{observationDate=new Date();timePlaying=false;calculateSky();});
$('#citySelect').addEventListener('change',event=>{if(event.target.value==='manual'){placeName='Manuel konum';$('#locationSummary').textContent=placeName;return;}const [lat,lon,name]=event.target.value.split(',');$('#latitudeInput').value=lat;$('#longitudeInput').value=lon;placeName=name;$('#locationSummary').textContent=name;observer=new Astronomy.Observer(Number(lat),Number(lon),0);calculateSky();});
$('#applyLocation').addEventListener('click',()=>{const lat=Number($('#latitudeInput').value),lon=Number($('#longitudeInput').value);if(!Number.isFinite(lat)||lat< -90||lat>90||!Number.isFinite(lon)||lon< -180||lon>180){showToast('Enlem −90…90, boylam −180…180 aralığında olmalı.');return;}placeName='Manuel konum';$('#locationSummary').textContent=`${lat.toFixed(2)}, ${lon.toFixed(2)}`;observer=new Astronomy.Observer(lat,lon,0);calculateSky();showToast('Gözlem konumu bu cihazda güncellendi.');});
$('#geoLocation').addEventListener('click',()=>{if(!navigator.geolocation){showToast('Bu tarayıcı konum isteğini desteklemiyor.');return;}navigator.geolocation.getCurrentPosition(({coords})=>{observer=new Astronomy.Observer(coords.latitude,coords.longitude,coords.altitude||0);placeName='Cihaz konumu';$('#latitudeInput').value=coords.latitude.toFixed(4);$('#longitudeInput').value=coords.longitude.toFixed(4);$('#locationSummary').textContent=placeName;calculateSky();showToast('Konum yalnızca bu cihazda kullanıldı.');},error=>showToast(error.code===1?'Konum izni verilmedi. Şehir veya koordinatı elle seçebilirsin.':'Konum alınamadı. Manuel şehir veya koordinat seçebilirsin.'),{enableHighAccuracy:false,timeout:10000,maximumAge:60000});});
$('#nightToggle').addEventListener('click',()=>{nightVision=!nightVision;ui.classList.toggle('night-vision',nightVision);$('#nightToggle').setAttribute('aria-pressed',String(nightVision));});
$('#collapseLeft').addEventListener('click',()=>{controlsCollapsed=!controlsCollapsed;$('#skyLeft').classList.toggle('collapsed',controlsCollapsed);$('#collapseLeft').textContent=controlsCollapsed?'+':'−';});
$('#closeSkyInfo').addEventListener('click',clearSelection);

$('#datePicker').min='1800-01-01T00:00';$('#datePicker').max='2100-12-31T23:59';
$('#datePicker').addEventListener('change',event=>{const date=fromLocalInput(event.target.value);if(Number.isNaN(date.getTime())){showToast('Geçerli bir tarih ve saat seç.');return;}if(date.getFullYear()<1800||date.getFullYear()>2100){observationDate=new Date(Math.min(Math.max(date.getTime(),new Date(1800,0,1).getTime()),new Date(2100,11,31,23,59).getTime()));showToast('Astronomy Engine için doğrulanmış dönem 1800-2100.');}else observationDate=date;calculateSky();});
ui.querySelectorAll('[data-mode]').forEach(button=>button.addEventListener('click',()=>{
  const mode=button.dataset.mode;ui.querySelectorAll('[data-mode]').forEach(b=>b.classList.toggle('active',b===button));
  const sky=mode==='sky';renderer.domElement.classList.toggle('mode-hidden',!sky);solarCanvas=host.querySelector('canvas:not(.sky-canvas):not(.deep-canvas)');if(solarCanvas)solarCanvas.classList.toggle('mode-hidden',sky);
  ['skyLeft','skyInfo','skyHud'].forEach(id=>{$(`#${id}`).classList.toggle('mode-hidden',!sky);});$('#nightToggle').classList.toggle('mode-hidden',!sky);document.querySelector('.intro')?.classList.add('mode-hidden');document.querySelector('.planet-panel')?.classList.toggle('mode-hidden',sky);document.querySelector('.info-panel')?.classList.toggle('mode-hidden',sky);document.querySelector('.scene-tools')?.classList.toggle('mode-hidden',sky);document.querySelector('.scale-note')?.classList.toggle('mode-hidden',sky);document.querySelector('.camera-hint')?.classList.toggle('mode-hidden',sky);
  document.querySelector('.control-dock')?.classList.toggle('mode-hidden',sky);document.querySelector('.mobile-body-picker')?.classList.toggle('mode-hidden',sky);document.querySelector('.sim-footer')?.classList.toggle('mode-hidden',sky);$('#timeDockDummy');document.querySelector('.time-dock').classList.toggle('mode-hidden',!sky);
  marker.hidden=true;
  if(sky){calculateSky();renderActive=true;}else{renderActive=false;}
}));

// Apply the default Sky mode once all mode listeners exist, hiding the solar canvas until selected.
ui.querySelector('[data-mode="sky"]').click();

listenForTap(renderer.domElement,event=>{
  const rect = renderer.domElement.getBoundingClientRect();
  pointer.set((event.clientX - rect.left) / rect.width * 2 - 1, 1 - (event.clientY - rect.top) / rect.height * 2);
  raycaster.setFromCamera(pointer, camera);
  const [bodyHit] = raycaster.intersectObjects(celestialMarkers.map(({sprite}) => sprite), false);
  raycaster.params.Points.threshold=2*earthSkyRadius*Math.tan(camera.fov*Math.PI/360)*(event.pointerType==='touch'?13:6)/rect.height;
  const starHit = raycaster.intersectObject(points, false)
    .filter(({index}) => pointPositions[index * 3 + 1] >= earthSkyRadius * Math.sin(-2 * Math.PI / 180))
    .sort((a, b) => a.distanceToRay - b.distanceToRay)[0];
  if (bodyHit && (!starHit || bodyHit.distance <= starHit.distance)) {
    showCelestial({sprite: bodyHit.object});
  } else if (starHit) {
    showStar(objectList[starHit.index],false);
  } else clearSelection();
});
const frame=now=>{const delta=Math.min((now-lastFrame)/1000,1);lastFrame=now;if(sensorActive&&sensorReference)camera.quaternion.slerp(sensorDesired,smoothing(delta));else controls.update();if(timePlaying){const next=new Date(observationDate.getTime()+delta*Number($('#timeSpeed').value)*timeDirection*1000);if(next.getFullYear()<1800||next.getFullYear()>2100){observationDate=new Date(next.getFullYear()<1800?1800:2100,next.getFullYear()<1800?0:11,next.getFullYear()<1800?1:31,next.getFullYear()<1800?0:23,next.getFullYear()<1800?0:59);timePlaying=false;$('#timePlay').textContent='▶';showToast('Doğrulanmış tarih aralığının sınırına ulaşıldı (1800–2100).');calculateSky();}else observationDate=next;if(now-calculationStamp>1000){calculateSky();calculationStamp=now;}}if(renderActive&&!document.hidden&&!renderer.domElement.classList.contains("mode-hidden")){starMaterial.uniforms.pixelRatio.value = renderer.getPixelRatio();renderer.render(scene,camera);placeMarker();skyQuality.frame(now);}};
window.addEventListener('pagehide',event=>{if(event.persisted)return;stopSky();window.removeEventListener("resize",resizeSky);disableSensor();controls.dispose();scene.traverse(obj=>{obj.geometry?.dispose();if(obj.material){(Array.isArray(obj.material)?obj.material:[obj.material]).forEach(m=>{m.map?.dispose();m.dispose();});}});renderer.dispose();renderer.forceContextLoss();});
calculateSky();renderActive=true;
const skyQuality=renderQuality($('#qualityToggle'),skyFps,(level,ratio)=>{
  lowQuality=level==='low';
  renderer.setPixelRatio(ratio);
  const count=objectList.length;
  const density={low:.55,medium:.8,high:1}[level];
  pointGeometry.setDrawRange(0,Math.min(count,Math.max(60,Math.ceil(count*density))));
});
function resizeSky(){
  camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);skyQuality.resize();
}
window.addEventListener('resize',resizeSky);
const stopSky=sceneLoop(renderer.domElement,()=>renderActive&&!renderer.domElement.classList.contains('mode-hidden'),frame,()=>{
  lastFrame=performance.now();skyQuality.pause();disableSensor();
},()=>renderer);
