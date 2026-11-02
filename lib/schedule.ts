import { Lesson,Train } from './types';
import { CONFIG } from './config';
const T=CONFIG.transferMinutes;
export function selectOutbound(trains:Train[],l:Lesson){
  return trains.filter(t=>toMinutes(t.arrival)+T<=toMinutes(l.start)).sort((a,b)=>toMinutes(b.departure)-toMinutes(a.departure));
}
export function selectInbound(trains:Train[],l:Lesson){
  return trains.filter(t=>toMinutes(t.departure)>=toMinutes(l.end)+T).sort((a,b)=>toMinutes(a.departure)-toMinutes(b.departure));
}

export function toMinutes(hhmm:string){ const [h,m]=hhmm.split(':').map(Number); return h*60+m; }
export function fromMinutes(n:number){ n=(n+1440)%1440; return `${String(Math.floor(n/60)).padStart(2,'0')}:${String(n%60).padStart(2,'0')}`; }
export function minutesBetween(a:string,b:string){ return toMinutes(b)-toMinutes(a); }
