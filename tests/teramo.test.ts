import { describe, expect, it } from 'vitest';
import { selectInbound,selectOutbound } from '../lib/schedule';
import { TE_BUS_FROM_UNI,TE_BUS_TO_UNI } from '../lib/transport';

const lesson={id:'x',courseId:'c',course:'C',date:'2026-10-05',start:'10:00',end:'12:00'};
describe('Teramo linea 7',()=>{
  it('andata: arriva almeno 10 minuti prima della lezione',()=>{
    expect(selectOutbound(TE_BUS_TO_UNI,lesson,10)[0]).toMatchObject({departure:'09:42',arrival:'09:49'});
  });
  it('ritorno: parte almeno 10 minuti dopo la fine della lezione',()=>{
    expect(selectInbound(TE_BUS_FROM_UNI,lesson,10)[0]).toMatchObject({departure:'12:19',arrival:'12:39'});
  });
  it('orari: 26 corse di andata, 25 di ritorno',()=>{
    expect([TE_BUS_TO_UNI.length,TE_BUS_FROM_UNI.length]).toEqual([26,25]);
  });
});
