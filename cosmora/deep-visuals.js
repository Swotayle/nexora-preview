import * as THREE from 'three';
import { galaxies, nebulae, stellarProfiles, blackHoles, seededRandom } from './deep-profiles.mjs';
import { qualityProfile } from './deep-math.mjs';

const tau = Math.PI * 2;
const noise = `
float hash(vec3 p) { return fract(sin(dot(p, vec3(127.1,311.7,74.7))) * 43758.5453); }
float grain(vec3 p) {
  vec3 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f);
  return mix(mix(mix(hash(i),hash(i+vec3(1,0,0)),f.x),
    mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),
    mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),
    mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y),f.z);
}
`;
const vertex = `
varying vec3 local;
varying vec3 eyeNormal;
varying vec3 eyeDirection;
void main() {
  local = position;
  vec4 viewPosition = modelViewMatrix * vec4(position,1.0);
  eyeNormal = normalize(normalMatrix * normal);
  eyeDirection = -viewPosition.xyz;
  gl_Position = projectionMatrix * viewPosition;
}
`;
function shader(fragment, values, options = {}) {
  return new THREE.ShaderMaterial({
    vertexShader: vertex, fragmentShader: `varying vec3 local;
      varying vec3 eyeNormal; varying vec3 eyeDirection; ${noise} ${fragment}`,
    uniforms: Object.fromEntries(Object.entries(values).map(([key, value]) => [key, {value}])),
    ...options
  });
}
const additive = {transparent: true, depthWrite: false, blending: THREE.AdditiveBlending};
function sphere(radius, detail, material) {
  return new THREE.Mesh(new THREE.SphereGeometry(radius, detail, Math.max(12, Math.floor(detail * .65))), material);
}
function halo(radius, color, strength, detail) {
  return sphere(radius, detail, shader(`
    uniform vec3 tint; uniform float strength;
    void main() {
      float limb = 1.0-abs(dot(normalize(eyeNormal),normalize(eyeDirection)));
      gl_FragColor=vec4(tint, pow(limb,2.8)*strength);
    }`, {tint:new THREE.Color(color), strength}, additive));
}

function makeGalaxy(id, profile, quality, random) {
  const group = new THREE.Group();
  const vertices = new Float32Array(quality.particles * 3);
  const colors = new Float32Array(vertices.length);
  const warm = new THREE.Color(0xffcb8c), cool = new THREE.Color(profile.tint), white = new THREE.Color(0xffffff);
  for (let index = 0; index < quality.particles; index++) {
    const fraction = random();
    const phase = random() * tau;
    let distance = 2 + 20 * Math.sqrt(random());
    let angle = profile.arms ? Math.log1p(distance / 3) * profile.twist + index % profile.arms * tau / profile.arms + (random() - .5) * .52 : phase;
    let x = Math.cos(angle) * distance;
    let z = Math.sin(angle) * distance;
    let y = (random() + random() - 1) * profile.thickness;
    let color = cool.clone().lerp(white, random() * .65);
    if (fraction < .24) {
      distance = Math.pow(random(), 1.75) * profile.bulge * 2.2;
      const latitude = random() * 2 - 1;
      const flat = Math.sqrt(1 - latitude * latitude) * distance;
      x = Math.cos(phase) * flat;
      z = Math.sin(phase) * flat * .73;
      y = latitude * distance * (id === 'sombrero' ? .78 : .46);
      color = warm.clone().lerp(white, random() * .7);
    } else if (profile.bar && fraction < .33) {
      x = (random() * 2 - 1) * profile.bar;
      z = (random() + random() - 1) * 1.45;
      color = warm.clone();
    } else if (profile.companion && fraction > .92) {
      x = 15 + Math.cos(phase) * random() * 4;
      z = 13 + Math.sin(phase) * random() * 4;
      y *= 2;
      color = warm.clone().lerp(white, random());
    } else {
      const dustLane = .5 + .5 * Math.sin(distance * .86 + angle * 1.7);
      color.multiplyScalar(1 - profile.dust * dustLane ** 5);
    }
    vertices.set([x,y,z],index*3);
    color.toArray(colors,index*3);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.BufferAttribute(vertices,3));
  geometry.setAttribute('color',new THREE.BufferAttribute(colors,3));
  const stars = new THREE.Points(geometry,new THREE.PointsMaterial({size:.16,vertexColors:true,opacity:.84,...additive}));
  group.add(stars);
  group.userData.points = stars;
  const core = sphere(profile.bulge * 2.2, quality.detail, shader('void main(){float facing=abs(dot(normalize(eyeNormal),normalize(eyeDirection)));gl_FragColor=vec4(1.0,.74,.48,.3*pow(facing,5.0));}',{},additive));
  core.scale.set(1,.61,.8);
  group.add(core);
  const disk = new THREE.Mesh(new THREE.RingGeometry(.5,23,quality.detail * 2), shader(`
    uniform vec3 tint; uniform float dust; uniform float arms; uniform float twist;
    void main(){
      float r=length(local.xy), a=atan(local.y,local.x);
      float strand=.5+.5*cos(arms*(a-twist*log(1.0+r/3.0)));
      float lanes=mix(1.0,pow(strand,3.0),step(.1,arms));
      float band=pow(.5+.5*cos(r*.87),8.0);
      float n=grain(local*.45);
      float light=exp(-r*.08)*(0.19+0.81*lanes)*(1.0-band*dust)*(.35+n*.65);
      gl_FragColor=vec4(tint,light*.37*(1.0-smoothstep(18.0,23.0,r)));
    }`,
    {tint:cool,dust:profile.dust,arms:profile.arms,twist:profile.twist},{...additive,side:THREE.DoubleSide}));
  disk.rotation.x = -Math.PI / 2;
  group.add(disk);
  group.rotation.set(id === 'sombrero' ? .12 : .42, .24, id === 'andromeda' ? -.35 : .12);
  return group;
}

