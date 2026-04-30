import type { ReactNode } from "react";
import {
	CLIENTS_TOUR_NAME,
	MAIN_TOUR_NAME,
	NEGOTIATIONS_TOUR_NAME,
	STATS_TOUR_NAME,
	TEAM_TOUR_NAME,
	TOUR_FIRST_TEAM_SESSION_KEY,
	TOUR_TEAM_HAS_MEMBERS_SESSION_KEY,
	type TourName,
} from "./tour-storage";

type KnownAppRole = "admin" | "director" | "seller";

export type AppRole = KnownAppRole | (string & {});

export type TourSide = "top" | "bottom" | "left" | "right";

/** Sostituisce nextRoute/prevRoute con `/team/{id}` usando sessionStorage (primo team in lista direttore). */
export type TourSessionNavMode = "firstTeamDetail";

export interface IcaruTourStep {
	icon?: ReactNode;
	title: string;
	content: ReactNode;
	selector: string;
	side?: TourSide;
	showControls?: boolean;
	pointerPadding?: number;
	pointerRadius?: number;
	nextRoute?: string;
	prevRoute?: string;
	roles?: AppRole[];
	/** Step visibile solo se `requiresSessionKey` è presente in sessionStorage (es. id team, membri in organigramma). */
	requiresSessionKey?: string;
	/** Step visibile solo se NON c’è id team in sessione (es. passaggio alle statistiche senza aprire dettagli). */
	omitIfSessionKey?: string;
	nextRouteSession?: TourSessionNavMode;
	prevRouteSession?: TourSessionNavMode;
}

export interface IcaruTour {
	tour: TourName;
	steps: IcaruTourStep[];
}

const COMMERCIAL_ROLES = ["director", "seller"] as const;

const canSeeCommercialSections = (role: AppRole | null | undefined): boolean =>
	role === "director" || role === "seller";

// Centralizza le impostazioni visive comuni per mantenere coerenti tutti gli step.
const baseStep = (step: IcaruTourStep): IcaruTourStep => ({
	showControls: true,
	pointerPadding: 10,
	pointerRadius: 18,
	...step,
});

const sharedSteps: IcaruTourStep[] = [
	baseStep({
		title: "La tua dashboard",
		content:
			"Qui trovi una panoramica rapida del lavoro e delle attività principali.",
		selector: "#tour-dashboard-header",
		side: "bottom",
		// No nextRoute: Onborda waits for the *next* step's selector via MutationObserver
		// after router.push. `#tour-sidebar-navigation` is already in the DOM on /dashboard,
		// so no mutation fires and the tour never advances — see onborda Onborda.tsx nextStep.
	}),
	baseStep({
		title: "Navigazione",
		content: "Usa il menu laterale per spostarti tra le sezioni disponibili.",
		selector: "#tour-sidebar-navigation",
		side: "right",
	}),
	baseStep({
		title: "Ricerca rapida",
		content: "Apri la ricerca per raggiungere velocemente pagine e contenuti.",
		selector: "#tour-sidebar-quick-search",
		side: "right",
	}),
	baseStep({
		title: "Preferenze",
		content: "Da qui puoi regolare tema, profilo e impostazioni personali.",
		selector: "#tour-sidebar-preferences",
		side: "right",
	}),
];

