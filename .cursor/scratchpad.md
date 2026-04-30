## Background and Motivation

### Onborda Website Tour

È stata richiesta l'integrazione di **Onborda** per creare un tour guidato dell'intero sito. Al primo accesso, l'utente deve ricevere una scelta chiara: iniziare il tour oppure saltarlo. Dopo la fine o lo skip, deve restare disponibile un bottone nel footer della Sidebar per riavviare il tour manualmente.

La direzione confermata è: **tour completo del sito**, con step diversi in base al ruolo dell'utente e alle sezioni effettivamente accessibili (es. Direttore/Venditore/Admin). Il tour deve essere customizzato per rispettare stile, vibe e pattern visivi esistenti dell'app (sidebar, card, table-container, pill, token colore e mobile navigation).

Stile della sidebar: il colore del nome (email) dell'utente loggato nella `Sidebar` non è soddisfacente e va allineato al sistema di token `sidebar-*` per leggibilità e coerenza visiva.

Dashboard: è stato richiesto un grafico SPANCO circolare (donut chart) che mostri quante trattative attive si trovano in ciascuno stato SPANCO, usando l'endpoint `/api/statistics/negotiations/spanco` e Recharts. Il grafico deve essere grande, senza card/container evidente, con il totale delle trattative al centro.

Deploy: la build su Vercel per il monorepo (Bun + Turborepo + Next.js) rimane bloccata nella fase di `bun install`, fermandosi al log `Resolved, downloaded and extracted [62]` senza procedere alla fase di build dell'app.

### Team Management (Gestione Team)

È stata richiesta una sezione completa di gestione dei team con organigramma (organization chart) visuale. Il backend Laravel espone un set completo di API per CRUD team, gestione membri e statistiche. L'interfaccia deve seguire gli stessi pattern e design delle altre pagine (clienti, trattative, dashboard).

**Requisiti principali:**
- **Direttore Vendite:** CRUD completo sui team, gestione membri, toggle `creator_participates`, statistiche
- **Venditore:** solo vista minimale dei team a cui è assegnato (id, nome, creator)
- **Admin:** nessun accesso ai team
- **Organigramma:** vista ad albero con il creator in alto e i membri sotto, con "skeleton" placeholder cliccabili per aggiungere nuovi membri tra quelli disponibili
- **Stile:** coerente con clienti/trattative (card `bg-card`, `table-container-bg`, stats cards, pill, ecc.)

## Key Challenges and Analysis

### Onborda Website Tour — Sfide tecniche e UX

- Onborda richiede target basati su `id` e una lista di tour/step configurata. Serve aggiungere gli `id` in modo stabile ai punti chiave dell'interfaccia senza alterare layout o stile.
- Il sito ha navigazione role-based: il tour deve filtrare gli step in base a `auth.role` e non deve tentare di evidenziare elementi non presenti per quel ruolo.
- Approccio confermato: usare **un provider Onborda globale** con **configurazione step role-aware** centralizzata e un'unica card custom in stile ICARU. Evitare tour completamente duplicati per ruolo; filtrare/assemblare gli step in base al ruolo corrente.
- Il flusso iniziale deve evitare jank di hydration: auth e preferenze arrivano da `localStorage`, quindi la richiesta "Vuoi fare il tour?" va mostrata solo dopo che l'utente autenticato e il layout sono pronti.
- Il bottone "Rifai tour" nel footer della Sidebar deve convivere con "Ricerca rapida" e "Preferenze" sia in sidebar verticale sia in navbar top/bottom.
- Il tour deve attraversare più route (dashboard, clienti, trattative, team, statistiche) usando gli step `nextRoute`/`prevRoute` di Onborda e aspettandosi che alcuni elementi siano caricati in modo asincrono.
- Persistenza: va definito se lo skip/completamento vive solo nel browser o per account lato backend. La soluzione più semplice è `localStorage` per utente/ruolo.
- Decisione confermata: per ora skip/completamento tour verranno salvati **solo in `localStorage`** (per browser/dispositivo), idealmente con chiave legata a utente/ruolo per evitare collisioni tra account diversi.
- Decisione UX confermata: il prompt iniziale userà una **soft center modal** arrotondata, coerente con dialog/card esistenti, con due azioni chiare: "Salta" e "Inizia tour".
- Decisione flusso confermata: il tour deve **auto-navigare tra le pagine** principali mentre l'utente preme "Avanti" (es. Dashboard → Clienti → Trattative → Team → Statistiche), invece di chiedere navigazione manuale.
- Decisione copy confermata: testi del tour **solo in italiano** per la prima versione, coerenti con le label attuali dell'interfaccia.

- Evitare di usare `primary-foreground` in un contesto non primario, così da non perdere contrasto con lo sfondo della sidebar.
- Mantenere la coerenza con i token già definiti in `globals.css` (`--color-sidebar-*`) e con il comportamento tra layout verticale e orizzontale della `Sidebar`.
- Capire se il blocco di `bun install` su Vercel è dovuto a una dipendenza locale (`motion-plus` via `.tgz`), a una configurazione errata del package manager o a uno script che si comporta diversamente in ambiente CI.
- Verificare che la struttura del monorepo (workspaces `apps/*` e `packages/*`, `bun.lock`, `packageManager` Bun) sia compatibile con la configurazione corrente del progetto Vercel (Install/Build command, directory di output).

### Team Management — Sfide tecniche e di design

1. **Organigramma (Org Chart):** Non è una tabella piatta ma una vista ad albero. Il team ha una struttura semplice: un creator (direttore) in cima + N membri sotto. L'org chart sarà composto da:
   - **Nodo Creator:** card in alto al centro con nome, cognome, ruolo, e indicatore se partecipa (`creator_participates`). Toggle "Partecipa al team" direttamente sul nodo.
   - **Nodi Membri:** card sotto, collegati con linee verticali/orizzontali. Ogni card mostra nome, cognome, email, ruolo (badge Venditore/Direttore). Bottone rimuovi su hover.
   - **Skeleton "Aggiungi membro":** card tratteggiata/punteggiata con "+" che al click apre un dropdown con la lista dei membri disponibili (`GET /api/teams/available-members`). Pulsing animation come placeholder.

2. **Routing e ruoli:** Servono percorsi distinti in base al ruolo:
   - Direttore: `/team` (lista completa) → `/team/crea` → `/team/[id]` (dettaglio con organigramma) → `/team/[id]/modifica`
   - Venditore: `/team` (i miei team, vista minimale)
   - Admin: redirect a dashboard

3. **Sidebar update:** Aggiungere voce "Team" nella sidebar (visibile solo a Direttore e Venditore, come per Trattative/Clienti).

4. **Layout content update:** Aggiungere `/team` ai percorsi visibili nella sidebar per `LayoutContent`.

5. **API types e client:** Definire tutti i tipi TypeScript e le funzioni client per i 10 endpoint team documentati.

6. **Statistiche team:** Cards riassuntive (pipeline, concluse, abbandonate) nella pagina di dettaglio, coerenti con lo stile dashboard/trattative.

## High-level Task Breakdown

### Onborda Website Tour — Piano di implementazione

**Task 1: Dependency e setup base Onborda**
- Aggiungere `onborda` alle dipendenze dell'app web.
- Aggiornare Tailwind v4/CSS source include se necessario per le classi distribuite da Onborda.
- **Criterio di successo:** l'app compila con `onborda` installato e senza errori di import.

**Task 2: Target stabili per il tour**
- Aggiungere `id` semantici e stabili ai target principali: shell layout, Sidebar/nav/footer, Dashboard, Clienti, Trattative, Team, Statistiche.
- Evitare target su righe dinamiche o contenuti che possono non esistere.
- **Criterio di successo:** ogni step pianificato ha un selector presente per il ruolo/pagina pertinente.

**Task 3: Configurazione role-aware degli step**
- Creare una configurazione centralizzata (es. `tour-steps.tsx`) con testi italiani, route transition e filtri per ruolo.
- Assemblare un tour `main` senza duplicare interi tour per ruolo.
- **Criterio di successo:** Direttore/Venditore/Admin ricevono sequenze coerenti con le sezioni accessibili.

**Task 4: UI custom del tour**
- Creare card Onborda custom in stile ICARU (rounded, `bg-card`/`bg-popover`, testo muted, pill buttons, motion breve).
- Creare modal iniziale soft-center con azioni "Inizia tour" e "Salta".
- **Criterio di successo:** il prompt e le card del tour sono coerenti con dialog/card esistenti e accessibili.

**Task 5: Provider globale e persistenza**
- Integrare `OnbordaProvider`/`Onborda` nel layout client/authenticated app shell.
- Mostrare il prompt solo dopo hydration/auth ready.
- Salvare skip/completamento in `localStorage`, con chiave scoped per versione tour + user + ruolo.
- **Criterio di successo:** il prompt appare una sola volta per utente/ruolo/browser e si può riaprire il tour manualmente.

**Task 6: Sidebar footer "Rifai tour"**
- Aggiungere un bottone footer in Sidebar verticale e navbar top/bottom che richiama `startOnborda("main")`.
- Deve convivere con "Ricerca rapida" e "Preferenze" senza rompere layout o mobile overlay.
- **Criterio di successo:** il tour si riavvia da qualsiasi pagina con Sidebar visibile.

