export type Course={id:string;code:string;name:string;match?:string[]};
export type Timetable={id:string;label:string;url:string;courses:Course[];transport?:boolean;transferMinutes?:number};
const SAPIENZA=process.env.SAPIENZA_TIMETABLE_URL||'https://corsidilaurea.uniroma1.it/it/course/33443/attendance/timetable';
const TERAMO=process.env.TERAMO_TIMETABLE_URL||'https://unite.prod.up.cineca.it/calendarioPubblico/linkCalendarioId=5fc3ba9e05bff70017af6730';

export const CONFIG={transferMinutes:20,origin:'Lido di Lavinio',destination:'Roma Termini'};

// transport:true = per questo orario si calcolano treni/bus. transferMinutes = margine tra mezzo e lezione (default CONFIG.transferMinutes).
// Fonti reali. `match` = parole chiave (minuscole) cercate nel titolo se non c'e' un codice insegnamento.
export const TIMETABLES:Timetable[]=[
  {id:'A',label:'A · Strategia e governance',url:SAPIENZA,transport:true,courses:[
    {id:'valutazione',code:'10627660',name:"Valutazione d'azienda"},
    {id:'gestione',code:'10628744',name:"Gestione economica e finanziaria dell'azienda"},
  ]},
  {id:'B',label:'B · Giurisprudenza Teramo',url:TERAMO,transport:true,transferMinutes:10,courses:[
    {id:'proc-civile',code:'',name:'Diritto processuale civile',match:['processuale civile']},
    {id:'penale',code:'',name:'Diritto penale',match:['diritto penale']},
  ]},
];
// C = unione automatica di tutti gli orari sopra (non ha una fonte propria).
export const VIEW_C={id:'C',label:'C · Confronto A + B'};
