## Background and Motivation

Stile della sidebar: il colore del nome (email) dell'utente loggato nella `Sidebar` non è soddisfacente e va allineato al sistema di token `sidebar-*` per leggibilità e coerenza visiva.

Dashboard: è stato richiesto un grafico SPANCO circolare (donut chart) che mostri quante trattative attive si trovano in ciascuno stato SPANCO, usando l'endpoint `/api/statistics/negotiations/spanco` e Recharts. Il grafico deve essere grande, senza card/container evidente, con il totale delle trattative al centro.

Deploy: la build su Vercel per il monorepo (Bun + Turborepo + Next.js) rimane bloccata nella fase di `bun install`, fermandosi al log `Resolved, downloaded and extracted [62]` senza procedere alla fase di build dell'app.

## Key Challenges and Analysis

- Evitare di usare `primary-foreground` in un contesto non primario, così da non perdere contrasto con lo sfondo della sidebar.
- Mantenere la coerenza con i token già definiti in `globals.css` (`--color-sidebar-*`) e con il comportamento tra layout verticale e orizzontale della `Sidebar`.
- Capire se il blocco di `bun install` su Vercel è dovuto a una dipendenza locale (`motion-plus` via `.tgz`), a una configurazione errata del package manager o a uno script che si comporta diversamente in ambiente CI.
- Verificare che la struttura del monorepo (workspaces `apps/*` e `packages/*`, `bun.lock`, `packageManager` Bun) sia compatibile con la configurazione corrente del progetto Vercel (Install/Build command, directory di output).

## High-level Task Breakdown

1. Identificare il punto in cui viene renderizzato il nome/email dell'utente loggato in `Sidebar`.
2. Aggiornare le classi Tailwind in modo che il testo usi un colore `sidebar-*` appropriato (es. `text-sidebar-primary`) mantenendo la struttura esistente.
3. Verificare che non ci siano errori di compilazione/lint e che il rendering sia corretto sia in tema chiaro che scuro.
4. Riprodurre localmente il problema di deploy eseguendo `bun install` dalla root del monorepo e osservare se si blocca o genera errori, annotando l'output completo (successo: `bun install` termina correttamente in locale).
5. Analizzare e, se necessario, correggere la dipendenza locale `motion-plus` in `package.json` (percorso `.tgz` e inclusione nel repo) affinché Bun riesca a risolverla e installarla sia in locale sia su Vercel (successo: `bun install` completa anche in CI senza blocchi nella fase di linking).
6. Verificare e allineare la configurazione del progetto Vercel allo stack Bun + Turborepo + Next.js (Install command `bun install`, Build command `turbo build` o `bun run build`, directory di output `apps/web/.next`) e aggiornare la documentazione interna se necessario (successo: configurazione consistente tra locale e CI).
7. Rieseguire una build su Vercel, controllare i log fino al termine e confermare che la fase di installazione superi il punto "Resolved, downloaded and extracted [...]" e che la build Next.js arrivi al termine senza errori (successo: deploy completo e preview/production raggiungibile).

## Project Status Board

- [ ] Aggiornare il colore del nome/email dell'utente loggato nella `Sidebar` usando i token `sidebar-*`.
- [ ] Aggiornare la palette dark per lo schema colore `"rich"` (tema **Dataweb**) definendo nuovi valori oklch in `globals.css` per migliorare contrasto e leggibilità.
- [ ] Aggiungere pagina e voce di navigazione per le **trattative aperte** (`/trattative/aperte`) utilizzando `TrattativeTable` con filtro corretto.
- [ ] Aggiungere in dashboard il grafico SPANCO ad anello (Recharts) alimentato da `/statistics/negotiations/spanco` per mostrare le trattative attive per stato.
- [ ] Implementare il flusso di **Password dimenticata** e **Reset password** (dialog nella pagina di login + pagina `/reset-password`), usando gli endpoint `/api/forgot-password` e `/api/reset-password` come da specifica.
- [ ] Risolvere il blocco di deploy su Vercel (`bun install` che si ferma a "Resolved, downloaded and extracted [...]") assicurando che la build completi e che l'app web sia correttamente deployata.

## Executor's Feedback or Assistance Requests

- Implementazione in corso per il colore del nome dell'utente loggato nella `Sidebar`. Dopo la modifica chiederò conferma all'utente per validare il risultato visivo prima di segnare il task come completato nella board.
- Sto lavorando ora in priorità sulla palette dark del tema **Dataweb** (`data-color-scheme="rich"`), aggiornando i token nella sezione `.dark[data-color-scheme="rich"]` di `globals.css`. Dopo le modifiche suggerirò un check visivo all'utente prima che il Planner dichiari il task completato.
- Ho iniziato a lavorare sulla pagina per le **trattative aperte**, aggiungendo la voce dedicata in `Sidebar` e collegandola alla route `/trattative/aperte` con un filtro che mostri solo le trattative effettivamente aperte (non abbandonate e non concluse).
- Ho aggiunto il token `--table-hover` per i temi predefiniti light e dark in `globals.css` così che l'hover `bg-table-hover` sulle righe della tabella sia visibile e coerente anche fuori dallo schema colore `rich`. Da validare visivamente in entrambi i temi.
 - Ho implementato un nuovo client API per `/api/statistics/negotiations/spanco` (`getNegotiationsSpancoStatistics`) e un componente `SpancoDonutChart` basato su Recharts, integrato nella pagina `DashboardPage`. Il grafico è grande, centrato, senza card dedicata, e mostra il totale delle trattative attive al centro con una legenda compatta sotto.
- Ho implementato il grafico SPANCO ad anello in dashboard usando Recharts (`SpancoDonutChart`) e l'endpoint `/statistics/negotiations/spanco`, con gestione chiara di loading/errore e legenda compatta; attendo validazione visiva dal Planner/utente prima di segnare il relativo task come completato.
- Ho iniziato a lavorare sul flusso di reset password: aggiungerò un dialog "Password dimenticata?" nella pagina di login e una pagina `/reset-password` che legge `token` ed `email` dalla query string, gestendo gli errori 429 (rate limit), 400 (token non valido) e 422 (validazione password) come da documento di specifica; chiederò all'utente di verificare manualmente l'invio mail e il redirect al login prima di segnare il task come completato.
 - Ho aggiornato la dipendenza `motion-plus` nella root `package.json` da pacchetto locale (`"./motion-plus.tgz"`, che non era versionato su Git/Vercel) alla versione pubblicata su npm (`"^1.5.1"`), eseguito `bun install` dalla root e verificato che `bun run build` (che lancia `turbo build` e `next build` per `web`) completi con successo in locale. Questo dovrebbe evitare blocchi legati alla risoluzione del pacchetto su Vercel.

## Lessons

- Quando si lavora con token come `primary-foreground`, usare invece i token specifici della sezione (es. `sidebar-*`) per evitare problemi di contrasto quando lo sfondo non è quello "primary".
 - Evitare dipendenze locali `.tgz` non versionate in un monorepo destinato a Vercel; preferire pacchetti pubblicati su npm (o repository privati configurati esplicitamente) così che l'install in CI non dipenda da file presenti solo in locale.