**Task 7: Verifica completa**
- Testare flow first-run, skip, complete, restart, ruoli, auto-navigation e mobile/top/bottom nav.
- Eseguire typecheck/lint disponibili.
- **Criterio di successo:** nessun step targetta UI nascosta/inaccessibile e i controlli funzionano su desktop/mobile.

### (Vecchi task — sidebar color, deploy, ecc.)
1–7: vedi task precedenti (sidebar color, deploy Vercel — completati o in standby).

### Team Management — Piano di implementazione

**Task 1: Tipi TypeScript per le API Team** (`apps/web/src/lib/api/types.ts`)
- Aggiungere: `ApiTeamCreator`, `ApiTeamUser`, `ApiTeam`, `ApiTeamMinimal`, `ApiAvailableMember`, `ApiTeamStats`, `CreateTeamBody`, `UpdateTeamBody`, `AddTeamMembersBody`
- **Criterio di successo:** Tipi compilano senza errori, coprono tutti i campi documentati dall'API.

**Task 2: Funzioni client API Team** (`apps/web/src/lib/api/client.ts`)
- Aggiungere 10 funzioni: `listAvailableMembers`, `listTeams`, `listMyTeams`, `createTeam`, `getTeam`, `updateTeam`, `deleteTeam`, `addTeamMembers`, `removeTeamMember`, `getTeamStats`
- Seguire lo stesso pattern `{ data } | { error }` delle altre funzioni.
- **Criterio di successo:** Tutte le funzioni compilano, seguono i pattern esistenti, endpoint URL corretti.

**Task 3: Sidebar — Aggiungere voce "Team"**
- Aggiungere "Team" come voce flat in `flatNavItems` nella Sidebar (tra "Clienti" e "Trattative" o dopo "Clienti").
- Visibile solo a `director` e `seller` (come `canSeeClienti`).
- Icona: `UserGroupIcon` o un'icona team dedicata (lucide `Users`).
- Aggiungere `/team` al tipo `AppRoute`.
- **Criterio di successo:** Voce "Team" visibile in sidebar per direttore e venditore, link funzionante a `/team`.

**Task 4: LayoutContent — Abilitare sidebar su `/team`**
- Aggiungere `"/team"` all'array `visibleSidebarPaths` in `layout-content.tsx`.
- **Criterio di successo:** Navigando a `/team` la sidebar è visibile.

**Task 5: Pagina lista team — Direttore** (`/team` page)
- Per `director`: tabella/griglia dei team (`GET /api/teams`) con nome, creator, conteggio membri, `creator_participates` toggle, azioni (dettaglio, modifica, elimina).
- Per `seller`: vista minimale "I miei team" (`GET /api/teams/my-teams`) con solo nome team e nome creator.
- Stats cards: totale team, totale membri, ecc.
- **Criterio di successo:** Pagina funzionante, dati caricati da API, ruoli gestiti correttamente.

**Task 6: Pagina dettaglio team con Organigramma** (`/team/[id]`)
- Org chart: creator in alto → membri sotto con connettori.
- Ogni nodo membro: avatar, nome, cognome, email, badge ruolo, bottone rimuovi (solo director).
- Nodo creator: evidenziato, toggle `creator_participates`.
- **Skeleton "Aggiungi membro":** card punteggiata con icona "+" al centro. Pulsing animation. Al click → dropdown/popover con lista `available-members` per selezionare chi aggiungere.
- Sezione statistiche team: cards pipeline/concluse/abbandonate (`GET /api/teams/{id}/stats`).
- **Criterio di successo:** Org chart renderizzato con dati reali, aggiunta/rimozione membri funzionanti, statistiche visibili.

**Task 7: Pagina creazione team** (`/team/crea`)
- Form: nome, descrizione, toggle `creator_participates`, multi-select membri (da `available-members`).
- Submit → `POST /api/teams`, redirect a dettaglio.
- **Criterio di successo:** Form funzionante, team creato con successo, redirect al dettaglio.

**Task 8: Pagina modifica team** (`/team/[id]/modifica`)
- Precompila form con dati team (`GET /api/teams/{id}`) + available members.
- Salvataggio → `PUT /api/teams/{id}`.
- Conferma uscita con modifiche non salvate (stesso pattern trattative).
- **Criterio di successo:** Form precompilato, modifica salvata, gestione unsaved changes.

**Task 9: Eliminazione team** (dialog/modale dalla lista o dal dettaglio)
- Conferma modale prima di `DELETE /api/teams/{id}`.
- Redirect a lista dopo eliminazione.
- **Criterio di successo:** Dialog conferma, team eliminato, redirect a lista.

**Task 10: Raffinamenti e polish**
- Animazioni (motion/react) coerenti con il resto dell'app.
- Skeleton loading per org chart durante caricamento.
- Empty states (nessun team, nessun membro).
- Responsive: org chart che si adatta su mobile.

### Team Cards View — Migrazione da tabella a cards

È stato richiesto di migliorare la visualizzazione dei team nella pagina `/team`. Attualmente i team vengono mostrati come tabella (righe con colonne Nome, Creatore, Membri, Partecipa, Azioni). La richiesta è di passare a una visualizzazione a **cards** coerente con il design system del sito (come le stat cards in dashboard).

**Requisiti:**
- Le cards devono mostrare: nome team, descrizione (se presente), creator, conteggio membri, badge `creator_participates`, azioni (dettaglio, elimina)
- Layout a griglia responsive (3 colonne desktop, 2 tablet, 1 mobile)
- Stile coerente con le stat cards della dashboard (`bg-background`, `rounded-4xl`, hover effect)
- Mantenere le stats cards "Totale team" e "Totale membri" in alto
- Card cliccabile per aprire il dettaglio team
- Pulsante elimina con stato di loading

### Team Update — 2026-03-09 — Supervisione & SPANCO

**Task 11: Allineare documentazione Teams all'ultima specifica** (`api_documentaion.md`)
- Integrare una sezione dedicata ai Team che descriva:
  - Regole di accesso per ruolo (Direttore Vendite, Venditore, Admin).
  - Vincolo su `creator_participates` con messaggio di errore 403: "Solo il creatore del team può modificare la propria partecipazione.".
  - Struttura e significato dei campi della risposta di `GET /api/teams/{id}/stats` allineati alla dashboard personale, con definizioni formali (aperte, concluse, abbandonate escluse).
  - Nuovi endpoint di SPANCO del team (`GET /api/teams/{id}/spanco`) e di supervisione membro (`/api/teams/{teamId}/members/{memberId}/stats|spanco|negotiations|map`) con esempi di risposta.
- **Criterio di successo:** il documento diventa l'unica fonte di verità leggibile per i Team, riflette tutto il contenuto della nota "Update — 2026-03-09 — Teams" e non contiene riferimenti a campi rimossi (`member_ids`, `pipeline`, `concluded`, `abandoned`).

**Task 12: UI SPANCO del team nella pagina dettaglio** (`apps/web/src/components/team-org-chart.tsx` + eventuale componente grafico riusabile)
- Estendere la pagina dettaglio team (`/team/[id]`, componente `TeamOrgChart`) con una sezione SPANCO di team che:
  - Usa `getTeamSpancoStatistics` (client già presente) per chiamare `GET /api/teams/{id}/spanco`.
  - Visualizza la distribuzione SPANCO in un grafico (idealmente riusando pattern/legenda del grafico personale SPANCO in dashboard) e/o in una lista tabellare leggibile.
  - Gestisce chiaramente loading, errori 403/500 e stato "nessuna trattativa" con messaggi testuali coerenti con il resto dell'app.
- **Criterio di successo:** un Direttore Vendite, aprendo `/team/[id]`, vede sia i KPI aggregati che la distribuzione SPANCO del team con lo stesso vocabolario visivo del grafico personale; nessun riferimento ai campi SPANCO rimossi dalla vecchia risposta Team.

**Task 13: Vista di supervisione singolo membro del team** (nuova route, es. `apps/web/src/app/team/[teamId]/members/[memberId]/page.tsx` + componenti dedicati)
- Definire una vista dedicata alla supervisione di un venditore, concettualmente unica (non esistono trattative "nel team" vs "fuori dal team"): tutte le trattative del venditore vengono conteggiate comunque nella statistica del team.
- **Entrata principale:** bottone/CTA "Dettagli venditore" sul `MemberNode` dell'organigramma (`OrgChartSection` in `team-org-chart.tsx`), che porta a `/team/[teamId]/members/[memberId]`. In alternativa si può rendere l'intera card cliccabile (rigorosamente separata dal bottone "Rimuovi" tramite `stopPropagation`).
- La vista deve:
  - Riutilizzare la shell grafica delle pagine di dettaglio esistenti (header con "Torna al team", titolo "Venditore {Nome Cognome}", azioni contestuali se servono).
  - Mostrare i **KPI personali** del venditore usando `getTeamMemberStatistics` (`GET /api/teams/{teamId}/members/{memberId}/stats`) in 3–4 stat cards in alto, con lo stesso linguaggio visivo dei KPI in `/dashboard`.
  - Mostrare lo **SPANCO personale** del venditore usando `getTeamMemberSpancoStatistics` (`/spanco`), con un grafico ad anello riusando il componente `SpancoDonutChart` (stesso design della dashboard) ma alimentato con i dati del venditore.
  - Esporre una **mappa** delle trattative non abbandonate con coordinate (`listTeamMemberNegotiationsWithCoordinates`), riutilizzando il pattern di mappa già usato per `/negotiations/me/with-coordinates` (cluster, tooltip, focus).
  - Elencare **tutte le trattative del venditore** (`listTeamMemberNegotiations`) con le stesse colonne base e lo stesso look & feel di `TrattativeTable`, in una sezione tabellare sotto grafico e mappa, chiarendo lo stato (aperta/conclusa/abbandonata) con le stesse pill di stato.
  - Gestire loading/error in modo coerente con le altre pagine (skeleton iniziali, banner di errore locale quando gli endpoint di supervisione falliscono).
  - Gestire in modo esplicito il caso `403` ("Il Direttore può accedere ai dati di un venditore solo se è membro effettivo del team indicato"): messaggio chiaro + CTA "Torna al team" per rientrare in `/team/[teamId]`.