function makeNebula(profile, quality) {
  const group = new THREE.Group();
  for (let layer = 0; layer < quality.layers; layer++) {
    const material = shader(`
      uniform vec3 tint; uniform vec3 edge; uniform float style; uniform float layer;
      void main(){
        vec3 p=local/8.0; float r=length(p);
        float n=grain(p*5.0+vec3(layer*1.7));
        float fine=grain(p*13.0+vec3(style));
        float field=0.0;
        if(style<.5){
          float wings=abs(p.x)*.66+.16;
          field=exp(-9.0*abs(abs(p.y)-wings))*exp(-2.8*abs(p.x));
          field+=.7*exp(-12.0*r*r);
        }else if(style<1.5){
          float pillars=exp(-90.0*pow(abs(p.x+.27+p.y*.17),2.0))+exp(-110.0*pow(abs(p.x-.13-p.y*.12),2.0))+exp(-170.0*pow(abs(p.x-.42),2.0));
          field=.18+pillars*.48*(1.0-smoothstep(.28,.95,p.y));
        }else if(style<2.5){
          float filament=abs(sin(18.0*p.x+17.0*p.y+n*5.0)*sin(13.0*p.z-11.0*p.y));
          field=pow(filament,4.0)*.9+.35*exp(-2.5*r);
        }else if(style<3.5){
          float ring=length(vec2(p.x,p.y));
          field=exp(-33.0*pow(abs(ring-.58),2.0))*(.35+.65*(1.0-abs(p.z)));
        }else{
          float neck=1.0-smoothstep(.08,.21,abs(p.x+.17+p.y*.22));
          float head=1.0-smoothstep(.15,.30,length(p.xy-vec2(.06,.26)));
          field=(.55+.45*n)*(1.0-max(neck*(1.0-smoothstep(.10,.28,p.y)),head))*(.35+.65*exp(-2.0*abs(p.x-.2)));
        }
        float limb=.35+.65*abs(dot(normalize(eyeNormal),normalize(eyeDirection)));
        float density=clamp(field*(.23+n*.67+fine*.19)*limb,0.0,1.0);
        gl_FragColor=vec4(mix(edge,tint,smoothstep(.22,.74,n)),density*OPACITY);
      }`.replace('OPACITY', (0.88 / quality.layers).toFixed(4)), {
      style:profile.shape,layer,tint:new THREE.Color(profile.tint),edge:new THREE.Color(profile.edge)
    },{...additive,side:THREE.DoubleSide});
    const shell = sphere(5.0 + layer * 2.65 / (quality.layers - 1), quality.detail, material);
    shell.scale.fromArray(profile.spread);
    shell.rotation.x = profile.shape === 3 ? .28 : layer * .16;
    shell.rotation.z = profile.shape === 4 ? -.12 : layer * .11;
    group.add(shell);
  }
  if (profile.shape !== 4) {
    const nucleus = sphere(profile.shape === 3 ? .18 : .26, 16,new THREE.MeshBasicMaterial({color:0xe9efff}));
    group.add(nucleus);
  }
  return group;
}

