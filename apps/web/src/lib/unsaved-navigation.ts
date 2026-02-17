"use client";

/**
 * Lightweight global coordination layer so that pages with moduli modificabili
 * (es. trattative edit) possano intercettare le richieste di navigazione
 * provenienti da componenti esterni come la Sidebar.
 *
 * L'obiettivo è mostrare un dialog / drawer di conferma "Modifiche non salvate"
 * quando l'utente prova a cambiare pagina con modifiche locali non salvate.
 *
 * Il pattern è intenzionalmente minimale:
 * - una sola callback globale alla volta (la pagina di edit attualmente montata)
 * - chi fa navigazione (Sidebar, top nav, ecc.) chiama requestUnsavedNavigation(href)
 * - se esiste un listener, decide lui se bloccare o eseguire la navigazione.
 */

/** Descrive una richiesta di navigazione che può essere intercettata. */
export interface UnsavedNavigationRequest {
	/** Percorso di destinazione richiesto (es. "/dashboard", "/trattative/tutte"). */
	href: string;
}

/** Funzione che gestisce una richiesta di navigazione; ritorna true se gestita. */
type UnsavedNavigationListener = (request: UnsavedNavigationRequest) => boolean;

/** Listener globale corrente; al massimo uno alla volta (pagina di edit attiva). */
let currentListener: UnsavedNavigationListener | null = null;

/**
 * Registra un listener globale per intercettare le richieste di navigazione.
 * La pagina di edit chiama questa funzione in un useEffect e riceve in cambio
 * una funzione di cleanup per deregistrarsi in unmount o quando non serve più.
 *
 * Il listener dovrebbe:
 * - Se ci sono modifiche non salvate: aprire il dialog e restituire true
 * - Se non ci sono modifiche: eseguire direttamente la navigazione e restituire true
 *
 * Se per qualsiasi motivo non vuole gestire la richiesta, può restituire false.
 */
export function registerUnsavedNavigationListener(
	listener: UnsavedNavigationListener
): () => void {
	currentListener = listener;
	return () => {
		// Deregistra solo se è ancora lo stesso listener (evita race di replace rapidi).
		if (currentListener === listener) {
			currentListener = null;
		}
	};
}

/**
 * Chiamata dai componenti di navigazione (Sidebar, dropdown Trattative, ecc.)
 * per dare alla pagina corrente la possibilità di intercettare la navigazione.
 *
 * Ritorna:
 * - true  → la richiesta è stata gestita dal listener (dialog aperto o navigazione effettuata)
 * - false → nessun listener registrato o errore; il chiamante deve procedere normalmente.
 */
export function requestUnsavedNavigation(href: string): boolean {
	if (!currentListener) {
		return false;
	}
	try {
		return currentListener({ href });
	} catch {
		// In caso di errore nel listener non blocchiamo la navigazione di default.
		return false;
	}
}