- **Criterio di successo:** da `/team/[id]` un Direttore può entrare in una pagina di supervisione membro che offre, in una singola shell grafica coerente con `/dashboard`, i KPI, lo SPANCO ad anello, la mappa e la tabella delle trattative del venditore, con un flusso di entrata chiaro dalla card dell'organigramma e nel rispetto dei vincoli di autorizzazione descritti nella specifica.

## Project Status Board

- [ ] Implementare tour Onborda completo e role-aware con prompt iniziale, persistenza `localStorage`, auto-navigation e bottone Sidebar "Rifai tour". **Implementazione portata nel checkout principale; fix hydration applicata al prompt iniziale. In attesa di validazione manuale first-run/restart su `localhost:3001`.**
- [ ] `/team`: sostituire la vista tabellare dei team con una griglia di cards responsive (Director + Seller) e skeleton minimal con info essenziali durante il caricamento. **In attesa di validazione manuale utente**.
- [ ] Aggiornare `api_documentaion.md` con una sezione completa dedicata ai Team (vincolo `creator_participates`, statistiche team, SPANCO team, supervisione membri) allineata alla specifica "Update — 2026-03-09 — Teams". **Implementato nella doc, in attesa di validazione manuale utente.**
- [ ] Aggiungere nella pagina dettaglio team (`/team/[id]`) una sezione SPANCO di team che usa `getTeamSpancoStatistics` per visualizzare la distribuzione SPANCO con un grafico coerente con lo SPANCO personale.
- [ ] Implementare una vista di supervisione per singolo membro del team (stats, SPANCO, lista trattative, mappa) basata sugli endpoint `/api/teams/{teamId}/members/{memberId}/stats|spanco|negotiations|map`, con gestione esplicita dei 403 quando il membro non appartiene al team.
- [ ] Aggiornare il colore del nome/email dell'utente loggato nella `Sidebar` usando i token `sidebar-*`.
- [ ] Aggiornare la palette dark per lo schema colore `"rich"` (tema **Dataweb**) definendo nuovi valori oklch in `globals.css` per migliorare contrasto e leggibilità.
- [ ] Aggiungere pagina e voce di navigazione per le **trattative aperte** (`/trattative/aperte`) utilizzando `TrattativeTable` con filtro corretto.
- [ ] Rifinire lo stile del dialog "Nuova trattativa" (pagina `/trattative/aperte` e affini) rendendo il contenuto più arrotondato e allineato ai pattern di design esistenti (label+input/ select con pill arrotondate).
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
 - [ ] Allineare la barra di ricerca dei clienti sulla stessa riga del titolo nella pagina `/clienti`.
- [ ] Rendere pienamente funzionante la ricerca nella tabella clienti (`/clienti`) e avvolgere il totale clienti in `AnimateNumber` per un contatore animato.
 - [ ] Allineare l'icona del titolo "Clienti" nella pagina `/clienti` con quella usata per la voce "Clienti" nella `Sidebar`.
- [ ] Aggiungere nel footer della `Sidebar` (tutti i layout) un bottone "Ricerca rapida" che apre il command palette globale (cmdk) con indicazione della scorciatoia da tastiera (⌘K / Ctrl+K) al posto di "Supporto".
- [ ] Aggiungere nella sezione "Dati trattativa" dell'editor (`/trattative/aperte/[id]` e affini) i campi di sola lettura "Telefono" (cliente) e "Data apertura" (created_at) rispettando l'ordine finale richiesto: Ragione sociale, Telefono, Data apertura, Referente, Note.
- [ ] Aggiungere nella tabella clienti (`/clienti`) una colonna per indicare se esiste già almeno una trattativa associata al cliente, con pill di stato e bottone "Aggiungi" quando non ci sono trattative.
- [ ] Aggiungere una pagina di dettaglio cliente (`/clienti/[id]`) con form di modifica dei dati anagrafici e dell'indirizzo, conferma di uscita in caso di modifiche non salvate (stesso pattern delle trattative) e collegamento diretto dalla tabella clienti.
- [ ] Rendere l'intera riga della tabella clienti (`/clienti`) cliccabile per aprire la pagina di dettaglio cliente, mantenendo indipendenti i pulsanti nella colonna "Trattativa".
 - [ ] Abilitare lo scroll verticale su mobile per la tabella clienti quando l'elenco supera l'altezza dello schermo (`/clienti`), limitando lo scroll alla sola lista (contenitore `scroll-fade-y`) e non all'intera card/pagina.
 - [ ] Abilitare lo scroll verticale su mobile per la tabella trattative quando l'elenco supera l'altezza dello schermo (`/trattative/*`), limitando lo scroll alla sola lista (contenitore `scroll-fade-y`) e non all'intera card/pagina.
- [ ] `/team/[id]/members/[memberId]` refinement: filtri pill (data/SPANCO/stato + search pill) con `bg-card` in light e dark. **In attesa di validazione manuale**.
- [ ] `/team/[id]/members/[memberId]` refinement: rimuovere la shadow non necessaria dal surface della search pill ("SegmentViewNode" feedback). **In attesa di validazione manuale**.
- [ ] `/team/[id]/members/[memberId]` refinement: spostare il conteggio “trattative trovate” sulla stessa riga del titolo (allineato a destra) come richiesto dal feedback. **In attesa di validazione manuale**.
- [ ] Fix mobile `/trattative/tutte` dialog "Nuova trattativa": dropdown `Spanco` deve ricevere correttamente i tap sopra i campi sottostanti (portal dentro Drawer). **Implementato, in attesa di validazione manuale utente.**

## Executor's Feedback or Assistance Requests

