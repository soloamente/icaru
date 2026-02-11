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
 - [ ] Rifinire la larghezza delle colonne della tabella trattative (`/trattative/tutte`), riducendo leggermente la colonna Importo e dando più spazio a Note e Percentuale per evitare ampi vuoti visivi.
- [ ] Aggiornare le pill di stato delle trattative con i nuovi colori: azzurro per aperte, verde per concluse, rosso invariato per abbandonate.
- [ ] Abilitare l'ordinamento per colonna Importo nella tabella delle trattative.
- [ ] Abilitare l'ordinamento per colonna Percentuale nella tabella delle trattative.
- [ ] Abilitare l'ordinamento della colonna Spanco rispettando l'ordine S → P → A → N → C → O.
- [ ] Rendere la colonna SPANCO nella tabella delle trattative una pill di stato compatta per migliorare la leggibilità visiva.
- [ ] Rendere la colonna Percentuale nella tabella delle trattative una barra di avanzamento con aspetto "slider" e valore percentuale visibile all'interno.
- [ ] Spostare l'input di ricerca delle trattative su una nuova riga dell'header e aggiungere un filtro per le fasi SPANCO nello stile dei filtri header.
- [ ] Allineare l'input di ricerca e il bottone "Aggiungi" sulla stessa riga nella pagina `/trattative/concluse` quando non sono presenti filtri header.

## Executor's Feedback or Assistance Requests

- Implementazione in corso per il colore del nome dell'utente loggato nella `Sidebar`. Dopo la modifica chiederò conferma all'utente per validare il risultato visivo prima di segnare il task come completato nella board.
- Sto lavorando ora in priorità sulla palette dark del tema **Dataweb** (`data-color-scheme="rich"`), aggiornando i token nella sezione `.dark[data-color-scheme="rich"]` di `globals.css`. Dopo le modifiche suggerirò un check visivo all'utente prima che il Planner dichiari il task completato.
- Ho iniziato a lavorare sulla pagina per le **trattative aperte**, aggiungendo la voce dedicata in `Sidebar` e collegandola alla route `/trattative/aperte` con un filtro che mostri solo le trattative effettivamente aperte (non abbandonate e non concluse).
- Ho aggiunto il token `--table-hover` per i temi predefiniti light e dark in `globals.css` così che l'hover `bg-table-hover` sulle righe della tabella sia visibile e coerente anche fuori dallo schema colore `rich`. Da validare visivamente in entrambi i temi.
 - Ho implementato un nuovo client API per `/api/statistics/negotiations/spanco` (`getNegotiationsSpancoStatistics`) e un componente `SpancoDonutChart` basato su Recharts, integrato nella pagina `DashboardPage`. Il grafico è grande, centrato, senza card dedicata, e mostra il totale delle trattative attive al centro con una legenda compatta sotto.
- Ho implementato il grafico SPANCO ad anello in dashboard usando Recharts (`SpancoDonutChart`) e l'endpoint `/statistics/negotiations/spanco`, con gestione chiara di loading/errore e legenda compatta; attendo validazione visiva dal Planner/utente prima di segnare il relativo task come completato.
- Ho iniziato a lavorare sul flusso di reset password: aggiungerò un dialog "Password dimenticata?" nella pagina di login e una pagina `/reset-password` che legge `token` ed `email` dalla query string, gestendo gli errori 429 (rate limit), 400 (token non valido) e 422 (validazione password) come da documento di specifica; chiederò all'utente di verificare manualmente l'invio mail e il redirect al login prima di segnare il task come completato.
 - Ho aggiornato la dipendenza `motion-plus` nella root `package.json` da pacchetto locale (`"./motion-plus.tgz"`, che non era versionato su Git/Vercel) alla versione pubblicata su npm (`"^1.5.1"`), eseguito `bun install` dalla root e verificato che `bun run build` (che lancia `turbo build` e `next build` per `web`) completi con successo in locale. Questo dovrebbe evitare blocchi legati alla risoluzione del pacchetto su Vercel.
 - Ho regolato il template di griglia delle colonne in `TrattativeTable` (header e righe) per la pagina `/trattative/tutte`, riducendo leggermente la larghezza massima della colonna "Importo" e aumentando quella della percentuale e delle note, così da eliminare l'eccesso di spazio vuoto sull'importo e dare più aria al contenuto testuale e alla pill di avanzamento.
 - Ho ulteriormente ampliato la colonna "Cliente" nella `TrattativeTable` rimuovendo l'avatar per lasciare più spazio al nome (specialmente per ragioni sociali lunghe) e ho aumentato il contrasto del testo all'interno della pill di avanzamento percentuale usando `text-foreground`, così che il valore (es. "30%") risulti più leggibile sopra il track e la barra verde.