const commercialSteps: IcaruTourStep[] = [
	baseStep({
		title: "Indicatori principali",
		content:
			"Controlla numeri e andamento commerciale appena entri in dashboard.",
		selector: "#tour-dashboard-stats-grid",
		side: "bottom",
		nextRoute: "/clienti",
		roles: [...COMMERCIAL_ROLES],
	}),
	baseStep({
		title: "Clienti",
		content:
			"La pagina clienti raccoglie anagrafiche, dettagli e attività collegate.",
		selector: "#tour-clienti-shell",
		side: "top",
		prevRoute: "/dashboard",
		roles: [...COMMERCIAL_ROLES],
	}),
	baseStep({
		title: "Cerca clienti",
		content: "Filtra l'elenco per trovare subito il cliente che ti serve.",
		selector: "#tour-clienti-search",
		side: "bottom",
		prevRoute: "/clienti",
		roles: [...COMMERCIAL_ROLES],
	}),
	baseStep({
		title: "Aggiungi un cliente",
		content:
			"Usa questo pulsante per creare una nuova anagrafica cliente con dati, contatti e sede.",
		selector: "#tour-clienti-add-client",
		side: "left",
		prevRoute: "/clienti",
		roles: [...COMMERCIAL_ROLES],
	}),
	baseStep({
		title: "Importa clienti",
		content:
			"Da qui avvii l’importazione massiva da file (Excel/CSV): nel dialog trovi anche il modello da scaricare e le istruzioni per un import corretto.",
		selector: "#tour-clienti-import",
		side: "left",
		prevRoute: "/clienti",
		roles: [...COMMERCIAL_ROLES],
	}),
	baseStep({
		title: "Modifica un cliente",
		content:
			"Clicca una riga per aprire il dettaglio cliente: da li puoi aggiornare dati anagrafici, sede e salvare le modifiche.",
		selector: "#tour-clienti-table",
		side: "top",
		prevRoute: "/clienti",
		roles: [...COMMERCIAL_ROLES],
	}),
	baseStep({
		title: "Trattative dal cliente",
		content:
			"Questa colonna ti dice se il cliente ha gia trattative. Se non ne ha, puoi crearne una nuova gia collegata al cliente.",
		selector: "#tour-clienti-row-negotiation-action",
		side: "bottom",
		prevRoute: "/clienti",
		nextRoute: "/trattative/tutte",
		roles: [...COMMERCIAL_ROLES],
	}),
	baseStep({
		title: "Trattative",
		content: "Qui segui opportunità aperte, concluse e abbandonate.",
		selector: "#tour-trattative-shell",
		side: "top",
		prevRoute: "/clienti",
		roles: [...COMMERCIAL_ROLES],
	}),
	baseStep({
		title: "Controlli trattative",
		content:
			"Usa ricerca, filtri per stato o SPANCO e ordinamenti per concentrarti sulle trattative più importanti.",
		selector: "#tour-trattative-filter-search-row",
		side: "bottom",
		prevRoute: "/trattative/tutte",
		roles: [...COMMERCIAL_ROLES],
	}),
	baseStep({
		title: "Esporta in Excel",
		content:
			"Sulla vista Tutte le trattative puoi scaricare un file Excel con l’elenco delle trattative, utile per analisi o condivisione.",
		selector: "#tour-trattative-export-excel",
		side: "bottom",
		prevRoute: "/trattative/tutte",
		roles: [...COMMERCIAL_ROLES],
	}),
	baseStep({
		title: "Aggiungi una trattativa",
		content:
			"Da qui apri il dialog per creare una trattativa: scegli cliente, referente, importo, fase SPANCO e percentuale.",
		selector: "#tour-trattative-add-desktop",
		side: "bottom",
		prevRoute: "/trattative/tutte",
		roles: [...COMMERCIAL_ROLES],
	}),
	baseStep({
		title: "Modifica una trattativa",
		content:
			"Clicca una riga della tabella per aprire il dettaglio: potrai modificare dati, stato, avanzamento, importo e allegati.",
		selector: "#tour-trattative-table",
		side: "top",
		prevRoute: "/trattative/tutte",
		nextRoute: "/team",
		roles: [...COMMERCIAL_ROLES],
	}),
	baseStep({
		title: "Team",
		content:
			"Consulta i team e il lavoro condiviso. Cliccando sulla card di un team apri il dettaglio per modificare dati, membri e organigramma.",
		selector: "#tour-team-shell",
		side: "top",
		prevRoute: "/trattative/tutte",
		roles: ["director"],
	}),
	baseStep({
		title: "Crea un team",
		content:
			"Con questo pulsante apri il flusso per creare un nuovo team, assegnare un nome e collegare i venditori.",
		selector: "#tour-team-crea",
		side: "left",
		prevRoute: "/team",
		roles: ["director"],
	}),
	baseStep({
		title: "Apri il dettaglio di un team",
		content:
			"Clicca una card del team: si apre il dettaglio dove puoi modificare nome, descrizione e membri, oltre a gestire l’organigramma e le statistiche con export PDF, Excel e mappa.",
		selector: "#tour-team-first-card",
		side: "top",
		prevRoute: "/team",
		nextRouteSession: "firstTeamDetail",
		roles: ["director"],
		requiresSessionKey: TOUR_FIRST_TEAM_SESSION_KEY,
	}),
	baseStep({
		title: "Organigramma e membri",
		content:
			"Nel dettaglio leggi la struttura del team e le relazioni tra venditori e responsabili.",
		selector: "#tour-team-org-chart",
		side: "bottom",
		prevRoute: "/team",
		roles: ["director"],
		requiresSessionKey: TOUR_FIRST_TEAM_SESSION_KEY,
	}),
	baseStep({
		title: "Dettagli venditore (scheda membro)",
		content:
			"Se nell’organigramma ci sono membri, su ogni scheda puoi cliccare Dettagli venditore per aprire la supervisione: andamento personale, fasi SPANCO, mappa e trattative di quel venditore.",
		selector: "#tour-team-member-detail-seller",
		side: "top",
		prevRouteSession: "firstTeamDetail",
		roles: ["director"],
		requiresSessionKey: TOUR_TEAM_HAS_MEMBERS_SESSION_KEY,
	}),
	baseStep({
		title: "Venditore (andamento mensile team)",
		content:
			"Qui limiti i dati a un venditore del team o lasci Tutti per vedere l’intero team. I grafici si aggiornano di conseguenza; anche export PDF, Excel e mappa rispettano la scelta del venditore.",
		selector: "#tour-team-detail-monthly-seller-filter",
		side: "bottom",
		prevRouteSession: "firstTeamDetail",
		roles: ["director"],
		requiresSessionKey: TOUR_FIRST_TEAM_SESSION_KEY,
	}),
	baseStep({
		title: "Anno o storico (andamento mensile team)",
		content:
			"Scegli un anno oppure lo storico per allineare grafici e asse temporale. L’export PDF dell’andamento mensile usa l’anno (o lo storico) che imposti qui.",
		selector: "#tour-team-detail-monthly-year-filter",
		side: "bottom",
		prevRouteSession: "firstTeamDetail",
		roles: ["director"],
		requiresSessionKey: TOUR_FIRST_TEAM_SESSION_KEY,
	}),
	baseStep({
		title: "Esporta PDF (team)",
		content:
			"Scarica un PDF delle statistiche mensili del team per l’anno o lo storico selezionato.",
		selector: "#tour-team-detail-export-pdf",
		side: "bottom",
		prevRouteSession: "firstTeamDetail",
		roles: ["director"],
		requiresSessionKey: TOUR_FIRST_TEAM_SESSION_KEY,
	}),
	baseStep({
		title: "Esporta Excel (team)",
		content:
			"Esporta i dati aggregati delle trattative del team in formato Excel.",
		selector: "#tour-team-detail-export-excel",
		side: "bottom",
		prevRouteSession: "firstTeamDetail",
		roles: ["director"],
		requiresSessionKey: TOUR_FIRST_TEAM_SESSION_KEY,
	}),
	baseStep({
		title: "Esporta mappa (team)",
		content:
			"Genera la mappa HTML delle trattative del team; puoi applicare filtri opzionali nel dialog prima del download.",
		selector: "#tour-team-detail-export-map",
		side: "bottom",
		prevRouteSession: "firstTeamDetail",
		nextRoute: "/statistiche",
		roles: ["director"],
		requiresSessionKey: TOUR_FIRST_TEAM_SESSION_KEY,
	}),
	baseStep({
		title: "Passa alle statistiche",
		content:
			"Non hai ancora team in elenco: dopo averne creato uno potrai vedere organigramma ed export dal dettaglio. Continua con la panoramica delle statistiche personali.",
		selector: "#tour-team-shell",
		side: "top",
		prevRoute: "/team",
		nextRoute: "/statistiche",
		roles: ["director"],
		omitIfSessionKey: TOUR_FIRST_TEAM_SESSION_KEY,
	}),
	baseStep({
		title: "Team",
		content:
			"Consulta i team a cui sei assegnato e il lavoro condiviso con colleghi e responsabili.",
		selector: "#tour-team-shell",
		side: "top",
		prevRoute: "/trattative/tutte",
		nextRoute: "/statistiche",
		roles: ["seller"],
	}),
	baseStep({
		title: "Statistiche",
		content: "Analizza andamento, mappa e distribuzione delle trattative.",
		selector: "#tour-statistiche-shell",
		side: "top",
		prevRoute: "/team",
		roles: [...COMMERCIAL_ROLES],
	}),
	baseStep({
		title: "Esporta la mappa",
		content:
			"Scarica la mappa delle trattative come pagina HTML usando i filtri attualmente impostati sulla mappa.",
		selector: "#tour-statistiche-export-map",
		side: "bottom",
		prevRoute: "/statistiche",
		roles: [...COMMERCIAL_ROLES],
	}),
	baseStep({
		title: "Anno per l’export PDF",
		content:
			"Scegli qui l’anno o lo storico aggregato prima di esportare: il PDF mensile include i dati del periodo selezionato, quindi cambia anno se ti serve un altro esercizio.",
		selector: "#tour-statistiche-year-select",
		side: "bottom",
		prevRoute: "/statistiche",
		roles: [...COMMERCIAL_ROLES],
	}),
	baseStep({
		title: "Esporta PDF mensili",
		content:
			"Con l’anno impostato come preferisci, genera il PDF dei grafici mensili (importi e numero di trattative).",
		selector: "#tour-statistiche-export-pdf",
		side: "bottom",
		prevRoute: "/statistiche",
		roles: [...COMMERCIAL_ROLES],
	}),
];

