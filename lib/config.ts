export type Course={id:string;code:string;name:string};
export type Timetable={id:string;label:string;url:string;courses:Course[]};
const URL=process.env.SAPIENZA_TIMETABLE_URL||'https://corsidilaurea.uniroma1.it/it/course/33443/attendance/timetable';

export const CONFIG={transferMinutes:20,origin:'Lido di Lavinio',destination:'Roma Termini'};

// Per aggiungere un secondo orario da confrontare: aggiungi un oggetto a questa lista
// (altro url e/o altre materie). L'interfaccia mostrerà da sola il selettore e il confronto.
export const TIMETABLES:Timetable[]=[
  {id:'a',label:'Orario attuale',url:URL,courses:[
    {id:'valutazione',code:'10627660',name:"Valutazione d'azienda"},
    {id:'gestione',code:'10628744',name:"Gestione economica e finanziaria dell'azienda"},
    {id:'innovazione',code:'10626387',name:"Economia e politiche dell'innovazione"},
  ]},
];
