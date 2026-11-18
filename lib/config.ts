export type Course={id:string;code:string;name:string;match?:string[]};
export type Timetable={id:string;label:string;url:string;courses:Course[];transport?:boolean;transferMinutes?:number};
const SAPIENZA=process.env.SAPIENZA_TIMETABLE_URL||'https://corsidilaurea.uniroma1.it/it/course/33443/attendance/timetable';
const TERAMO=process.env.TERAMO_TIMETABLE_URL||'https://unite.prod.up.cineca.it/calendarioPubblico/linkCalendarioId=5fc3ba9e05bff70017af6730';

export const CONFIG={transferMinutes:20,origin:'Lido di Lavinio',destination:'Roma Termini'};

// transport:true = per questo orario si calcolano treni/bus. transferMinutes = margine tra mezzo e lezione (default CONFIG.transferMinutes).
// Fonti reali. `match` = parole chiave (minuscole) cercate nel titolo se non c'e' un codice insegnamento.
export const TIMETABLES:Timetable[]=[
  {id:'A',label:'Strategia e governance',url:SAPIENZA,transport:true,courses:[
    {id:'valutazione',code:'10627660',name:"Valutazione d'azienda"},
    {id:'gestione',code:'10628744',name:"Gestione economica e finanziaria dell'azienda"},
  ]},
  {id:'B',label:'Giurisprudenza',url:TERAMO,transport:true,transferMinutes:10,courses:[
    {id:'proc-civile',code:'',name:'Diritto processuale civile',match:['processuale civile']},
    {id:'penale',code:'',name:'Diritto penale',match:['diritto penale']},
  ]},
];
// C = unione automatica di tutti gli orari sopra (non ha una fonte propria).
export const VIEW_C={id:'C',label:'Confronto'};

// Andata fissa di A, valida tutte le settimane (indipendente dall'orario delle lezioni). Chiave = giorno (2 = martedi, 3 = mercoledi).
// Per tornare al calcolo automatico di un giorno basta cancellare la sua riga.
export const FIXED_OUTBOUND_A:Record<number,{departure:string;arrival:string;station?:string}>={
  2:{station:'Padiglione',departure:'07:37',arrival:'08:22'},
  3:{departure:'06:51',arrival:'07:43'},
};

// Minuti minimi tra l'arrivo del treno a Teramo e la partenza del bus (e viceversa al ritorno).
export const B_CONNECT_MINUTES=5;