const clientTopicSteps: IcaruTourStep[] = [
	baseStep({
		title: "Clienti",
		content: "Qui gestisci anagrafiche, contatti, sedi e trattative collegate.",
		selector: "#tour-clienti-shell",
		side: "top",
	}),
	baseStep({
		title: "Cerca e filtra clienti",
		content:
			"Usa la ricerca per trovare rapidamente un cliente per nome, email o dati anagrafici.",
		selector: "#tour-clienti-search",
		side: "bottom",
	}),
	baseStep({
		title: "Aggiungi un cliente",
		content:
			"Questo pulsante apre il form per creare una nuova anagrafica cliente con contatti e sede.",
		selector: "#tour-clienti-add-client",
		side: "left",
	}),
	baseStep({
		title: "Importa clienti",
		content:
			"Importa molti clienti insieme da Excel o CSV; nel dialog puoi scaricare il modello e seguire i passaggi indicati.",
		selector: "#tour-clienti-import",
		side: "left",
		prevRoute: "/clienti",
	}),
	baseStep({
		title: "Apri e modifica",
		content:
			"Clicca una riga per entrare nel dettaglio cliente, modificare i dati e salvare.",
		selector: "#tour-clienti-table",
		side: "top",
	}),
	baseStep({
		title: "Crea trattative dal cliente",
		content:
			"Da questa colonna vedi se esistono trattative e puoi crearne una gia collegata al cliente.",
		selector: "#tour-clienti-row-negotiation-action",
		side: "bottom",
	}),
];

