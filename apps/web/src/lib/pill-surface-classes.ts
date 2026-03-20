/**
 * Superfici pill su tema chiaro predefinito: -200 rispetto a -100 per contrasto su card/bianco.
 * Usate per stato trattativa, CTA negli empty state e pill inline (es. “Aggiungi” / “Ha trattativa”).
 */

/** Pill “Aperta” e altre sky non interattive (solo lettura). */
export const SKY_STATUS_PILL_LIGHT_CLASSES =
	"bg-sky-200 text-sky-800 dark:bg-sky-900/30 dark:text-sky-400";

/**
 * CTA negli empty state (`AnimatedEmptyState`) e pill inline cliccabili sky:
 * hover/focus per feedback; dark:hover separato.
 */
export const SKY_CTA_PILL_LIGHT_CLASSES = `${SKY_STATUS_PILL_LIGHT_CLASSES} transition-colors hover:bg-sky-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/70 dark:hover:bg-sky-900/40`;

/** Stato “Conclusa” / successo (solo lettura). */
export const GREEN_STATUS_PILL_LIGHT_CLASSES =
	"bg-green-200 text-green-800 dark:bg-green-900/30 dark:text-green-400";

/** Pill verde cliccabile (es. “Ha trattativa” nella tabella clienti). */
export const GREEN_CTA_PILL_LIGHT_CLASSES = `${GREEN_STATUS_PILL_LIGHT_CLASSES} transition-colors hover:bg-green-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500/70 dark:hover:bg-green-900/40`;

/** Stato “Abbandonata” / errore (solo lettura). */
export const RED_STATUS_PILL_LIGHT_CLASSES =
	"bg-red-200 text-red-800 dark:bg-red-900/30 dark:text-red-400";
