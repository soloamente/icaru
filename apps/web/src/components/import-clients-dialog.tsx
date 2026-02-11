"use client";

import { Dialog } from "@base-ui/react/dialog";
import { Select } from "@base-ui/react/select";
import { ChevronDown, FileSpreadsheet, Upload } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useRef, useState } from "react";
import { Drawer } from "vaul";
import { useIsMobile } from "@/hooks/use-is-mobile";
import { importCheck, importConfirm } from "@/lib/api/client";
import type { ImportCheckResponse } from "@/lib/api/types";
import { useAuth } from "@/lib/auth/auth-context";
import { cn } from "@/lib/utils";
import { CheckIcon } from "./icons";
import { Button } from "./ui/button";
import { Spinner } from "./ui/spinner";

/** Human-readable labels for DB columns in the mapping dropdown. */
const DB_COLUMN_LABELS: Record<string, string> = {
	ragione_sociale: "Ragione sociale",
	p_iva: "Partita IVA",
	email: "Email",
	telefono: "Telefono",
	tipologia: "Tipologia",
	indirizzo: "Indirizzo",
	cap: "CAP",
	citta: "Città",
	provincia: "Provincia",
	regione: "Regione",
};

const ACCEPTED_FILE_TYPES = ".xlsx,.xls,.csv";
const ACCEPTED_MIME_TYPES = [
	"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
	"application/vnd.ms-excel",
	"text/csv",
];
/** Regex to allow Excel/CSV extensions when MIME type is missing or generic. */
const EXCEL_CSV_EXTENSION_REGEX = /\.(xlsx|xls|csv)$/i;

type Step = "upload" | "mapping" | "result";

interface ImportClientsDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	/** Called after a successful import so the parent can refetch the clients list. */
	onSuccess?: () => void;
}

/**
 * Dialog for importing clients from Excel/CSV.
 * Step 1: Upload file → analyze (POST /import/check).
 * Step 2: Review/adjust column mapping, then confirm (POST /import/confirm).
 * Step 3: Show result (imported count + any row errors).
 * Uses Base UI Dialog on desktop and Vaul Drawer on mobile, with motion for step transitions.
 */