const negotiationsTopicSteps: IcaruTourStep[] = [
	baseStep({
		title: "Trattative",
		content:
			"Questa tabella raccoglie opportunita aperte, concluse e abbandonate.",
		selector: "#tour-trattative-shell",
		side: "top",
	}),
	baseStep({
		title: "Filtri e ricerca",
		content:
			"Usa ricerca, stato, SPANCO e ordinamenti per trovare subito le trattative da lavorare.",
		selector: "#tour-trattative-filter-search-row",
		side: "bottom",
	}),
	baseStep({
		title: "Esporta in Excel",
		content:
			"Dalla lista Tutte le trattative scarica un Excel con le trattative; comodo per report o revisioni esterne.",
		selector: "#tour-trattative-export-excel",
		side: "bottom",
		prevRoute: "/trattative/tutte",
	}),
	baseStep({
		title: "Aggiungi una trattativa",
		content:
			"Apri il dialog di creazione per scegliere cliente, referente, importo, SPANCO e percentuale.",
		selector: "#tour-trattative-add-desktop",
		side: "bottom",
	}),
	baseStep({
		title: "Modifica una trattativa",
		content:
			"Clicca una riga per aprire il dettaglio e aggiornare dati, stato, avanzamento e allegati.",
		selector: "#tour-trattative-table",
		side: "top",
	}),
];

