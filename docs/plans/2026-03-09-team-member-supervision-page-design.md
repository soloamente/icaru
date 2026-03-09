# Team Member Supervision Page Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Aggiungere dalla pagina dettaglio team (`/team/[id]`) un accesso rapido a una nuova vista di supervisione venditore che mostri, per un singolo membro del team, KPI personali, grafico SPANCO, mappa e tabella delle trattative.

**Architecture:** Riutilizziamo il contesto attuale dei team (Next.js App Router, segment `(main)/team`) introducendo una nuova route annidata `/team/[teamId]/members/[memberId]`. La pagina di supervisione usa gli endpoint dedicati di backend (`/api/teams/{teamId}/members/{memberId}/stats|spanco|negotiations|map`) e ricompone componenti UI già esistenti (stat cards stile dashboard, `SpancoDonutChart`, componente mappa trattative e tabella tipo `TrattativeTable`) in una shell grafica coerente con `/dashboard` e le pagine di dettaglio esistenti.

**Tech Stack:** Next.js App Router (client components), React, TypeScript, Tailwind/DaisyUI design system esistente, API client `apps/web/src/lib/api/client.ts`, componenti `SpancoDonutChart`, `NegotiationsMap`/mappa trattative, `TrattativeTable` o tabella derivata.

---

### Task 1: Wire bottone "Dettagli venditore" sulle card dell'organigramma

**Files:**
- Modify: `apps/web/src/components/team-org-chart.tsx` (`MemberNode` e `OrgChartSection`)

**Steps (alto livello):**
1. Aggiungere su `MemberNode` una CTA testuale in fondo alla card, es. un pulsante "Dettagli venditore" con icona freccia, mantenendo il bottone `X` per la rimozione come overlay in alto a destra.
2. Esporre da `MemberNode` un handler `onOpenDetails` passato da `OrgChartSection`.
3. In `OrgChartSection`, usare `useRouter` o la funzione `router.push` già presente in `TeamOrgChart` per navigare a `/team/[teamId]/members/[memberId]` quando l'utente clicca la CTA, assicurandosi di usare `event.stopPropagation()` per non interferire con altre interazioni.

### Task 2: Creare la route `/team/[teamId]/members/[memberId]`

**Files:**
- Create: `apps/web/src/app/(main)/team/[teamId]/members/[memberId]/page.tsx`

**Steps:**
1. Definire un componente client `TeamMemberSupervisionPage` che legge `teamId` e `memberId` dai params (string → number) e usa l'auth context per ottenere il token.
2. Gestire redirect o errore se non autenticato, allineandosi al pattern usato in `/dashboard` e `/clienti`.
3. Preparare lo state necessario per: `TeamMemberStatistics`, `SpancoStatistics`, lista trattative (`ApiNegotiation[]`) e trattative con coordinate (`ApiNegotiation[]`), più flag di `loading` ed eventuali errori per ciascun blocco.

### Task 3: Fetch KPI venditore e SPANCO personale

**Files:**
- Modify: `apps/web/src/app/(main)/team/[teamId]/members/[memberId]/page.tsx`

**Steps:**
1. Usare `getTeamMemberStatistics(token, teamId, memberId)` per popolare le stat cards in alto (numero trattative aperte, % conclusione, importo medio, giorni medi chiusura, ecc.).
2. Usare `getTeamMemberSpancoStatistics(token, teamId, memberId)` per ottenere i dati del grafico SPANCO.
3. Allineare il formato delle stat cards a quello di `DashboardPage` (card con titolo, valore grande, eventuale unità).
4. Integrare `SpancoDonutChart` passando `stats`, `isLoading` e `error` in modo analogo a `/dashboard`.

### Task 4: Fetch e visualizzare mappa delle trattative del venditore

**Files:**
- Modify: `apps/web/src/app/(main)/team/[teamId]/members/[memberId]/page.tsx`
- Inspect/reuse: `apps/web/src/components/negotiations-map.tsx` (o componente mappa equivalente)

**Steps:**
1. Usare `listTeamMemberNegotiationsWithCoordinates(token, teamId, memberId)` per recuperare le trattative con coordinate.
2. Reutilizzare il componente mappa esistente usato in `DashboardPage` oppure creare un wrapper `TeamMemberNegotiationsMap` che accetta una lista di `ApiNegotiation` e ne filtra solo quelle con coordinate valide.
3. Gestire stati di loading (`NegotiationsMapSkeleton` o skeleton simile) ed errori con un banner locale non bloccante.

### Task 5: Fetch e visualizzare tabella trattative del venditore

**Files:**
- Modify: `apps/web/src/app/(main)/team/[teamId]/members/[memberId]/page.tsx`
- Inspect/reuse: `apps/web/src/components/trattative-table.tsx`

**Steps:**
1. Usare `listTeamMemberNegotiations(token, teamId, memberId)` per ottenere tutte le trattative del venditore (aperte, concluse, abbandonate).
2. Riutilizzare `TrattativeTable` con una prop che permette di iniettare un dataset già pronto, oppure creare una variante `TeamMemberNegotiationsTable` che adotta lo stesso layout/colonne ma non esegue fetch interno.
3. Garantire che le pill di stato (aperte, concluse, abbandonate) usino gli stessi colori e logica della tabella principale.

### Task 6: Gestione errori e 403 autorizzazione

**Files:**
- Modify: `apps/web/src/app/(main)/team/[teamId]/members/[memberId]/page.tsx`

**Steps:**
1. Se uno qualunque degli endpoint `getTeamMemberStatistics`, `getTeamMemberSpancoStatistics`, `listTeamMemberNegotiations`, `listTeamMemberNegotiationsWithCoordinates` restituisce 403, mostrare un messaggio chiaro tipo: "Non puoi accedere ai dati di questo venditore per il team selezionato."
2. Aggiungere un bottone "Torna al team" che riporta a `/team/[teamId]`.
3. Per errori generici, mostrare banner di errore in alto nella pagina, mantenendo comunque visibili le sezioni che hanno caricato correttamente.

