const W=800,H=450;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const near=(a,b,r)=>Math.hypot(a.x-b.x,a.y-b.y)<r;
const rand=(min,max)=>min+Math.random()*(max-min);
function dot(ctx,x,y,r,color){
  ctx.beginPath();ctx.fillStyle=color;ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();
}
const stars=Array.from({length:104},()=>({x:rand(0,W),y:rand(0,H),r:rand(.4,1.3)}));
export function space({ctx,keys,finish,hud,beep}){
  const ship={x:400,y:370};
  let time=0,score=0,health=3,shield=2,rapid=0,spawn=.6,shot=0,iframes=0;
  let enemies=[],bullets=[],boosts=[],ended=false;
  return {
    tick(dt){
      if(ended)return;
      time+=dt;shot-=dt;spawn-=dt;rapid-=dt;iframes-=dt;
      ship.x=clamp(ship.x+(Number(keys.has('right'))-Number(keys.has('left')))*310*dt,20,W-20);
      ship.y=clamp(ship.y+(Number(keys.has('down'))-Number(keys.has('up')))*270*dt,20,H-20);
      if(keys.has('fire')&&shot<=0){bullets.push({x:ship.x,y:ship.y-17});shot=rapid>0?.12:.27;beep(400,.035);}
      if(spawn<=0){
        const drone=Math.random()<.32;
        enemies.push({x:rand(25,W-25),y:-25,r:drone?17:rand(11,24),v:rand(95,170)+time*2.3,drone,phase:rand(0,7)});
        spawn=Math.max(.24,.9-time*.012);
      }
      for(const bullet of bullets)bullet.y-=510*dt;
      for(const enemy of enemies){
        enemy.y+=enemy.v*dt;
        if(enemy.drone)enemy.x=clamp(enemy.x+Math.sin(time*4+enemy.phase)*85*dt,20,W-20);
        const hit=bullets.find(b=>!b.dead&&near(b,enemy,enemy.r+4));
        if(hit){
          hit.dead=true;enemy.dead=true;score+=enemy.drone?20:10;
          if(Math.random()<.24)boosts.push({x:enemy.x,y:enemy.y,type:Math.random()<.55?'shield':'rapid'});
        }else if(iframes<=0&&near(ship,enemy,enemy.r+13)){
          enemy.dead=true;iframes=1.05;
          if(shield>0)shield--;else health--;
          beep(120,.14);
        }
      }
      for(const boost of boosts){
        boost.y+=100*dt;
        if(near(ship,boost,22)){boost.dead=true;if(boost.type==='shield')shield=Math.min(3,shield+1);else rapid=7;beep(820,.12);}
      }
      bullets=bullets.filter(b=>b.y>-10&&!b.dead);
      enemies=enemies.filter(b=>b.y<H+30&&!b.dead);
      boosts=boosts.filter(b=>b.y<H+20&&!b.dead);
      const points=score+Math.floor(time);
      hud('Skor '+points+' · Can '+health+' · Kalkan '+shield+' · '+Math.floor(time)+' sn'+(rapid>0?' · Seri ateş':''));
      if(health<=0){ended=true;finish(points,'Gemi kaybedildi');}
    },
    draw(){
      ctx.fillStyle='#070d23';ctx.fillRect(0,0,W,H);
      for(const star of stars)dot(ctx,star.x,(star.y+time*34)%H,star.r,'#728bc3');
      for(const enemy of enemies){
        ctx.save();ctx.translate(enemy.x,enemy.y);ctx.rotate(time*(enemy.drone?-1.2:.8));
        ctx.fillStyle=enemy.drone?'#ff5397':'#8a697b';ctx.strokeStyle=enemy.drone?'#ffd6eb':'#d5b4bf';ctx.lineWidth=2;
        ctx.beginPath();
        for(let i=0;i<7;i++){const phase=i*Math.PI*2/7,r=enemy.r*(i%2?.78:1);ctx.lineTo(Math.cos(phase)*r,Math.sin(phase)*r);}
        ctx.closePath();ctx.fill();ctx.stroke();ctx.restore();
      }
      for(const b of bullets){ctx.fillStyle='#8ffff2';ctx.fillRect(b.x-2,b.y-8,4,12);}
      for(const b of boosts){dot(ctx,b.x,b.y,9,b.type==='shield'?'#77f8ff':'#ffd576');}
      if(iframes>0&&Math.floor(iframes*14)%2)return;
      if(shield>0){ctx.strokeStyle='#63eaff';ctx.beginPath();ctx.arc(ship.x,ship.y,21,0,Math.PI*2);ctx.stroke();}
      ctx.fillStyle='#c2edff';ctx.beginPath();ctx.moveTo(ship.x,ship.y-17);ctx.lineTo(ship.x+15,ship.y+13);ctx.lineTo(ship.x,ship.y+7);ctx.lineTo(ship.x-15,ship.y+13);ctx.closePath();ctx.fill();
      dot(ctx,ship.x,ship.y+2,4,'#756aff');
    }
  };
}

