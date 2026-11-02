import { TIMETABLES } from '../lib/config';
import { describe, expect, it } from 'vitest';
import { parseTimetableHtml } from '../lib/sapienza';

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

    const lessons = parseTimetableHtml(html,TIMETABLES[0].courses);
    expect(lessons).toHaveLength(3);
    expect(lessons.map((x) => x.courseId)).toEqual(['valutazione', 'gestione', 'innovazione']);
    expect(lessons.map((x) => x.room)).toEqual(['Aula 1', 'Aula 2', 'Aula 3']);
  });

  it('does not silently fall back to PDF data', () => {
    const html = '<html><body><a href="orario.pdf">PDF</a></body></html>';
    expect(parseTimetableHtml(html,TIMETABLES[0].courses)).toEqual([]);
  });
});
