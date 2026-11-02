Uni → Treno
Web app mobile-first che legge l'orario del corso di laurea Sapienza `33443`, mantiene solo:
Valutazione d'azienda — `10627660`
Gestione economica e finanziaria dell'azienda — `10628744`
Economia e politiche dell'innovazione — `10626387`
poi cerca collegamenti ferroviari tra Padiglione (Anzio) e Roma Termini e propone le partenze compatibili con le lezioni. Il tempo università → stazione è configurato a 20 minuti.
Architettura
`app/`: UI Next.js mobile-first e API `/api/week`.
`lib/scrapers/sapienza.ts`: scopre il HTML live table dell'orario dalla pagina ufficiale e filtra le tre materie.
`lib/providers/`: adapter indipendenti per Trenitalia e Trainline.
`lib/schedule.ts`: logica di compatibilità tra lezione e treno.
`tests/`: test da aggiungere per parser e regole di viaggio.
Perché non un singolo scraper?
I siti ferroviari sono applicazioni dinamiche e possono cambiare markup. I provider sono isolati: se Trenitalia modifica il form, si aggiorna solo `lib/providers/trenitalia.ts`.
Avvio
```bash
npm install
npx playwright install chromium
cp .env.example .env.local
npm run dev
```
Apri `http://localhost:3000`.
Orario Sapienza
La pagina indicata nel progetto è:
`https://corsidilaurea.uniroma1.it/it/course/33443/attendance/timetable`
La pagina corrente pubblica l'avviso del 16/09/2026 e l'orario come HTML live table. Se la struttura dell'allegato cambia, puoi impostare `SAPIENZA_TIMETABLE_URL` direttamente al HTML live table.
Treni
Il provider principale usa browser automation sul sito pubblico di Trenitalia; Trainline è fallback. Non sono usate API private o credenziali.
> Nota: prima di pubblicare il progetto, verifica i termini d'uso dei servizi che intendi automatizzare e valuta un feed/API ufficiale o autorizzato se disponibile.
Miglioramenti consigliati
Salvare il HTML live table dell'orario con checksum e usare il parser solo quando cambia.
Aggiungere RFI come provider di verifica dell'orario programmato.
Memorizzare i risultati ferroviari per pochi minuti per ridurre il carico sui siti.
Aggiungere notifiche PWA per ricordare quando uscire dall'università.
Aggiungere test con fixture del HTML live table reale e screenshot mobile.

Fonte dell'orario
L'orario delle lezioni viene letto esclusivamente dalla tabella HTML live presente nella pagina Sapienza configurata in `CONFIG.timetableUrl`. Il PDF dell'avviso non viene scaricato, parsato o usato come fallback, perché può non riflettere le modifiche successive (in particolare aula e spostamenti).
Lo scraper usa Playwright per attendere il rendering client-side della tabella e conserva l'aula quando è presente nella riga della lezione. Se la tabella non viene trovata o non contiene le tre materie richieste, l'API restituisce un errore invece di mostrare dati obsoleti.


## Struttura
- `data/extra.json`: lezioni/seminari extra, da modificare a mano (campi: date, start, end, title, room, timetable = `all` o l'id di un orario). Basta un commit: il deploy le include.
- `lib/config.ts`: lista `TIMETABLES`. Per un secondo orario da confrontare aggiungi un oggetto (id, label, url, courses): compare il pulsante "Confronta".
- `lib/transport.ts`: orari FL8 e bus. `lib/sapienza.ts`: scraper. `lib/schedule.ts`: regole di compatibilità.
