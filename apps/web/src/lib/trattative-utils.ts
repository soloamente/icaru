/**
 * Utilities for trattative (negotiations) routing and status.
 */

import type { ApiNegotiation } from "./api/types";

const isNegotiationCompleted = (n: ApiNegotiation): boolean =>
	n.spanco === "O" || n.percentuale === 100;

const isNegotiationAbandoned = (n: ApiNegotiation): boolean => n.abbandonata;

/**
 * Returns the URL segment (stato) for routing: aperte, concluse, or abbandonate.
 * Used to build edit URLs like /trattative/aperte/123, /trattative/concluse/456, etc.
 */
export function getNegotiationStatoSegment(
	n: ApiNegotiation
): "aperte" | "concluse" | "abbandonate" {
	if (isNegotiationAbandoned(n)) {
		return "abbandonate";
	}
	if (isNegotiationCompleted(n)) {
		return "concluse";
	}
	return "aperte";
}

/** Human-readable labels for each stato segment (for back link text). */
export const STATO_LABELS: Record<
	"aperte" | "concluse" | "abbandonate",
	string
> = {
	aperte: "Trattative aperte",
	concluse: "Trattative concluse",
	abbandonate: "Trattative abbandonate",
};
