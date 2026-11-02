export type Lesson={id:string;courseId:string;course:string;date:string;start:string;end:string;room?:string;extra?:boolean;src?:string};
export type Train={id:string;provider:string;departure:string;arrival:string;price?:number;direct?:boolean};
export type DayPlan={date:string;lessons:Lesson[];outbound:Train[];inbound:Train[]};
export type Extra={date:string;start:string;end:string;title:string;room?:string;timetable?:string};
export type TimetableData={id:string;label:string;days:DayPlan[];error?:string;warning?:string};
