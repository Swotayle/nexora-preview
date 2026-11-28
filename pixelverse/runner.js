import * as THREE from '../cosmora/vendor/three/build/three.module.js';
export function runner({runnerBoard,finish,hud,beep}){
  const renderer=new THREE.WebGLRenderer({antialias:true});
  renderer.setPixelRatio(Math.min(devicePixelRatio,1.6));
  runnerBoard.append(renderer.domElement);
  const scene=new THREE.Scene();
  const sky=document.createElement('canvas');
  sky.width=1024;sky.height=512;
  const g=sky.getContext('2d'), gradient=g.createLinearGradient(0,0,0,512);
  gradient.addColorStop(0,'#0e0a25');gradient.addColorStop(.46,'#291c4b');gradient.addColorStop(.72,'#4d315e');gradient.addColorStop(1,'#130e29');
  g.fillStyle=gradient;g.fillRect(0,0,1024,512);
  const texture=new THREE.CanvasTexture(sky);
  texture.colorSpace=THREE.SRGBColorSpace;scene.background=texture;
  scene.fog=new THREE.FogExp2(0x271b4a,.022);
  const camera=new THREE.PerspectiveCamera(57,16/9,.1,170);
  camera.position.set(0,5.6,9);camera.lookAt(0,0,-11);
  const box=new THREE.BoxGeometry(1,1,1),gem=new THREE.OctahedronGeometry(.52), bevel=new THREE.CylinderGeometry(.36,.51,1,8);
  const materials={road:new THREE.MeshBasicMaterial({color:0x1b2445}),line:new THREE.MeshBasicMaterial({color:0x7b56e5}),barrier:new THREE.MeshBasicMaterial({color:0xf2529b}),crystal:new THREE.MeshBasicMaterial({color:0x59fff1}),player:new THREE.MeshBasicMaterial({color:0x88ddff}),building:new THREE.MeshBasicMaterial({color:0x241e43}),lamp:new THREE.MeshBasicMaterial({color:0x9ee3ff}),trim:new THREE.MeshBasicMaterial({color:0x562958}),signal:new THREE.MeshBasicMaterial({color:0xffadcb})};
  function add(shape,material,x,y,z,sx=1,sy=1,sz=1){
    const mesh=new THREE.Mesh(shape,material);mesh.position.set(x,y,z);mesh.scale.set(sx,sy,sz);scene.add(mesh);return mesh;
  }
  add(box,materials.road,0,-.2,-55,10,.35,132);
  for(const x of [-4.9,-1.65,1.65,4.9])add(box,materials.line,x,0,-55,.05,.035,132);
  const strips=Array.from({length:24},(_,i)=>add(box,materials.line,0,0,8-i*5,10,.03,.03));
  const sides=Array.from({length:22},(_,i)=>{
    const h=2+(i*7%10);
    const tower=add(box,materials.building,(i%2?1:-1)*(7+i%3),h*.5,6-i*5,1.6,h,2.1);
    for(const tier of [-.32,-.08,.16,.39]){
      const ring=new THREE.Mesh(box,i%3?materials.trim:materials.lamp);
      ring.position.y=tier;ring.scale.set(1.04,.012,1.04);tower.add(ring);
    }
    return tower;
  });
  const player=new THREE.Group();scene.add(player);player.position.set(0,.55,1);
  const hull=new THREE.Mesh(bevel,materials.player);hull.scale.set(1.54,.5,2.15);player.add(hull);
  const cockpit=new THREE.Mesh(bevel,materials.line);cockpit.position.set(0,.29,-.15);cockpit.scale.set(.86,.25,1.1);player.add(cockpit);
  for(const x of [-.35,.35]){
    const engine=new THREE.Mesh(gem,materials.crystal);
    engine.position.set(x,-.06,.85);engine.scale.set(.19,.17,.62);player.add(engine);
  }
  function barrier(x){
    const group=new THREE.Group();
    group.position.set(x,0,-60);scene.add(group);
    for(const pos of [-.55,.55]){
      const shell=new THREE.Mesh(bevel,materials.barrier);
      shell.position.set(pos,.5,0);shell.scale.set(.87,1,.86);group.add(shell);
    }
    const strip=new THREE.Mesh(box,materials.signal);strip.position.set(0,.72,.42);strip.scale.set(1.5,.14,.11);group.add(strip);
    return group;
  }
  let lane=0,vertical=0,height=0,distance=0,energy=0,spawn=.3,ended=false,objects=[];
  const resize=()=>{
    const w=runnerBoard.clientWidth,h=runnerBoard.clientHeight;
    if(!w||!h)return;
    renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();
  };
  const observer=new ResizeObserver(resize);observer.observe(runnerBoard);resize();
  return {
    press(key){
      if(key==='left')lane=Math.max(-1,lane-1);
      if(key==='right')lane=Math.min(1,lane+1);
      if((key==='jump'||key==='up')&&height===0)vertical=8.8;
    },
    tick(dt){
      if(ended)return;
      const speed=Math.min(42,15+distance/65);
      distance+=dt*speed;
      player.position.x=THREE.MathUtils.damp(player.position.x,lane*3.3,15,dt);
      if(height>0||vertical>0){height=Math.max(0,height+vertical*dt);vertical-=22*dt;if(!height)vertical=0;}
      player.position.y=.55+height;
      player.rotation.z=(lane*3.3-player.position.x)*-.12;
      for(const strip of [...strips,...sides]){strip.position.z+=speed*dt;if(strip.position.z>10)strip.position.z-=strip.scale.x===10?120:110;}
      if((spawn-=dt)<=0){
        const slot=Math.floor(Math.random()*3)-1, crystal=Math.random()<.43;
        const mesh=crystal?add(gem,materials.crystal,slot*3.3,.9,-60):barrier(slot*3.3);
        objects.push({mesh,crystal});
        spawn=Math.max(.48,1.05-distance/1600);
      }
      for(const o of objects){
        const p=o.mesh.position;p.z+=dt*speed;
        if(o.crystal)o.mesh.rotation.y+=dt*4;
        if(Math.abs(p.z-1)<.95&&Math.abs(p.x-player.position.x)<1.18){
          if(o.crystal&&height<1.4){energy++;o.dead=true;beep(820,.095);}
          if(!o.crystal&&height<.94){ended=true;finish(Math.floor(distance)+energy*35,'Parkur bitti · '+Math.floor(distance)+' m · '+energy+' kristal');break;}
        }
      }
      objects=objects.filter(o=>{if(!o.dead&&o.mesh.position.z<12)return true;scene.remove(o.mesh);return false;});
      hud({Skor:Math.floor(distance)+energy*35,Mesafe:Math.floor(distance)+' m',Kristal:energy,Hız:Math.round(speed*3.6)+' km/sa'});
    },
    draw(){renderer.render(scene,camera);},
    destroy(){
      observer.disconnect();box.dispose();gem.dispose();bevel.dispose();texture.dispose();Object.values(materials).forEach(m=>m.dispose());renderer.dispose();renderer.domElement.remove();
    }
  };
}
