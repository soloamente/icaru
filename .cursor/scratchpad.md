## Background and Motivation

Stile della sidebar: il colore del nome (email) dell'utente loggato nella `Sidebar` non è soddisfacente e va allineato al sistema di token `sidebar-*` per leggibilità e coerenza visiva.

Dashboard: è stato richiesto un grafico SPANCO circolare (donut chart) che mostri quante trattative attive si trovano in ciascuno stato SPANCO, usando l'endpoint `/api/statistics/negotiations/spanco` e Recharts. Il grafico deve essere grande, senza card/container evidente, con il totale delle trattative al centro.

## Key Challenges and Analysis

- Evitare di usare `primary-foreground` in un contesto non primario, così da non perdere contrasto con lo sfondo della sidebar.
- Mantenere la coerenza con i token già definiti in `globals.css` (`--color-sidebar-*`) e con il comportamento tra layout verticale e orizzontale della `Sidebar`.

## High-level Task Breakdown

1. Identificare il punto in cui viene renderizzato il nome/email dell'utente loggato in `Sidebar`.
2. Aggiornare le classi Tailwind in modo che il testo usi un colore `sidebar-*` appropriato (es. `text-sidebar-primary`) mantenendo la struttura esistente.
3. Verificare che non ci siano errori di compilazione/lint e che il rendering sia corretto sia in tema chiaro che scuro.

## Project Status Board

- [ ] Aggiornare il colore del nome/email dell'utente loggato nella `Sidebar` usando i token `sidebar-*`.
- [ ] Aggiornare la palette dark per lo schema colore `"rich"` (tema **Dataweb**) definendo nuovi valori oklch in `globals.css` per migliorare contrasto e leggibilità.
- [ ] Aggiungere pagina e voce di navigazione per le **trattative aperte** (`/trattative/aperte`) utilizzando `TrattativeTable` con filtro corretto.
- [ ] Aggiungere in dashboard il grafico SPANCO ad anello (Recharts) alimentato da `/statistics/negotiations/spanco` per mostrare le trattative attive per stato.
- [ ] Implementare il flusso di **Password dimenticata** e **Reset password** (dialog nella pagina di login + pagina `/reset-password`), usando gli endpoint `/api/forgot-password` e `/api/reset-password` come da specifica.

## Executor's Feedback or Assistance Requests

- Implementazione in corso per il colore del nome dell'utente loggato nella `Sidebar`. Dopo la modifica chiederò conferma all'utente per validare il risultato visivo prima di segnare il task come completato nella board.
- Sto lavorando ora in priorità sulla palette dark del tema **Dataweb** (`data-color-scheme="rich"`), aggiornando i token nella sezione `.dark[data-color-scheme="rich"]` di `globals.css`. Dopo le modifiche suggerirò un check visivo all'utente prima che il Planner dichiari il task completato.
- Ho iniziato a lavorare sulla pagina per le **trattative aperte**, aggiungendo la voce dedicata in `Sidebar` e collegandola alla route `/trattative/aperte` con un filtro che mostri solo le trattative effettivamente aperte (non abbandonate e non concluse).
- Ho aggiunto il token `--table-hover` per i temi predefiniti light e dark in `globals.css` così che l'hover `bg-table-hover` sulle righe della tabella sia visibile e coerente anche fuori dallo schema colore `rich`. Da validare visivamente in entrambi i temi.
 - Ho implementato un nuovo client API per `/api/statistics/negotiations/spanco` (`getNegotiationsSpancoStatistics`) e un componente `SpancoDonutChart` basato su Recharts, integrato nella pagina `DashboardPage`. Il grafico è grande, centrato, senza card dedicata, e mostra il totale delle trattative attive al centro con una legenda compatta sotto.
- Ho implementato il grafico SPANCO ad anello in dashboard usando Recharts (`SpancoDonutChart`) e l'endpoint `/statistics/negotiations/spanco`, con gestione chiara di loading/errore e legenda compatta; attendo validazione visiva dal Planner/utente prima di segnare il relativo task come completato.
- Ho iniziato a lavorare sul flusso di reset password: aggiungerò un dialog "Password dimenticata?" nella pagina di login e una pagina `/reset-password` che legge `token` ed `email` dalla query string, gestendo gli errori 429 (rate limit), 400 (token non valido) e 422 (validazione password) come da documento di specifica; chiederò all'utente di verificare manualmente l'invio mail e il redirect al login prima di segnare il task come completato.

## Lessons

- Quando si lavora con token come `primary-foreground`, usare invece i token specifici della sezione (es. `sidebar-*`) per evitare problemi di contrasto quando lo sfondo non è quello "primary".

