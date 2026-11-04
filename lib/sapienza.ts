import * as cheerio from 'cheerio';
import { Course,Timetable } from './config';
import { Lesson } from './types';
const hit=(c:Course,raw:string,nr:string)=>(!!c.code&&raw.includes(c.code))||nr.includes(c.name.toLowerCase())||(c.match||[]).some(m=>nr.includes(m));
export function parseTimetableHtml(html:string,courses:Course[]):Lesson[]{
  const $=cheerio.load(html); const out:Lesson[]=[];
  $('table').each((_,tb)=>{
    let roomIdx=-1;
    $(tb).find('tr').each((_,tr)=>{
      const cells=$(tr).find('th,td').map((_,c)=>$(c).text().replace(/\s+/g,' ').trim()).get();
      if($(tr).find('th').length){roomIdx=cells.findIndex(c=>/aula/i.test(c));return}
      const row=cells.join(' | ');
      const nr=row.toLowerCase().replace(/[’`]/g,"'");const course=courses.find(c=>hit(c,row,nr)); if(!course)return;
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
const START=['start','dataInizio','inizio','data_inizio','startDate'],END=['end','dataFine','fine','data_fine','endDate'];
const pick=(e:any,keys:string[])=>{for(const k of keys)if(e?.[k]!=null)return e[k]};
// accetta ISO, "gg/mm/aaaa hh:mm" o timestamp in ms; restituisce una stringa ISO (o '' se non e' una data+ora)
function norm(v:any):string{
  if(typeof v==='number')return new Date(v).toISOString();
  if(typeof v!=='string')return '';
  const m=v.match(/^(\d{2})\/(\d{2})\/(\d{4})[ T](\d{1,2}:\d{2})/);
  if(m)return `${m[3]}-${m[2]}-${m[1]}T${m[4].padStart(5,'0')}`;
  return v.length>=16?v:'';
}
const isEv=(j:any)=>!!j&&typeof j==='object'&&!Array.isArray(j)&&norm(pick(j,START))!==''&&norm(pick(j,END))!=='';
function collect(j:any,out:any[]){
  if(Array.isArray(j)){j.forEach(x=>collect(x,out));return}
  if(j&&typeof j==='object'){if(isEv(j))out.push(j);else Object.values(j).forEach(x=>collect(x,out))}
}
const TITLE=['title','nome','titolo','descrizione','insegnamento'];
export function parseEvents(json:any,courses:Course[]):Lesson[]{
  const ev:any[]=[];collect(json,ev);const out:Lesson[]=[];
  for(const e of ev){
    const raw=JSON.stringify(e).replace(/&#0?39;|&apos;/g,"'").replace(/&amp;/g,'&');const nr=raw.toLowerCase().replace(/[’`]/g,"'");
    const c=courses.find(c=>hit(c,raw,nr));if(!c)continue;
    const a=rome(norm(pick(e,START))),b=rome(norm(pick(e,END)));
    const aule=Array.isArray(e.aule)?e.aule.map((x:any)=>typeof x==='string'?x:(x?.descrizione||x?.nome||x?.aula||'')).filter(Boolean).join(', '):'';
    const room=e.room||e.aula||e.location||aule||raw.match(/((?:Aula|Sala)[^"(\\,\[]{1,40})/)?.[1]?.trim();
    out.push({id:`${c.id}-${a.date}-${a.time}`,courseId:c.id,course:c.name,date:a.date,start:a.time,end:b.time,room:typeof room==='string'&&room?room:undefined});
  }
  return out;
}
// --- richieste POST con intervallo di date (usate da Cineca/UniversityPlanner): le rieseguiamo mese per mese
const RS=/^(data_?)?(inizio|start|from|dal)$/i,RE=/^(data_?)?(fine|end|to|al)$/i;
const like=(old:string,d:Date)=>/^\d{2}\/\d{2}\/\d{4}/.test(old)
  ?`${String(d.getUTCDate()).padStart(2,'0')}/${String(d.getUTCMonth()+1).padStart(2,'0')}/${d.getUTCFullYear()}`
  :old.includes('T')?d.toISOString():d.toISOString().slice(0,10);
function withRange(o:any,s:Date,e:Date,c={n:0}):any{
  if(Array.isArray(o))return o.map(x=>withRange(x,s,e,c));
  if(o&&typeof o==='object'){
    const r:any={};
    for(const [k,v] of Object.entries(o)){
      if(typeof v==='string'&&RS.test(k)){r[k]=like(v,s);c.n++}
      else if(typeof v==='string'&&RE.test(k)){r[k]=like(v,e);c.n++}
      else r[k]=withRange(v,s,e,c);
    }
    return r;
  }
  return o;
}
export async function fetchLessons(tt:Timetable):Promise<Lesson[]>{
  const {chromium}=await import('playwright');
  const b=await chromium.launch();
  try{
    const ctx=await b.newContext({locale:'it-IT',userAgent:'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36'});
    const p=await ctx.newPage();
    const feeds:{url:string;method:string;post?:string;body:string}[]=[];const reqs:string[]=[];
    p.on('response',async r=>{try{
      const rq=r.request(),kind=rq.resourceType();
      if(kind==='fetch'||kind==='xhr')reqs.push(`${rq.method()} ${r.status()} ${r.url().slice(0,150)}`);
      if((r.headers()['content-type']||'').includes('json')||kind==='fetch'||kind==='xhr'){
        const body=await r.text();
        if(/^\s*[\[{]/.test(body))feeds.push({url:r.url(),method:rq.method(),post:rq.postData()||undefined,body});
      }
    }catch{}});
    await p.goto(tt.url,{waitUntil:'networkidle',timeout:60000});
    await p.waitForTimeout(4000);
    const lessons:Lesson[]=[];
    const add=(l:Lesson[])=>{for(const x of l)if(!lessons.some(y=>y.id===x.id))lessons.push(x)};
    const titles=new Set<string>();
    const seen=(j:any)=>{const ev:any[]=[];collect(j,ev);ev.forEach(e=>titles.add(String(pick(e,TITLE)??JSON.stringify(e)).replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim().slice(0,70)))};
    const months=Array.from({length:10},(_,m)=>[new Date(Date.UTC(2026,8+m,1)),new Date(Date.UTC(2026,9+m,1))]);
    const done=new Set<string>();
    for(const f of feeds){
      try{const j=JSON.parse(f.body);seen(j);add(parseEvents(j,tt.courses))}catch{}
      const key=f.method+f.url+(f.post||'');if(done.has(key))continue;done.add(key);
      const u=new URL(f.url);
      if(f.method==='GET'&&u.searchParams.has('start')&&u.searchParams.has('end')){
        for(const [s0,e0] of months){
          u.searchParams.set('start',s0.toISOString());u.searchParams.set('end',e0.toISOString());
          try{const r=await ctx.request.get(u.toString());const j=await r.json();seen(j);add(parseEvents(j,tt.courses))}catch(e){console.log('feed errore',String(e).slice(0,100))}
        }
      }else if(f.method==='POST'&&f.post){
        let body:any;try{body=JSON.parse(f.post)}catch{continue}
        const c={n:0};withRange(body,new Date(),new Date(),c);if(!c.n)continue;
        for(const [s0,e0] of months){
          try{const r=await ctx.request.post(f.url,{data:withRange(body,s0,e0)});const j=await r.json();seen(j);add(parseEvents(j,tt.courses))}catch(e){console.log('feed POST errore',String(e).slice(0,100))}
        }
      }
    }
    if(!lessons.length){
      console.log(`DIAGNOSTICA ${tt.id}: titoli trovati (${titles.size}):`,[...titles].slice(0,60).join(' ## '));
      console.log(`DIAGNOSTICA ${tt.id}: chiamate xhr/fetch (${reqs.length}):\n`+reqs.slice(0,25).join('\n'));
      console.log(`DIAGNOSTICA ${tt.id}: risposte JSON (${feeds.length}):\n`+feeds.slice(0,8).map(f=>`${f.method} ${f.url.slice(0,120)}${f.post?' BODY '+f.post.slice(0,200):''}\n  -> ${f.body.slice(0,250)}`).join('\n'));
      throw new Error(`Orario ${tt.id} non trovato o senza le materie richieste (${tt.url}).`);
    }
    return lessons;
  } finally{await b.close()}
}
