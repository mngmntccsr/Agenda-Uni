import { mkdirSync,writeFileSync,readFileSync } from 'node:fs';
import { fetchLessons } from '../lib/sapienza';
import { searchTrains,BUS_FROM_TIBURTINA,BUS_TO_TIBURTINA,TE_BUS_TO_UNI,TE_BUS_FROM_UNI } from '../lib/transport';
import { selectInbound,selectOutbound } from '../lib/schedule';
import { CONFIG,TIMETABLES,VIEW_C,Timetable } from '../lib/config';
import { DayPlan,Extra,Lesson,TimetableData,Train } from '../lib/types';

const extras:Extra[]=JSON.parse(readFileSync('data/extra.json','utf8'));
// C riceve tutti gli extra (una volta sola); A e B solo i propri o quelli "all".
const extraFor=(id:string):Lesson[]=>extras
  .filter(e=>id===VIEW_C.id||!e.timetable||e.timetable==='all'||e.timetable===id)
  .map(e=>({id:`extra-${e.date}-${e.start}`,courseId:'extra',course:e.title,date:e.date,start:e.start,end:e.end,room:e.room,extra:true,src:TIMETABLES.some(t=>t.id===e.timetable)?e.timetable:undefined}));

type Group={src:string;lessons:Lesson[];transport:boolean;margin:number};
const grp=(t:Timetable,lessons:Lesson[]):Group=>({src:t.id,lessons,transport:!!t.transport,margin:t.transferMinutes??CONFIG.transferMinutes});
// Mezzi per orario: B = bus linea 7 di Teramo tutti i giorni; A = treno FL8 (bus il lunedi e il giovedi).
const routes=(src:string,dow:number)=>src==='B'
  ?{go:TE_BUS_TO_UNI,back:TE_BUS_FROM_UNI}
  :{go:dow===1?BUS_TO_TIBURTINA:searchTrains(CONFIG.origin),back:dow===4?BUS_FROM_TIBURTINA:searchTrains(CONFIG.destination)};
// I mezzi si calcolano per ogni orario con transport:true, solo sulle sue lezioni, e restano etichettati con la sua sigla.
function plan(all:Lesson[],groups:Group[]):DayPlan[]{
  const dates=[...new Set(all.map(l=>l.date))].sort();
  return dates.map(date=>{
    const dow=new Date(date+'T12:00:00').getDay();
    const lessons=all.filter(l=>l.date===date).sort((a,b)=>a.start.localeCompare(b.start));
    const outbound:Train[]=[],inbound:Train[]=[];
    for(const g of groups){
      if(!g.transport)continue;
      const gl=g.lessons.filter(l=>l.date===date).sort((a,b)=>a.start.localeCompare(b.start));
      if(!gl.length)continue;
      const last=gl.reduce((a,b)=>b.end>a.end?b:a);
      const r=routes(g.src,dow);
      outbound.push(...selectOutbound(r.go,gl[0],g.margin).map(t=>({...t,src:g.src})));
      inbound.push(...selectInbound(r.back,last,g.margin).map(t=>({...t,src:g.src})));
    }
    return {date,lessons,outbound,inbound};
  });
}
async function main(){
  const base:Record<string,Lesson[]>={};const out:TimetableData[]=[];
  for(const tt of TIMETABLES){
    try{
      const ls=(await fetchLessons(tt)).map(l=>({...l,src:tt.id}));
      const mine=[...ls,...extraFor(tt.id)];
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