function makeStar(id, magnitude, quality, clock, random) {
  const group = new THREE.Group();
  const profile = stellarProfiles[id];
  if (!profile) {
    const radius = THREE.MathUtils.clamp(1.65 - (magnitude ?? 3) * .17,.60,1.9);
    group.add(sphere(radius,12,new THREE.MeshBasicMaterial({color:0xffedc8})));
    return group;
  }
  const tint = new THREE.Color(profile.color);
  const body = sphere(profile.radius,quality.detail,shader(`
    uniform vec3 tint; uniform float time; uniform float frequency; uniform float activity; uniform float detail;
    void main(){
      vec3 p=normalize(local)*frequency+vec3(time*activity*.24,0.0,-time*.14);
      float large=grain(p+vec3(grain(p*.52)*2.0));
      float small=detail>0.01 ? grain(p*2.7) : large;
      float convection=smoothstep(.13,.78,mix(large,small,detail*.36));
      float limb=clamp(dot(normalize(eyeNormal),normalize(eyeDirection)),0.0,1.0);
      vec3 color=mix(tint*.34,mix(tint,vec3(1.0),.46),convection)*(.65+.48*sqrt(limb));
      gl_FragColor=vec4(color,1.0);
    }`,{tint,time:clock.value,frequency:profile.grain,activity:profile.activity,detail:0}));
  body.material.uniforms.time = clock;
  body.scale.y = profile.flatten ?? 1;
  group.add(body,halo(profile.radius*1.23,profile.color,.56,quality.detail));
  group.userData.detailMaterial = body.material;
  const flares = new THREE.Group();
  for (let i=0; i<Math.min(profile.flares,quality.layers+1); i++) {
    const angle=random()*tau;
    const arc = new THREE.TorusGeometry(profile.radius*(.22+random()*.19), .024, 5, 24, Math.PI*1.27);
    const loop = new THREE.Mesh(arc,new THREE.MeshBasicMaterial({color:profile.color,opacity:.52,...additive}));
    loop.position.set(Math.cos(angle)*profile.radius*.90,(random()-.5)*profile.radius,Math.sin(angle)*profile.radius*.90);
    loop.rotation.set(angle,.8,angle*.5);
    flares.add(loop);
  }
  group.add(flares);
  group.userData.flares=flares;
  group.userData.activity=profile.activity;
  if (profile.companion) {
    const companion=sphere(.36,16,new THREE.MeshBasicMaterial({color:0xe2f4ff}));
    companion.position.set(3.2,.65,.7); group.add(companion);
  }
  return group;
}

function makeHole(profile, quality, clock) {
  const group = new THREE.Group();
  group.rotation.z = profile.tilt;
  group.add(sphere(2.2,quality.detail,new THREE.MeshBasicMaterial({color:0x010104})));
  const disk = new THREE.Mesh(new THREE.RingGeometry(2.6,profile.outer,quality.detail*3),shader(`
    uniform float time; uniform float speed; uniform float outer; uniform vec3 heat;
    void main(){
      float r=length(local.xy), a=atan(local.y,local.x);
      float t=clamp((r-2.6)/(outer-2.6),0.0,1.0);
      float streak=.5+.5*sin(a*7.0+log(r)*29.0-time*speed*(3.0-t));
      float gas=grain(vec3(cos(a)*4.0,sin(a)*4.0,r*2.0-time*speed*.3));
      vec3 color=mix(vec3(1.0,.94,.79),heat,smoothstep(0.0,.64,t));
      float fade=smoothstep(0.0,.08,t)*(1.0-smoothstep(.56,1.0,t));
      gl_FragColor=vec4(color,fade*(.38+streak*.35+gas*.27));
    }`,{time:clock.value,speed:profile.speed,outer:profile.outer,heat:new THREE.Color(profile.heat)},{...additive,side:THREE.DoubleSide}));
  disk.material.uniforms.time=clock;
  disk.rotation.x=-Math.PI/2;
  group.add(disk);
  // Angle-dependent arcs evoke lensing without warping or tracing background light rays.
  const lens = sphere(2.63,quality.detail,shader(`
    uniform vec3 heat; uniform float time;
    void main(){
      float limb=1.0-abs(dot(normalize(eyeNormal),normalize(eyeDirection)));
      float arc=.34+.66*pow(abs(sin(atan(local.y,local.x)+time*.18)),1.4);
      gl_FragColor=vec4(mix(heat,vec3(.77,.88,1.0),arc),pow(limb,7.0)*arc*.82);
    }`,{heat:new THREE.Color(profile.heat),time:clock.value},additive));
  lens.material.uniforms.time=clock;
  group.add(lens);
  if(profile.jet){
    for(const direction of [-1,1]){
      const material=shader(`
        uniform float time; uniform float lengthY;
        void main(){
          float t=clamp(local.y/lengthY+.5,0.0,1.0);
          float ripples=.65+.35*cos(t*32.0-time*2.0);
          gl_FragColor=vec4(.32,.55,1.0,(1.0-t)*ripples*.43);
        }`,{time:clock.value,lengthY:profile.jet},additive);
      material.uniforms.time=clock;
      const jet=new THREE.Mesh(new THREE.ConeGeometry(1.25,profile.jet,quality.detail,1,true),material);
      jet.position.y=direction*(profile.jet*.5+2.3);
      if(direction<0) jet.rotation.x=Math.PI;
      group.add(jet);
    }
  }
  return group;
}

export function createDeepModel(item, level, clock) {
  const quality = qualityProfile(level);
  const random = seededRandom(item.id);
  if (Object.hasOwn(galaxies,item.id)) return makeGalaxy(item.id,galaxies[item.id],quality,random);
  if (Object.hasOwn(nebulae,item.id)) return makeNebula(nebulae[item.id],quality);
  if (Object.hasOwn(blackHoles,item.id)) return makeHole(blackHoles[item.id],quality,clock);
  return makeStar(item.id,item.magnitude,quality,clock,random);
}

