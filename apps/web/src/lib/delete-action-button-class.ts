import { cn } from "@/lib/utils";

/**
 * Classe condivisa per il pulsante «Elimina» in pagine di dettaglio (clienti, trattative),
 * in header (desktop) e nella riga sotto al form (mobile). Variant `destructive` + queste
 * classi: tinta senza bordo, testo readabile in dataweb light.
 */
export const DELETE_TINT_BUTTON_CLASSNAME =
	"h-10 min-w-24 rounded-xl border-0 bg-destructive/10 text-sm shadow-none hover:bg-destructive/10 hover:text-destructive focus-visible:ring-destructive/25 dark:bg-destructive/20 dark:hover:bg-destructive/20 dark:hover:text-destructive";

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
