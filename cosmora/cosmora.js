import { renderQuality, sceneLoop, listenForTap, qualityOptions, reducedMotion } from './runtime-ui.js';
import { advanceJourney, createJourney, flightMode, integrateFlight, movementSpeed, resolveFlight, scaledRadius, validPosition } from './flight.mjs';
import { mountFlightHud } from './flight-hud.js';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const $ = (selector) => document.querySelector(selector);
const host = $('#space');
const loading = $('#loading');
const fallback = $('#fallback');
const toast = $('#toast');
const orbitScaleInput = $('#distanceRange');
const sizeScaleInput = $('#sizeRange');
const bodies = [
  { id:'mercury', name:'Merkür', type:'KARASAL GEZEGEN', color:'#aaa18f', diameter:'4.879 km', mass:'0,330 × 10²⁴ kg', distance:'57,9 milyon km', distanceAu:0.39, period:88.0, rotation:1407.6, temperature:'167 °C', gravity:'3,7 m/s²', moons:'0', tilt:0.03, inclination:7.0, radius:0.48, orbit:8, eccentricity:0.206, description:'Güneş’e en yakın ve en küçük gezegen. Ağır kraterlerle kaplı yüzeyi, uzun gündüzleri ve geceleri arasında büyük sıcaklık farkları yaşar.' },
  { id:'venus', name:'Venüs', type:'KARASAL GEZEGEN', color:'#d7aa70', diameter:'12.104 km', mass:'4,87 × 10²⁴ kg', distance:'108,2 milyon km', distanceAu:0.72, period:224.7, rotation:-5832.5, temperature:'464 °C', gravity:'8,9 m/s²', moons:'0', tilt:177.4, inclination:3.4, radius:0.78, orbit:12, eccentricity:0.007, description:'Yoğun atmosferinin ısıyı hapsettiği, Güneş Sistemi’nin en sıcak gezegeni. Kendi ekseninde çoğu gezegenin ters yönünde döner.' },
  { id:'earth', name:'Dünya', type:'KARASAL GEZEGEN', color:'#428cc0', diameter:'12.756 km', mass:'5,97 × 10²⁴ kg', distance:'149,6 milyon km', distanceAu:1.00, period:365.2, rotation:23.9, temperature:'15 °C', gravity:'9,8 m/s²', moons:'1 — Ay', tilt:23.4, inclination:0, radius:0.82, orbit:16.5, eccentricity:0.017, description:'Yüzeyinde kalıcı sıvı su ve bildiğimiz yaşam bulunan tek gezegen. Atmosferi, okyanusları ve uydusu Ay birlikte değişen bir dünyayı şekillendirir.' },
  { id:'mars', name:'Mars', type:'KARASAL GEZEGEN', color:'#bd684c', diameter:'6.792 km', mass:'0,642 × 10²⁴ kg', distance:'228,0 milyon km', distanceAu:1.52, period:687.0, rotation:24.6, temperature:'−65 °C', gravity:'3,7 m/s²', moons:'2 — Phobos, Deimos', tilt:25.2, inclination:1.8, radius:0.62, orbit:21, eccentricity:0.094, description:'Pas rengini demir oksitli tozundan alan soğuk bir çöl gezegeni. Geçmişinde akarsular ve göller bulunmuş olabileceğine dair izler taşıyor.' },
  { id:'jupiter', name:'Jüpiter', type:'GAZ DEVI', color:'#d3a77f', diameter:'142.984 km', mass:'1,898 × 10²⁷ kg', distance:'778,5 milyon km', distanceAu:5.20, period:4331.0, rotation:9.9, temperature:'−110 °C', gravity:'23,1 m/s²', moons:'95 — Io, Europa, Ganymede, Callisto', tilt:3.1, inclination:1.3, radius:1.60, orbit:28, eccentricity:0.049, description:'Güneş Sistemi’nin en büyük gezegeni. Renkli bulut kuşaklarında yüzyıllardır süren dev fırtınalar görülür; uydularının bazıları buz altı okyanuslara ev sahipliği yapabilir.' },
  { id:'saturn', name:'Satürn', type:'GAZ DEVI', color:'#d9c18e', diameter:'120.536 km', mass:'5,68 × 10²⁶ kg', distance:'1.432 milyon km', distanceAu:9.58, period:10747.0, rotation:10.7, temperature:'−140 °C', gravity:'9,0 m/s²', moons:'274 — Titan, Enceladus, Rhea', tilt:26.7, inclination:2.5, radius:1.38, orbit:35, eccentricity:0.052, description:'Buz ve kaya parçalarından oluşan geniş halkalarıyla tanınır. Uydusu Titan’ın kalın atmosferi; Enceladus’un ise uzaya püskürttüğü buzlu suyu bilim insanlarının ilgisini çeker.' },
  { id:'uranus', name:'Uranüs', type:'BUZ DEVI', color:'#8acdd0', diameter:'51.118 km', mass:'8,68 × 10²⁵ kg', distance:'2.867 milyon km', distanceAu:19.2, period:30589.0, rotation:-17.2, temperature:'−195 °C', gravity:'8,7 m/s²', moons:'28 — Titania, Oberon', tilt:97.8, inclination:0.8, radius:1.08, orbit:42, eccentricity:0.047, description:'Mavi-yeşil rengini atmosferindeki metandan alır. Eksen eğikliği yaklaşık 98 derece olduğu için, yörüngesinde adeta yan yatmış halde ilerler.' },
  { id:'neptune', name:'Neptün', type:'BUZ DEVI', color:'#5278d6', diameter:'49.528 km', mass:'1,02 × 10²⁶ kg', distance:'4.515 milyon km', distanceAu:30.1, period:59800.0, rotation:16.1, temperature:'−200 °C', gravity:'11,0 m/s²', moons:'16 — Triton', tilt:28.3, inclination:1.8, radius:1.04, orbit:49, eccentricity:0.010, description:'Güneş’ten en uzaktaki gezegen. Uzak ve soğuk olmasına rağmen atmosferinde saatte binlerce kilometreye ulaşabilen rüzgârlar eser.' }
];
const speedLevels = [0, 0.25, 1, 3, 10, 30];
let speedIndex = 2;
let playing = true;
let lowQuality = Boolean(matchMedia('(max-width: 760px)').matches || (navigator.hardwareConcurrency || 8) <= 4 || (navigator.deviceMemory && navigator.deviceMemory <= 4));