const teamTopicSteps: IcaruTourStep[] = [
	baseStep({
		title: "Team",
		content:
			"Qui consulti i team: come direttore puoi crearne di nuovi e aprire il dettaglio cliccando sulla card del team per modificare dati, membri e organigramma; come venditore vedi quelli a cui sei assegnato.",
		selector: "#tour-team-shell",
		side: "top",
	}),
	baseStep({
		title: "Crea un team",
		content:
			"Da questo pulsante avvii la creazione di un team e l’assegnazione dei membri (solo direttore vendite).",
		selector: "#tour-team-crea",
		side: "left",
		prevRoute: "/team",
		roles: ["director"],
	}),
	baseStep({
		title: "Dettaglio dalla card",
		content:
			"Con almeno un team in elenco, clicca sulla card per aprire la pagina dove modifichi nome, descrizione e membri. Senza team creane prima uno con il pulsante sopra.",
		selector: "#tour-team-shell",
		side: "top",
		prevRoute: "/team",
		roles: ["director"],
		omitIfSessionKey: TOUR_FIRST_TEAM_SESSION_KEY,
	}),
	baseStep({
		title: "Apri il dettaglio di un team",
		content:
			"Clicca una card del team: si apre il dettaglio dove puoi modificare nome, descrizione e membri, oltre a gestire l’organigramma e le statistiche con export.",
		selector: "#tour-team-first-card",
		side: "top",
		prevRoute: "/team",
		nextRouteSession: "firstTeamDetail",
		roles: ["director"],
		requiresSessionKey: TOUR_FIRST_TEAM_SESSION_KEY,
	}),
	baseStep({
		title: "Organigramma e membri",
		content: "Visualizza la struttura del team e le relazioni tra i ruoli.",
		selector: "#tour-team-org-chart",
		side: "bottom",
		prevRoute: "/team",
		roles: ["director"],
		requiresSessionKey: TOUR_FIRST_TEAM_SESSION_KEY,
	}),
	baseStep({
		title: "Dettagli venditore (scheda membro)",
		content:
			"Se nell’organigramma ci sono membri, su ogni scheda puoi cliccare Dettagli venditore per aprire la supervisione: andamento personale, fasi SPANCO, mappa e trattative di quel venditore.",
		selector: "#tour-team-member-detail-seller",
		side: "top",
		prevRouteSession: "firstTeamDetail",
		roles: ["director"],
		requiresSessionKey: TOUR_TEAM_HAS_MEMBERS_SESSION_KEY,
	}),
	baseStep({
		title: "Venditore (andamento mensile team)",
		content:
			"Qui limiti i dati a un venditore del team o lasci Tutti per vedere l’intero team. I grafici si aggiornano di conseguenza; anche export PDF, Excel e mappa rispettano la scelta del venditore.",
		selector: "#tour-team-detail-monthly-seller-filter",
		side: "bottom",
		prevRouteSession: "firstTeamDetail",
		roles: ["director"],
		requiresSessionKey: TOUR_FIRST_TEAM_SESSION_KEY,
	}),
	baseStep({
		title: "Anno o storico (andamento mensile team)",
		content:
			"Scegli un anno oppure lo storico per allineare grafici e asse temporale. L’export PDF dell’andamento mensile usa l’anno (o lo storico) che imposti qui.",
		selector: "#tour-team-detail-monthly-year-filter",
		side: "bottom",
		prevRouteSession: "firstTeamDetail",
		roles: ["director"],
		requiresSessionKey: TOUR_FIRST_TEAM_SESSION_KEY,
	}),
	baseStep({
		title: "Esporta PDF (team)",
		content:
			"Scarica il PDF delle statistiche mensili del team per l’anno selezionato.",
		selector: "#tour-team-detail-export-pdf",
		side: "bottom",
		prevRouteSession: "firstTeamDetail",
		roles: ["director"],
		requiresSessionKey: TOUR_FIRST_TEAM_SESSION_KEY,
	}),
	baseStep({
		title: "Esporta Excel (team)",
		content: "Esporta i dati del team in Excel per analisi esterne.",
		selector: "#tour-team-detail-export-excel",
		side: "bottom",
		prevRouteSession: "firstTeamDetail",
		roles: ["director"],
		requiresSessionKey: TOUR_FIRST_TEAM_SESSION_KEY,
	}),
	baseStep({
		title: "Esporta mappa (team)",
		content:
			"Genera la mappa delle trattative del team in HTML, con filtri opzionali nel dialog.",
		selector: "#tour-team-detail-export-map",
		side: "bottom",
		prevRouteSession: "firstTeamDetail",
		roles: ["director"],
		requiresSessionKey: TOUR_FIRST_TEAM_SESSION_KEY,
	}),
];

