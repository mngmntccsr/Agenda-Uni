import { describe,it,expect } from 'vitest';
import { selectOutbound,selectInbound } from '../lib/schedule';
import { Lesson,Train } from '../lib/types';
const lesson:Lesson={id:'1',courseId:'gestione',course:'Gestione',date:'2026-09-29',start:'10:00',end:'12:00'};
const trains:Train[]=[{id:'a',provider:'x',departure:'08:30',arrival:'09:15'},{id:'b',provider:'x',departure:'09:00',arrival:'09:45'},{id:'c',provider:'x',departure:'12:30',arrival:'13:15'},{id:'d',provider:'x',departure:'12:50',arrival:'13:35'}];
describe('travel windows',()=>{it('finds outbound before lesson with station transfer',()=>expect(selectOutbound(trains,lesson).map(x=>x.id)).toContain('a'));it('finds inbound after lesson and transfer',()=>expect(selectInbound(trains,lesson).map(x=>x.id)).toContain('c'));});