- **Onborda Website Tour — Task 1 completato in worktree `.worktrees/onborda-website-tour`:** aggiunta dipendenza `onborda` all'app web, aggiunte peer dependencies richieste (`framer-motion`, `@radix-ui/react-portal`), aggiornato `bun.lock`, e aggiunto `@source "../../../node_modules/onborda/dist/**/*.{js,ts,jsx,tsx}";` in `globals.css` dopo il gruppo di `@import` per rispettare Biome. `bun --cwd apps/web build` passa nel worktree. Review spec: compliant. Review qualità: approved. Nota: resta un warning/lint preesistente in `globals.css` sulla specificity discendente, non introdotto dal task.
- **Onborda Website Tour — Task 2 completato in worktree `.worktrees/onborda-website-tour`:** creato `apps/web/src/lib/onborda/tour-storage.ts` con `MAIN_TOUR_NAME`, `MAIN_TOUR_VERSION`, chiave `localStorage` scoped per tour/versione/ruolo/email e helper SSR-safe `readTourState` / `writeTourState`. Build equivalente da `apps/web` passa (`bun run build`); `ReadLints` sul nuovo file non segnala errori. Review spec: compliant. Review qualità: approved.
- **Onborda Website Tour — Task 3 completato in worktree `.worktrees/onborda-website-tour`:** creato `apps/web/src/lib/onborda/tour-steps.tsx` con configurazione centralizzata del tour `main`, copy italiana, step shared + commerciali role-aware (Direttore/Venditore) e fallback Admin/unknown solo shared + wrap-up. Corretta la sequenza route dopo review per non saltare step sulla stessa pagina (Clienti search, Trattative controls). `bun run build` da `apps/web` passa; diagnostics sul file pulite. Review spec: compliant. Review qualità: approved.
- **Onborda Website Tour — Task 4 completato in worktree `.worktrees/onborda-website-tour`:** creati `apps/web/src/components/onborda-tour-card.tsx` e `apps/web/src/components/onborda-start-dialog.tsx`. La card custom usa stile ICARU (`bg-popover`, `bg-table-header`, rounded, focus ring), step indicator e controlli Avanti/Indietro/Fine; dopo review il bottone chiudi viene renderizzato solo quando `closeOnborda` esiste e non accetta prop arbitrarie inutilizzate. Il dialog iniziale usa Base UI Dialog, copy italiana e azioni "Salta" / "Inizia tour". `bun run build` da `apps/web` passa; scoped Ultracite sui due file passa. Review spec: compliant. Review qualità: approved.
- **Onborda Website Tour — Task 5 completato in worktree `.worktrees/onborda-website-tour`:** creato `apps/web/src/components/onborda-tour-provider.tsx` e integrato `OnbordaTourProvider` in `providers.tsx` dentro `AuthProvider`. Il provider usa `buildMainTour(auth?.role)`, `OnbordaProvider`, `cardComponent`, prompt iniziale gated da hydration/auth e `localStorage`, skip persisted, evento `dispatchRedoTour`, e start/redo robusto: invece di `setTimeout` fisso, usa pending-start cancellabile e aspetta `/dashboard` + `#tour-dashboard-shell` prima di chiamare `startOnborda`. Aggiornato anche `tour-storage.ts` con `try/catch` su `localStorage`. `bun run build` da `apps/web` passa; scoped Ultracite sui file toccati passa. Review spec: compliant. Review qualità: approved. Nota: persistenza `completed` resta volutamente per Task 8.
- **Onborda Website Tour — Task 6 completato in worktree `.worktrees/onborda-website-tour`:** aggiornato `apps/web/src/components/sidebar.tsx` con import `RotateCcw` e `dispatchRedoTour`, `tourId` sugli item footer, ids stabili `tour-sidebar-navigation`, `tour-sidebar-quick-search`, `tour-sidebar-preferences`, `tour-sidebar-redo-tour`, e nuovo bottone "Rifai tour" che rilancia il tour e chiude la sidebar mobile quando aperta. `bun run build` da `apps/web` passa; scoped Ultracite su `sidebar.tsx` passa. Review spec: compliant. Review qualità: approved.
- **Onborda Website Tour — Task 7 completato in worktree `.worktrees/onborda-website-tour`:** aggiunti target id stabili senza modifiche visuali a Dashboard (`tour-dashboard-shell`, `tour-dashboard-stats`), Clienti (`tour-clienti-shell`, `tour-clienti-search`), Trattative (`tour-trattative-shell`, `tour-trattative-controls`), Team (`tour-team-shell`, opzionale `tour-team-org-chart`) e Statistiche (`tour-statistiche-shell`, opzionali map/monthly/spanco). `bun run build` da `apps/web` passa; diagnostics mostrano solo warning preesistenti nei componenti grandi. Review spec: compliant con verifica `git -C`; review qualità: approved.
- **Onborda Website Tour — Task 8 completato in worktree `.worktrees/onborda-website-tour`:** aggiunto `apps/web/src/lib/onborda/tour-events.ts` e collegato evento di completamento senza import circolari: la card dispatcha completion solo quando l'utente preme "Fine" sull'ultimo step, il provider ascolta l'evento e salva `completed` in `localStorage` con la chiave utente/ruolo corrente. La chiusura via X resta distinta e non marca il tour completato. `dispatchRedoTour` resta disponibile per la Sidebar. `bun run build` da `apps/web` passa; scoped Ultracite sui file toccati passa. Review spec: compliant. Review qualità: approved.
- **Onborda Website Tour — Task 9 bloccato da autenticazione:** dev server del worktree avviato su `http://localhost:3002` (porta 3001 occupata dal server root). Browser QA conferma che l'app risponde e che un utente non autenticato viene rediretto a `/login`; la pagina login mostra il form "Benvenuto su Icaru" e il bottone "Accedi" disabilitato a campi vuoti. Non è stato possibile verificare prompt iniziale, "Salta", "Rifai tour", auto-navigation, close vs completed, ruoli o mobile/nav variants senza credenziali valide o sessione autenticata per origin `localhost:3002`. Richiesta assistenza: servono credenziali test (preferibilmente Director/Seller, opzionale Admin) oppure un modo sicuro per importare una sessione valida.
- **Onborda Website Tour — Fix spotlight responsive:** dopo feedback utente, abbandonato il tentativo di riposizionare lo spotlight interno di Onborda tramite style override, perché Onborda continua ad applicare transform e coordinate proprie. `OnbordaTourCard` ora nasconde overlay/pointer interni e renderizza un highlight custom in portal su `document.body`, calcolato da `getBoundingClientRect()` del target, clippato alla viewport e animato insieme alla card. `ReadLints` su `onborda-tour-card.tsx` pulito; `bun --cwd apps/web build` passa (restano solo warning CSS preesistenti su `@property`). Richiesta verifica manuale: riprovare tour su desktop/mobile e controllare che ogni evidenziamento circondi il target.
- **Onborda Website Tour — Confetti snow style:** sostituito l'effetto confetti custom basato su elementi DOM con `canvas-confetti` e un effetto "snow" breve alla fine del tour: particelle circolari bianche/azzurrine che cadono dall'alto con drift leggero, durata controllata e `disableForReducedMotion`. Aggiunte dipendenze `canvas-confetti` e `@types/canvas-confetti` in `apps/web`. `ReadLints` pulito su `onborda-tour-card.tsx`/`package.json`; `bun run build` da `apps/web` passa (restano solo warning CSS preesistenti su `@property`). Richiesta verifica manuale: completare il tour e controllare che l'effetto neve sia visibile ma non invasivo.
- **Onborda Website Tour — Confetti più celebrativi:** dopo feedback utente, sostituito `canvas-confetti` con `@neoconfetti/react`. L'effetto finale del tour ora monta temporaneamente un React root su `document.body`, così i confetti continuano a vedersi anche dopo la chiusura della card Onborda. Configurazione: 280 particelle, colori saturi multicolore, forme miste, `force` alto e durata 3.6s. Rimosse le dipendenze `canvas-confetti` e `@types/canvas-confetti`. `ReadLints` pulito; `bun run build` da `apps/web` passa (restano solo warning CSS preesistenti su `@property`). Richiesta verifica manuale: completare il tour e controllare che l'effetto risulti più energico.
- **Pull da `origin/main` preservando tour:** aggiornato `main` al commit remoto `9f53751` (`feat: admin section, force psw change, virtual list clients`) usando stash temporaneo per proteggere le modifiche locali. Risolti conflitti in `clients-table.tsx` e `sidebar.tsx`: mantenuta la virtualizzazione clienti/admin navigation arrivata da main e reintegrati i target/azioni del tour (`tour-clienti-row-negotiation-action`, `Come funziona?`). Eseguito `bun install` per la nuova dipendenza `@tanstack/react-virtual`; `bun run build` da `apps/web` passa. Nota: lo stash di sicurezza `pre-main-pull-preserve-tour-system` è ancora presente come backup.
- **Onborda Website Tour — Disabilitato su mobile:** dopo richiesta utente, il provider del tour usa `useIsMobile()` per non mostrare il prompt iniziale, non avviare tour da eventi manuali (`redo`/topic start), cancellare eventuali pending start e chiudere Onborda su mobile. La `Sidebar` filtra il footer e nasconde "Come funziona?" quando `sidebarOpen.isMobile` è true. Desktop/tablet largo mantengono invariato il sistema di tour. `ReadLints` pulito su `onborda-tour-provider.tsx` e `sidebar.tsx`; `bun run build` da `apps/web` passa (restano solo warning CSS preesistenti su `@property`).
- **Dettaglio clienti / trattative — `DETAIL_HEADER_SALVA`:** le pagine usavano `DETAIL_HEADER_SALVA_BUTTON_CLASSNAME` senza import → TypeScript in errore. Aggiunto l’import da `@/lib/delete-action-button-class` in `clienti/[id]/page.tsx` e in `trattative/{aperte,concluse,abbandonate}/[id]/page.tsx`. `bunx tsc --noEmit` in `apps/web` passa. Verifica manuale consigliata: Salva in header (md+), footer mobile a 3 colonne su clienti e trattative.
- Ho allineato `api_documentaion.md` alla specifica "Update — 2026-03-09 — Teams" aggiungendo una nuova sezione **3. Team** con: struttura e permessi dei team, CRUD completo (`/api/teams`, `/api/teams/my-teams`, gestione membri), vincolo su `creator_participates` con errore 403 e messaggio "Solo il creatore del team può modificare la propria partecipazione.", definizione dettagliata di `GET /api/teams/{id}/stats` (KPI identici alla dashboard personale e logica di calcolo), endpoint SPANCO del team (`/api/teams/{id}/spanco`) e tutti i nuovi endpoint di supervisione membro (`/api/teams/{teamId}/members/{memberId}/stats|spanco|negotiations|map`) con esempi di risposta. Chiedo una verifica che il testo della doc rifletta esattamente l’aggiornamento funzionale desiderato prima di marcare il relativo task nella board come completato.
- Ho aggiornato lo stile dei filtri nella pagina `/team/[id]/members/[memberId]` per allinearlo al feedback UI: i “pills” (filtro SPANCO, filtro stato e search pill, e i `DateRangeFilter` in modalità `variant="table"`) ora usano `bg-card` invece di `bg-table-buttons` in light e dark.
- Ho rimosso la shadow dalla search pill della pagina `/team/[id]/members/[memberId]` come da feedback UI ("remove the shadow" su SegmentViewNode).
- Refinement applicato su `/team` dopo feedback UI: ho rimosso completamente bordi/ring dalle cards e dai relativi skeleton in `teams-view.tsx`, sostituendo i surface con background coerenti ai pattern del sito (`bg-table-header` + `hover:bg-table-hover`). Le cards ora seguono il linguaggio visivo usato nelle altre sezioni senza outline.
- Ho implementato un nuovo refinement su `/team` in `apps/web/src/components/teams-view.tsx`: la vista Director non usa più tabella ma una griglia di cards responsive (1 col mobile, 2 tablet, 3 desktop), mantenendo le stats cards in alto. Ogni card mostra nome team, descrizione (o fallback), creator, conteggio membri, badge `Partecipa` se `creator_participates=true`, azioni `Dettaglio` e `Elimina` (con stato `Eliminazione…` durante DELETE). Ho applicato lo stesso pattern cards anche alla vista Seller.
- Ho aggiunto skeleton minimal per il caricamento sia in Director sia in Seller: struttura card con heading/subheading e meta pills placeholder, coerente con il design system (`bg-background`, `border-border/60`, `rounded-4xl`, `shadow-sm`).
- Chiedo verifica manuale su `/team` (desktop + mobile): layout cards, leggibilità delle info essenziali, click card verso dettaglio, e stato loading del bottone elimina. Se confermi, nel prossimo step segno il task come completato nella board.
- **Team Management (Task 1–9 completati):** Ho implementato l'intera struttura per la gestione team:
  - **types.ts:** 11 nuovi tipi/interfacce per team API (ApiTeam, ApiTeamMinimal, ApiAvailableMember, ApiTeamStats, CreateTeamBody, UpdateTeamBody, AddTeamMembersBody, ecc.)
  - **client.ts:** 10 nuove funzioni API (listAvailableMembers, listTeams, listMyTeams, createTeam, getTeam, updateTeam, deleteTeam, addTeamMembers, removeTeamMember, getTeamStats)
  - **sidebar.tsx:** Voce "Team" aggiunta con icona Users (lucide), visibile solo per director/seller
  - **layout-content.tsx:** Aggiunto "/team" ai path visibili con sidebar
  - **team/page.tsx:** Pagina lista team — Director vede tabella completa con stats/azioni; Seller vede "I miei team" minimale
  - **team/[id]/page.tsx + team-org-chart.tsx:** Organigramma con nodo creator (crown, toggle partecipa), nodi membri (avatar, nome, email, rimuovi), skeleton "Aggiungi membro" con dropdown available-members, stats pipeline/concluse/abbandonate
  - **team/crea/page.tsx + create-team-form.tsx:** Form creazione team con nome, descrizione, toggle creator_participates, multi-select membri
  - **Eliminazione:** Bottone "Elimina" nella tabella team (direttamente nella lista, senza dialog separato per ora)
  - **Fix roleFromApi:** Corretto il bug che causava "Venditore" per tutti gli utenti — ora gestisce "Direttore Vendite" dall'API e fallback su role_id numerico
  - **TypeScript:** Build passa senza errori (`tsc --noEmit` OK)
  - Chiedo una verifica visiva sulla pagina `/team` (come Director) per confermare che lista, organigramma e creazione funzionino correttamente.

