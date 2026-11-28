import * as T from 'three';
import {OrbitControls} from '../cosmora/vendor/three/examples/jsm/controls/OrbitControls.js';
import {lots,types} from './simulation.js';

export function createView(view,select,getCity){
  const renderer=new T.WebGLRenderer({antialias:true,powerPreference:'high-performance'});
  renderer.outputColorSpace=T.SRGBColorSpace;
  view.append(renderer.domElement);
  const canvas=renderer.domElement,scene=new T.Scene(),camera=new T.PerspectiveCamera(48,1,.1,170);
  const controls=new OrbitControls(camera,canvas);
  controls.enableDamping=true;controls.dampingFactor=.14;controls.minDistance=2.7;controls.maxDistance=105;controls.maxPolarAngle=Math.PI*.49;
  const day=new T.Color(0x82adcb),night=new T.Color(0x080d25),sky=night.clone();
  scene.background=sky;scene.fog=new T.Fog(sky,50,135);
  const skyLight=new T.HemisphereLight(0xaad9fc,0x344c4c,2);
  const sun=new T.DirectionalLight(0xffedd0,2.2);
  sun.position.set(-18,38,25);scene.add(skyLight,sun);
  sun.shadow.mapSize.set(1024,1024);
  Object.assign(sun.shadow.camera,{left:-33,right:33,top:33,bottom:-33,near:1,far:88});
  sun.shadow.normalBias=.05;
  const cityLayer=new T.Group(), dynamic=new T.Group();scene.add(cityLayer,dynamic);
  const cube=new T.BoxGeometry(1,1,1), cone=new T.ConeGeometry(1,1,6), bowl=new T.CylinderGeometry(1,1,1,12), torus=new T.TorusGeometry(1,.08,7,24);
  const makeMat=(color,emissive=0)=>new T.MeshStandardMaterial({color,emissive,roughness:.73,metalness:.15});
  const road=makeMat(0x222b3c),grass=makeMat(0x1d594e),paving=makeMat(0x46596c),dirt=makeMat(0x223d46);
  const line=new T.MeshBasicMaterial({color:0x8f86b4}),stroke=new T.MeshBasicMaterial({color:0x81ffe0}),tree=makeMat(0x338964),trunk=makeMat(0x65524b),steel=makeMat(0xa6becb),water=makeMat(0x55dfc9,0x10595e);
  const carPaint=[0x77e7fe,0xf5b98a,0xb58afa,0x5bfff0].map(c=>makeMat(c,c));
  const facades={}, accents={},rotors=[], sites=[];
  function mesh(group,geometry,material,x,y,z,sx=1,sy=1,sz=1){
    const object=new T.Mesh(geometry,material);
    object.position.set(x,y,z);object.scale.set(sx,sy,sz);group.add(object);return object;
  }
  const floor=mesh(scene,cube,dirt,0,-.19,0,238,.3,238);
  floor.receiveShadow=true;
  for(let i=0;i<=6;i++){
    const p=(i-3)*9;
    mesh(scene,cube,road,p,.008,0,2.8,.08,56).receiveShadow=true;
    mesh(scene,cube,road,0,.009,p,56,.08,2.8).receiveShadow=true;
    for(let j=0;j<6;j++){
      const segment=(j-2.5)*9;
      mesh(scene,cube,line,p,.055,segment,.044,.014,3.8);
      mesh(scene,cube,line,segment,.056,p,3.8,.014,.044);
    }
  }
  const gridMaterial=new T.MeshBasicMaterial({color:0x6c97af,wireframe:true,transparent:true,opacity:.22});
  for(const lot of lots){
    const tile=mesh(cityLayer,cube,paving,lot.x,.095,lot.z,5.9,.17,5.9);
    tile.userData.id=lot.id;tile.receiveShadow=true;sites.push(tile);
    mesh(cityLayer,cube,gridMaterial,lot.x,.1,lot.z,5.92,.175,5.92);
  }
  const highlight=new T.Group();scene.add(highlight);highlight.visible=false;
  for(const side of [-1,1]){
    mesh(highlight,cube,stroke,side*2.94,.2,0,.075,.033,5.9);
    mesh(highlight,cube,stroke,0,.2,side*2.94,5.9,.033,.075);
  }
  const cars=Array.from({length:12},(_,i)=>{
    const body=mesh(dynamic,cube,carPaint[i%4],0,.28,0,.75,.37,1.44);
    mesh(body,cube,steel,0,.55,.02,.72,.6,.57);
    return {body,horizontal:i%2===0,lane:(Math.floor(i/2)%6-2)*9+(i%4===0?.68:-.68),phase:i*4.1,direction:i%4<2?1:-1};
  });
  const lanterns=new T.InstancedMesh(cube,makeMat(0x76d3ef,0x4bdcff),49);
  const matrix=new T.Matrix4();
  let n=0;
  for(let x=-3;x<=3;x++)for(let z=-3;z<=3;z++){
    matrix.makeScale(.19,.22,.19).setPosition(x*9+1.9,1.28,z*9+1.9);lanterns.setMatrixAt(n++,matrix);
    mesh(scene,cube,steel,x*9+1.9,.62,z*9+1.9,.06,1.2,.06);
  }
  scene.add(lanterns);
  function facade(type){
    if(facades[type])return facades[type];
    const paint=document.createElement('canvas');paint.width=64;paint.height=96;
    const g=paint.getContext('2d');g.fillStyle='#152c44';g.fillRect(0,0,64,96);
    const tiles=document.createElement('canvas');tiles.width=64;tiles.height=96;
    const glow=tiles.getContext('2d');glow.fillStyle='#000';glow.fillRect(0,0,64,96);
    const color=new T.Color(types[type].color).getStyle();
    for(let y=7;y<94;y+=12)for(let x=6;x<62;x+=10){
      const lit=(x*17+y*11)%9<6;
      g.fillStyle=lit?color:'#29465d';g.globalAlpha=lit?.79:1;g.fillRect(x,y,6,5);
      if(lit){glow.fillStyle=color;glow.fillRect(x,y,6,5);}
    }
    const tex=new T.CanvasTexture(paint),litTex=new T.CanvasTexture(tiles);
    tex.colorSpace=litTex.colorSpace=T.SRGBColorSpace;
    tex.anisotropy=litTex.anisotropy=Math.min(4,renderer.capabilities.getMaxAnisotropy());
    return facades[type]=new T.MeshStandardMaterial({map:tex,emissiveMap:litTex,emissive:0xffffff,roughness:.68,metalness:.42});
  }
  function accent(type){return accents[type]??=makeMat(types[type].color,types[type].color);}
  const buildingMeshes=new Map(), pickables=[];
  function decorate(group,type,level){
    const t=types[type],color=accent(type), h=t.height+(level-1)*1.7;
    if(type==='homes'||type==='offices'){
      const width=type==='homes'?3.25:3.75;
      const glass=facade(type), façade=[glass,glass,steel,steel,glass,glass];
      const base=mesh(group,cube,façade,0,h*.5,0,width,h,3.15);
      base.castShadow=base.receiveShadow=true;
      mesh(group,cube,color,0,h+.045,0,width+.10,.12,3.3);
      mesh(group,cube,glass,.35,h+.42,.12,width*.58,.8,1.8).castShadow=true;
      if(type==='offices')mesh(group,cube,color,.8,h+1.25,.2,.085,1.8,.085);
    }else if(type==='solar'){
      for(const x of [-1.5,0,1.5])for(const z of [-1.3,1.3]){
        mesh(group,cube,steel,x,.43,z,.14,.71,.14);
        const panel=mesh(group,cube,color,x,.84,z,1.22,.09,1.35);panel.rotation.x=-.35;
        for(const u of [-.38,0,.38]){const beam=mesh(group,cube,steel,x+u,.895,z,.025,.014,1.35);beam.rotation.x=-.35;}
      }
    }else if(type==='wind'){
      mesh(group,bowl,steel,0,h*.49,0,.14,h,.14);
      const hub=new T.Group();hub.position.set(0,h,.18);group.add(hub);rotors.push(hub);
      mesh(hub,bowl,color,0,0,0,.33,.33,.33).rotation.x=Math.PI/2;
      for(let i=0;i<3;i++){
        const blade=new T.Group();blade.rotation.z=i*Math.PI*2/3;hub.add(blade);
        mesh(blade,cube,steel,0,1.05,0,.12,1.65,.075);
      }
    }else if(type==='water'){
      for(const x of [-1.25,1.25]){
        mesh(group,bowl,steel,x,.9,0,.9,1.8,.9).castShadow=true;
        mesh(group,bowl,water,x,1.86,0,.84,.13,.84);
      }
      mesh(group,cube,color,0,.65,-1.4,3.3,1.3,.45);
    }else if(type==='park'){
      mesh(group,cube,grass,0,.03,0,5.5,.1,5.5);
      for(const [x,z] of [[-1.6,-1.5],[1.6,-1.4],[-1.5,1.55],[1.5,1.45]]){
        mesh(group,bowl,trunk,x,.52,z,.13,1,.13);
        mesh(group,cone,tree,x,1.28,z,.8,1.45,.8).castShadow=true;
      }
      mesh(group,cube,steel,0,.12,0,.36,.04,5.2);
    }else{
      mesh(group,bowl,steel,0,.13,0,2.3,.22,2.3).receiveShadow=true;
      mesh(group,bowl,water,0,.28,0,1.65,.14,1.65);
      const sculpture=mesh(group,torus,color,0,1.64,0,1.13,1.13,1.13);sculpture.rotation.y=.65;
    }
  }
  function sync(city){
    for(const lot of lots){
      const value=city.lots[lot.id],old=buildingMeshes.get(lot.id),key=value?value.type+value.level:'';
      if(old?.userData.key===key)continue;
      if(old){cityLayer.remove(old);buildingMeshes.delete(lot.id);}
      if(!value)continue;
      const group=new T.Group();group.position.set(lot.x,.18,lot.z);group.userData={id:lot.id,key};
      decorate(group,value.type,value.level);cityLayer.add(group);buildingMeshes.set(lot.id,group);
    }
    for(let i=rotors.length-1;i>=0;i--)if(!rotors[i].parent?.parent)rotors.splice(i,1);
    pickables.splice(0,pickables.length,...sites,...buildingMeshes.values());
  }
  function mark(id){
    highlight.visible=id!==null;
    if(highlight.visible)highlight.position.set(lots[id].x,0,lots[id].z);
  }
  let mode='overview', quality, frameTime=0, elapsed=0,last=performance.now(),lastDraw=0,dirty=true;
  const held=new Set(), keyMap={ArrowLeft:'left',KeyA:'left',ArrowRight:'right',KeyD:'right',ArrowUp:'up',KeyW:'up',ArrowDown:'down',KeyS:'down'};
  const vector=new T.Vector3(),side=new T.Vector3();
  function resize(){
    const width=view.clientWidth,height=view.clientHeight;
    if(width<=0||height<=0)return;
    renderer.setSize(width,height,false);camera.aspect=width/height;camera.updateProjectionMatrix();dirty=true;
  }
  new ResizeObserver(resize).observe(view);
  function setQuality(next){
    quality=next;renderer.setPixelRatio(next==='low'?1:Math.min(devicePixelRatio,next==='high'?2:1.35));
    renderer.shadowMap.enabled=next==='high';
    sun.castShadow=next==='high';
    lanterns.visible=next!=='low';
    cars.forEach((car,i)=>{car.body.visible=i<(next==='low'?4:next==='medium'?8:12);});
    renderer.shadowMap.needsUpdate=true;resize();
  }
  function setMode(next,id){
    mode=next;
    if(mode==='overview'){
      controls.enablePan=true;controls.maxPolarAngle=Math.PI*.49;
      controls.target.set(0,0,0);camera.position.set(41,45,47);
    }else{
      const lot=lots[id]??{x:-4.5,z:-4.5},x=lot.x-4.5,z=lot.z+2.7;
      controls.enablePan=false;controls.maxPolarAngle=Math.PI*.60;
      camera.position.set(x,1.75,z);controls.target.set(x+3.1,1.85,z-2.8);
    }
    controls.update();dirty=true;
  }
  controls.addEventListener('change',()=>{dirty=true;});
  function zoom(factor){
    vector.copy(camera.position).sub(controls.target);
    const size=T.MathUtils.clamp(vector.length()*factor,controls.minDistance,controls.maxDistance);
    camera.position.copy(controls.target).add(vector.setLength(size));controls.update();dirty=true;
  }
  function hold(direction,on){if(on)held.add(direction);else held.delete(direction);}
  view.addEventListener('keydown',e=>{const what=keyMap[e.code];if(what){e.preventDefault();hold(what,true);}});
  window.addEventListener('keyup',e=>hold(keyMap[e.code],false));
  window.addEventListener('blur',()=>held.clear());
  const pointer=new T.Vector2(), ray=new T.Raycaster();
  let tap, touches=new Set();
  canvas.addEventListener('pointerdown',e=>{
    touches.add(e.pointerId);
    tap=touches.size===1?{x:e.clientX,y:e.clientY,id:e.pointerId}:null;
    view.focus({preventScroll:true});
  });
  canvas.addEventListener('pointercancel',e=>{touches.delete(e.pointerId);tap=null;});
  canvas.addEventListener('pointerup',e=>{
    touches.delete(e.pointerId);
    if(tap?.id!==e.pointerId||Math.hypot(e.clientX-tap.x,e.clientY-tap.y)>7)return;
    tap=null;
    const rect=canvas.getBoundingClientRect();
    pointer.set((e.clientX-rect.left)*2/rect.width-1,1-(e.clientY-rect.top)*2/rect.height);
    ray.setFromCamera(pointer,camera);
    let hit=ray.intersectObjects(pickables,true)[0]?.object;
    while(hit&&hit.userData.id===undefined)hit=hit.parent;
    if(hit)select(hit.userData.id);
  });
  function draw(now){
    requestAnimationFrame(draw);
    const dt=Math.min(.065,(now-last)/1000);last=now;
    if(document.hidden)return;
    const city=getCity();
    elapsed+=dt;
    if(held.size){
      camera.getWorldDirection(vector);vector.y=0;vector.normalize();side.crossVectors(vector,camera.up).normalize();
      const velocity=mode==='street'?8:15;
      const forwards=Number(held.has('up'))-Number(held.has('down')), lateral=Number(held.has('right'))-Number(held.has('left'));
      side.multiplyScalar(lateral*dt*velocity).addScaledVector(vector,forwards*dt*velocity);
      const boundary=mode==='street'?43:88;
      if(Math.abs(camera.position.x+side.x)<boundary&&Math.abs(camera.position.z+side.z)<boundary){camera.position.add(side);controls.target.add(side);}
      dirty=true;
    }
    controls.update(dt);
    if(now-lastDraw<(quality==='low'?42:quality==='medium'?26:16))return;
    frameTime+=dt;
    if(!dirty&&city.paused&&frameTime<.07)return;
    frameTime=0;lastDraw=now;dirty=false;
    const phase=city.light==='day'?.46:city.light==='night'?.91:city.phase;
    const daylight=T.MathUtils.smoothstep(Math.sin(phase*2*Math.PI-Math.PI/2),-.33,.53);
    sky.copy(night).lerp(day,daylight);scene.fog.color.copy(sky);
    skyLight.intensity=.50+daylight*1.9;sun.intensity=.12+daylight*2.1;
    for(const material of Object.values(facades))material.emissiveIntensity=1.9-daylight*1.72;
    for(const material of Object.values(accents))material.emissiveIntensity=.75-daylight*.63;
    lanterns.material.emissiveIntensity=1.55-daylight*1.35;
    for(const car of cars){
      const a=((elapsed*3.3*car.direction+car.phase)%58+58)%58-29;
      car.body.position.x=car.horizontal?a:car.lane;
      car.body.position.z=car.horizontal?car.lane:a;
      car.body.rotation.y=car.horizontal?Math.PI/2:0;
    }
    for(const rotor of rotors)rotor.rotation.z=elapsed*2.15;
    renderer.render(scene,camera);
  }
  setMode('overview');resize();requestAnimationFrame(draw);
  return {sync,mark,setMode,setQuality,zoom,hold};
}
