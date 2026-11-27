
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const vertexShader = /* glsl */ `
varying vec3 surface;
varying vec3 eyeNormal;
varying vec3 eye;
void main(){
  surface=position;
  vec4 p=modelViewMatrix*vec4(position,1.);
  eye=-p.xyz;
  eyeNormal=normalMatrix*normal;
  gl_Position=projectionMatrix*p;
}`;
const noise = /* glsl */ `
float hash(vec3 p){return fract(sin(dot(p,vec3(127.1,311.7,74.7)))*43758.5453);}
float grain(vec3 p){
  vec3 i=floor(p), f=fract(p); f=f*f*(3.-2.*f);
  return mix(mix(mix(hash(i),hash(i+vec3(1,0,0)),f.x),
                 mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),
             mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),
                 mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y),f.z);
}`;

function stellarTint(index){
  const neutral=new THREE.Color('#f4f2ff');
  if(!Number.isFinite(index))return neutral;
  if(index<.25)return neutral.lerp(new THREE.Color('#a3c7ff'), THREE.MathUtils.clamp((.25-index)*1.8,0,1));
  return neutral.lerp(new THREE.Color('#ffb86d'),THREE.MathUtils.clamp((index-.25)*.78,0,1));
}

// Scene units describe the illustration; the catalog does not supply a measured surface map or radius.
export function openStellarJourney(star,onReturn){
  const dialog=document.createElement('dialog');
  dialog.className='stellar-journey';
  dialog.setAttribute('aria-labelledby','stellar-name');
  dialog.innerHTML='<header><button type="button" class="stellar-return">← Gökyüzüne dön</button><div><h2 id="stellar-name"></h2><p class="stellar-status" role="status">Yıldıza yaklaşılıyor</p></div><div class="stellar-zoom"><button type="button" aria-label="Yakınlaştır">+</button><button type="button" aria-label="Uzaklaştır">−</button></div></header><footer><strong>Temsili bilimsel görselleştirme</strong><span></span><small>Yüzey deseni, ışık halesi ve model ölçeği temsilidir. Yolculuk görsel bir simülasyondur.</small></footer>';
  dialog.querySelector('h2').textContent=star.name;
  dialog.querySelector('footer span').textContent=[
    'HIP '+star.hip, 'Spektral sınıf: '+(star.spectrum||'kayıt yok'),
    'B−V: '+(Number.isFinite(star.ci)?star.ci.toFixed(3):'kayıt yok'),
    Number.isFinite(star.distancePc)?(star.distancePc*3.26156).toLocaleString('tr',{maximumFractionDigits:1})+' ışık yılı':null
  ].filter(Boolean).join(' · ');
  const renderer=new THREE.WebGLRenderer({antialias:true});
  renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.5));
  renderer.domElement.setAttribute('aria-label','Yıldızın çevresinde sürükleyerek dolaş');
  dialog.prepend(renderer.domElement);
  document.body.append(dialog);
  dialog.showModal();

  const scene=new THREE.Scene();
  scene.background=new THREE.Color('#040712');
  const camera=new THREE.PerspectiveCamera(46,1,.03,220);
  camera.position.set(.8,.42,94);
  const controls=new OrbitControls(camera,renderer.domElement);
  controls.enablePan=false;
  controls.enableDamping=true;
  controls.minDistance=1.18;
  controls.maxDistance=95;
  controls.enabled=false;
  controls.update();
  const tint=stellarTint(star.ci);
  const time={value:0};
  const surface=new THREE.Mesh(new THREE.SphereGeometry(1,96,64),new THREE.ShaderMaterial({
    vertexShader,uniforms:{tint:{value:tint},time,seed:{value:(star.hip%997)*.027}},
    fragmentShader:`
      varying vec3 surface; varying vec3 eyeNormal; varying vec3 eye;
      uniform vec3 tint; uniform float time; uniform float seed;
      ${noise}
      void main(){
        vec3 p=normalize(surface);
        vec3 q=p*14.+vec3(seed,time*.13,-time*.07);
        float warp=grain(q*.65);
        float cloud=grain(q+warp*2.);
        float cells=grain(p*65.+warp*3.+seed);
        float fine=grain(p*183.+cloud*3.);
        float density=mix(cloud,cells,.55)*.85+fine*.15;
        float facing=max(0.,dot(normalize(eyeNormal),normalize(eye)));
        float light=(.57+.65*smoothstep(.16,.86,density))*(.42+.58*sqrt(facing));
        vec3 color=mix(tint*.42,mix(tint,vec3(1.),.32),light);
        gl_FragColor=vec4(color,1.);
        #include <colorspace_fragment>
      }`
  }));
  scene.add(surface);
  const glow=new THREE.Mesh(new THREE.PlaneGeometry(5,5),new THREE.ShaderMaterial({
    transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,uniforms:{tint:{value:tint}},
    vertexShader:'varying vec2 uvAt;void main(){uvAt=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader:`varying vec2 uvAt;uniform vec3 tint;
      void main(){
        vec2 p=(uvAt-.5)*5.; float r=length(p);
        float a=atan(p.y,p.x);
        float ray=.85+.12*sin(a*9.+sin(a*5.))+.06*sin(a*31.);
        float glow=exp(-4.8*max(0.,r-1.))*smoothstep(.85,1.04,r)*(1.-smoothstep(1.38,2.48,r));
        gl_FragColor=vec4(tint,glow*ray*.38);
      }`
  }));
  scene.add(glow);
  const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
  const resize=()=>{
    const width=dialog.clientWidth,height=dialog.clientHeight;
    if(!width||!height)return;
    camera.aspect=width/height;
    camera.updateProjectionMatrix();
    renderer.setSize(width,height);
  };
  window.addEventListener('resize',resize);
  resize();
  const elapsedStart=performance.now();
  const flightDirection=camera.position.clone().normalize();
  let request,arrived=false;
  const zoom=factor=>{
    if(!arrived)return;
    camera.position.setLength(THREE.MathUtils.clamp(camera.position.length()*factor,controls.minDistance,controls.maxDistance));
    controls.update();
  };
  const [plus,minus]=dialog.querySelectorAll('.stellar-zoom button');
  plus.onclick=()=>zoom(.82);
  minus.onclick=()=>zoom(1/.82);
  dialog.querySelector('.stellar-return').onclick=()=>dialog.close();
  dialog.addEventListener('close',()=>{
    cancelAnimationFrame(request);
    window.removeEventListener('resize',resize);
    controls.dispose();
    for(const object of [surface,glow]){object.geometry.dispose();object.material.dispose();}
    renderer.dispose();
    renderer.forceContextLoss();
    dialog.remove();
    onReturn();
  },{once:true});
  function frame(now){
    const elapsed=(now-elapsedStart)/1000;
    const progress=reduce?1:Math.min(1,elapsed/2.45);
    if(!arrived){
      const eased=progress*progress*(3-2*progress);
      const tangent=Math.tan(THREE.MathUtils.degToRad(camera.fov/2));
      const end=Math.hypot(1,1/(.87*tangent*Math.min(1,camera.aspect)));
      camera.position.copy(flightDirection).multiplyScalar(94*Math.pow(end/94,eased));
      if(progress===1){
        arrived=true;
        controls.enabled=true;
        dialog.querySelector('.stellar-status').textContent='Yakın inceleme · Sürükle veya yakınlaştır';
      }
    }
    time.value=reduce?0:elapsed;
    controls.update();
    glow.quaternion.copy(camera.quaternion);
    renderer.render(scene,camera);
    request=requestAnimationFrame(frame);
  }
  request=requestAnimationFrame(frame);
  return dialog;
}