const symbols=['✦','⬡','◇','☾','♜','☉','◆','▲','♫','✚','◈','✿'];
function shuffle(items){
  for(let i=items.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[items[i],items[j]]=[items[j],items[i]];}
  return items;
}
export function memory({memoryBoard,level,finish,hud,beep}){
  const pairCount={easy:6,medium:8,hard:12}[level];
  const labels=shuffle([...symbols.slice(0,pairCount),...symbols.slice(0,pairCount)]);
  let time=0,moves=0,found=0,close=0,open=[],cursor=0,ended=false;
  memoryBoard.style.setProperty('--columns',pairCount===12?6:4);
  const cards=labels.map((label,i)=>{
    const b=document.createElement('button');b.type='button';b.className='memory-card';b.textContent='✧';b.setAttribute('aria-label','Kapalı kart '+(i+1));
    b.onclick=()=>flip(i);memoryBoard.append(b);return b;
  });
  function reveal(i,show){
    cards[i].dataset.open=show;cards[i].textContent=show?labels[i]:'✧';cards[i].setAttribute('aria-label',show?'Açık kart '+labels[i]:'Kapalı kart '+(i+1));
  }
  function flip(i){
    if(ended||close>0||open.includes(i)||cards[i].disabled)return;
    cursor=i;open.push(i);reveal(i,true);beep(500,.04);
    if(open.length<2)return;
    moves++;
    if(labels[open[0]]!==labels[open[1]]){close=.65;return;}
    for(const index of open){cards[index].dataset.match='true';cards[index].disabled=true;}
    open=[];found++;beep(740,.09);
    if(found===pairCount){ended=true;finish(Math.max(1,pairCount*150-moves*8-Math.floor(time)*2),'Tüm çiftler bulundu · '+moves+' hamle · '+Math.floor(time)+' sn');}
  }
  return {
    tick(dt){
      if(ended)return;
      time+=dt;
      if(close>0&&(close-=dt)<=0){for(const i of open)reveal(i,false);open=[];}
      hud(found+'/'+pairCount+' çift · '+moves+' hamle · '+Math.floor(time)+' sn');
    },
    press(key){
      const cols=pairCount===12?6:4;
      const offset={left:-1,right:1,up:-cols,down:cols}[key];
      if(offset===undefined)return;
      for(let i=0;i<cards.length;i++){
        cursor=(cursor+offset+cards.length)%cards.length;
        if(!cards[cursor].disabled){cards[cursor].focus();break;}
      }
    },
    destroy(){memoryBoard.replaceChildren();}
  };
}

