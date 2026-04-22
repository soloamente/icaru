/**
 * List headers on `bg-card` (trattative, clienti, team, dettaglio membro, statistiche anno, mappa trattative): search, filter pills, CTA pill (Aggiungi, Importa, Crea team, export).
 * Surfaces sit on `bg-card`; default palette uses `bg-background` for contrast.
 * Dataweb (`data-color-scheme="rich"` on `html`): keep `bg-table-buttons` for the established tint.
 * Also composed into `EXPORT_ACTION_PILL_BUTTON_CLASS` for the same default vs Dataweb behavior.
 */
export const TRATTATIVE_HEADER_FILTER_BG =
	'bg-background [html[data-color-scheme="rich"]_&]:bg-table-buttons';

/** Base UI Select sets `data-popup-open` while the menu is open; mirror the same default vs rich surfaces. */
export const TRATTATIVE_HEADER_FILTER_BG_POPUP_OPEN =
	'data-popup-open:bg-background [html[data-color-scheme="rich"]_&]:data-popup-open:bg-table-buttons';

/**
 * Pill filtri sulla shell tabella (`table-container-bg`), es. riga sopra la griglia in supervisione venditore.
 * Tema predefinito: `bg-card` per staccare le pill dal fondo tabella; Dataweb: `bg-table-buttons`.
 */
export const TABLE_CONTAINER_FILTER_PILL_BG =
	'bg-card [html[data-color-scheme="rich"]_&]:bg-table-buttons';

export const TABLE_CONTAINER_FILTER_PILL_BG_POPUP_OPEN =
	'data-popup-open:bg-card [html[data-color-scheme="rich"]_&]:data-popup-open:bg-table-buttons';
