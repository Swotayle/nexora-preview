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
  let enemies=[],bullets=[],boosts=[],ended=false,particles=[];
  function burst(x,y,color,count=16){
    for(let i=0;i<count;i++){
      const angle=rand(0,Math.PI*2),speed=rand(24,152);
      particles.push({x,y,vx:Math.cos(angle)*speed,vy:Math.sin(angle)*speed,life:rand(.21,.63),color});
    }
  }
  const nebula=ctx.createRadialGradient(600,112,6,600,112,390);
  nebula.addColorStop(0,'#29365b');nebula.addColorStop(.45,'#171b3a');nebula.addColorStop(1,'#060a18');
  const cloud=ctx.createRadialGradient(140,295,5,140,295,270);
  cloud.addColorStop(0,'#8a4f9155');cloud.addColorStop(1,'#67228000');
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
          burst(enemy.x,enemy.y,enemy.drone?'#f976c7':'#fdd3ac');
          if(Math.random()<.24)boosts.push({x:enemy.x,y:enemy.y,type:Math.random()<.55?'shield':'rapid'});
        }else if(iframes<=0&&near(ship,enemy,enemy.r+13)){
          enemy.dead=true;iframes=1.05;
          burst(ship.x,ship.y,shield>0?'#7eeeff':'#ff7a89',24);
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
      for(const p of particles){p.x+=p.vx*dt;p.y+=p.vy*dt;p.life-=dt;}
      particles=particles.filter(p=>p.life>0);
      const points=score+Math.floor(time);
      hud({Skor:points,Can:health,Kalkan:shield,Süre:Math.floor(time)+' sn'});
      if(health<=0){ended=true;finish(points,'Gemi kaybedildi');}
    },
    draw(){
      ctx.fillStyle=nebula;ctx.fillRect(0,0,W,H);
      ctx.fillStyle=cloud;ctx.fillRect(0,0,W,H);
      for(const star of stars)dot(ctx,star.x,(star.y+time*(20+star.r*16))%H,star.r,'#c6ddfc96');
      for(const enemy of enemies){
        ctx.save();ctx.translate(enemy.x,enemy.y);ctx.rotate(time*(enemy.drone?-1.2:.8));
        const hull=ctx.createLinearGradient(0,-enemy.r,0,enemy.r);
        hull.addColorStop(0,enemy.drone?'#ffa7d7':'#bb9eaa');
        hull.addColorStop(1,enemy.drone?'#512256':'#3a354e');
        ctx.fillStyle=hull;ctx.strokeStyle=enemy.drone?'#ffd0e9':'#d8b2bc88';ctx.lineWidth=1;
        ctx.beginPath();
        for(let i=0;i<9;i++){const phase=i*Math.PI*2/9,r=enemy.r*(i%2?.81:1);ctx.lineTo(Math.cos(phase)*r,Math.sin(phase)*r);}
        ctx.closePath();ctx.fill();ctx.stroke();
        if(enemy.drone){ctx.shadowColor='#fb6db8';ctx.shadowBlur=13;dot(ctx,0,0,4,'#ffcfeb');}
        else dot(ctx,-enemy.r*.24,-enemy.r*.26,enemy.r*.26,'#504458');
        ctx.restore();
      }
      ctx.shadowColor='#64ffff';ctx.shadowBlur=11;
      for(const b of bullets){ctx.fillStyle='#ccfffb';ctx.beginPath();ctx.roundRect(b.x-2,b.y-13,4,16,2);ctx.fill();}
      ctx.shadowBlur=0;
      for(const p of particles){ctx.globalAlpha=Math.min(1,p.life*3);dot(ctx,p.x,p.y,1.8,p.color);}
      ctx.globalAlpha=1;
      for(const b of boosts){dot(ctx,b.x,b.y,9,b.type==='shield'?'#77f8ff':'#ffd576');}
      if(iframes>0&&Math.floor(iframes*14)%2)ctx.globalAlpha=.55;
      ctx.save();ctx.translate(ship.x,ship.y);
      if(shield>0){
        ctx.shadowColor='#80e7ff';ctx.shadowBlur=iframes>0?21:6;ctx.strokeStyle=iframes>0?'#d5feff':'#68dbfb9a';ctx.lineWidth=iframes>0?3:1.2;
        ctx.beginPath();ctx.ellipse(0,0,23,24,0,0,Math.PI*2);ctx.stroke();
      }
      ctx.shadowColor=rapid>0?'#ffd0a5':'#8781ff';ctx.shadowBlur=14;
      dot(ctx,0,12,5,'#adbbff');
      ctx.shadowBlur=0;
      const metal=ctx.createLinearGradient(-18,-19,18,17);metal.addColorStop(0,'#c4eefe');metal.addColorStop(.55,'#838de9');metal.addColorStop(1,'#273f66');
      ctx.fillStyle=metal;ctx.beginPath();ctx.moveTo(0,-21);ctx.quadraticCurveTo(8,-12,9,-4);ctx.lineTo(17,13);ctx.lineTo(7,10);ctx.lineTo(0,7);ctx.lineTo(-7,10);ctx.lineTo(-17,13);ctx.lineTo(-9,-4);ctx.quadraticCurveTo(-8,-12,0,-21);ctx.fill();
      ctx.fillStyle='#162551';ctx.beginPath();ctx.ellipse(0,-6,3.4,7,0,0,Math.PI*2);ctx.fill();
      ctx.restore();ctx.globalAlpha=1;
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
    const b=document.createElement('button');b.type='button';b.className='memory-card';b.textContent='✧';b.style.setProperty('--card-hue',248+i*5);b.setAttribute('aria-label','Kapalı kart '+(i+1));
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
      hud({'Eşleşme':found+'/'+pairCount,Hamle:moves,Süre:Math.floor(time)+' sn'});
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