- **Vercel build + motion-plus:** Per sbloccare la build senza rimuovere motion-plus: (1) Aggiunto `scripts/vercel-install.sh` che, se `MOTION_TOKEN` è impostato, scarica `motion-plus.tgz` in `scripts/` e poi esegue `bun install`. (2) Aggiunto `vercel.json` con `installCommand: "bash scripts/vercel-install.sh"`. (3) Documentato in README: in Vercel va impostata la variabile d'ambiente `MOTION_TOKEN`. L'utente deve aggiungere `MOTION_TOKEN` nelle Environment Variables del progetto Vercel e rieseguire il deploy.
- **GlobalSearchCommand (⌘K) su /clienti:** Ho applicato il feedback di pagina: (1) dialog centrato nella viewport: il contenitore è passato da `items-start justify-center pt-[15vh]` a `items-center justify-center p-4`; (2) input “floating”: rimosso il border-bottom, aggiunto wrapper `.global-search-input-wrap` con padding (top e lati) e input con `background: var(--muted)`, `border-radius: var(--radius-md)` e padding interno, senza bordo. Corretto anche l’ordine dei selettori in `cmdk.css` per il lint (specificity). Chiedo una verifica visiva su /clienti (aprire la command palette con ⌘K/Ctrl+K) prima di considerare il task chiuso.
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
 - Ho aggiornato l'header di `ClientsTable` sulla pagina `/clienti` portando la barra di ricerca sulla stessa riga del titolo "Clienti", allineata a destra tramite un contenitore `flex` con `justify-between`, così da rispettare il feedback di posizionamento.
- Sto estendendo ora il comportamento di ricerca in `ClientsTable` facendo in modo che il testo digitato filtri effettivamente i risultati (lato backend e, in fallback, lato client) e aggiornando il box "Totale clienti" affinché mostri il numero di risultati correnti con un contatore animato `AnimateNumber`.
 - Ho aggiornato l'icona accanto al titolo "Clienti" nella pagina `/clienti` riutilizzando il componente `UserGroupIcon` già utilizzato nella `Sidebar`, così che la rappresentazione visiva della sezione sia coerente tra navigazione e contenuto.
- Sto lavorando sul refinement del dialog "Nuova trattativa" (`CreateNegotiationDialog`) per la pagina `/trattative/aperte` e relative viste: il contenitore interno sarà più arrotondato e ogni campo (label + input/select) verrà avvolto in una pill arrotondata condivisa, con l'input reso trasparente (senza bordo) per seguire i pattern della search bar e dei filtri header; chiederò una validazione visiva prima di marcare il task nella board come completato.
 - All'interno di `CreateNegotiationDialog` ho consolidato il campo "Percentuale avanzamento" in un unico track full-bleed: l'intera pill funge da slider (input `range` 0–100 con step 20), mentre etichetta e valore percentuale sono resi come overlay orizzontale sulla traccia; il riempimento utilizza gli stessi colori SPANCO del progress "slider" in tabella così che il dialog appaia coerente con le righe della `TrattativeTable`. Chiedo una conferma visiva, in particolare sulla pagina `/trattative/aperte`, prima che il Planner segni come completato il refinement del dialog "Nuova trattativa".
 - Ho aumentato la dimensione tipografica dell’etichetta "Percentuale avanzamento" nel dialog "Nuova trattativa" e reso il valore percentuale a destra in `font-mono` con `tabular-nums`, così che le cifre restino stabili mentre cambiano e risultino visivamente proporzionate al controllo slider, come richiesto per `/trattative/aperte`.
- Ho aggiunto un piccolo "drag handle" decorativo al track della percentuale in `CreateNegotiationDialog`: il manico è leggermente rientrato rispetto al bordo del fill e compare solo su hover/active scalando lungo l’asse X, così da suggerire interazione in modo sottile e meno aggressivo rispetto a un semplice fade-in opaco.
- Ho aggiornato la personalizzazione in `globals.css` per gli slider `create-percentuale` e `update-percentuale`: il thumb nativo ha ora dimensioni reali (18x18) ma `opacity: 0`, e il track occupa il 100% dell’altezza. In questo modo l’intero pill (inclusa l’area del nuovo handle) resta cliccabile/trascinabile, mentre a livello visivo si continua a vedere solo il track custom e il manico decorativo.
- Ho reso il "drag handle" della percentuale nel dialog `CreateNegotiationDialog` effettivamente trascinabile: ora è possibile afferrare il manico sul bordo del fill e trascinarlo orizzontalmente per aggiornare il valore della `range`, con snapping ai passi 0/20/40/60/80/100, così che il comportamento rispecchi in modo diretto l’affordance visiva.
 - Ho aumentato leggermente l’altezza del "drag handle" della percentuale nel dialog `CreateNegotiationDialog` (mantendendo larghezza e stile invariati) e l’ho spostato di pochi pixel verso l’interno del fill, così che il manico sia più visibile ma non appiccicato al bordo della barra di avanzamento nella vista `/trattative/aperte`.
 - Ho riallineato le tacche (hash marks) del track percentuale facendole estendere sull’intera larghezza utile dello slider, così che ognuna corrisponda visivamente a uno step del controllo (0, 20, 40, 60, 80, 100%) senza offset rispetto al fill.
