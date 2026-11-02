import * as cheerio from 'cheerio';
import { Course,Timetable } from './config';
import { Lesson } from './types';
export function parseTimetableHtml(html:string,courses:Course[]):Lesson[]{
  const $=cheerio.load(html); const out:Lesson[]=[];
  $('table').each((_,tb)=>{
    let roomIdx=-1;
    $(tb).find('tr').each((_,tr)=>{
      const cells=$(tr).find('th,td').map((_,c)=>$(c).text().replace(/\s+/g,' ').trim()).get();
      if($(tr).find('th').length){roomIdx=cells.findIndex(c=>/aula/i.test(c));return}
      const row=cells.join(' | ');
      const nr=row.toLowerCase().replace(/[’`]/g,"'");const course=courses.find(c=>row.includes(c.code)||nr.includes(c.name.toLowerCase())); if(!course)return;
      const d=row.match(/(\d{2})\/(\d{2})\/(\d{4})/); const t=row.match(/(\d{1,2}[:.]\d{2})\s*[-–]\s*(\d{1,2}[:.]\d{2})/);
      if(!d||!t)return;
      const f=(x:string)=>x.replace('.',':').padStart(5,'0');
      const date=`${d[3]}-${d[2]}-${d[1]}`;
      const room=roomIdx>=0?cells[roomIdx]:cells[cells.length-1];
      out.push({id:`${course.id}-${date}-${f(t[1])}`,courseId:course.id,course:course.name,date,start:f(t[1]),end:f(t[2]),room:room&&!row.startsWith(room)?room:undefined});
    });
  });
  return out;
}
const rome=(v:string)=>{
  if(!/[zZ]|[+-]\d\d:?\d\d$/.test(v))return {date:v.slice(0,10),time:v.slice(11,16)};
  const p=new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Rome',dateStyle:'short',timeStyle:'short'}).format(new Date(v)).split(' ');
  return {date:p[0],time:p[1]};
};
function collect(j:any,out:any[]){
  if(Array.isArray(j)){j.forEach(x=>collect(x,out));return}
  if(j&&typeof j==='object'){
    if(typeof j.start==='string'&&typeof j.end==='string'&&j.start.length>=16)out.push(j);
    else Object.values(j).forEach(x=>collect(x,out));
  }
}
export function parseEvents(json:any,courses:Course[]):Lesson[]{
  const ev:any[]=[];collect(json,ev);const out:Lesson[]=[];
  for(const e of ev){
    const raw=JSON.stringify(e).replace(/&#0?39;|&apos;/g,"'").replace(/&amp;/g,'&');const nr=raw.toLowerCase().replace(/[’`]/g,"'");
    const c=courses.find(c=>nr.includes(c.name.toLowerCase())||raw.includes(c.code));if(!c)continue;
    const a=rome(e.start),b=rome(e.end);
    const room=e.room||e.aula||e.location||raw.match(/((?:Aula|Sala)[^"(\\,\[]{1,40})/)?.[1]?.trim();
    out.push({id:`${c.id}-${a.date}-${a.time}`,courseId:c.id,course:c.name,date:a.date,start:a.time,end:b.time,room:typeof room==='string'?room:undefined});
  }
  return out;
}
export async function fetchLessons(tt:Timetable):Promise<Lesson[]>{
  const {chromium}=await import('playwright');
  const b=await chromium.launch();
  try{
    const ctx=await b.newContext({locale:'it-IT',userAgent:'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36'});
    const p=await ctx.newPage();
    const feeds:{url:string;body:string}[]=[];
    p.on('response',async r=>{try{if((r.headers()['content-type']||'').includes('json'))feeds.push({url:r.url(),body:await r.text()})}catch{}});
    await p.goto(tt.url,{waitUntil:'networkidle',timeout:60000});
    await p.waitForTimeout(3000);
    let lessons:Lesson[]=[];
    const add=(l:Lesson[])=>{for(const x of l)if(!lessons.some(y=>y.id===x.id))lessons.push(x)};
    const titles=new Set<string>();
    const seen=(j:any)=>{const ev:any[]=[];collect(j,ev);ev.forEach(e=>titles.add(String(e.title).replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim().slice(0,70)))};
    for(const f of feeds){
      try{const j=JSON.parse(f.body);seen(j);add(parseEvents(j,tt.courses))}catch{}
      const u=new URL(f.url);
      if(u.searchParams.has('start')&&u.searchParams.has('end')){
        for(let m=0;m<7;m++){
          const s0=new Date(Date.UTC(2026,8+m,1)),e0=new Date(Date.UTC(2026,9+m,1));
          u.searchParams.set('start',s0.toISOString());u.searchParams.set('end',e0.toISOString());
          try{const r=await ctx.request.get(u.toString());const j=await r.json();seen(j);add(parseEvents(j,tt.courses))}catch(e){console.log('feed errore',m,String(e).slice(0,100))}
        }
      }
    }
    if(!lessons.length){
      console.log('DIAGNOSTICA titoli trovati ('+titles.size+'):',[...titles].join(' ## '));
      throw new Error('Orario Sapienza non trovato o senza le materie richieste.');
    }
    return lessons;
  } finally{await b.close()}
}