let orbitDistanceScale = 1;
let planetSizeScale = 1;
let showOrbits = true;
let showLabels = true;
let cinematic = false;
let selectedId = 'sun';
let follow = false;
let focusObject = null;
let focusPosition = new THREE.Vector3();
let transition = null;
let toastTimer = 0;
let simulatedSeconds = 0;
const keys = new Set();
const movementVelocity = new THREE.Vector3();
const movementIntent = new THREE.Vector3();
const planetMeshes = new Map();
const orbitLines = [];
const labelSprites = new Map();
const hitTargets = [];
let previousFrame=performance.now();
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();

const webglCanvas = document.createElement('canvas');
const webglTestContext = webglCanvas.getContext('webgl2') || webglCanvas.getContext('webgl');
const webglAvailable = Boolean(window.WebGLRenderingContext && webglTestContext);
webglTestContext?.getExtension('WEBGL_lose_context')?.loseContext();
if (!webglAvailable) {
  loading.classList.add('hidden');
  window.cosmoraModuleFallback?.('webgl');
  throw new Error('Bu tarayıcıda WebGL kullanılamıyor.');
}

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x030711);
scene.fog = new THREE.FogExp2(0x030711, 0.00115);
const camera = new THREE.PerspectiveCamera(46, innerWidth / innerHeight, 0.1, 1200);
camera.position.set(0, 52, 135);
const renderer = new THREE.WebGLRenderer({ antialias: !lowQuality, alpha: false, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio || 1, lowQuality ? 1 : 1.8));
renderer.setSize(innerWidth, innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.18;
host.appendChild(renderer.domElement);
const fpsMeter=document.createElement('small');fpsMeter.id='solarFps';fpsMeter.className='cosmora-fps';fpsMeter.textContent='— FPS';document.querySelector('.sim-footer')?.append(fpsMeter);
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.055;
controls.rotateSpeed = 0.55;
controls.zoomSpeed = 0.85;
controls.panSpeed = 0.55;
controls.minDistance = 3.4;
controls.maxDistance = 240;
controls.target.set(0, 0, 0);
controls.update();

scene.add(new THREE.AmbientLight(0x18223b, 0.72));
const sunLight = new THREE.PointLight(0xffdfac, 1800, 0, 1.15);
sunLight.position.set(0, 0, 0);
scene.add(sunLight);

function hashNoise(x, y, seed) {
  let n = Math.sin(x * 127.1 + y * 311.7 + seed * 74.7) * 43758.5453;
  return n - Math.floor(n);
}
function valueNoise(u, v, scale, seed) {
  const x = u * scale, y = v * scale, ix = Math.floor(x), iy = Math.floor(y);
  const fx = x - ix, fy = y - iy;
  const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
  const sample = (gx, gy) => hashNoise((gx % scale + scale) % scale, gy, seed);
  const a = THREE.MathUtils.lerp(sample(ix, iy), sample(ix + 1, iy), sx);
  const b = THREE.MathUtils.lerp(sample(ix, iy + 1), sample(ix + 1, iy + 1), sx);
  return THREE.MathUtils.lerp(a, b, sy);
}
function fractal(u, v, seed) {
  let sum = 0, amplitude = 0.55, weight = 0;
  for (let octave = 0; octave < 5; octave++) {
    const scale = 4 * (2 ** octave);
    sum += valueNoise(u, v, scale, seed + octave * 13) * amplitude;
    weight += amplitude;
    amplitude *= 0.5;
  }
  return sum / weight;
}
function insidePolygon(u,v,polygon){let inside=false;for(let i=0,j=polygon.length-1;i<polygon.length;j=i++){const [xi,yi]=polygon[i],[xj,yj]=polygon[j];const crosses=((yi>v)!==(yj>v))&&(u<(xj-xi)*(v-yi)/(yj-yi)+xi);if(crosses)inside=!inside;}return inside;}
const earthLandforms=[
  [[.035,.19],[.09,.13],[.17,.14],[.21,.19],[.28,.22],[.29,.29],[.25,.34],[.28,.40],[.25,.45],[.22,.51],[.19,.54],[.16,.49],[.12,.45],[.10,.38],[.07,.33],[.06,.26]],
  [[.23,.49],[.29,.48],[.32,.54],[.34,.60],[.33,.68],[.31,.74],[.30,.81],[.28,.88],[.26,.82],[.25,.74],[.23,.67],[.22,.59]],
  [[.32,.14],[.38,.12],[.41,.16],[.40,.24],[.37,.28],[.34,.24]],
  [[.43,.20],[.49,.15],[.58,.17],[.66,.16],[.74,.20],[.82,.22],[.88,.29],[.86,.34],[.80,.37],[.77,.44],[.70,.43],[.67,.49],[.61,.47],[.57,.43],[.53,.46],[.49,.40],[.45,.39],[.42,.32]],
  [[.47,.40],[.52,.41],[.57,.46],[.59,.53],[.57,.60],[.55,.68],[.52,.75],[.49,.71],[.47,.64],[.45,.56],[.44,.48]],
  [[.77,.65],[.82,.62],[.87,.64],[.90,.69],[.88,.75],[.83,.78],[.79,.75],[.76,.70]],
  [[.96,.57],[.99,.55],[1,.61],[.99,.68],[.96,.67]]
];
function makeTexture(kind, seed, size = 512) {
  const width = size, height = Math.floor(size / 2);
  const canvas = document.createElement('canvas');
  canvas.width = width; canvas.height = height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  const image = ctx.createImageData(width, height);
  const palettes = {
    mercury: [[30,28,29],[82,75,69],[145,132,116],[194,178,154]],
    moon: [[53,54,57],[91,92,94],[137,137,136],[184,181,174],[214,210,200]],
    venus: [[111,69,36],[171,118,55],[215,166,88],[246,212,145]],
    earth: [[4,27,69],[11,70,127],[26,121,155],[33,99,57],[104,135,67],[181,151,100],[223,229,218]],
    mars: [[70,28,20],[126,49,32],[176,75,43],[211,119,71],[221,166,113]],
    jupiter: [[111,66,49],[171,105,74],[213,164,124],[239,211,166],[151,102,81]],
    saturn: [[126,104,72],[177,148,101],[215,189,137],[237,218,174],[165,135,94]],
    uranus: [[69,142,151],[109,184,188],[160,215,213],[203,234,223]],
    neptune: [[20,41,104],[37,76,163],[57,111,204],[100,160,225],[29,53,117]]
  };
  for (let y = 0; y < height; y++) {
    const v = y / height;
    for (let x = 0; x < width; x++) {
      const u = x / width;
      const n = fractal(u, v, seed);
      let greatRedSpot = false;
      let paletteIndex = 0, palette = palettes[kind];
      if (kind === 'earth') {
        const landform = earthLandforms.some(poly=>insidePolygon(u,v,poly));
        const coast = valueNoise(u,v,42,seed+4);
        const land = landform && coast > 0.22;
        paletteIndex = land ? (n > 0.62 ? 5 : n > 0.52 ? 4 : 3) : (coast < 0.25 ? 0 : coast < 0.55 ? 1 : 2);
        if (Math.abs(v - 0.5) > 0.47) paletteIndex = 6;
      } else if (kind === 'jupiter' || kind === 'saturn') {
        const bands = (Math.sin(v * (kind === 'jupiter' ? 80 : 60) + Math.sin(u * 12 + n * 6)) + 1) / 2;
        paletteIndex = Math.min(palette.length - 1, Math.floor(bands * palette.length * 0.82 + n * 1.2));
        if (kind === 'jupiter') {
          const spot = ((u - 0.69) * (u - 0.69) / 0.004 + (v - 0.55) * (v - 0.55) / 0.0007) < 1;
          if (spot) { paletteIndex = 2; greatRedSpot = true; }
        }
      } else if (kind === 'uranus' || kind === 'neptune') {
        const bands = (Math.sin(v * 24 + n * 4 + Math.sin(u * 9)) + 1) / 2;
        paletteIndex = Math.min(palette.length - 1, Math.floor(bands * palette.length));
      } else {
        paletteIndex = Math.min(palette.length - 1, Math.floor(n * palette.length));
      }
      const color = greatRedSpot ? [180,82,58] : palette[paletteIndex];
      const shade = 0.84 + fractal(u + 0.18, v + 0.23, seed + 41) * 0.25;
      const i = (y * width + x) * 4;
      image.data[i] = Math.min(255, color[0] * shade);
      image.data[i + 1] = Math.min(255, color[1] * shade);
      image.data[i + 2] = Math.min(255, color[2] * shade);
      image.data[i + 3] = 255;
    }
  }
  ctx.putImageData(image, 0, 0);
  if (kind === 'moon' || kind === 'mercury' || kind === 'mars') {
    const craterCount=kind==='moon'?220:kind==='mercury'?170:95;
    for(let i=0;i<craterCount;i++){
      const x=hashNoise(i,11,seed+29)*width,y=hashNoise(i,17,seed+53)*height;
      const r=(kind==='moon'?2:1.5)+hashNoise(i,5,seed+83)*(kind==='moon'?15:10);
      ctx.beginPath();ctx.fillStyle=kind==='mars'?'rgba(55,25,19,.22)':'rgba(20,21,22,.26)';ctx.ellipse(x,y,r*1.18,r*.78,0,0,Math.PI*2);ctx.fill();
      ctx.beginPath();ctx.strokeStyle='rgba(246,232,209,.23)';ctx.lineWidth=Math.max(.7,r*.12);ctx.ellipse(x-r*.04,y-r*.035,r,r*.67,0,Math.PI*1.05,Math.PI*1.85);ctx.stroke();
      ctx.beginPath();ctx.strokeStyle='rgba(20,18,18,.18)';ctx.lineWidth=Math.max(.8,r*.18);ctx.ellipse(x+r*.04,y+r*.03,r*.91,r*.6,0,Math.PI*.05,Math.PI*.87);ctx.stroke();
    }
  }
  if (kind === 'earth') {
    ctx.globalAlpha = 0.22;
    ctx.fillStyle = '#fff';
    for (let i = 0; i < 420; i++) {
      const x = hashNoise(i, 2, seed + 71) * width;
      const y = hashNoise(i, 8, seed + 17) * height;
      const w = 4 + hashNoise(i, 5, seed + 8) * 22;
      ctx.beginPath(); ctx.ellipse(x, y, w, 1.3 + w * 0.12, 0, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = Math.min(renderer.capabilities.getMaxAnisotropy(), lowQuality ? 2 : 8);
  return texture;
}
function makeCloudAlpha(size=256){
  const canvas=document.createElement('canvas');canvas.width=size;canvas.height=size/2;const ctx=canvas.getContext('2d'),image=ctx.createImageData(canvas.width,canvas.height);
  for(let y=0;y<canvas.height;y++)for(let x=0;x<canvas.width;x++){const n=fractal(x/canvas.width,y/canvas.height,719);const a=THREE.MathUtils.clamp((n-.49)*3.8,0,.72);const i=(y*canvas.width+x)*4;image.data[i]=image.data[i+1]=image.data[i+2]=Math.round(a*255);image.data[i+3]=255;}
  ctx.putImageData(image,0,0);return new THREE.CanvasTexture(canvas);
}
function makeCityLightsTexture(size=512){
  const canvas=document.createElement('canvas');canvas.width=size;canvas.height=size/2;const ctx=canvas.getContext('2d');ctx.clearRect(0,0,canvas.width,canvas.height);
  for(let i=0;i<170;i++){const u=hashNoise(i,31,113),v=.18+hashNoise(i,47,127)*.64;if(!earthLandforms.some(poly=>insidePolygon(u,v,poly)))continue;const cluster=1+Math.floor(hashNoise(i,59,131)*5),x=u*canvas.width,y=v*canvas.height;for(let j=0;j<cluster;j++){const dx=(hashNoise(i+j,61,137)-.5)*14,dy=(hashNoise(i+j,67,139)-.5)*8;ctx.fillStyle=`rgba(255,190,102,${.28+hashNoise(i,j,149)*.58})`;ctx.beginPath();ctx.arc(x+dx,y+dy,.35+hashNoise(i,j,151)*.8,0,Math.PI*2);ctx.fill();}}
  const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;return texture;
}
function makeSunTexture(size = 512) {
  const canvas=document.createElement('canvas');canvas.width=size;canvas.height=size/2;const ctx=canvas.getContext('2d');
  const base=ctx.createLinearGradient(0,0,0,canvas.height);base.addColorStop(0,'#f6a544');base.addColorStop(.2,'#ffd477');base.addColorStop(.5,'#ffca58');base.addColorStop(.8,'#f6a23b');base.addColorStop(1,'#df6f28');ctx.fillStyle=base;ctx.fillRect(0,0,canvas.width,canvas.height);
  for(let i=0;i<1200;i++){
    const x=hashNoise(i,7,33)*canvas.width,y=hashNoise(i,19,81)*canvas.height,r=1+hashNoise(i,3,13)*5;
    ctx.beginPath();ctx.fillStyle=i%3===0?'rgba(255,245,176,.13)':'rgba(177,66,24,.1)';ctx.ellipse(x,y,r*2,r*.65,hashNoise(i,4,22)*Math.PI,0,Math.PI*2);ctx.fill();
  }
  const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=Math.min(renderer.capabilities.getMaxAnisotropy(),lowQuality?2:8);return texture;
}
function radialTexture(inner, outer) {
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = 256;
  const ctx = canvas.getContext('2d');
  const gradient = ctx.createRadialGradient(128,128,inner,128,128,outer);
  gradient.addColorStop(0,'rgba(255,244,208,0.85)'); gradient.addColorStop(0.18,'rgba(255,183,89,0.48)'); gradient.addColorStop(0.52,'rgba(255,119,48,0.15)'); gradient.addColorStop(1,'rgba(255,98,32,0)');
  ctx.fillStyle = gradient; ctx.fillRect(0,0,256,256);
  return new THREE.CanvasTexture(canvas);
}
function ringTexture() {
  const canvas = document.createElement('canvas'); canvas.width = 512; canvas.height = 32;
  const ctx = canvas.getContext('2d');
  const grad = ctx.createLinearGradient(0,0,512,0);
  [[0,'rgba(145,118,80,.04)'],[.12,'rgba(196,168,121,.55)'],[.23,'rgba(239,218,172,.82)'],[.34,'rgba(112,94,74,.28)'],[.47,'rgba(220,192,142,.7)'],[.54,'rgba(74,65,58,.14)'],[.63,'rgba(222,201,158,.76)'],[.76,'rgba(167,137,100,.46)'],[.9,'rgba(225,203,158,.73)'],[1,'rgba(139,113,81,.18)']].forEach(([at,color])=>grad.addColorStop(at,color));
  ctx.fillStyle=grad;ctx.fillRect(0,0,512,32);
  const tex=new THREE.CanvasTexture(canvas);tex.colorSpace=THREE.SRGBColorSpace;return tex;
}
function textSprite(text, color = '#e7f5ff') {
  const canvas=document.createElement('canvas');canvas.width=384;canvas.height=96;
  const ctx=canvas.getContext('2d');ctx.font='500 36px Manrope, Arial';ctx.textAlign='center';ctx.fillStyle=color;ctx.shadowColor=color;ctx.shadowBlur=13;ctx.fillText(text.toUpperCase(),192,54);
  const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
  const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:texture,transparent:true,depthTest:false,depthWrite:false}));sprite.scale.set(5.1,1.3,1);sprite.renderOrder=5;return sprite;
}
let solarStars;
function createStars() {
  const amount=lowQuality?1400:3400;const positions=new Float32Array(amount*3);const colors=new Float32Array(amount*3);
  for(let i=0;i<amount;i++){
    const radius=THREE.MathUtils.randFloat(115,420),theta=Math.random()*Math.PI*2,phi=Math.acos(THREE.MathUtils.randFloatSpread(2));
    positions[i*3]=radius*Math.sin(phi)*Math.cos(theta);positions[i*3+1]=radius*Math.cos(phi);positions[i*3+2]=radius*Math.sin(phi)*Math.sin(theta);
    const tint=THREE.MathUtils.randFloat(0.55,1);colors[i*3]=tint*.76;colors[i*3+1]=tint*.86;colors[i*3+2]=tint;
  }
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.BufferAttribute(positions,3));geometry.setAttribute('color',new THREE.BufferAttribute(colors,3));
  const material=new THREE.PointsMaterial({size:lowQuality?0.45:0.62,sizeAttenuation:true,vertexColors:true,transparent:true,opacity:.85,depthWrite:false});
  solarStars=new THREE.Points(geometry,material);scene.add(solarStars);
}
function createSun() {
  const geometry=new THREE.SphereGeometry(3.1,lowQuality?36:64,lowQuality?28:48);
  const material=new THREE.MeshBasicMaterial({map:makeSunTexture(lowQuality?256:512),color:0xffd69a});
  const mesh=new THREE.Mesh(geometry,material);scene.add(mesh);mesh.userData.bodyId='sun';hitTargets.push(mesh);planetMeshes.set('sun',{mesh,pivot:mesh,baseRadius:3.1});
  const glow=new THREE.Sprite(new THREE.SpriteMaterial({map:radialTexture(20,125),color:0xffa74f,transparent:true,blending:THREE.AdditiveBlending,depthWrite:false}));glow.scale.set(38,38,1);scene.add(glow);
  const corona=new THREE.Mesh(new THREE.SphereGeometry(3.24,48,32),new THREE.MeshBasicMaterial({color:0xffa64c,transparent:true,opacity:.12,side:THREE.BackSide,blending:THREE.AdditiveBlending,depthWrite:false}));scene.add(corona);
  const label=textSprite('GÜNEŞ','#ffe4b5');label.position.set(0,4.6,0);scene.add(label);labelSprites.set('sun',label);
}
function createOrbit(body) {
  const points=[];const samples=160;const eccentricity=body.eccentricity;
  for(let i=0;i<=samples;i++){const angle=(i/samples)*Math.PI*2;const radius=body.orbit*(1-eccentricity*eccentricity)/(1+eccentricity*Math.cos(angle));points.push(new THREE.Vector3(radius*Math.cos(angle),0,radius*Math.sin(angle)));}
  const geometry=new THREE.BufferGeometry().setFromPoints(points);
  const color=new THREE.Color(body.color);
  const line=new THREE.LineLoop(geometry,new THREE.LineBasicMaterial({color,transparent:true,opacity:.22,depthWrite:false}));
  line.rotation.x=THREE.MathUtils.degToRad(body.inclination);
  scene.add(line);orbitLines.push(line);
}
function atmosphereMaterial(color,opacity) {
  return new THREE.ShaderMaterial({transparent:true,depthWrite:false,side:THREE.BackSide,blending:THREE.AdditiveBlending,uniforms:{glowColor:{value:new THREE.Color(color)},coefficient:{value:0.55},power:{value:2.2},glowOpacity:{value:opacity}},vertexShader:'varying vec3 vNormal; varying vec3 vViewPosition; void main(){vec4 mvPosition=modelViewMatrix*vec4(position,1.0);vNormal=normalize(normalMatrix*normal);vViewPosition=-mvPosition.xyz;gl_Position=projectionMatrix*mvPosition;}',fragmentShader:'uniform vec3 glowColor;uniform float coefficient;uniform float power;uniform float glowOpacity;varying vec3 vNormal;varying vec3 vViewPosition;void main(){float intensity=pow(coefficient-dot(normalize(vNormal),normalize(vViewPosition)),power);gl_FragColor=vec4(glowColor,intensity*glowOpacity);}' });
}
function createPlanet(body) {
  createOrbit(body);
  const orbitFrame=new THREE.Group();orbitFrame.rotation.x=THREE.MathUtils.degToRad(body.inclination);scene.add(orbitFrame);
  const orbitRoot=new THREE.Group();orbitFrame.add(orbitRoot);
  const pathRadius=body.orbit;
  const planetAnchor=new THREE.Group();planetAnchor.position.x=pathRadius;orbitRoot.add(planetAnchor);
  const axisGroup=new THREE.Group();axisGroup.rotation.z=THREE.MathUtils.degToRad(body.tilt>90?180-body.tilt:body.tilt);planetAnchor.add(axisGroup);
  const detail=lowQuality?28:56;
  const material=new THREE.MeshStandardMaterial({map:makeTexture(body.id,body.id.length*17+5,lowQuality?256:512),roughness:body.id==='earth'?.66:.88,metalness:0});
  if(body.id==='venus'){
    const nasaVenusTexture=new THREE.TextureLoader().load(new URL('./assets/textures/venus.jpg',import.meta.url).href,texture=>{
      texture.colorSpace=THREE.SRGBColorSpace;
      texture.anisotropy=Math.min(renderer.capabilities.getMaxAnisotropy(),lowQuality?2:8);
      material.map=texture;material.needsUpdate=true;
    },undefined,()=>showToast('Venüs dokusu yüklenemedi. Temsili yüzey gösteriliyor.'));
    nasaVenusTexture.colorSpace=THREE.SRGBColorSpace;
  }
  if(body.id==='earth'){material.emissive=new THREE.Color(0xffa956);material.emissiveMap=makeCityLightsTexture(lowQuality?256:512);material.emissiveIntensity=.28;}
  const mesh=new THREE.Mesh(new THREE.SphereGeometry(body.radius,detail,Math.floor(detail*.7)),material);mesh.userData.bodyId=body.id;axisGroup.add(mesh);hitTargets.push(mesh);
  const atmosphereColor={earth:'#6ec5ff',venus:'#ffe1a1',mars:'#e37852',jupiter:'#ffd1a0',saturn:'#ffe4a8',uranus:'#7ceaff',neptune:'#779bff'}[body.id];
  if(atmosphereColor){const shell=new THREE.Mesh(new THREE.SphereGeometry(body.radius*1.055,lowQuality?24:40,lowQuality?18:28),atmosphereMaterial(atmosphereColor,body.id==='venus'?.38:.72));axisGroup.add(shell);mesh.userData.atmosphere=shell;}
  if(body.id==='saturn'){
    const ring=new THREE.Mesh(new THREE.RingGeometry(body.radius*1.28,body.radius*2.15,128),new THREE.MeshStandardMaterial({map:ringTexture(),color:0xe5d0a2,side:THREE.DoubleSide,transparent:true,opacity:.89,roughness:1,depthWrite:false}));
    ring.rotation.x=Math.PI/2;axisGroup.add(ring);
  }
  if(body.id==='earth'){
    const cloudTexture=makeCloudAlpha(lowQuality?128:256);
    const cloud=new THREE.Mesh(new THREE.SphereGeometry(body.radius*1.016,lowQuality?28:48,lowQuality?20:32),new THREE.MeshStandardMaterial({color:0xe6f3ff,alphaMap:cloudTexture,transparent:true,opacity:.58,roughness:1,depthWrite:false}));axisGroup.add(cloud);mesh.userData.cloud=cloud;
    const moonOrbit=new THREE.Group();planetAnchor.add(moonOrbit);moonOrbit.position.x=0;
  const moon=new THREE.Mesh(new THREE.SphereGeometry(.19,20,14),new THREE.MeshStandardMaterial({map:makeTexture('moon',91,256),roughness:1}));moon.position.set(2.05,0,0);moon.userData.moon=true;moonOrbit.add(moon);mesh.userData.moonOrbit=moonOrbit;
  }
  const label=textSprite(body.name,body.id==='neptune'?'#bdceff':'#e3f3ff');label.position.set(0,body.radius+1.2,0);axisGroup.add(label);labelSprites.set(body.id,label);
  const initialPhase=Math.random()*Math.PI*2;
  planetMeshes.set(body.id,{mesh,pivot:orbitRoot,anchor:planetAnchor,axis:axisGroup,body,baseRadius:body.radius,baseDistance:pathRadius,phase:initialPhase,initialPhase,spin:0,cloud:mesh.userData.cloud,moonOrbit:mesh.userData.moonOrbit});
  return orbitRoot;
}
function createSystem(){createStars();createSun();bodies.forEach(createPlanet);}
function applyDistanceScale(){planetMeshes.forEach((entry,id)=>{if(id==='sun')return;entry.anchor.position.x=entry.baseDistance*orbitDistanceScale;});orbitLines.forEach((line,index)=>{line.scale.setScalar(orbitDistanceScale);});}
function applySizeScale(){planetMeshes.forEach((entry,id)=>{if(id==='sun')return;if(entry.axis)entry.axis.scale.setScalar(planetSizeScale);});}
function getDisplayPosition(id,target=new THREE.Vector3()){
  const entry=planetMeshes.get(id);if(!entry||id==='sun')return target.set(0,0,0);
  return entry.mesh.getWorldPosition(target);
}
function describeRotation(hours){
  const direction=hours<0?' · geriye dönük':'';const abs=Math.abs(hours);
  if(abs<48)return `${abs.toLocaleString('tr-TR',{maximumFractionDigits:1})} saat${direction}`;
  return `${(abs/24).toLocaleString('tr-TR',{maximumFractionDigits:1})} gün (${abs.toLocaleString('tr-TR',{maximumFractionDigits:1})} saat)${direction}`;
}
function displayBody(id){
  selectedId=id;const isSun=id==='sun';const body=bodies.find((item)=>item.id===id);
  document.querySelectorAll('.body-row').forEach((row)=>row.classList.toggle('active',row.dataset.body===id));
  $('#mobileBody').value=id;
  $('#bodyType').textContent=isSun?'MERKEZ YILDIZ':body.type;
  $('#bodyName').textContent=isSun?'Güneş':body.name;
  $('#bodyDescription').textContent=isSun?'Sistemin merkezindeki yıldız. Işığı ve kütleçekimi, gezegenlerin yolculuğunu şekillendirir.':body.description;
  $('#diameter').textContent=isSun?'1.392.700 km':body.diameter;
  $('#mass').textContent=isSun?'1,989 × 10³⁰ kg':body.mass;
  $('#distance').textContent=isSun?'—':`${body.distance} (${body.distanceAu.toLocaleString('tr-TR')} AB)`;
  $('#year').textContent=isSun?'—':`${body.period.toLocaleString('tr-TR')} gün`;
  $('#day').textContent=isSun?'≈ 25 gün (ekvator)':describeRotation(body.rotation);
  $('#temperature').textContent=isSun?'≈ 5.500 °C*':body.temperature;
  $('#gravity').textContent=isSun?'274 m/s²':body.gravity;
  $('#moons').textContent=isSun?'Gezegenleri etkiler':body.moons;
  $('#factFoot').textContent=isSun?'Güneş bir gezegen değildir; yıldız olarak modellenmiştir.':`Uydu sayısı NASA/JPL fact sheet tablosundaki bilinen uydu sayısının anlık görüntüsüdür.`;
  $('#infoPanel').classList.remove('closed');
}
function beginSolarJourney(position, target) {
  transition = createJourney(camera.position.toArray(),controls.target.toArray(),position.toArray(),target.toArray(),solarHud.speed());
  movementVelocity.set(0,0,0);
}
function animateFocus(id){
  const position=getDisplayPosition(id,new THREE.Vector3());
  const direction=camera.position.clone().sub(controls.target).normalize();
  if (!direction.lengthSq()) direction.set(0,0,1);
  const entry=planetMeshes.get(id);
  const distance=id==='sun'?22:Math.max(entry.baseRadius*planetSizeScale*4.8,3.6);
  const endpoint=position.clone().addScaledVector(direction,distance);
  beginSolarJourney(endpoint,position);
  solarOrbit=false;
  focusObject=entry.mesh;
  focusPosition.copy(position);
  follow=true;
  $('#followBtn').classList.add('active');
}
function cancelSolarMotion() {
  transition=null;
  follow=false;
  solarOrbit=false;
  movementVelocity.set(0,0,0);
  controls.enabled=true;
  $('#followBtn').classList.remove('active');
}
let solarOrbit=false;
const solarHud=mountFlightHud($('#simulator'),keys,()=>{cancelSolarMotion();if(cinematic)$('#cinemaBtn').click();},true);
solarHud.panel.classList.add('solar-flight');
const solarOrbitButton=document.createElement('button'); solarOrbitButton.type='button'; solarOrbitButton.textContent='Yörünge'; solarHud.panel.append(solarOrbitButton);
solarOrbitButton.onclick=()=>{if(!focusObject){showToast('Önce bir hedef seç.');return;}solarOrbit=!solarOrbit;if(solarOrbit&&!follow)document.querySelector('#followBtn').click();};
for (const event of ['pointerdown','wheel']) renderer.domElement.addEventListener(event,()=>{
  if (transition || cinematic) {
    cancelSolarMotion();
    if (cinematic) $('#cinemaBtn').click();
  }
},{capture:true,passive:true});
function selectBody(id){
  if(!planetMeshes.has(id))return;
  displayBody(id);animateFocus(id);
}
function showToast(message){toast.textContent=message;toast.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>toast.classList.remove('show'),2500);}
function setSpeed(index){speedIndex=THREE.MathUtils.clamp(index,0,speedLevels.length-1);$('#speedRange').value=String(speedIndex);$('#speedReadout').textContent=`${speedLevels[speedIndex].toLocaleString('tr-TR',{maximumFractionDigits:2})}×`;$('#slowerBtn').disabled=speedIndex===0;$('#fasterBtn').disabled=speedIndex===speedLevels.length-1;}
function resetView(){
  orbitDistanceScale=1;planetSizeScale=1;orbitScaleInput.value='1';sizeScaleInput.value='1';$('#distanceValue').textContent='1.00×';$('#sizeValue').textContent='1.0×';
  $('#orbitsToggle').checked=true;$('#labelsToggle').checked=true;showOrbits=true;showLabels=true;orbitLines.forEach((line)=>line.visible=true);labelSprites.forEach((sprite)=>sprite.visible=true);
  setSpeed(2);playing=true;$('#playGlyph').textContent='Ⅱ';$('#playBtn').setAttribute('aria-label','Simülasyonu duraklat');cinematic=false;$('#simulator').classList.remove('cinematic');$('#cinemaBtn').classList.remove('active');
  document.querySelector('#qualityBtn').value='auto';document.querySelector('#qualityBtn').dispatchEvent(new Event('change'));
  planetMeshes.forEach((entry,id)=>{if(id!=='sun'){entry.phase=entry.initialPhase;entry.pivot.rotation.y=entry.phase;entry.mesh.rotation.y=0;}});
  applyDistanceScale();applySizeScale();controls.minDistance=3.4;controls.maxDistance=240;focusObject=null;follow=false;solarOrbit=false;$('#followBtn').classList.remove('active');
  displayBody('sun');beginSolarJourney(new THREE.Vector3(0,52,135),new THREE.Vector3());showToast('Simülasyon ayarları başlangıç değerlerine döndü.');
}
function updateClock(){
  const total=Math.floor(simulatedSeconds);const h=Math.floor(total/3600)%100;const m=Math.floor((total%3600)/60);const s=total%60;
  $('#clock').textContent=[h,m,s].map((v)=>String(v).padStart(2,'0')).join(':');
}
function updateMovement(delta){
  movementIntent.set(0,0,0);
  if(!document.activeElement?.matches('input,select,button')){
    const direction=new THREE.Vector3();camera.getWorldDirection(direction);
    const right=new THREE.Vector3().crossVectors(direction,new THREE.Vector3(0,1,0)).normalize();
    if(keys.has('w')||keys.has('arrowup'))movementIntent.add(direction);
    if(keys.has('s')||keys.has('arrowdown'))movementIntent.sub(direction);
    if(keys.has('d')||keys.has('arrowright'))movementIntent.add(right);
    if(keys.has('a')||keys.has('arrowleft'))movementIntent.sub(right);
    if(keys.has('q'))movementIntent.y+=1;if(keys.has('e'))movementIntent.y-=1;
  }
  movementIntent.normalize().multiplyScalar(movementSpeed(Math.max(2,controls.getDistance()*.12)*solarHud.speed(),keys));
  const step=integrateFlight(movementVelocity.toArray(),movementIntent.toArray(),delta);
  movementVelocity.fromArray(step.velocity);
  const movement=new THREE.Vector3().fromArray(step.displacement);
  camera.position.add(movement);
  controls.target.add(movement);
}
const solarPrevious=new THREE.Vector3(), solarCenter=new THREE.Vector3();
let safeSolarPosition=camera.position.toArray(), solarHudStamp=0;
function resolveSolarCamera() {
  const colliders=[];
  for (const [id,entry] of planetMeshes) {
    colliders.push({center:entry.mesh.getWorldPosition(solarCenter).toArray(),radius:scaledRadius(entry.baseRadius,id==='sun'?1:planetSizeScale)});
    const moon=entry.moonOrbit?.children[0];
    if (moon) colliders.push({center:moon.getWorldPosition(solarCenter).toArray(),radius:scaledRadius(.19,planetSizeScale)});
  }
  const desired=camera.position.toArray();
  const safe=resolveFlight(solarPrevious.toArray(),desired,colliders,safeSolarPosition);
  if (!validPosition(desired) || !validPosition(controls.target.toArray())) {
    cancelSolarMotion();
    controls.target.set(0,0,0);
  }
  if(transition && validPosition(desired) && solarCenter.fromArray(safe).distanceTo(camera.position)>.05){
    cancelSolarMotion();
    showToast('Yolculuk güvenli yaklaşma sınırında durdu.');
  }
  camera.position.fromArray(safe);
  camera.lookAt(controls.target);
  safeSolarPosition=safe;
}
let stopSolarLoop=()=>{};
function updatePlanetLabels(){
  if(!showLabels){labelSprites.forEach(sprite=>sprite.visible=false);return;}
  const position=new THREE.Vector3();
  labelSprites.forEach((sprite,id)=>{
    const entry=planetMeshes.get(id);
    if(!entry){sprite.visible=true;return;}
    const center=entry.mesh?.getWorldPosition(position) || position.set(0,0,0);
    const threshold=(entry.baseRadius||3)*8.5*planetSizeScale;
    sprite.visible=camera.position.distanceTo(center)>threshold;
  });
}
function animate(now){

  const delta=Math.min(Math.max((now-previousFrame)/1000,0),.05);
  previousFrame=now;
  const timeFactor=speedLevels[speedIndex];
  if(playing){simulatedSeconds+=delta*timeFactor*60;updateClock();}
  if(playing){
    const visualSpeed=timeFactor;
    planetMeshes.forEach((entry,id)=>{
      if(id==='sun')return;
      const {body}=entry;
      entry.phase+=(0.11/Math.sqrt(body.period/365.2))*visualSpeed*delta;
      entry.pivot.rotation.y=entry.phase;
      const rotationSign=Math.sign(body.rotation);
      entry.mesh.rotation.y+=rotationSign*(.035/Math.sqrt(Math.abs(body.rotation)/23.9))*visualSpeed*delta;
      if(entry.cloud)entry.cloud.rotation.y+=.008*visualSpeed*delta;
      if(entry.moonOrbit)entry.moonOrbit.rotation.y+=.55*visualSpeed*delta;
    });
  }
  const visible=!document.hidden&&!renderer.domElement.classList.contains('mode-hidden');
  solarHud.panel.hidden=!visible;
  if(!visible){keys.clear();movementVelocity.set(0,0,0);return;}
  solarPrevious.copy(camera.position);
  const focusCenter=focusObject?.getWorldPosition(new THREE.Vector3());
  if(transition){
    const state=advanceJourney(transition,delta,focusCenter?.toArray() ?? transition.target);
    transition.elapsed=state.elapsed;
    camera.position.fromArray(state.position);
    controls.target.fromArray(state.look);
    if(state.done) transition=null;
  }else{
    if(follow&&focusCenter){
      const shift=focusCenter.clone().sub(focusPosition);
      camera.position.add(shift);
      controls.target.add(shift);
    }
    if((solarOrbit||(cinematic&&!reducedMotion.matches))&&focusCenter){
      const move=camera.position.clone().sub(focusCenter).applyAxisAngle(camera.up,delta*(.08+solarHud.speed()*.025));
      const desired=(focusObject.geometry.parameters.radius*planetSizeScale+2)*(2.7+Math.sin(now*.0007)*.35);
      if(cinematic)move.setLength(THREE.MathUtils.lerp(move.length(),desired,1-Math.exp(-.7*delta)));
      camera.position.copy(focusCenter).add(move);
      controls.target.copy(focusCenter);
    }
    updateMovement(delta);
  }
  if(focusCenter)focusPosition.copy(focusCenter);
  controls.enabled=!transition;
  controls.update();
  resolveSolarCamera();
  if(now-solarHudStamp>=100){
    solarHudStamp=now;
    const id=focusObject?.userData.bodyId;
    const body=planetMeshes.get(id)?.body;
    const direction=camera.getWorldDirection(new THREE.Vector3());
    solarHud.update({
      mode:flightMode({travel:transition,cinematic,orbit:solarOrbit,tracking:follow&&focusObject}),
      target:body?.name ?? (id==='sun'?'Güneş':'Güneş Sistemi'),
      velocity:delta>0?camera.position.distanceTo(solarPrevious)/delta:0,
      range:focusCenter?camera.position.distanceTo(focusCenter):null,
      astronomical:body?`${body.distance} (Güneş’e ortalama)`:'',
      bearing:(Math.atan2(direction.x,-direction.z)*180/Math.PI+360)%360,
      fov:camera.fov,fraction:transition?transition.elapsed/transition.duration:null
    });
  }
  updatePlanetLabels();
  renderer.render(scene,camera); solarQuality.frame(now);
}

