import { mkdirSync,writeFileSync,readFileSync } from 'node:fs';
import { fetchLessons } from '../lib/sapienza';
import { searchTrains,BUS_FROM_TIBURTINA,BUS_TO_TIBURTINA,TE_BUS_TO_UNI,TE_BUS_FROM_UNI,LAN_TE_WEEK,LAN_TE_SUN,TE_LAN_WEEK } from '../lib/transport';
import { selectInbound,selectOutbound,toMinutes } from '../lib/schedule';
import { B_CONNECT_MINUTES,CONFIG,FIXED_OUTBOUND_A,TIMETABLES,VIEW_C,Timetable } from '../lib/config';
import { DayPlan,Extra,Lesson,TimetableData,Train } from '../lib/types';

const extras:Extra[]=JSON.parse(readFileSync('data/extra.json','utf8'));
// C riceve tutti gli extra (una volta sola); A e B solo i propri o quelli "all".
const extraFor=(id:string):Lesson[]=>extras
  .filter(e=>id===VIEW_C.id||!e.timetable||e.timetable==='all'||e.timetable===id)
  .map(e=>({id:`extra-${e.date}-${e.start}`,courseId:'extra',course:e.title,date:e.date,start:e.start,end:e.end,room:e.room,extra:true,src:TIMETABLES.some(t=>t.id===e.timetable)?e.timetable:undefined}));

// Se un extra/seminario si sovrappone a una lezione DELLO STESSO orario, si mostra solo l'extra (la lezione sparisce, anche dal calcolo dei mezzi).
// Vale per orario: l'extra di A non nasconde le lezioni di B e viceversa; gli extra "all" agiscono su ciascun orario separatamente.
const hideOverlapped=(ls:Lesson[]):Lesson[]=>{
  const ex=ls.filter(l=>l.extra);
  return ls.filter(l=>l.extra||!ex.some(e=>e.date===l.date&&e.start<l.end&&l.start<e.end));
};