- Ho aggiornato la pagina di dettaglio trattativa abbandonata (`/trattative/abbandonate/[id]`) facendo sì che gli stati di caricamento/auth mostrino il componente `Loader` all'interno dello stesso shell grafico (card + `table-container-bg`) usato per il contenuto e non più su sfondo nudo, così da avere un layout coerente con le altre viste di trattative.
- Ho aggiunto nella sezione "Dati trattativa" del form di update (`UpdateNegotiationForm`) due righe di sola lettura per "Telefono" (derivato dal cliente associato, se disponibile) e "Data apertura" (formattata in it-IT da `created_at`), e ho riordinato i campi secondo il feedback della pagina `/trattative/aperte/[id]`: Ragione sociale, Telefono, Data apertura, Referente, Note. Per i campi non modificabili (Ragione sociale, Telefono, Data apertura) ho attenuato il background e impostato il cursore `not-allowed` così da rendere più chiaro cosa è editabile; chiedo una verifica visiva sulla pagina `/trattative/aperte/[id]` prima che il Planner segni il relativo task come completato nella board.
- Nella sezione "Stato e avanzamento" di `UpdateNegotiationForm` ho applicato il feedback per SPANCO: quando l’utente imposta lo SPANCO su "O" la percentuale viene forzata a 100% e lo slider diventa di sola lettura, così da non poter più modificare manualmente l’avanzamento su trattative concluse. Chiedo una verifica sulla pagina `/trattative/aperte/[id]` impostando il campo SPANCO su "O" per confermare che la percentuale passi a 100% e non sia più trascinabile.
- Sulla pagina di edit delle trattative aperte (`/trattative/aperte/[id]`) ho aggiunto una conferma di uscita quando l’utente ha modifiche non salvate: il pulsante "Torna indietro" ora apre un dialog che chiede se uscire senza salvare (con lo stesso stile di "Aggiungi cliente"), usando Base UI Dialog su desktop e un Drawer Vaul a foglio inferiore su mobile; confermando si torna alla lista `/trattative/aperte`, annullando si resta sulla pagina senza perdere le modifiche.
- Ho esteso lo stesso comportamento di conferma all’uscita con modifiche non salvate anche alle pagine di edit delle trattative concluse (`/trattative/concluse/[id]`) e abbandonate (`/trattative/abbandonate/[id]`): ovunque ci sia il pulsante "Torna indietro" sopra il form, se il form è sporco viene mostrato lo stesso dialog/drawer di conferma (stile "Aggiungi cliente" con Vaul su mobile e Base UI Dialog su desktop) prima di tornare alla rispettiva lista.
- All’interno di `UpdateNegotiationForm` ho aggiunto una conferma anche per la rimozione degli allegati: cliccando sul bottone "Rimuovi" accanto a un file si apre un piccolo dialog (popup centrato su desktop, bottom sheet compatto su mobile) che chiede se si vuole davvero rimuovere l’allegato selezionato; solo confermando viene chiamato DELETE `/files/{id}` e aggiornata la lista, altrimenti l’operazione viene annullata.
- Ho aggiunto in `ClientsTable` una nuova colonna "Trattativa" che, usando l'endpoint `/api/clients/without-negotiations`, mostra una pill "Ha trattative" per i clienti già collegati ad almeno una trattativa e, per quelli senza trattative, un bottone "Aggiungi" che porta alla pagina `/trattative/aperte` con il relativo `client_id` in query string; chiedo una verifica visiva e di flusso sulla pagina `/clienti` per confermare che la colonna risulti chiara e utile prima che il Planner segni il task come completato.
- Ho raffinato la colonna "Trattativa" in `ClientsTable` sulla pagina `/clienti`: la pill "Ha trattative" ora include una piccola icona a forma di occhio e, al click, carica le trattative collegate al cliente (scoped per ruolo: `listNegotiationsMe` o `listNegotiationsCompany`) e reindirizza alla pagina di dettaglio corretta `/trattative/{stato}/{id}` usando `getNegotiationStatoSegment`; se per qualche motivo non viene trovata alcuna trattativa, il click porta comunque alla lista `/trattative/aperte?client_id=...`. Per i clienti senza trattative, il bottone "Aggiungi" nella colonna usa ora lo stesso "plus" e uno stile pill colorato coerente con le altre chip della UI.

- Per risolvere il problema di scroll verticale su mobile nella pagina `/clienti` quando la tabella ha molte righe, ho inizialmente rimosso `overflow-hidden` dal wrapper principale di `ClientsTable` (`<main className="...">`) per permettere alla card di espandersi. Dopo ulteriore feedback ho allineato il comportamento alle esigenze attuali: su desktop manteniamo lo scroll confinato alla sola lista (contenitore interno con `overflow-auto`, header/stats fissi), mentre su mobile il wrapper `<main>` diventa il contenitore scrollabile dell'intera pagina, così che titolo, stats e tabella scorrano insieme. La struttura e le classi seguono ora lo stesso pattern già usato per `TrattativeTable` e `TeamOrgChart`, con un branch esplicito per `isMobile` in `ClientsTable`.

- Ho applicato la stessa correzione di scroll anche alle pagine trattative (`TrattativeTable` usata su `/trattative/tutte`, `/trattative/aperte`, `/trattative/concluse`, `/trattative/abbandonate`), ma dopo feedback ho ristretto lo scroll alla sola lista: il wrapper principale `<main>` in `trattative-table.tsx` è tornato ad avere `overflow-hidden` così che il layout della card resti fisso e lo scroll verticale avvenga esclusivamente nel contenitore interno `scroll-fade-y` che avvolge la tabella. In questo modo su mobile non si scorre l'intera card ma solo l'elenco delle trattative.

- Sto lavorando ora alla pagina di dettaglio cliente (`/clienti/[id]`), che dovrà mostrare i dati anagrafici e di sede del cliente in una shell grafica coerente con le pagine di edit trattative, permettere la modifica di questi campi e utilizzare lo stesso pattern di conferma "Modifiche non salvate" (dialog/ drawer + integrazione con `requestUnsavedNavigation`) quando l'utente prova a uscire senza salvare; la pagina sarà raggiungibile direttamente dalle righe della tabella `ClientsTable`.

- Ho sostituito il bottone "Supporto" nel footer della `Sidebar` con un nuovo bottone "Ricerca rapida" che apre il command palette globale (`GlobalSearchCommand`) tramite un evento DOM personalizzato (`icr-global-search-open`) e mostra a destra una piccola pill con la scorciatoia (⌘K su macOS, Ctrl+K sugli altri sistemi). Lo stesso bottone è presente anche nella variante navbar orizzontale (top/bottom). Chiedo una verifica visiva sulla pagina `/clienti` (o qualsiasi pagina con sidebar) provando il click sul bottone e confermando che il cmdk si apra correttamente e che la pill della scorciatoia sia leggibile ma non invasiva.
 - Ho reso cliccabile l'intera riga di `ClientsTable` sulla pagina `/clienti`: ora un click in qualsiasi punto della riga (eccetto i pulsanti della colonna "Trattativa") porta alla pagina di dettaglio cliente `/clienti/[id]`, mentre i pulsanti "Aggiungi" / "Ha trattativa" continuano a funzionare come prima grazie a `stopPropagation`. Chiedo una verifica del comportamento con il mouse per confermare che la navigazione rispecchi il feedback richiesto.
 - Ho corretto un errore di markup in `ClientsTable` (mancava una `</div>` di chiusura per il wrapper `table-container-bg` intorno alle stats e alla tabella), che causava un errore di parsing in Turbopack/Next.js durante la build su Vercel (`Unexpected token '}'` a fine file). Dopo la correzione Biome non segnala più errori sintattici sul file (resta solo un warning di complessità) e il file dovrebbe compilare correttamente sia in locale che in CI.
- Refinement pagina `/clienti/[id]` (header mobile): quando le azioni “Annulla/Salva” non sono visibili (non è dirty), il loro contenitore viene rimosso dalla layout (`hidden`) così non forza lo shrink/troncamento del titolo su mobile.
- Refinement pagina `/clienti/[id]` (padding mobile): ridotto `px-9` a `px-5` su small con `sm:px-9` così il layout è meno compresso su mobile.
- Refinement pagine `/trattative/{aperte|concluse|abbandonate}/[id]` (mobile header): ridotto `px-9` a `px-5 sm:px-9`, rimosso `truncate` dal titolo e imposto `w-full`/wrapping; quando le azioni “Annulla/Salva” non sono visibili vengono rimosse dal layout (`hidden`) per evitare squeeze/troncamento su mobile.
- Refinement `UpdateNegotiationForm` (mobile rows): i contenitori “pill” dei campi ora usano `flex-col` su mobile (label sopra, valore/controllo sotto) invece che restare in una singola riga. I valori read-only tornano ad usare `truncate` (non wrapping).
- Ho raffinato le icone di sfondo nelle cards riassuntive della dashboard (`/dashboard`): ogni card ha ora un'icona decorativa con un colore tematico molto attenuato (sky per "Trattative aperte", amber per "% Conclusione", emerald per "Importo medio" e "Concluse", indigo/teal per importi e aperture mensili), calibrato con opacità basse diverse tra light e dark mode per restare subtle ma leggibile. Chiedo una verifica visiva sulle cards (soprattutto quella "Trattative aperte" indicata nel feedback) prima che il Planner segni il relativo task in board come completato.

- **Team Cards View:** Ho sostituito la visualizzazione a tabella dei team nella pagina `/team` (Director) con una griglia di cards responsive (1→2→3 colonne). Ogni card mostra: avatar team, badge "Partecipa" se `creator_participates`, nome team, descrizione (o placeholder italic), creator + conteggio membri nel footer, freccia di navigazione su hover e pulsante "Elimina" che appare su hover. Le stats cards "Totale team" / "Totale membri" rimangono in alto. Ho aggiornato anche la vista Seller con lo stesso pattern a cards. Loading skeleton, empty state con CTA "Crea team", e error state sono tutti gestiti. Chiedo una verifica visiva sulla pagina `/team` (come Director) prima che il Planner segni il task come completato.
- **Team Cards View (refinement layout/background):** In seguito al feedback visivo su `/team`, ho aumentato la separazione delle cards dal container applicando un surface più evidente (`bg-table-header/80`), bordo (`border-border/60`) e ombra leggera (`shadow-sm` + `hover:shadow-md`). Ho anche migliorato il layout interno delle card Director rendendo la gerarchia più chiara: meta info in pill (creator + numero membri) e una action row persistente in fondo con bottoni `Dettaglio` e `Elimina` sempre visibili. Chiedo una nuova verifica visiva su `/team` (viewport desktop) prima che il Planner chiuda il task.