function initialize(){
  createSystem();
  $('#bodyName').textContent='Güneş';
  solarQuality.resize();
  setSpeed(speedIndex);displayBody('sun');
  loading.classList.add('hidden');
  startSolarLoop();
}
const solarSelect=$('#qualityBtn');
solarSelect.innerHTML=qualityOptions;
let solarLevel,solarQualityBuilt=false;
const solarQuality=renderQuality(solarSelect,fpsMeter,(level,ratio)=>{
  renderer.setPixelRatio(ratio);
  lowQuality=level==='low';
  if(solarLevel===level&&solarQualityBuilt)return;
  solarQualityBuilt=planetMeshes.size>0;
  solarLevel=level;
  if(solarStars){const count=solarStars.geometry.attributes.position.count;solarStars.geometry.setDrawRange(0,Math.round(count*{low:.45,medium:.75,high:1}[level]));}
  const segments={low:24,medium:40,high:56}[level];
  const textureSize={low:256,medium:512,high:768}[level];
  for(const [id,entry] of planetMeshes){
    if(id==='sun')continue;
    const mesh=entry.mesh;
    mesh.geometry.dispose();
    mesh.geometry=new THREE.SphereGeometry(entry.baseRadius,segments,Math.floor(segments*.7));
    if(mesh.material.map?.isCanvasTexture){
      mesh.material.map.dispose();
      mesh.material.map=makeTexture(id,id.length*17+5,textureSize);
      mesh.material.needsUpdate=true;
    }
    if(entry.cloud)entry.cloud.visible=level!=='low';
    if(mesh.userData.atmosphere)mesh.userData.atmosphere.visible=level!=='low';
  }
});
function startSolarLoop(){
  stopSolarLoop=sceneLoop(renderer.domElement,()=>!renderer.domElement.classList.contains('mode-hidden'),animate,()=>{
    previousFrame=performance.now();solarQuality.pause();keys.clear();movementVelocity.set(0,0,0);solarHud.panel.hidden=true;
  },()=>renderer);
}
try{initialize();}catch(error){console.error('COSMORA WebGL başlatma hatası:',error);loading.classList.add('hidden');fallback.hidden=false;}