const statsTopicSteps: IcaruTourStep[] = [
	baseStep({
		title: "Statistiche",
		content: "Qui analizzi andamento, mappa e distribuzione delle trattative.",
		selector: "#tour-statistiche-shell",
		side: "top",
	}),
	baseStep({
		title: "Mappa trattative",
		content:
			"La mappa ti aiuta a capire dove sono distribuite le opportunita commerciali.",
		selector: "#tour-statistiche-map",
		side: "bottom",
	}),
	baseStep({
		title: "Esporta la mappa",
		content:
			"Scarica la mappa con i filtri attuali come file HTML per condividerla o consultarla offline.",
		selector: "#tour-statistiche-export-map",
		side: "bottom",
		prevRoute: "/statistiche",
	}),
	baseStep({
		title: "Andamento mensile",
		content:
			"Questi grafici mostrano importi e numero di trattative nel tempo.",
		selector: "#tour-statistiche-monthly",
		side: "top",
	}),
	baseStep({
		title: "Anno per l’export PDF",
		content:
			"Prima di scaricare il PDF, imposta qui l’anno o lo storico: l’export riflette sempre il periodo selezionato.",
		selector: "#tour-statistiche-year-select",
		side: "bottom",
		prevRoute: "/statistiche",
	}),
	baseStep({
		title: "Esporta PDF mensili",
		content:
			"Quando l’anno è quello giusto, usa questo pulsante per generare il PDF dei grafici mensili.",
		selector: "#tour-statistiche-export-pdf",
		side: "bottom",
		prevRoute: "/statistiche",
	}),
	baseStep({
		title: "Distribuzione SPANCO",
		content:
			"Il grafico SPANCO mostra in che fase si trovano le trattative attive.",
		selector: "#tour-statistiche-spanco",
		side: "top",
	}),
];

const filterStepsByRole = (
	steps: IcaruTourStep[],
	role: AppRole | null | undefined
): IcaruTourStep[] =>
	steps.filter((step) => {
		if (!(step.roles && step.roles.length > 0)) {
			return true;
		}
		if (role == null) {
			return false;
		}
		return step.roles.includes(role as AppRole);
	});

/** Solo ID team numerici accettati in sessionStorage (evita `/team/undefined` o valori corrotti). */
const TOUR_TEAM_ID_NUMERIC = /^\d+$/;

const readFirstTeamIdForTour = (): string | null => {
	if (typeof window === "undefined") {
		return null;
	}
	try {
		const raw = sessionStorage.getItem(TOUR_FIRST_TEAM_SESSION_KEY)?.trim();
		if (raw && TOUR_TEAM_ID_NUMERIC.test(raw)) {
			return raw;
		}
		return null;
	} catch {
		return null;
	}
};

const readHasFirstTeamInSession = (): boolean =>
	readFirstTeamIdForTour() !== null;