const grid={cols:10,rows:6,size:70,left:50,top:15};
const route=[[0,1],[3,1],[3,4],[7,4],[7,2],[10,2]];
const center=([c,r])=>({x:grid.left+(c+.5)*grid.size,y:grid.top+(r+.5)*grid.size});
const path=route.map(center);
const pathCells=new Set();
for(let i=0;i<route.length-1;i++){
  const [a,b]=route[i],[c,d]=route[i+1];
  for(let x=Math.min(a,c);x<=Math.max(a,c);x++)for(let y=Math.min(b,d);y<=Math.max(b,d);y++)pathCells.add(x+','+y);
}
export function defense({ctx,finish,hud,beep,notify}){
  let energy=105,core=12,wave=0,score=0,count=0,spawn=0,ended=false;
  const towers=new Map(),enemies=[],trails=[];
  let cursor=[1,2];
  function build(){
    const key=cursor.join(','),tower=towers.get(key);
    if(pathCells.has(key)){notify('Yol üzerine kule kurulamaz.');return;}
    const cost=tower?30*tower.level:35;
    if(tower?.level===4){notify('Bu kule en yüksek seviyede.');return;}
    if(energy<cost){notify('Gerekli enerji: '+cost);return;}
    energy-=cost;
    if(tower)tower.level++;else towers.set(key,{...center(cursor),level:1,cooldown:0});
    notify(tower?'Kule seviye '+tower.level:'Kule kuruldu');beep(620,.08);
  }
  function next(){
    if(count||enemies.length){notify('Mevcut dalganın bitmesini bekle.');return;}
    wave++;count=5+wave*2;spawn=.35;notify(wave+'. dalga başladı');
  }
  function tick(dt){
    if(ended)return;
    if(count>0&&(spawn-=dt)<=0){
      count--;const type=(count+wave)%3;
      const hp=[28,18,65][type]+wave*[5,4,9][type];
      enemies.push({...path[0],target:1,hp,max:hp,v:[75,121,48][type]+wave*4,type});
      spawn=Math.max(.22,.9-wave*.035);
    }
    for(const enemy of enemies){
      const p=path[enemy.target], dx=p.x-enemy.x,dy=p.y-enemy.y,distance=Math.hypot(dx,dy);
      if(distance<=enemy.v*dt){
        enemy.x=p.x;enemy.y=p.y;enemy.target++;
        if(enemy.target===path.length){enemy.escaped=true;core--;}
      }else{enemy.x+=dx/distance*enemy.v*dt;enemy.y+=dy/distance*enemy.v*dt;}
    }
    for(const tower of towers.values()){
      tower.cooldown-=dt;
      if(tower.cooldown>0)continue;
      const enemy=enemies.find(other=>!other.escaped&&other.hp>0&&near(tower,other,120+tower.level*16));
      if(!enemy)continue;
      enemy.hp-=13+tower.level*7;tower.cooldown=.85-tower.level*.12;
      trails.push({tower,enemy,ttl:.11});
    }
    for(let i=enemies.length-1;i>=0;i--){
      const enemy=enemies[i];
      if(enemy.escaped){enemies.splice(i,1);continue;}
      if(enemy.hp<=0){energy+=9+enemy.type*2;score+=10+wave*2;enemies.splice(i,1);}
    }
    for(let i=trails.length-1;i>=0;i--)if((trails[i].ttl-=dt)<0)trails.splice(i,1);
    hud('Dalga '+wave+' · Çekirdek '+core+' · Enerji '+energy+' · Skor '+score);
    if(core<=0){ended=true;finish(score,'Çekirdek düştü · Dalga '+wave);}
  }
  function draw(){
    ctx.fillStyle='#080e20';ctx.fillRect(0,0,W,H);
    for(let c=0;c<grid.cols;c++)for(let r=0;r<grid.rows;r++){
      const x=grid.left+c*grid.size,y=grid.top+r*grid.size,key=c+','+r;
      ctx.fillStyle=pathCells.has(key)?'#32234c':'#101c33';ctx.fillRect(x+2,y+2,66,66);
      if(c===cursor[0]&&r===cursor[1]){ctx.strokeStyle='#84f8ff';ctx.strokeRect(x+2,y+2,66,66);}
    }
    for(const tower of towers.values()){
      dot(ctx,tower.x,tower.y,18,'#206478');dot(ctx,tower.x,tower.y,11,'#73f7f2');
      ctx.fillStyle='#eefaff';ctx.font='14px system-ui';ctx.fillText(String(tower.level),tower.x-4,tower.y+5);
    }
    for(const enemy of enemies){
      dot(ctx,enemy.x,enemy.y,enemy.type===2?16:12,['#ed6ca3','#ffb264','#a991ff'][enemy.type]);
      ctx.fillStyle='#e9f7ff';ctx.fillRect(enemy.x-12,enemy.y-22,24*enemy.hp/enemy.max,3);
    }
    ctx.strokeStyle='#9bfff5';ctx.lineWidth=2;
    for(const {tower,enemy} of trails){ctx.beginPath();ctx.moveTo(tower.x,tower.y);ctx.lineTo(enemy.x,enemy.y);ctx.stroke();}
    ctx.lineWidth=1;
  }
  return {tick,draw,next,build,
    point(x,y){
      const c=Math.floor((x-grid.left)/grid.size),r=Math.floor((y-grid.top)/grid.size);
      if(c>=0&&c<grid.cols&&r>=0&&r<grid.rows){cursor=[c,r];build();}
    },
    press(key){
      const dir={left:[-1,0],right:[1,0],up:[0,-1],down:[0,1]}[key];
      if(dir)cursor=[clamp(cursor[0]+dir[0],0,grid.cols-1),clamp(cursor[1]+dir[1],0,grid.rows-1)];
      if(key==='fire')build();
    }
  };
}
