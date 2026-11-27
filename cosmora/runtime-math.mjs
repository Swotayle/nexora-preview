export const levels = ['low','medium','high'];
export const pixelRatio = (level, dpr=1) => Math.max(.65,Math.min(Number.isFinite(dpr)?dpr:1,{low:.85,medium:1.25,high:1.8}[level] ?? 1));
export const initialQuality = ({mobile=false,cores=8,reduced=false}={}) => mobile||cores<=4||reduced ? 'low' : 'medium';
export function frameMetrics(intervals) {
  const values=intervals.filter(value=>Number.isFinite(value)&&value>0);
  if (!values.length) return null;
  const mean=values.reduce((sum,value)=>sum+value,0)/values.length;
  const sorted=[...values].sort((a,b)=>a-b);
  return {fps:1000/mean,mean,p95:sorted[Math.ceil(sorted.length*.95)-1]};
}
export function adjustQuality(state, fps, now) {
  if (!Number.isFinite(fps)||fps<=0) return state;
  const index=Math.max(0,levels.indexOf(state.level));
  const low=fps<27 ? state.low+1 : 0;
  const high=fps>=55 ? state.high+1 : 0;
  if(now-state.changed>=12000){
    if(low>=3&&index>0)return {level:levels[index-1],low:0,high:0,changed:now};
    if(high>=8&&index<2)return {level:levels[index+1],low:0,high:0,changed:now};
  }
  return {...state,low,high};
}
export const canRender = ({visible,hidden,lost}) => visible&&!hidden&&!lost;
export const sensorReading = ({alpha,beta,gamma}={}) =>
  [alpha,beta,gamma].every(Number.isFinite)&&alpha>=0&&alpha<=360&&Math.abs(beta)<=180&&Math.abs(gamma)<=90 ? {alpha,beta,gamma} : null;
export const screenDegrees = angle => Number.isFinite(angle) ? ((angle%360)+360)%360 : 0;
export const smoothing = (seconds, rate=9) => 1-Math.exp(-rate*Math.min(Math.max(seconds,0),.1));
export function relativePose(a,b) {
  const [x,y,z,w]=a,[i,j,k,l]=b;
  return [w*i+x*l+y*k-z*j,w*j-x*k+y*l+z*i,w*k+x*j-y*i+z*l,w*l-x*i-y*j-z*k];
}
export function calibrationOffset(camera,device){
  const [x,y,z,w]=device;
  return relativePose(camera,[-x,-y,-z,w]);
}
export function pointerState(state,event) {
  const active=new Set(state.active);
  let start=state.start;
  if(event.type==='down'){
    active.add(event.id);
    start=active.size===1&&event.primary ? {id:event.id,x:event.x,y:event.y}:null;
  }
  if(event.type==='move'&&start?.id===event.id&&Math.hypot(event.x-start.x,event.y-start.y)>7)start=null;
  let tap=false;
  if(event.type==='up'||event.type==='cancel'){
    tap=event.type==='up'&&active.size===1&&start?.id===event.id&&Math.hypot(event.x-start.x,event.y-start.y)<=7;
    active.delete(event.id);
    start=null;
  }
  return {active,start,tap};
}

