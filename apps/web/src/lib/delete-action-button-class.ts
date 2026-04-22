import { cn } from "@/lib/utils";

/**
 * Classe condivisa per il pulsante «Elimina» in pagine di dettaglio (clienti, trattative),
 * in header (desktop) e nella riga sotto al form (mobile). Variant `destructive` + queste
 * classi: tinta senza bordo, testo readabile in dataweb light.
 */
export const DELETE_TINT_BUTTON_CLASSNAME =
	"!h-10 min-h-10 min-w-26 rounded-xl border-0 bg-destructive/10 text-sm shadow-none hover:bg-destructive/10 hover:text-destructive focus-visible:ring-destructive/25 dark:bg-destructive/20 dark:hover:bg-destructive/20 dark:hover:text-destructive";

/**
 * Stessa tinta in griglia a 3 sotto al form (mobile): larghezze flessibili, niente overflow orizzontale.
 */
export const DELETE_TINT_FOOTER_CLASSNAME = cn(
	DELETE_TINT_BUTTON_CLASSNAME,
	"w-full min-w-0 max-sm:shrink max-sm:px-1.5 max-sm:text-xs"
);

/**
 * Annulla / Salva (o controllo disabilitato) in cella sotto a viewport stretto.
 * Stessa altezza di `DELETE_TINT_FOOTER` / Elimina (`h-10`); `!` batte l’`h-8` del Button default.
 */
export const MOBILE_FOOTER_SECONDARY_ACTION_CLASSNAME =
	"flex !h-10 min-h-10 w-full min-w-0 max-sm:shrink max-sm:px-1.5 max-sm:text-xs sm:px-2.5";

/**
 * «Annulla» in header (md+) su pagine dettaglio: stessa larghezza minima (`min-w-26`) di Salva e tint Elimina.
 */
export const DETAIL_HEADER_ANNULLA_DISABLED_CLASSNAME =
	"!h-10 inline-flex min-h-10 min-w-26 cursor-not-allowed items-center justify-center rounded-xl border border-border bg-secondary font-medium text-secondary-foreground text-sm opacity-50";

/**
 * «Annulla» in header (md+), stato attivo: outline coerente con le altre pagine dettaglio.
 */
export const DETAIL_HEADER_ANNULLA_OUTLINE_CLASSNAME =
	"!h-10 inline-flex min-h-10 min-w-26 items-center justify-center rounded-xl border border-border bg-secondary font-medium text-secondary-foreground text-sm transition-colors hover:bg-secondary/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

/**
 * «Salva» in header (md+) su pagine dettaglio: stessa altezza del tint Elimina, batte h-8 del Button.
 */
export const DETAIL_HEADER_SALVA_BUTTON_CLASSNAME =
	"!h-10 min-h-10 min-w-26 rounded-xl text-sm";