const readHasOrgMembersInSession = (): boolean => {
	if (typeof window === "undefined") {
		return false;
	}
	try {
		return sessionStorage.getItem(TOUR_TEAM_HAS_MEMBERS_SESSION_KEY) === "1";
	} catch {
		return false;
	}
};

/**
 * Senza team in elenco (nessuna chiave in sessionStorage) tutti gli step che richiedono
 * `requiresSessionKey` vengono omessi: niente spotlight su `#tour-team-first-card` né
 * `nextRoute` verso `/team/:id`. Lo step con `omitIfSessionKey` resta per portare il tour
 * principale verso `/statistiche` o per chiudere il topic senza URL inventati.
 * Chiave `TOUR_TEAM_HAS_MEMBERS_SESSION_KEY`: solo se il dettaglio team ha membri nell’organigramma.
 */
const filterSessionPresence = (steps: IcaruTourStep[]): IcaruTourStep[] => {
	const hasFirstTeam = readHasFirstTeamInSession();
	const hasOrgMembers = readHasOrgMembersInSession();
	return steps.filter((s) => {
		if (s.requiresSessionKey === TOUR_FIRST_TEAM_SESSION_KEY && !hasFirstTeam) {
			return false;
		}
		if (
			s.requiresSessionKey === TOUR_TEAM_HAS_MEMBERS_SESSION_KEY &&
			!hasOrgMembers
		) {
			return false;
		}
		if (s.omitIfSessionKey === TOUR_FIRST_TEAM_SESSION_KEY && hasFirstTeam) {
			return false;
		}
		return true;
	});
};

const applySessionTeamNav = (steps: IcaruTourStep[]): IcaruTourStep[] => {
	const id = readFirstTeamIdForTour();
	const detailRoute = id != null ? `/team/${id}` : undefined;
	return steps.map((s) => {
		let next = s.nextRoute;
		let prev = s.prevRoute;
		if (s.nextRouteSession === "firstTeamDetail" && detailRoute) {
			next = detailRoute;
		}
		if (s.prevRouteSession === "firstTeamDetail" && detailRoute) {
			prev = detailRoute;
		}
		return { ...s, nextRoute: next, prevRoute: prev };
	});
};

/** Applica filtri ruolo, sessione team e risoluzione route `/team/:id` prima di passare gli step a Onborda. */
export function prepareTourStepsForRuntime(
	steps: IcaruTourStep[],
	role: AppRole | null | undefined
): IcaruTourStep[] {
	const byRole = filterStepsByRole(steps, role);
	const bySession = filterSessionPresence(byRole);
	return applySessionTeamNav(bySession);
}

export function prepareAllToursForRuntime(
	role: AppRole | null | undefined
): IcaruTour[] {
	return buildMainTour(role).map((tour) => ({
		...tour,
		steps: prepareTourStepsForRuntime(tour.steps, role),
	}));
}

const wrapUpStep = (role: AppRole | null | undefined): IcaruTourStep =>
	baseStep({
		title: "Come funziona?",
		content:
			"Puoi riaprire le guide in qualsiasi momento da questo pulsante e scegliere l'argomento che vuoi ripassare.",
		selector: "#tour-sidebar-how-it-works",
		side: "right",
		prevRoute: canSeeCommercialSections(role) ? "/statistiche" : undefined,
	});

export const buildMainTour = (
	role: AppRole | null | undefined
): IcaruTour[] => {
	const steps = canSeeCommercialSections(role)
		? [...sharedSteps, ...commercialSteps, wrapUpStep(role)]
		: [...sharedSteps, wrapUpStep(role)];

	return [
		{
			tour: MAIN_TOUR_NAME,
			steps,
		},
		{
			tour: CLIENTS_TOUR_NAME,
			steps: clientTopicSteps,
		},
		{
			tour: NEGOTIATIONS_TOUR_NAME,
			steps: negotiationsTopicSteps,
		},
		{
			tour: TEAM_TOUR_NAME,
			steps: teamTopicSteps,
		},
		{
			tour: STATS_TOUR_NAME,
			steps: statsTopicSteps,
		},
	];
};
