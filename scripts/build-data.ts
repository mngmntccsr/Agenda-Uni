import { mkdirSync,writeFileSync,readFileSync } from 'node:fs';
import { fetchLessons } from '../lib/sapienza';
import { searchTrains,BUS_FROM_TIBURTINA,BUS_TO_TIBURTINA } from '../lib/transport';
import { selectInbound,selectOutbound } from '../lib/schedule';
import { CONFIG,TIMETABLES } from '../lib/config';
import { DayPlan,Extra,Lesson,TimetableData } from '../lib/types';

const extras:Extra[]=JSON.parse(readFileSync('data/extra.json','utf8'));

function plan(all:Lesson[]):DayPlan[]{
  const dates=[...new Set(all.map(l=>l.date))].sort();
  return dates.map(date=>{
    const dow=new Date(date+'T12:00:00').getDay();
    const lessons=all.filter(l=>l.date===date).sort((a,b)=>a.start.localeCompare(b.start));
    const go=searchTrains(CONFIG.origin),back=searchTrains(CONFIG.destination);
    return {date,lessons,outbound:selectOutbound(dow===1?BUS_TO_TIBURTINA:go,lessons[0]),inbound:selectInbound(dow===4?BUS_FROM_TIBURTINA:back,lessons[lessons.length-1])};
  });
}
async function main(){
  const timetables:TimetableData[]=[];
  for(const tt of TIMETABLES){
    const lessons=await fetchLessons(tt);
    for(const e of extras)if(!e.timetable||e.timetable==='all'||e.timetable===tt.id)
      lessons.push({id:`extra-${e.date}-${e.start}`,courseId:'extra',course:e.title,date:e.date,start:e.start,end:e.end,room:e.room,extra:true});
    timetables.push({id:tt.id,label:tt.label,days:plan(lessons)});
  }
  mkdirSync('public',{recursive:true});
  writeFileSync('public/data.json',JSON.stringify({generatedAt:new Date().toISOString(),timetables}));
  console.log('Salvati',timetables.map(t=>`${t.id}:${t.days.length}gg`).join(' '));
}
main().catch(e=>{console.error(e);process.exit(1)});