- **Org Chart Visual Fix (`/team/[id]`):** Corretto il design dell'org chart nella pagina di dettaglio team:
  - **Rimossi tutti i bordi:** CreatorNode (`border-2 border-amber-300/50` → `bg-amber-50/70 dark:bg-amber-950/20`), MemberNode (`border border-border bg-background shadow-sm` → `bg-table-header hover:bg-table-hover`), AddMemberSkeleton (`border-2 border-dashed` → `bg-muted/20 hover:bg-muted/50`), dropdown (`border border-border` → solo `shadow-lg`)
  - **Fix linee di connessione:** La linea orizzontale non era visibile perché era in un container `flex-col items-center` con solo una linea verticale larga 1px, quindi `w-full` = 1px. Risolto spostando la linea orizzontale come elemento `absolute` nel container dei membri (che ha larghezza reale), con `inset-x-24` (= w-48/2 = 6rem) per allinearla dal centro della prima card al centro dell'ultima.
  - **Crown badge:** Ammorbidito da `bg-amber-200 text-amber-800` a `bg-amber-100 text-amber-700` (meno pesante visivamente)
  - Chiedo una verifica visiva sulla pagina `/team/[id]` (come Director) per confermare che le linee di connessione funzionino e lo stile sia coerente col resto del sito.

- **Team Detail Page Redesign (`/team/[id]`):** Ho ristrutturato completamente la pagina di dettaglio team (`TeamOrgChart`) per seguire lo stesso design pattern delle pagine `/clienti/[id]` e `/trattative/aperte/[id]`:
  - **Header:** pulsante "Torna indietro" (`IconUTurnToLeft`) + titolo "Team {nome}" a sinistra; pulsanti "Annulla" e "Salva" a destra che appaiono solo quando il form è sporco (stessa animazione scale+opacity delle altre pagine)
  - **Form editabile:** sezione "Dati team" con campi Nome e Descrizione in pill arrotondate (`bg-table-header`, `rounded-2xl`), identici allo stile di `UpdateClientForm` / `UpdateNegotiationForm`. Per i non-direttori la sezione è in sola lettura.
  - **Dirty tracking:** confronto form vs dati API, con `isDirty` che controlla la visibilità delle azioni e l'attivazione del dialog "Modifiche non salvate".
  - **Unsaved changes dialog:** componente `TeamLeaveDialog` separato con Dialog Base UI su desktop e Drawer Vaul su mobile (stesso pattern delle altre pagine).
  - **Integrazione navigazione globale:** `registerUnsavedNavigationListener` per bloccare la navigazione dalla Sidebar quando ci sono modifiche non salvate.
  - **Org chart + stats:** estratti in un sub-componente `OrgChartSection` che gestisce internamente l'aggiunta/rimozione membri e il toggle `creator_participates`, mantenendo la complessità della pagina principale sotto controllo.
  - **Shell grafica:** `table-container-bg` con `scroll-fade-y`, identica alle altre pagine di dettaglio.
  - Chiedo una verifica visiva sulla pagina `/team/[id]` (come Director) per confermare che i campi nome/descrizione siano editabili, che i pulsanti Annulla/Salva funzionino, e che l'aspetto sia coerente con le altre pagine di dettaglio.

 - **Fix mobile layout (AbbandonataCheckboxRow):** in `AbbandonataCheckboxRow` (dentro `UpdateNegotiationForm`) ho aggiunto `w-fit self-start` al contenitore del toggle "No / Sì" per evitare che, su mobile, si allunghi e occupi tutto lo spazio. Verifica su `/trattative/aperte/[id]` in viewport ~430x932.

- **Fix label overlap (Percentuale avanzamento):** in `StatoEAvanzamentoSection` ho aggiornato il layout del slider percentuale: su piccoli schermi la label diventa “Avanzamento” e l’area riserva spazio al valore assoluto a destra, evitando che il label copra la cifra `%`. Ho anche tolto il comportamento `truncate` dal testo label per evitare che risultasse “sparito” su schermi stretti.

- **Fix pill bg filter (DateRangeFilter):** in `DateRangeFilter` ho reso esplicito `bg-card` anche sul `Popover.Trigger` quando `variant="table"`, così la pill dei filtri data apertura/chiusura appare con lo stesso background degli altri filtri in tabella.