listenForTap(renderer.domElement,event=>{
  const box=renderer.domElement.getBoundingClientRect();pointer.x=((event.clientX-box.left)/box.width)*2-1;pointer.y=-((event.clientY-box.top)/box.height)*2+1;raycaster.setFromCamera(pointer,camera);
  const hits=raycaster.intersectObjects(hitTargets,false);if(hits.length){const id=hits[0].object.userData.bodyId;if(id)selectBody(id);}
});
document.querySelectorAll('.body-row').forEach((button)=>button.addEventListener('click',()=>selectBody(button.dataset.body)));
$('#mobileBody').addEventListener('change',(event)=>selectBody(event.target.value));
$('#playBtn').addEventListener('click',()=>{playing=!playing;$('#playGlyph').textContent=playing?'Ⅱ':'▶';$('#playBtn').setAttribute('aria-label',playing?'Simülasyonu duraklat':'Simülasyonu başlat');});
$('#speedRange').addEventListener('input',(event)=>setSpeed(Number(event.target.value)));
$('#slowerBtn').addEventListener('click',()=>setSpeed(speedIndex-1));$('#fasterBtn').addEventListener('click',()=>setSpeed(speedIndex+1));
orbitScaleInput.addEventListener('input',(event)=>{orbitDistanceScale=Number(event.target.value);$('#distanceValue').textContent=`${orbitDistanceScale.toFixed(2)}×`;applyDistanceScale();});
sizeScaleInput.addEventListener('input',(event)=>{planetSizeScale=Number(event.target.value);$('#sizeValue').textContent=`${planetSizeScale.toFixed(1)}×`;applySizeScale();});
$('#orbitsToggle').addEventListener('change',(event)=>{showOrbits=event.target.checked;orbitLines.forEach((line)=>line.visible=showOrbits);});
$('#labelsToggle').addEventListener('change',(event)=>{showLabels=event.target.checked;labelSprites.forEach((sprite)=>sprite.visible=showLabels);});
  $('#overviewBtn').addEventListener('click',()=>{focusObject=null;follow=false;solarOrbit=false;$('#followBtn').classList.remove('active');beginSolarJourney(new THREE.Vector3(0,52,135),new THREE.Vector3());displayBody('sun');});
