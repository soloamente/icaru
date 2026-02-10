## Background and Motivation

Stile della sidebar: il colore del nome (email) dell'utente loggato nella `Sidebar` non è soddisfacente e va allineato al sistema di token `sidebar-*` per leggibilità e coerenza visiva.

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

## Executor's Feedback or Assistance Requests

- Implementazione in corso per il colore del nome dell'utente loggato nella `Sidebar`. Dopo la modifica chiederò conferma all'utente per validare il risultato visivo prima di segnare il task come completato nella board.
- Sto lavorando ora in priorità sulla palette dark del tema **Dataweb** (`data-color-scheme="rich"`), aggiornando i token nella sezione `.dark[data-color-scheme="rich"]` di `globals.css`. Dopo le modifiche suggerirò un check visivo all'utente prima che il Planner dichiari il task completato.

## Lessons

- Quando si lavora con token come `primary-foreground`, usare invece i token specifici della sezione (es. `sidebar-*`) per evitare problemi di contrasto quando lo sfondo non è quello "primary".