- Ho aggiornato le pill di stato in `TrattativeTable` applicando il nuovo schema cromatico richiesto (azzurro per aperte, verde per concluse, rosso invariato per abbandonate) e chiedo un controllo visivo per confermare che i colori siano corretti.
- Ho implementato l'ordinamento per "Importo" in `TrattativeTable` con un controllo nel header che cicla tra nessun ordinamento, decrescente e crescente; invito l'utente a verificare che il comportamento sia corretto prima di chiudere il task.
- Sto estendendo lo stesso comportamento di ordinamento alle colonne "Spanco" (ordine S → P → A → N → C → O) e "Percentuale", assicurandomi che sia attivo un solo ordinamento alla volta; aggiornerò qui quando pronto per la validazione.
 - Ho aggiornato l'allineamento del bottone di ordinamento "Importo" nell'header di `TrattativeTable` su `/trattative/tutte`, passando da `justify-end` a `justify-start` per rispettare il feedback visivo sulla disposizione del testo e dell'icona.
- Ho trasformato il valore SPANCO nella `TrattativeTable` in una pill di stato compatta (chip arrotondato con background `bg-table-header` e testo tabulare), in modo da renderlo visivamente coerente con le altre pill di stato pur mantenendo una gerarchia visiva distinta rispetto allo stato finale della trattativa.
- Ho sostituito il semplice testo della colonna "Percentuale" in `TrattativeTable` con una barra di avanzamento orizzontale (effetto slider) che riempie in base al valore `%` e mostra il numero all'interno, migliorando la leggibilità visiva dell'avanzamento su `/trattative/tutte`; attendo conferma visiva prima di marcare il relativo task come completato.
- Ho aggiornato l'header di `TrattativeTable` spostando la barra di ricerca su una seconda riga dedicata e aggiungendo un filtro locale per le fasi SPANCO (basato su Radix `Select`), così da poter limitare rapidamente la vista a una singola fase; chiedo una verifica visiva e funzionale sulla pagina `/trattative/tutte` prima di segnare il relativo task nella board come completato.
- Ho allineato il colore di background dei filtri SPANCO/Stato alla stessa variabile usata per la search bar (`bg-table-buttons`), così che tutti i controlli di header abbiano lo stesso peso visivo e risultino coerenti tra loro.
- Per la search bar di `TrattativeTable` su `/trattative/tutte` ho aggiunto un'icona "delete left" dedicata che compare solo quando l'utente ha digitato del testo: cliccarla cancella il termine di ricerca e mantiene il focus nell'input, così da poter ripartire a scrivere immediatamente.
- Ho regolato il layout dell'header di `TrattativeTable` in modo che, quando non sono presenti filtri header (come su `/trattative/concluse`), il campo di ricerca venga mostrato sulla stessa riga del bottone "Aggiungi", posizionato a sinistra del bottone, mentre nelle viste con filtri mantiene la disposizione su due righe (filtri + search sotto al titolo).
 - Ho aggiunto una transizione animata tra l'icona di ricerca e l'icona "delete left" nella search bar di `TrattativeTable`, usando `AnimatePresence` di `motion/react` per far ruotare e sfumare le icone quando il campo passa da vuoto a pieno (e viceversa), mantenendo il focus nell'input quando si cancella il testo.

## Lessons

- Quando si lavora con token come `primary-foreground`, usare invece i token specifici della sezione (es. `sidebar-*`) per evitare problemi di contrasto quando lo sfondo non è quello "primary".
 - Evitare dipendenze locali `.tgz` non versionate in un monorepo destinato a Vercel; preferire pacchetti pubblicati su npm (o repository privati configurati esplicitamente) così che l'install in CI non dipenda da file presenti solo in locale.