type Group={src:string;lessons:Lesson[];transport:boolean;margin:number};
const grp=(t:Timetable,lessons:Lesson[]):Group=>({src:t.id,lessons,transport:!!t.transport,margin:t.transferMinutes??CONFIG.transferMinutes});
// Andata fissa di A (vedi FIXED_OUTBOUND_A in config.ts); null = calcolo automatico.
function fixedOutbound(src:string,dow:number):Train[]|null{
  const F=FIXED_OUTBOUND_A[dow];
  if(src!=='A'||!F)return null;
  return [{id:`fl8-fisso-${F.departure}`,provider:F.station?`Trenitalia FL8 · ${F.station}`:'Trenitalia FL8',departure:F.departure,arrival:F.arrival,direct:true}];
}
// Mezzi di A: treno FL8, con il bus lungo (Tiburtina) al lunedi
// all'andata e nell'ULTIMO giorno con eventi della settimana (lezioni o extra) al ritorno.
const routes=(dow:number,isLastDay:boolean)=>({go:dow===1?BUS_TO_TIBURTINA:searchTrains(CONFIG.origin),back:isLastDay?BUS_FROM_TIBURTINA:searchTrains(CONFIG.destination)});
// lunedi (YYYY-MM-DD) della settimana di una data
const weekOf=(d:string)=>{const x=new Date(d+'T12:00:00Z');x.setUTCDate(x.getUTCDate()-((x.getUTCDay()+6)%7));return x.toISOString().slice(0,10)};
// per ogni settimana, il primo / l'ultimo giorno in cui il gruppo ha un evento (extra compresi)
const edgeDays=(g:Group,last:boolean)=>{const m=new Map<string,string>();for(const l of g.lessons){const k=weekOf(l.date),c=m.get(k);if(!c||(last?l.date>c:l.date<c))m.set(k,l.date)}return m};
type Day=DayPlan&{mid?:Train[]};
// B (Teramo): bus linea 7 ogni giorno; treno Lanciano->Teramo prima del primo evento della settimana e Teramo->Lanciano dopo l'ultimo;
// il mercoledi, se ci sono due eventi, bus per uscire dopo il primo e rientrare prima del secondo (mid).
function planB(gl:Lesson[],dow:number,isFirst:boolean,isLast:boolean,m:number){
  const outbound:Train[]=[],inbound:Train[]=[],mid:Train[]=[];
  const first=gl[0],last=gl.reduce((a,b)=>b.end>a.end?b:a);
  const bus=selectOutbound(TE_BUS_TO_UNI,first,m)[0];
  if(bus){
    outbound.push(bus);
    if(isFirst){const t=selectOutbound(dow===0?LAN_TE_SUN:LAN_TE_WEEK,{...first,start:bus.departure},B_CONNECT_MINUTES)[0];if(t)outbound.push(t)}
  }
  const back=selectInbound(TE_BUS_FROM_UNI,last,m)[0];
  if(back){
    inbound.push(back);
    if(isLast&&dow>=1&&dow<=5){const t=selectInbound(TE_LAN_WEEK,{...last,end:back.arrival},B_CONNECT_MINUTES)[0];if(t)inbound.push(t)}
  }
  if(dow===3&&gl.length>1){
    const out=selectInbound(TE_BUS_FROM_UNI,gl[0],m)[0];
    const ret=out&&selectOutbound(TE_BUS_TO_UNI.filter(t=>toMinutes(t.departure)>=toMinutes(out.arrival)),gl[1],m)[0];
    if(out&&ret)mid.push(out,ret);
  }
  return {outbound,inbound,mid};
}
function plan(all:Lesson[],groups:Group[]):Day[]{
  const dates=[...new Set(all.map(l=>l.date))].sort();
  const lasts=new Map(groups.map(g=>[g.src,edgeDays(g,true)] as const)),firsts=new Map(groups.map(g=>[g.src,edgeDays(g,false)] as const));
  return dates.map(date=>{
    const dow=new Date(date+'T12:00:00').getDay();
    const lessons=all.filter(l=>l.date===date).sort((a,b)=>a.start.localeCompare(b.start));
    const outbound:Train[]=[],inbound:Train[]=[],mid:Train[]=[];
    for(const g of groups){
      if(!g.transport)continue;
      const gl=g.lessons.filter(l=>l.date===date).sort((a,b)=>a.start.localeCompare(b.start));
      if(!gl.length)continue;
      const last=gl.reduce((a,b)=>b.end>a.end?b:a);
      const isLast=lasts.get(g.src)!.get(weekOf(date))===date,isFirst=firsts.get(g.src)!.get(weekOf(date))===date;
      if(g.src==='B'){
        const b=planB(gl,dow,isFirst,isLast,g.margin);
        outbound.push(...b.outbound.map(t=>({...t,src:g.src})));inbound.push(...b.inbound.map(t=>({...t,src:g.src})));mid.push(...b.mid.map(t=>({...t,src:g.src})));
        continue;
      }
      const r=routes(dow,isLast);
      outbound.push(...(fixedOutbound(g.src,dow)??selectOutbound(r.go,gl[0],g.margin)).slice(0,1).map(t=>({...t,src:g.src})));
      inbound.push(...selectInbound(r.back,last,g.margin).slice(0,1).map(t=>({...t,src:g.src})));
    }
    return {date,lessons,outbound,inbound,mid};
  });
}
async function main(){
  const base:Record<string,Lesson[]>={};const out:TimetableData[]=[];
  for(const tt of TIMETABLES){
    try{
      const ls=(await fetchLessons(tt)).map(l=>({...l,src:tt.id}));
      const mine=hideOverlapped([...ls,...extraFor(tt.id)]);
      base[tt.id]=mine;
      out.push({id:tt.id,label:tt.label,days:plan(mine,[grp(tt,mine)])});
    }catch(e){
      console.error(`Orario ${tt.id} non disponibile:`,e);
      out.push({id:tt.id,label:tt.label,days:[],error:`Orario ${tt.id} non disponibile: ${e instanceof Error?e.message:String(e)}`});
    }
  }
  if(!Object.keys(base).length){console.error('Nessun orario scaricato: non pubblico dati vuoti.');process.exit(1)}
  const missing=TIMETABLES.filter(t=>!base[t.id]).map(t=>t.id);
  out.push({id:VIEW_C.id,label:VIEW_C.label,days:plan([...new Map([...Object.values(base).flat(),...extraFor(VIEW_C.id)].map(l=>[l.id,l])).values()],TIMETABLES.filter(t=>base[t.id]).map(t=>grp(t,base[t.id]))),warning:missing.length?`Nel confronto mancano gli orari: ${missing.join(', ')}`:undefined});
  mkdirSync('public',{recursive:true});
  writeFileSync('public/data.json',JSON.stringify({generatedAt:new Date().toISOString(),timetables:out}));
  console.log('Salvati',out.map(t=>`${t.id}:${t.days.length}gg`).join(' '));
}
main().catch(e=>{console.error(e);process.exit(1)});