export function ImportClientsDialog({
	open,
	onOpenChange,
	onSuccess,
}: ImportClientsDialogProps) {
	const isMobile = useIsMobile();
	const { token } = useAuth();

	const [step, setStep] = useState<Step>("upload");
	const [file, setFile] = useState<File | null>(null);
	const [analysis, setAnalysis] = useState<ImportCheckResponse | null>(null);
	const [fileToken, setFileToken] = useState<string>("");
	const [fileExtension, setFileExtension] = useState<string>("");
	// For each unmatched Excel column, user-selected DB column (empty = skip).
	const [unmatchedMapping, setUnmatchedMapping] = useState<
		Record<string, string>
	>({});
	const [uploadError, setUploadError] = useState<string | null>(null);
	const [isAnalyzing, setIsAnalyzing] = useState(false);
	const [isConfirming, setIsConfirming] = useState(false);
	const [confirmError, setConfirmError] = useState<string | null>(null);
	const [importedCount, setImportedCount] = useState<number>(0);
	const [importErrors, setImportErrors] = useState<string[]>([]);
	const [isDragOver, setIsDragOver] = useState(false);
	const fileInputRef = useRef<HTMLInputElement | null>(null);

	const resetState = useCallback(() => {
		setStep("upload");
		setFile(null);
		setAnalysis(null);
		setFileToken("");
		setFileExtension("");
		setUnmatchedMapping({});
		setUploadError(null);
		setConfirmError(null);
		setImportedCount(0);
		setImportErrors([]);
		setIsAnalyzing(false);
		setIsConfirming(false);
	}, []);

	const handleOpenChange = useCallback(
		(open: boolean) => {
			if (!open) {
				resetState();
			}
			onOpenChange(open);
		},
		[onOpenChange, resetState]
	);

	const handleFileSelect = useCallback(
		async (selectedFile: File | null) => {
			if (!(selectedFile && token)) {
				return;
			}
			setUploadError(null);
			setFile(selectedFile);
			setIsAnalyzing(true);
			const result = await importCheck(token, selectedFile);
			setIsAnalyzing(false);
			if ("error" in result) {
				setUploadError(result.error);
				setFile(null);
				return;
			}
			setAnalysis(result.data);
			setFileToken(result.data.file_token);
			setFileExtension(result.data.file_extension);
			// Initialize unmatched mapping: no selection (skip) for each unmatched column.
			const initial: Record<string, string> = {};
			for (const col of result.data.unmatched_excel_columns) {
				initial[col] = "";
			}
			setUnmatchedMapping(initial);
			setStep("mapping");
		},
		[token]
	);

	const handleDrop = useCallback(
		(e: React.DragEvent) => {
			e.preventDefault();
			setIsDragOver(false);
			const f = e.dataTransfer.files?.[0];
			if (
				(f && ACCEPTED_MIME_TYPES.includes(f.type)) ||
				(f && EXCEL_CSV_EXTENSION_REGEX.test(f.name))
			) {
				handleFileSelect(f);
			} else {
				setUploadError(
					"Formato non supportato. Usa un file Excel (.xlsx, .xls) o CSV."
				);
			}
		},
		[handleFileSelect]
	);

	const handleDragOver = useCallback((e: React.DragEvent) => {
		e.preventDefault();
		setIsDragOver(true);
	}, []);

	const handleDragLeave = useCallback((e: React.DragEvent) => {
		e.preventDefault();
		setIsDragOver(false);
	}, []);

	const handleInputChange = useCallback(
		(e: React.ChangeEvent<HTMLInputElement>) => {
			const f = e.target.files?.[0];
			if (f) {
				handleFileSelect(f);
			}
			e.target.value = "";
		},
		[handleFileSelect]
	);

	const setUnmatchedColumn = useCallback((excelCol: string, dbCol: string) => {
		setUnmatchedMapping((prev) => {
			return { ...prev, [excelCol]: dbCol };
		});
	}, []);

	const handleConfirmImport = useCallback(async () => {
		if (!(token && analysis)) {
			return;
		}
		// Build mapping: matched columns + user-selected unmatched (only if dbCol non-empty).
		const mapping: Record<string, string> = {};
		for (const { excel_column, db_column } of analysis.matched_columns) {
			mapping[excel_column] = db_column;
		}
		for (const [excelCol, dbCol] of Object.entries(unmatchedMapping)) {
			if (dbCol) {
				mapping[excelCol] = dbCol;
			}
		}
		setConfirmError(null);
		setIsConfirming(true);
		const result = await importConfirm(token, {
			file_token: fileToken,
			file_extension: fileExtension,
			mapping,
		});
		setIsConfirming(false);
		if ("error" in result) {
			setConfirmError(result.error);
			return;
		}
		setImportedCount(result.data.imported_count);
		setImportErrors(result.data.errors ?? []);
		setStep("result");
	}, [token, analysis, unmatchedMapping, fileToken, fileExtension]);

	const handleCloseAfterResult = useCallback(() => {
		onSuccess?.();
		handleOpenChange(false);
	}, [onSuccess, handleOpenChange]);

	const content = (
		<div className="w-full max-w-lg">
			<AnimatePresence mode="wait">
				{step === "upload" && (
					<motion.div
						animate={{ opacity: 1, y: 0 }}
						className="space-y-4"
						exit={{ opacity: 0, y: -8 }}
						initial={{ opacity: 0, y: 8 }}
						key="upload"
						transition={{ duration: 0.2 }}
					>
						<header>
							<h2 className="font-semibold text-foreground text-lg">
								Importa clienti da Excel/CSV
							</h2>
							<p className="mt-1 text-muted-foreground text-sm">
								Carica un file .xlsx, .xls o .csv. Nel passo successivo potrai
								associare le colonne del file ai campi del database.
							</p>
						</header>
						{/* Drop zone: button triggers file input; drag/drop on same surface for accessibility. */}
						<button
							className={cn(
								"flex min-h-[140px] w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed px-4 py-6 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
								isDragOver
									? "border-primary bg-primary/5"
									: "border-border bg-table-header hover:border-muted-foreground/40 hover:bg-table-buttons"
							)}
							onClick={() => fileInputRef.current?.click()}
							onDragLeave={handleDragLeave}
							onDragOver={handleDragOver}
							onDrop={handleDrop}
							type="button"
						>
							<input
								accept={ACCEPTED_FILE_TYPES}
								className="sr-only"
								disabled={isAnalyzing}
								onChange={handleInputChange}
								ref={fileInputRef}
								type="file"
							/>
							{isAnalyzing ? (
								<>
									<Spinner className="size-8 text-muted-foreground" />
									<span className="text-muted-foreground text-sm">
										Analisi in corso…
									</span>
								</>
							) : (
								<>
									<Upload className="size-10 text-muted-foreground" />
									<span className="font-medium text-foreground text-sm">
										Trascina il file qui o clicca per scegliere
									</span>
									<span className="text-muted-foreground text-xs">
										.xlsx, .xls, .csv
									</span>
								</>
							)}
						</button>
						{uploadError && (
							<motion.p
								animate={{ opacity: 1 }}
								className="text-destructive text-sm"
								initial={{ opacity: 0 }}
							>
								{uploadError}
							</motion.p>
						)}
					</motion.div>
				)}

				{step === "mapping" && analysis && (
					<motion.div
						animate={{ opacity: 1, y: 0 }}
						className="space-y-4"
						exit={{ opacity: 0, y: -8 }}
						initial={{ opacity: 0, y: 8 }}
						key="mapping"
						transition={{ duration: 0.2 }}
					>
						<header>
							<h2 className="font-semibold text-foreground text-lg">
								Associa le colonne
							</h2>
							<p className="mt-1 text-muted-foreground text-sm">
								Le colonne già riconosciute sono pre-associate. Per le altre
								scegli il campo database o lascia "Non importare".
							</p>
							{file && (
								<p className="mt-1 flex items-center gap-1.5 text-muted-foreground text-xs">
									<FileSpreadsheet className="size-3.5" />
									{file.name}
								</p>
							)}
						</header>

						{/* Matched columns: read-only list */}
						{analysis.matched_columns.length > 0 && (
							<div>
								<h3 className="mb-2 font-medium text-foreground text-sm">
									Colonne riconosciute
								</h3>
								<ul className="space-y-1.5">
									{analysis.matched_columns.map((m, i) => (
										<motion.li
											animate={{ opacity: 1, x: 0 }}
											className="flex items-center justify-between gap-2 rounded-xl bg-table-header px-3 py-2 text-sm"
											initial={{ opacity: 0, x: -8 }}
											key={m.excel_column}
											transition={{ delay: i * 0.03, duration: 0.15 }}
										>
											<span className="text-foreground">{m.excel_column}</span>
											<span className="flex items-center gap-1.5 text-muted-foreground">
												<CheckIcon className="size-3.5 text-green-500" />
												{DB_COLUMN_LABELS[m.db_column] ?? m.db_column}
											</span>
										</motion.li>
									))}
								</ul>
							</div>
						)}

						{/* Unmatched: dropdown per column */}
						{analysis.unmatched_excel_columns.length > 0 && (
							<div>
								<h3 className="mb-2 font-medium text-foreground text-sm">
									Altre colonne da associare
								</h3>
								<ul className="space-y-2">
									{analysis.unmatched_excel_columns.map((excelCol, i) => (
										<motion.li
											animate={{ opacity: 1, x: 0 }}
											className="flex items-center gap-2"
											initial={{ opacity: 0, x: -8 }}
											key={excelCol}
											transition={{
												delay: (analysis.matched_columns.length + i) * 0.03,
												duration: 0.15,
											}}
										>
											<span className="min-w-[120px] truncate text-foreground text-sm">
												{excelCol}
											</span>
											<Select.Root
												onValueChange={(value) => {
													setUnmatchedColumn(excelCol, value ?? "");
												}}
												value={unmatchedMapping[excelCol] ?? ""}
											>
												<Select.Trigger
													className={cn(
														"flex h-9 flex-1 cursor-pointer items-center justify-between rounded-xl border-none bg-table-buttons px-3 py-2 font-medium text-foreground text-sm shadow-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
													)}
												>
													<Select.Value>
														{(value: string) =>
															value
																? (DB_COLUMN_LABELS[value] ?? value)
																: "Non importare"
														}
													</Select.Value>
													<Select.Icon className="shrink-0 text-muted-foreground">
														<ChevronDown className="size-4" />
													</Select.Icon>
												</Select.Trigger>
												<Select.Portal>
													<Select.Positioner
														alignItemWithTrigger={false}
														className="z-100 max-h-60 min-w-[200px] rounded-2xl shadow-xl"
														sideOffset={8}
													>
														<Select.Popup className="max-h-60 overflow-y-auto rounded-2xl bg-popover p-1 text-popover-foreground">
															<Select.List className="flex flex-col gap-0.5">
																<Select.Item
																	className="relative flex cursor-pointer select-none items-center rounded-xl py-2 pr-8 pl-3 text-sm outline-hidden transition-colors data-highlighted:bg-accent data-selected:bg-accent data-highlighted:text-foreground data-selected:text-foreground"
																	value=""
																>
																	<Select.ItemIndicator className="absolute right-2 flex size-4 items-center justify-center">
																		<CheckIcon className="size-3.5" />
																	</Select.ItemIndicator>
																	<Select.ItemText>
																		Non importare
																	</Select.ItemText>
																</Select.Item>
																{analysis.all_db_columns.map((dbCol) => (
																	<Select.Item
																		className="relative flex cursor-pointer select-none items-center rounded-xl py-2 pr-8 pl-3 text-sm outline-hidden transition-colors data-highlighted:bg-accent data-selected:bg-accent data-highlighted:text-foreground data-selected:text-foreground"
																		key={dbCol}
																		value={dbCol}
																	>
																		<Select.ItemIndicator className="absolute right-2 flex size-4 items-center justify-center">
																			<CheckIcon className="size-3.5" />
																		</Select.ItemIndicator>
																		<Select.ItemText>
																			{DB_COLUMN_LABELS[dbCol] ?? dbCol}
																		</Select.ItemText>
																	</Select.Item>
																))}
															</Select.List>
														</Select.Popup>
													</Select.Positioner>
												</Select.Portal>
											</Select.Root>
										</motion.li>
									))}
								</ul>
							</div>
						)}

						{confirmError && (
							<motion.p
								animate={{ opacity: 1 }}
								className="text-destructive text-sm"
								initial={{ opacity: 0 }}
							>
								{confirmError}
							</motion.p>
						)}

						<div className="flex gap-2 pt-2">
							<Button
								onClick={() => {
									setStep("upload");
									setConfirmError(null);
								}}
								variant="outline"
							>
								Indietro
							</Button>
							<Button disabled={isConfirming} onClick={handleConfirmImport}>
								{isConfirming ? (
									<>
										<Spinner className="size-4" />
										Importazione…
									</>
								) : (
									"Conferma e importa"
								)}
							</Button>
						</div>
					</motion.div>
				)}

				{step === "result" && (
					<motion.div
						animate={{ opacity: 1, y: 0 }}
						className="space-y-4"
						exit={{ opacity: 0, y: -8 }}
						initial={{ opacity: 0, y: 8 }}
						key="result"
						transition={{ duration: 0.2 }}
					>
						<header>
							<h2 className="font-semibold text-foreground text-lg">
								Importazione completata
							</h2>
							<motion.p
								animate={{ opacity: 1, scale: 1 }}
								className="mt-2 flex items-center gap-2 font-medium text-foreground text-xl tabular-nums"
								initial={{ opacity: 0, scale: 0.95 }}
								transition={{ delay: 0.1, duration: 0.2 }}
							>
								<CheckIcon className="size-6 text-green-500" />
								{importedCount} clienti importati
							</motion.p>
						</header>
						{importErrors.length > 0 && (
							<div className="rounded-xl bg-destructive/10 px-3 py-2.5">
								<h3 className="mb-1.5 font-medium text-destructive text-sm">
									Avvisi per riga
								</h3>
								<ul className="max-h-32 space-y-1 overflow-y-auto text-destructive text-xs">
									{importErrors.map((err, i) => (
										<li key={`import-err-${i}-${err.slice(0, 40)}`}>{err}</li>
									))}
								</ul>
							</div>
						)}
						<Button className="w-full" onClick={handleCloseAfterResult}>
							Chiudi
						</Button>
					</motion.div>
				)}
			</AnimatePresence>
		</div>
	);

	if (isMobile) {
		return (
			<Drawer.Root onOpenChange={handleOpenChange} open={open}>
				<Drawer.Portal>
					<Drawer.Overlay className="fixed inset-0 z-50 bg-black/40" />
					<Drawer.Content className="fixed right-0 bottom-0 left-0 z-50 flex max-h-[90vh] flex-col rounded-t-xl bg-card text-card-foreground outline-none">
						<div className="mx-auto mt-2 h-1.5 w-12 shrink-0 rounded-full bg-muted-foreground/30" />
						<div className="overflow-y-auto p-6 pb-8">{content}</div>
					</Drawer.Content>
				</Drawer.Portal>
			</Drawer.Root>
		);
	}

	return (
		<Dialog.Root
			disablePointerDismissal={false}
			onOpenChange={handleOpenChange}
			open={open}
		>
			<Dialog.Portal>
				<Dialog.Backdrop
					aria-hidden
					className="data-closed:fade-out-0 data-open:fade-in-0 fixed inset-0 z-50 bg-black/50 data-closed:animate-out data-open:animate-in"
				/>
				<div className="fixed inset-0 z-50 flex items-center justify-center p-4">
					<Dialog.Popup
						aria-describedby="import-clients-dialog-desc"
						aria-labelledby="import-clients-dialog-title"
						className="data-closed:fade-out-0 data-closed:zoom-out-95 data-open:fade-in-0 data-open:zoom-in-95 w-full max-w-lg overflow-hidden rounded-3xl bg-card text-card-foreground shadow-lg outline-none duration-200 data-closed:animate-out data-open:animate-in"
					>
						<div className="max-h-[85vh] overflow-y-auto p-6">
							<h2 className="sr-only" id="import-clients-dialog-title">
								Importa clienti da Excel/CSV
							</h2>
							<p className="sr-only" id="import-clients-dialog-desc">
								Carica un file e associa le colonne ai campi del database, poi
								conferma l’importazione.
							</p>
							{content}
						</div>
					</Dialog.Popup>
				</div>
			</Dialog.Portal>
		</Dialog.Root>
	);
}
