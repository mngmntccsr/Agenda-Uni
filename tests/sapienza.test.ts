import { describe, expect, it } from 'vitest';
import { parseTimetableHtml,parseEvents } from '../lib/sapienza';
import { Course } from '../lib/config';

const COURSES: Course[] = [
  { id: 'valutazione', code: '10627660', name: "Valutazione d'azienda" },
  { id: 'gestione', code: '10628744', name: "Gestione economica e finanziaria dell'azienda" },
  { id: 'innovazione', code: '10626387', name: "Economia e politiche dell'innovazione" },
];

describe('Sapienza live timetable parser', () => {
  it('reads only the requested courses and keeps the room from the HTML table', () => {
    const html = `
      <table>
        <tr><th>Data</th><th>Orario</th><th>Insegnamento</th><th>Aula</th></tr>
        <tr><td>29/09/2026</td><td>09:00 - 12:00</td><td>10627660 VALUTAZIONE D'AZIENDA</td><td>Aula 1</td></tr>
        <tr><td>29/09/2026</td><td>14:00 - 16:00</td><td>10628744 GESTIONE ECONOMICA E FINANZIARIA DELL'AZIENDA</td><td>Aula 2</td></tr>
        <tr><td>29/09/2026</td><td>16:00 - 18:00</td><td>10626387 ECONOMIA E POLITICHE DELL'INNOVAZIONE</td><td>Aula 3</td></tr>
        <tr><td>29/09/2026</td><td>10:00 - 11:00</td><td>10626375 BUSINESS PLAN</td><td>Aula 99</td></tr>
      </table>`;
    const lessons = parseTimetableHtml(html, COURSES);
    expect(lessons).toHaveLength(3);
    expect(lessons.map((x) => x.courseId)).toEqual(['valutazione', 'gestione', 'innovazione']);
    expect(lessons.map((x) => x.room)).toEqual(['Aula 1', 'Aula 2', 'Aula 3']);
  });

  it('does not silently fall back to PDF data', () => {
    expect(parseTimetableHtml('<html><body><a href="orario.pdf">PDF</a></body></html>', COURSES)).toEqual([]);
  });

  it('matches courses without a code by keyword and skips amministrativo', () => {
    const teramo: Course[] = [
      { id: 'proc-civile', code: '', name: 'Diritto processuale civile', match: ['processuale civile'] },
      { id: 'proc-penale', code: '', name: 'Diritto processuale penale', match: ['processuale penale'] },
    ];
    const json = { events: [
      { start: '2026-10-05T09:00:00', end: '2026-10-05T11:00:00', title: 'DIRITTO PROCESSUALE CIVILE' },
      { start: '2026-10-05T11:00:00', end: '2026-10-05T13:00:00', title: 'Diritto processuale penale' },
      { start: '2026-10-05T14:00:00', end: '2026-10-05T16:00:00', title: 'Diritto processuale amministrativo' },
    ] };
    expect(parseEvents(json, teramo).map((x) => x.courseId)).toEqual(['proc-civile', 'proc-penale']);
  });
});