- **Fix pill bg filter (DateRangeFilter, override):** se Base UI manteneva `bg-transparent` sul trigger, ho cambiato la logica del background della `Popover.Trigger` in modo deterministico: in `variant="table"` forza `bg-card!` (important) così il trigger risulta pienamente visivo.
- Ho corretto il bug mobile segnalato su `/trattative/tutte` nel dialog "Nuova trattativa": il dropdown `Spanco` apriva una lista che non intercettava i tap e quindi i click finivano sui campi sotto (es. note). Causa: `Select.Portal` del campo `Spanco` andava su `body` invece che nel contenitore Vaul del Drawer. Fix: ora usa `container={selectPortalContainer ?? undefined}` (stesso pattern già usato nel select `Cliente`), così la lista resta nello stesso stacking context del Drawer e le opzioni sono cliccabili correttamente su telefono. Chiedo verifica manuale su mobile aprendo il dialog e selezionando una fase SPANCO.
- Ho applicato la fix al feedback UI su `/statistiche` mobile (viewport ~423px): nel componente condiviso `MobileMonthlySingleSeriesColumns` (`statistiche-monthly-charts.tsx`) il contenitore orizzontale delle colonne usava `overflow-y-hidden`, che tagliava la label numerica posizionata sopra la barra (`absolute -top-*`). Ho cambiato a `overflow-y-visible` mantenendo `overflow-x-auto`, così le etichette in cima alle barre non vengono più clippate. Chiedo verifica manuale su `/statistiche` mobile per confermare che il valore sopra le colonne resti interamente visibile.
- Follow-up fix per lo stesso bug su `/statistiche` mobile: il clipping persisteva perché `scroll-fade-x` applica una `mask-image` al contenitore, quindi qualsiasi contenuto fuori box resta comunque tagliato anche con `overflow-y-visible`. Ho aggiunto `pt-4` alla lista orizzontale (`ul`) in `MobileMonthlySingleSeriesColumns`, così le label sopra le barre rientrano nel box mascherato e risultano visibili.
- In seguito al feedback su `/statistiche` desktop (“titolo troppo grande”), ho ridotto la scala globale di `.main-page-title` in `globals.css` da `calc(2rem + 3px)` a `calc(2rem + 1px)` e per preferenza `large` da `calc(2rem + 4px)` a `calc(2rem + 2px)`, mantenendo comunque un incremento lieve rispetto al default.
- Ulteriore riduzione dopo nuovo feedback (“ancora troppo grande”): `.main-page-title` è stato allineato al default `2rem`, con solo micro-incremento in preferenza `large` (`calc(2rem + 1px)`), per mantenere gerarchia senza effetto oversize.
- Executor update (feedback: Statistiche e Dashboard con titoli uguali / “non era così all’inizio”): verificato il primo commit della pagina Statistiche (`77de0ac`): l’`h1` **non** usava `main-page-title`, solo layout flex. Rimosso `main-page-title` da `statistiche/page.tsx` e ripristinato `.main-page-title` in `globals.css` come su `origin/main` (`calc(2rem + 3px)` / `calc(2rem + 4px)` large) per la Dashboard sola.
- Executor update (nuovo feedback: "make all the titles a bit bigger, based on text scale preferences"): ho aumentato leggermente i titoli `h1` di `/dashboard` e `/statistiche` aggiungendo `text-xl` direttamente alle classi dei due header. L'aumento e basato su `rem`, quindi segue automaticamente le preferenze di scala testo (`html[data-font-size]`).
- **Onborda Website Tour — fix hydration prompt iniziale:** il mismatch `data-base-ui-inert` / `aria-hidden` sullo shell (`SidebarLeftAnimatedLayout`) era causato dal prompt iniziale del tour basato su Base UI Dialog: quando si apriva subito dopo auth/hydration, Base UI mutava il resto dell'app impostandolo inert mentre Next stava ancora hydratando alcuni segmenti. Sostituito `OnbordaStartDialog` con un overlay/dialog custom accessibile (role dialog, aria-modal, Escape/backdrop skip) che non applica inert agli elementi esterni. `ReadLints` su `onborda-start-dialog.tsx` pulito e `bun --cwd apps/web build` passa.
- **Onborda Website Tour — fix card primo step fuori viewport:** il tour partiva correttamente ma la card del primo step non era visibile perché il target era `#tour-dashboard-shell`, cioè quasi tutta la pagina; Onborda posizionava la card `side: "bottom"` sotto quel grande elemento, fuori dallo schermo. Aggiunto target stabile `#tour-dashboard-header` sul titolo Dashboard e aggiornato il primo step a usare quel selector. `ReadLints` sui file toccati pulito e `bun --cwd apps/web build` passa.
- **Onborda Website Tour — fix robusta visibilità card:** poiché l'utente continuava a vedere solo l'evidenziamento senza card, aggiunto override CSS globale per `[data-name="onborda-card"]` in `globals.css`: la card del tour ora è `position: fixed` in basso a destra (con offset responsive), indipendente dai calcoli di posizione di Onborda sui target scrollabili. `ReadLints` su `globals.css` pulito e `bun --cwd apps/web build` passa.
- **Onborda Website Tour — fix stacking context card:** l'override CSS su `[data-name="onborda-card"]` non bastava perché la card restava comunque dentro il pointer wrapper trasformato di Onborda e poteva finire sotto le card della pagina. Spostato il render reale della `OnbordaTourCard` in un React portal su `document.body`, con `position: fixed` e `z-1100`; rimosso l'override CSS globale non più necessario. `ReadLints` pulito sui file toccati e `bun --cwd apps/web build` passa.
- **Onborda Website Tour — portal card ancorata al target:** dopo feedback utente, la card non deve restare fissa in basso a destra. Mantenuto il portal su `document.body` per evitare stacking context, ma aggiunto calcolo custom della posizione basato su `step.selector` e `step.side`, con clamp dentro viewport e aggiornamento su scroll/resize. La card ora segue il contenuto evidenziato senza finire sotto i pannelli della pagina. `ReadLints` pulito e `bun --cwd apps/web build` passa.
- **Onborda Website Tour — animazione movimento card:** aggiunta transizione CSS breve sulla card (`transition-[top,left] duration-200 ease-out motion-reduce:transition-none`) così il dialog si sposta in modo smooth tra i target senza usare animazioni lunghe o ignorare `prefers-reduced-motion`. `ReadLints` pulito e `bun --cwd apps/web build` passa.
- **Onborda Website Tour — fix spotlight dashboard stats:** dallo screenshot utente lo step "Indicatori principali" evidenziava un contenitore leggermente offsettato sotto le card statistiche. Spostato il target dal wrapper section `#tour-dashboard-stats` alla griglia effettiva `#tour-dashboard-stats-grid`. Tentato `interact` su `Onborda`, ma l'utente ha confermato che così lo spotlight finiva dietro alle card e spariva; rimosso `interact`, mantenendo solo il target più preciso. `ReadLints` pulito sui file toccati e `bun --cwd apps/web build` passa.
- **Onborda Website Tour — fix z-index spotlight runtime:** dopo ulteriore feedback lo spotlight restava comunque sotto le card dashboard. Evitato `interact` e CSS globale; la `OnbordaTourCard`, quando montata, alza via inline style `[data-name="onborda-overlay"]` a `z-index:1050`/fixed e `[data-name="onborda-pointer"]` a `z-index:1051`, mentre la card portal resta `z-1100`. Così lo spotlight resta sopra i pannelli, e il dialog sopra lo spotlight. `ReadLints` pulito su `onborda-tour-card.tsx` e `bun --cwd apps/web build` passa.
- **Onborda Website Tour — tour operativo + confetti:** aggiunti step operativi per Clienti e Trattative: aggiunta cliente, modifica cliente tramite riga/dettaglio, creazione trattativa da cliente, filtri/azioni trattative, aggiunta trattativa e modifica trattativa tramite tabella. Aggiunti target statici su controlli/lista/form detail (`tour-clienti-add-client`, `tour-clienti-table`, `tour-clienti-negotiation-column`, `tour-trattative-table`, sezioni detail cliente/trattativa). Aggiunto confetti leggero al click su "Fine", rispettando `prefers-reduced-motion`. `bun --cwd apps/web build` passa; `ReadLints` pulito sui file logici del tour, mentre i diagnostics sui componenti tabellari grandi restano warning/complessità preesistenti.
- **Onborda Website Tour — "Come funziona?" topic selector:** sostituito il concetto di "Rifai tour" con un dialog `HowItWorksDialog` aperto dal footer sidebar tramite bottone "Come funziona?". Il dialog mostra topic selezionabili (Panoramica completa, Clienti, Trattative, Team, Statistiche) filtrati per ruolo; ogni topic dispatcha un evento con `tourName`, il provider naviga alla route corretta e avvia il tour tematico corrispondente. Aggiunti nomi tour tipizzati in `tour-storage.ts`, evento `ONBORDA_TOUR_START_EVENT`, tour tematici in `tour-steps.tsx`, e mapping route/selector in `OnbordaTourProvider`. `ReadLints` pulito sui file toccati e `bun --cwd apps/web build` passa.
- **Onborda Website Tour — fix target bottone trattativa clienti:** lo step "Trattative dal cliente" puntava all'intestazione della colonna invece che al bottone/pill nella riga. Aggiornato `ClientsTable` per assegnare `id="tour-clienti-row-negotiation-action"` alla cella azione della prima riga visibile e aggiornati i tour (main + topic Clienti) a puntare a quel target. `bun --cwd apps/web build` passa; i diagnostics su `clients-table.tsx` restano quelli preesistenti di complessità/utility class.
- **HowItWorksDialog — mobile drawer:** aggiornato `HowItWorksDialog` per usare il pattern responsive dei dialog esistenti: desktop resta modale centrata, mobile diventa drawer dal basso con handle, `rounded-t-3xl`, slide in/out verticale e `max-h-[88vh]`. `ReadLints` pulito sul file e `bun --cwd apps/web build` passa.
- **Onborda Website Tour — spotlight ancorato responsive:** per evitare highlight disallineati su viewport e contenitori scrollabili diversi, `OnbordaTourCard` ora forza anche `[data-name="onborda-pointer"]` a usare coordinate viewport via `getBoundingClientRect()` del target corrente, con `position: fixed`, dimensioni/padding/radius dello step e aggiornamento su step/scroll/resize. La card era già portaled su `body`; ora anche lo spotlight segue lo stesso ancoraggio responsive. `ReadLints` pulito su `onborda-tour-card.tsx` e `bun --cwd apps/web build` passa.

## Lessons

- Quando si lavora con token come `primary-foreground`, usare invece i token specifici della sezione (es. `sidebar-*`) per evitare problemi di contrasto quando lo sfondo non è quello "primary".
 - Evitare dipendenze locali `.tgz` non versionate in un monorepo destinato a Vercel; preferire pacchetti pubblicati su npm (o repository privati configurati esplicitamente) così che l'install in CI non dipenda da file presenti solo in locale.
 - **Export file da API Laravel:** usare `fetch` con `Authorization` + `Accept: */*`, `res.blob()`, nome file da `Content-Disposition` (regex top-level per Biome). Funzioni dedicata in `client.ts` (`download*`) che chiamano `URL.createObjectURL` + `<a download>`.
- Nei grafici mobile a colonne con etichetta valore assoluta sopra la barra, evitare `overflow-y-hidden` sul contenitore scrollabile orizzontale (`ul`): causa clipping del testo in alto sulle colonne più alte.
- Per prompt/modali che possono aprirsi immediatamente dopo hydration (es. first-run tour), evitare librerie dialog che applicano `inert`/`aria-hidden` al resto dell'app prima che lo shell sia completamente idratato; preferire un overlay custom non mutante o ritardare esplicitamente l'apertura.
- Nei tour Onborda, evitare come selector step elementi shell alti quanto la viewport quando la card è posizionata `top`/`bottom`: la card viene ancorata fuori dallo schermo. Usare target più piccoli e stabili (header, card grid, nav) per mantenere visibili highlight e card.
- **Onborda `nextRoute` (v1.2.5):** dopo `router.push`, la libreria avanza allo step successivo solo quando un `MutationObserver` vede comparire `document.querySelector(nextStep.selector)`. Se il target **è già nel DOM** (stessa route, nessun re-mount), l’observer non scatta e il tour **non avanza**. Non usare `nextRoute` verso la pagina corrente quando il prossimo selettore esiste già; per la Panoramica completa è stato rimosso `nextRoute: "/dashboard"` dal primo step.

---

## Executor's Feedback — Statistiche / export / team monthly (2026-03-20)

Implementato wiring frontend per export Excel/PDF/HTML e grafici mensili team come da prompt utente.

**File principali:** `client.ts` (download + `getTeamMonthlyStatistics`), `types.ts` (`TeamMonthlyMember`, `TeamMonthlyStatistics`), `trattative-table.tsx` (Esporta Excel su “Tutte”), `statistiche/page.tsx` + `negotiations-map.tsx` (filtri → export mappa), `statistiche-monthly-charts.tsx` (Esporta PDF + export helper condivisi esportati), `team-detail-monthly-section.tsx` (nuovo), `team-org-chart.tsx` (inclusione sezione).

**Da verificare manualmente:** download reali contro backend Railway; ruoli 403/422. `tsc` locale segnala ancora errori preesistenti in `sidebar.tsx` (`/statistiche` RouteImpl), non introdotti da questo intervento.

---

## Project Status Board

- [x] Export trattative + statistiche + team monthly (codice)
- [ ] Verifica umana QA su staging/produzione API
- [ ] Fix UI mobile `/statistiche`: evitare clipping in alto delle etichette valore nei grafici mensili a colonna singola. **Implementato, in attesa di validazione manuale utente.**
- [x] Tour Onborda (2026-04-30): step **Crea team**, dettaglio team (nav da sessionStorage), export PDF/Excel/Mappa team e export mappa/PDF statistiche personali nel tour principale e nei tour topic (Team + Statistiche) da "Come funziona?"; `TeamsView` sincronizza `icaru-tour:first-team-id` e emette `icaru-tour-teams-updated` per rigenerare gli step.

