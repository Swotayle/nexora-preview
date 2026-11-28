const horizon=155, depth=195, far=145;
const lanes=[-1,0,1];
const clamp=(v,min,max)=>Math.min(Math.max(v,min),max);
function polygon(ctx,points,fill){
  ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.closePath();ctx.fillStyle=fill;ctx.fill();
}
const skyline=Array.from({length:44},(_,i)=>({x:i*20-15,h:28+(i*37%113),w:12+(i*13%15),tone:i%3}));
function city(ctx){
  const sky=ctx.createLinearGradient(0,0,0,450);
  sky.addColorStop(0,'#100e2e');sky.addColorStop(.34,'#3e215d');sky.addColorStop(.72,'#140e27');sky.addColorStop(1,'#08091b');
  ctx.fillStyle=sky;ctx.fillRect(0,0,800,450);
  const glow=ctx.createRadialGradient(505,146,4,505,146,220);
  glow.addColorStop(0,'#f6778b85');glow.addColorStop(1,'#ff59a400');ctx.fillStyle=glow;ctx.fillRect(0,0,800,370);
  ctx.fillStyle='#ffd2b9';ctx.beginPath();ctx.arc(544,96,43,0,Math.PI*2);ctx.fill();
  ctx.save();ctx.clip();ctx.fillStyle='#b4597d';for(let i=0;i<6;i++)ctx.fillRect(497,101+i*7,95,2+i*.45);ctx.restore();
  for(const {x,h,w,tone} of skyline){
    ctx.fillStyle=['#17102e','#211635','#251b42'][tone];ctx.fillRect(x,horizon+13-h,w,h+12);
    ctx.fillStyle=tone===0?'#f987a36c':'#8fc4fb6c';
    for(let y=horizon+20-h;y<horizon;y+=9)for(let col=x+4;col<x+w-2;col+=7)if((col+y)%5<3)ctx.fillRect(col,y,2,4);
    if(tone===1){ctx.fillStyle='#ed81b2';ctx.fillRect(x+w/2,horizon-h+8,1,5);}
  }
}
function car(ctx,x,y,s,steer){
  ctx.save();ctx.translate(x,y);ctx.scale(s,s);ctx.rotate(steer*.11);
  ctx.shadowBlur=20;ctx.shadowColor='#ee65eb';
  ctx.fillStyle='#fe76dc';ctx.beginPath();ctx.ellipse(0,13,50,8,0,0,Math.PI*2);ctx.fill();
  ctx.shadowBlur=0;
  const body=ctx.createLinearGradient(0,-32,0,15);body.addColorStop(0,'#d2ebfe');body.addColorStop(.52,'#7383dd');body.addColorStop(1,'#252846');
  polygon(ctx,[[-56,12],[-53,-3],[-34,-16],[-24,-34],[24,-34],[34,-16],[53,-3],[56,12],[44,20],[-44,20]],body);
  polygon(ctx,[[-28,-16],[-20,-30],[20,-30],[28,-16]],'#172b54');
  polygon(ctx,[[-51,4],[-27,-7],[27,-7],[51,4],[43,13],[-43,13]],'#202641');
  ctx.shadowColor='#ff63b2';ctx.shadowBlur=12;
  for(const a of [-1,1]){ctx.fillStyle='#ff83ce';ctx.fillRect(a===-1?-47:19,3,28,4);}
  ctx.shadowBlur=0;ctx.fillStyle='#b0d7f5';ctx.fillRect(-14,9,28,2);
  ctx.restore();
}
export function drift({ctx,finish,hud,beep}){
  let lane=0,player=0,meters=0,orbs=0,speed=19,next=1,objects=[],ended=false,flash=0;
  function project(z,laneWidth){
    const p=depth/(depth+z*7);
    const center=400+Math.sin(meters*.013+z*.018)*120*(1-p);
    return {x:center+laneWidth*p*160,y:horizon+278*p,p};
  }
  const backdrop=document.createElement('canvas');
  backdrop.width=800;backdrop.height=450;city(backdrop.getContext('2d'));
  function draw(){
    ctx.drawImage(backdrop,0,0);
    for(let z=far;z>0;z-=5){
      const a=project(z,-2),b=project(z,2),c=project(z-5,2),d=project(z-5,-2);
      polygon(ctx,[[a.x,a.y],[b.x,b.y],[c.x,c.y],[d.x,d.y]],Math.floor((z+meters)/9)%2?'#1c2040':'#1b1a36');
      ctx.strokeStyle='#fb90d7';ctx.lineWidth=Math.max(.6,b.p*2.3);
      ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(d.x,d.y);ctx.moveTo(b.x,b.y);ctx.lineTo(c.x,c.y);ctx.stroke();
      if(Math.floor((z+meters)/7)%2){
        ctx.strokeStyle='#a5a9fa8a';
        for(const edge of [-.5,.5]){const q=project(z,edge),r=project(z-5,edge);ctx.beginPath();ctx.moveTo(q.x,q.y);ctx.lineTo(r.x,r.y);ctx.stroke();}
      }
    }
    for(let z=far-(meters%9);z>0;z-=9){
      for(const edge of [-2.07,2.07]){
        const {x,y,p}=project(z,edge);ctx.fillStyle='#7482ad';ctx.fillRect(x,y-27*p,2*p,27*p);
        ctx.shadowColor='#ea8cec';ctx.shadowBlur=10*p;ctx.fillStyle='#fbb1fd';ctx.fillRect(x-3*p,y-29*p,7*p,3*p);ctx.shadowBlur=0;
      }
    }
    for(const o of objects.slice().reverse()){
      const {x,y,p}=project(Math.max(o.z,0),o.lane),s=p*.72;
      if(o.drone){car(ctx,x,y-5,s,0);continue;}
      ctx.save();ctx.translate(x,y-20*p);ctx.rotate(meters*.055);ctx.shadowColor='#50ffe5';ctx.shadowBlur=18*p;
      polygon(ctx,[[0,-17*p],[11*p,0],[0,17*p],[-11*p,0]],'#8ffff1');ctx.restore();
    }
    const p=project(0,player);
    car(ctx,p.x,p.y-31,.85,lane-player);
    if(flash>0){ctx.fillStyle=ended?'#ff506836':'#7dffed23';ctx.fillRect(0,0,800,450);}
  }
  return {draw,
    press(key){if(key==='left'||key==='right')lane=clamp(lane+(key==='left'?-1:1),-1,1);},
    tick(dt){
      if(ended)return;
      speed=Math.min(49,19+meters/64);meters+=speed*dt;
      player+=(lane-player)*(1-Math.exp(-15*dt));flash-=dt;
      if((next-=dt)<=0){
        const blocked=lanes[Math.floor(Math.random()*lanes.length)];
        const reward=lanes.filter(l=>l!==blocked)[Math.random()<.5?0:1];
        objects.push({z:100,lane:blocked,drone:true},{z:111,lane:reward,drone:false});
        next=Math.max(.82,1.48-meters/1500);
      }
      for(const o of objects){
        o.z-=speed*dt;
        if(o.z>5||o.z<-.1||Math.abs(player-o.lane)>.37)continue;
        if(o.drone){ended=true;flash=1;break;}
        if(!o.got){o.got=true;orbs++;flash=.17;beep(810,.11);}
      }
      objects=objects.filter(o=>o.z>=0&&!o.got);
      const distance=Math.floor(meters),score=distance+orbs*40;
      hud({Skor:score,Mesafe:distance+' m','Veri kristali':orbs,Hız:Math.round(speed*3.6)+' km/sa'});
      if(ended)finish(score,'Araç hasar gördü · '+distance+' m · '+orbs+' kristal',{distance,orbs});
    }
  };
}
