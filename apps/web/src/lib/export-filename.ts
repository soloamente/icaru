/**
 * Nomi file per export (PDF, Excel, mappa HTML): prefisso descrittivo + data locale.
 * Allineato ai Content-Disposition dell'API Laravel quando presenti; altrimenti fallback lato client.
 */

/** Data locale nel formato YYYY-MM-DD (es. 2026-05-22). */
export function exportDateStamp(date: Date = new Date()): string {
	const y = date.getFullYear();
	const m = String(date.getMonth() + 1).padStart(2, "0");
	const d = String(date.getDate()).padStart(2, "0");
	return `${y}-${m}-${d}`;
}

/** Suffisso anno per export PDF statistiche (es. `-2025` o `-storico`). */
export function exportYearSuffix(year?: string): string {
	if (!year || year.trim().length === 0) {
		return "";
	}
	const trimmed = year.trim();
	if (trimmed === "storico") {
		return "-storico";
	}
	return `-${trimmed}`;
}

/** Basename generici restituiti dall'URL o da header incompleti (es. map → map.htm). */
const GENERIC_EXPORT_BASENAMES = new Set([
	"map",
	"pdf",
	"excel",
	"download",
	"template",
]);

/** Prefissi già descrittivi dall'API (statistiche-team-2026-05-22.pdf, ecc.). */
const DESCRIPTIVE_EXPORT_PREFIX = /^(statistiche|trattative|mappa)(-team)?-/i;

function basenameWithoutExtension(filename: string): string {
	const lastDot = filename.lastIndexOf(".");
	if (lastDot <= 0) {
		return filename.toLowerCase();
	}
	return filename.slice(0, lastDot).toLowerCase();
}

/** True se il nome non distingue export passati (map, pdf, excel, …). */
export function isGenericExportFilename(filename: string): boolean {
	const trimmed = filename.trim();
	if (trimmed.length === 0) {
		return true;
	}
	const base = basenameWithoutExtension(trimmed);
	if (GENERIC_EXPORT_BASENAMES.has(base)) {
		return true;
	}
	if (DESCRIPTIVE_EXPORT_PREFIX.test(trimmed)) {
		return false;
	}
	return base.length < 8;
}

/**
 * Preferisce il nome da Content-Disposition se descrittivo; altrimenti il fallback con data.
 */
export function resolveExportFilename(
	fromHeader: string,
	fallback: string
): string {
	const trimmed = fromHeader.trim();
	if (trimmed.length === 0 || isGenericExportFilename(trimmed)) {
		return fallback;
	}
	return trimmed;
}

export function buildPersonalStatisticsPdfFilename(year?: string): string {
	return `statistiche${exportYearSuffix(year)}-${exportDateStamp()}.pdf`;
}

export function buildPersonalNegotiationsExcelFilename(): string {
	return `trattative-${exportDateStamp()}.xlsx`;
}

export function buildPersonalNegotiationsMapFilename(): string {
	return `mappa-trattative-${exportDateStamp()}.html`;
}

export function buildTeamStatisticsPdfFilename(year?: string): string {
	return `statistiche-team${exportYearSuffix(year)}-${exportDateStamp()}.pdf`;
}

export function buildTeamNegotiationsExcelFilename(): string {
	return `trattative-team-${exportDateStamp()}.xlsx`;
}

export function buildTeamNegotiationsMapFilename(): string {
	return `mappa-team-${exportDateStamp()}.html`;
}