$('#followBtn').addEventListener('click',()=>{if(!focusObject){showToast('Önce bir gezegen seç.');return;}follow=!follow;if(!follow)solarOrbit=false;$('#followBtn').classList.toggle('active',follow);showToast(follow?'Gezegen takibi açık':'Gezegen takibi kapalı');});
$('#fullscreenBtn').addEventListener('click',async()=>{const target=$('#simulator');try{if(document.fullscreenElement){if(!document.exitFullscreen){showToast('Bu tarayıcı tam ekrandan çıkışı desteklemiyor.');return;}await document.exitFullscreen();}else{if(!target.requestFullscreen){showToast('Tam ekran bu tarayıcıda kullanılamıyor.');return;}await target.requestFullscreen();}}catch{showToast('Tam ekran bu tarayıcıda kullanılamıyor.');}});
if(!$('#simulator').requestFullscreen){$('#fullscreenBtn').title='Bu tarayıcı tam ekran modunu desteklemiyor.';$('#fullscreenBtn').setAttribute('aria-label','Tam ekran bu tarayıcıda desteklenmiyor');}
$('#cinemaBtn').addEventListener('click',()=>{cinematic=!cinematic;$('#simulator').classList.toggle('cinematic',cinematic);$('#cinemaBtn').classList.toggle('active',cinematic);showToast(cinematic?'Sinematik görünüm açık':'Sinematik görünüm kapalı');});

