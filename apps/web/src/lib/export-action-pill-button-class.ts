import { TRATTATIVE_HEADER_FILTER_BG } from "@/lib/trattative-header-filter-classes";
import { cn } from "@/lib/utils";

/**
 * Pill condivisa per azioni “Esporta” (team, statistiche, trattative):
 * allineata a Crea team / Aggiungi con `pr-4.25` per bilanciare icona + label.
 * Superficie: default `bg-background` su pannelli `bg-card`; Dataweb (`rich`) usa `bg-table-buttons`.
 */
export const EXPORT_ACTION_PILL_BUTTON_CLASS = cn(
	"flex min-h-10 cursor-pointer items-center justify-center gap-2.5 rounded-full px-3.75 py-1.75 pr-4.25 text-card-foreground text-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50",
	TRATTATIVE_HEADER_FILTER_BG
);
