import { adjustQuality, canRender, frameMetrics, initialQuality, pixelRatio, pointerState } from './runtime-math.mjs';

export const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)');
export const qualityOptions='<option value="auto">Otomatik</option><option value="low">Düşük</option><option value="medium">Orta</option><option value="high">Yüksek</option>';
export function renderQuality(select,meter,apply) {
  const pick=()=>initialQuality({mobile:matchMedia('(max-width:760px)').matches,cores:navigator.hardwareConcurrency,reduced:reducedMotion.matches});
  let state={level:pick(),low:0,high:0,changed:performance.now()};
  let first=null,last=null,windowStart=null,intervals=[];
  function set(level){
    apply(level,pixelRatio(level,devicePixelRatio));
    select.title=`Etkin grafik seviyesi: ${{low:'Düşük',medium:'Orta',high:'Yüksek'}[level]}`;
  }
  function pause(){first=last=windowStart=null;intervals=[];state={...state,low:0,high:0};meter.textContent='– FPS';}
  select.value='auto';
  select.addEventListener('change',()=>{
    state={level:select.value==='auto'?pick():select.value,low:0,high:0,changed:performance.now()};
    set(state.level);pause();
  });
  set(state.level);
  return {pause, resize:()=>set(state.level), frame(now){
    first??=now;
    if(now-first<1800){meter.textContent='Isınma';return;}
    if(last!==null)intervals.push(now-last);
    last=now;windowStart??=now;
    if(now-windowStart<1000)return;
    const metrics=frameMetrics(intervals);
    intervals=[];windowStart=now;
    if(!metrics)return;
    meter.textContent=`${Math.round(metrics.fps)} FPS · ${metrics.mean.toFixed(1)} ms · p95 ${metrics.p95.toFixed(1)} ms`;
    if(select.value==='auto'){
      const next=adjustQuality(state,metrics.fps,now);
      const changed=next.level!==state.level;
      state=next;
      if(changed){set(state.level);pause();}
    }
  }};
}

export function sceneLoop(element,isVisible,draw,pause,getRenderer) {
  let timer=null,lost=false,disposed=false,running=false;
  const canvas=getRenderer().domElement;
  function sync(){
    const active=!disposed&&canRender({visible:isVisible(),hidden:document.hidden,lost});
    if(active&&timer===null){running=true;timer=requestAnimationFrame(tick);}
    if(!active&&running){
      if(timer!==null)cancelAnimationFrame(timer);
      timer=null;running=false;pause();
    }
  }
  function tick(now){
    timer=null;
    if(!canRender({visible:isVisible(),hidden:document.hidden,lost})||disposed){sync();return;}
    draw(now);
    sync();
  }
  const observer=new MutationObserver(sync);
  observer.observe(element,{attributes:true,attributeFilter:['class']});
  document.addEventListener('visibilitychange',sync);
  const lostContext=event=>{
    event.preventDefault();lost=true;sync();
    window.cosmoraModuleFallback?.('context');
  };
  const restored=()=>{lost=false;window.cosmoraClearFallback?.('context');sync();};
  canvas.addEventListener('webglcontextlost',lostContext);
  canvas.addEventListener('webglcontextrestored',restored);
  sync();
  return ()=>{disposed=true;sync();observer.disconnect();document.removeEventListener('visibilitychange',sync);
    canvas.removeEventListener('webglcontextlost',lostContext);canvas.removeEventListener('webglcontextrestored',restored);};
}

export function listenForTap(canvas,callback) {
  let state={active:new Set(),start:null,tap:false};
  for(const type of ['down','move','up','cancel']){
    canvas.addEventListener('pointer'+type,event=>{
      if(event.pointerType==='mouse'&&type==='down'&&event.button!==0)return;
      state=pointerState(state,{type,id:event.pointerId,primary:event.isPrimary,x:event.clientX,y:event.clientY});
      if(state.tap)callback(event);
    });
  }
  for(const event of ['lostpointercapture','pointerleave'])canvas.addEventListener(event,event=>{
    state=pointerState(state,{type:'cancel',id:event.pointerId});
  });
}

