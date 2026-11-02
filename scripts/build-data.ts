import { mkdirSync,writeFileSync,readFileSync } from 'node:fs';
import { fetchLessons } from '../lib/sapienza';
import { searchTrains,BUS_FROM_TIBURTINA,BUS_TO_TIBURTINA } from '../lib/transport';
import { selectInbound,selectOutbound } from '../lib/schedule';
import { CONFIG,TIMETABLES,VIEW_C } from '../lib/config';
import { DayPlan,Extra,Lesson,TimetableData } from '../lib/types';

const extras:Extra[]=JSON.parse(readFileSync('data/extra.json','utf8'));
// C riceve tutti gli extra (una volta sola); A e B solo i propri o quelli "all".
const extraFor=(id:string):Lesson[]=>extras
  .filter(e=>id===VIEW_C.id||!e.timetable||e.timetable==='all'||e.timetable===id)
  .map(e=>({id:`extra-${e.date}-${e.start}`,courseId:'extra',course:e.title,date:e.date,start:e.start,end:e.end,room:e.room,extra:true}));

function plan(all:Lesson[]):DayPlan[]{
  const dates=[...new Set(all.map(l=>l.date))].sort();
  return dates.map(date=>{
    const dow=new Date(date+'T12:00:00').getDay();
    const lessons=all.filter(l=>l.date===date).sort((a,b)=>a.start.localeCompare(b.start));
    const last=lessons.reduce((a,b)=>b.end>a.end?b:a);
    const go=searchTrains(CONFIG.origin),back=searchTrains(CONFIG.destination);
    return {date,lessons,outbound:selectOutbound(dow===1?BUS_TO_TIBURTINA:go,lessons[0]),inbound:selectInbound(dow===4?BUS_FROM_TIBURTINA:back,last)};
  });
}
async function main(){
  const base:Record<string,Lesson[]>={};const out:TimetableData[]=[];
  for(const tt of TIMETABLES){
    try{
      const ls=(await fetchLessons(tt)).map(l=>({...l,src:tt.id}));
      base[tt.id]=ls;
      out.push({id:tt.id,label:tt.label,days:plan([...ls,...extraFor(tt.id)])});
    }catch(e){
      console.error(`Orario ${tt.id} non disponibile:`,e);
      out.push({id:tt.id,label:tt.label,days:[],error:`Orario ${tt.id} non disponibile: ${e instanceof Error?e.message:String(e)}`});
    }
  }
  if(!Object.keys(base).length){console.error('Nessun orario scaricato: non pubblico dati vuoti.');process.exit(1)}
  const missing=TIMETABLES.filter(t=>!base[t.id]).map(t=>t.id);
  out.push({id:VIEW_C.id,label:VIEW_C.label,days:plan([...Object.values(base).flat(),...extraFor(VIEW_C.id)]),warning:missing.length?`Nel confronto mancano gli orari: ${missing.join(', ')}`:undefined});
  mkdirSync('public',{recursive:true});
  writeFileSync('public/data.json',JSON.stringify({generatedAt:new Date().toISOString(),timetables:out}));
  console.log('Salvati',out.map(t=>`${t.id}:${t.days.length}gg`).join(' '));
}
main().catch(e=>{console.error(e);process.exit(1)});