$('#resetBtn').addEventListener('click',resetView);
// Allows other COSMORA modes to return to the actual animated Earth model.
window.COSMORA_SOLAR_API={selectBody,getBodyPosition:(id)=>planetMeshes.has(id)?getDisplayPosition(id,new THREE.Vector3()).toArray():null};
$('#closeInfo').addEventListener('click',()=>$('#infoPanel').classList.add('closed'));
$('#scaleInfo').addEventListener('click',()=>$('#noticeDialog').showModal());
$('.notice-close').addEventListener('click',()=>$('#noticeDialog').close());
$('#noticeDialog').addEventListener('click',(event)=>{if(event.target===$('#noticeDialog'))$('#noticeDialog').close();});
window.addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);solarQuality.resize();});

window.addEventListener('keydown',(event)=>{
  if(renderer.domElement.classList.contains('mode-hidden'))return;
  if(event.key==='Escape')cancelSolarMotion();
  if(event.key==='Escape'&&cinematic){cinematic=false;$('#simulator').classList.remove('cinematic');$('#cinemaBtn').classList.remove('active');}
  if(event.target?.closest?.('input,select,textarea,button,[contenteditable]'))return;const key=event.key.toLowerCase();
  if(['w','a','s','d','q','e','arrowup','arrowdown','arrowleft','arrowright','shift','control'].includes(key)){if((transition||follow||solarOrbit||cinematic)&&key!=='shift'&&key!=='control'){cancelSolarMotion();if(cinematic)$('#cinemaBtn').click();}keys.add(key);event.preventDefault();}
  if(key===' '){playing=!playing;$('#playGlyph').textContent=playing?'Ⅱ':'▶';event.preventDefault();}
});
window.addEventListener('keyup',(event)=>keys.delete(event.key.toLowerCase()));window.addEventListener('blur',()=>keys.clear());

const selectionObserver=new ResizeObserver(()=>renderer.setSize(host.clientWidth||innerWidth,host.clientHeight||innerHeight));selectionObserver.observe(host);
window.addEventListener('pagehide',event=>{
  if(event.persisted)return;stopSolarLoop();
  selectionObserver.disconnect();controls.dispose();scene.traverse((object)=>{object.geometry?.dispose();const materials=Array.isArray(object.material)?object.material:[object.material];materials.filter(Boolean).forEach((material)=>{Object.values(material).forEach((value)=>{if(value?.isTexture)value.dispose();});Object.values(material.uniforms||{}).forEach((uniform)=>{if(uniform.value?.isTexture)uniform.value.dispose();});material.dispose();});});
  renderer.dispose();renderer.forceContextLoss();
});
