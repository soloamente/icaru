# Onborda Website Tour Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a full, role-aware Onborda website tour with first-run prompt, local persistence, auto-navigation, custom ICARU styling, and a Sidebar footer restart button.

**Architecture:** Install Onborda in `apps/web`, wrap the authenticated app shell with a small client provider, and keep all tour copy/role filtering in focused files under `apps/web/src/lib/onborda/`. Add stable `id` targets to existing page shells and navigation controls without redesigning the current UI.

**Tech Stack:** Next.js App Router, React 19, TypeScript, Tailwind CSS v4, Onborda, existing ICARU auth/preferences/sidebar patterns, Bun/Turborepo.

---

## File Structure

- Create `apps/web/src/lib/onborda/tour-storage.ts`: localStorage keys and helpers for skipped/completed state.
- Create `apps/web/src/lib/onborda/tour-steps.tsx`: centralized Italian tour copy and role-aware step assembly.
- Create `apps/web/src/components/onborda-tour-card.tsx`: custom Onborda card styled like ICARU dialogs.
- Create `apps/web/src/components/onborda-start-dialog.tsx`: first-run soft center modal with "Inizia tour" and "Salta".
- Create `apps/web/src/components/onborda-tour-provider.tsx`: Onborda wrapper, first-run logic, and global restart event handling.
- Modify `apps/web/package.json`: add `onborda`.
- Modify `apps/web/src/styles/globals.css`: include Onborda as a Tailwind v4 source.
- Modify `apps/web/src/components/providers.tsx`: wrap app content with `OnbordaTourProvider`.
- Modify `apps/web/src/components/sidebar.tsx`: add stable tour ids and "Rifai tour" footer action in vertical and horizontal variants.
- Modify route/page components and core page components for stable ids:
  - `apps/web/src/app/(main)/dashboard/page.tsx`
  - `apps/web/src/app/(main)/clienti/page.tsx`
  - `apps/web/src/components/clients-table.tsx`
  - `apps/web/src/app/(main)/trattative/tutte/page.tsx`
  - `apps/web/src/app/(main)/trattative/aperte/page.tsx`
  - `apps/web/src/app/(main)/trattative/concluse/page.tsx`
  - `apps/web/src/app/(main)/trattative/abbandonate/page.tsx`
  - `apps/web/src/components/trattative-table.tsx`
  - `apps/web/src/app/(main)/team/page.tsx`
  - `apps/web/src/components/teams-view.tsx`
  - `apps/web/src/components/team-org-chart.tsx`
  - `apps/web/src/app/(main)/statistiche/page.tsx`

Do not commit during execution unless the user explicitly asks.

---

### Task 1: Add Onborda Dependency And Tailwind Source

**Files:**
- Modify: `apps/web/package.json`
- Modify: `bun.lock` via package manager
- Modify: `apps/web/src/styles/globals.css`

- [ ] **Step 1: Install Onborda in the web workspace**

Run from repo root:

```bash
bun add onborda --cwd apps/web
```

Expected: `apps/web/package.json` contains `onborda` in `dependencies`, and `bun.lock` updates.

- [ ] **Step 2: Add Tailwind v4 source include**

Modify the top of `apps/web/src/styles/globals.css`:

```css
@import "tailwindcss";
@source "../../../node_modules/onborda/dist/**/*.{js,ts,jsx,tsx}";
@import "tw-animate-css";
```

The relative path is from `apps/web/src/styles/globals.css` to repo root `node_modules`.

- [ ] **Step 3: Verify package install**

Run:

```bash
bun --cwd apps/web build
```

Expected: build should not fail because of missing `onborda` imports or Tailwind source syntax. If unrelated pre-existing build failures appear, document them in `.cursor/scratchpad.md` before continuing.

---

### Task 2: Add Tour Persistence Helpers

**Files:**
- Create: `apps/web/src/lib/onborda/tour-storage.ts`

- [ ] **Step 1: Create localStorage helper module**

Create `apps/web/src/lib/onborda/tour-storage.ts`:

```ts
export const MAIN_TOUR_NAME = "main" as const;
export const MAIN_TOUR_VERSION = "2026-04-29" as const;

type TourState = "completed" | "skipped";

interface TourStorageIdentity {
	email?: string | null;
	role?: string | null;
}

const normalizeStoragePart = (value: string | null | undefined): string =>
	(value?.trim().toLowerCase() || "anonymous").replaceAll(/\s+/g, "-");

export const getTourStorageKey = ({
	email,
	role,
}: TourStorageIdentity): string =>
	[
		"icaru",
		"onborda",
		MAIN_TOUR_NAME,
		MAIN_TOUR_VERSION,
		normalizeStoragePart(role),
		normalizeStoragePart(email),
	].join(":");

export const readTourState = (key: string): TourState | null => {
	if (typeof window === "undefined") {
		return null;
	}
	const value = window.localStorage.getItem(key);
	if (value === "completed" || value === "skipped") {
		return value;
	}
	return null;
};

export const writeTourState = (key: string, state: TourState): void => {
	if (typeof window === "undefined") {
		return;
	}
	window.localStorage.setItem(key, state);
};
```

- [ ] **Step 2: Verify TypeScript syntax**

Run:

```bash
bun --cwd apps/web run build
```

Expected: no TypeScript error from `tour-storage.ts`.

---

### Task 3: Add Role-Aware Tour Step Definitions

**Files:**
- Create: `apps/web/src/lib/onborda/tour-steps.tsx`

- [ ] **Step 1: Create the tour step module**

Create `apps/web/src/lib/onborda/tour-steps.tsx`:

```tsx
import type { ReactNode } from "react";
import { MAIN_TOUR_NAME } from "./tour-storage";

type AppRole = "admin" | "director" | "seller" | string;

type TourSide = "top" | "bottom" | "left" | "right";

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
}

export interface IcaruTour {
	tour: typeof MAIN_TOUR_NAME;
	steps: IcaruTourStep[];
}

const canSeeCommercialSections = (role: AppRole | null | undefined): boolean =>
	role === "director" || role === "seller";

const baseStep = (step: IcaruTourStep): IcaruTourStep => ({
	showControls: true,
	pointerPadding: 10,
	pointerRadius: 18,
	...step,
});

const sharedSteps: IcaruTourStep[] = [
	baseStep({
		title: "Benvenuto in ICARU",
		content:
			"Questo tour ti mostra le aree principali del sito e dove trovare gli strumenti piu importanti.",
		selector: "#tour-dashboard-shell",
		side: "bottom",
		nextRoute: "/dashboard",
	}),
	baseStep({
		title: "La tua navigazione",
		content:
			"Da qui puoi spostarti tra Dashboard, Clienti, Trattative, Team e Statistiche in base al tuo ruolo.",
		selector: "#tour-sidebar-navigation",
		side: "right",
	}),
	baseStep({
		title: "Ricerca rapida",
		content:
			"Usa la ricerca rapida per trovare clienti, trattative e team senza passare manualmente da ogni pagina.",
		selector: "#tour-sidebar-quick-search",
		side: "right",
	}),
	baseStep({
		title: "Preferenze",
		content:
			"Qui puoi cambiare tema, posizione della navigazione e preferenze visive dell'interfaccia.",
		selector: "#tour-sidebar-preferences",
		side: "right",
	}),
];

const commercialSteps: IcaruTourStep[] = [
	baseStep({
		title: "Dashboard operativa",
		content:
			"Le card e i grafici riassumono lo stato delle tue trattative e aiutano a capire dove intervenire.",
		selector: "#tour-dashboard-stats",
		side: "bottom",
		nextRoute: "/clienti",
	}),
	baseStep({
		title: "Clienti",
		content:
			"La sezione Clienti raccoglie anagrafiche, ricerca e accessi rapidi alle trattative collegate.",
		selector: "#tour-clienti-shell",
		side: "top",
		prevRoute: "/dashboard",
		nextRoute: "/trattative/tutte",
		roles: ["director", "seller"],
	}),
	baseStep({
		title: "Cerca e filtra",
		content:
			"Usa la barra di ricerca per restringere l'elenco e trovare velocemente il cliente giusto.",
		selector: "#tour-clienti-search",
		side: "bottom",
		roles: ["director", "seller"],
	}),
	baseStep({
		title: "Trattative",
		content:
			"Qui trovi tutte le trattative, con filtri, stato SPANCO, percentuale di avanzamento e azioni rapide.",
		selector: "#tour-trattative-shell",
		side: "top",
		prevRoute: "/clienti",
		nextRoute: "/team",
		roles: ["director", "seller"],
	}),
	baseStep({
		title: "Filtri e ricerca trattative",
		content:
			"Questi controlli ti aiutano a filtrare per stato, fase SPANCO e testo libero.",
		selector: "#tour-trattative-controls",
		side: "bottom",
		roles: ["director", "seller"],
	}),
	baseStep({
		title: "Team",
		content:
			"La sezione Team mostra i gruppi di lavoro. I direttori possono gestire membri e supervisionare i venditori.",
		selector: "#tour-team-shell",
		side: "top",
		prevRoute: "/trattative/tutte",
		nextRoute: "/statistiche",
		roles: ["director", "seller"],
	}),
	baseStep({
		title: "Statistiche",
		content:
			"Le statistiche mostrano mappa, grafici mensili, distribuzione SPANCO ed esportazioni operative.",
		selector: "#tour-statistiche-shell",
		side: "top",
		prevRoute: "/team",
		roles: ["director", "seller"],
	}),
];

const wrapUpStep = baseStep({
	title: "Puoi rifare il tour quando vuoi",
	content:
		"Il bottone Rifai tour resta nella navigazione: usalo ogni volta che vuoi ripassare il funzionamento del sito.",
	selector: "#tour-sidebar-redo-tour",
	side: "right",
	prevRoute: "/statistiche",
});

export const buildMainTour = (role: AppRole | null | undefined): IcaruTour[] => {
	const steps = canSeeCommercialSections(role)
		? [...sharedSteps, ...commercialSteps, wrapUpStep]
		: [...sharedSteps, wrapUpStep];

	return [
		{
			tour: MAIN_TOUR_NAME,
			steps: steps.filter((step) => !step.roles || step.roles.includes(role ?? "")),
		},
	];
};
```

- [ ] **Step 2: Adjust route jumps if Team is not visible for a role**

If the current app confirms Admin does not see Clienti/Trattative/Team/Statistiche, keep the admin tour as shared navigation/search/preferences/wrap-up only. Do not add `nextRoute` to inaccessible pages for admin.

- [ ] **Step 3: Verify TypeScript syntax**

Run:

```bash
bun --cwd apps/web run build
```

Expected: no TypeScript errors from `tour-steps.tsx`.

---

### Task 4: Build Custom Tour Card And Start Dialog

**Files:**
- Create: `apps/web/src/components/onborda-tour-card.tsx`
- Create: `apps/web/src/components/onborda-start-dialog.tsx`

- [ ] **Step 1: Create custom Onborda card**

Create `apps/web/src/components/onborda-tour-card.tsx`:

```tsx
"use client";

import { ArrowLeft, ArrowRight, X } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface OnbordaTourCardProps {
	step?: {
		title?: string;
		content?: ReactNode;
		icon?: ReactNode;
	};
	currentStep?: number;
	totalSteps?: number;
	nextStep?: () => void;
	prevStep?: () => void;
	closeOnborda?: () => void;
}

export function OnbordaTourCard({
	step,
	currentStep = 0,
	totalSteps = 1,
	nextStep,
	prevStep,
	closeOnborda,
}: OnbordaTourCardProps) {
	const isFirstStep = currentStep <= 0;
	const isLastStep = currentStep >= totalSteps - 1;

	return (
		<div className="w-[min(22rem,calc(100vw-2rem))] rounded-3xl bg-popover p-4 text-popover-foreground shadow-2xl ring-1 ring-border/40">
			<div className="mb-3 flex items-start justify-between gap-3">
				<div className="flex min-w-0 items-start gap-3">
					{step?.icon ? (
						<div className="flex size-9 shrink-0 items-center justify-center rounded-2xl bg-table-header text-card-foreground">
							{step.icon}
						</div>
					) : null}
					<div className="min-w-0">
						<p className="mb-1 text-muted-foreground text-xs">
							Passo {currentStep + 1} di {totalSteps}
						</p>
						<h2 className="text-card-foreground text-lg leading-tight">
							{step?.title}
						</h2>
					</div>
				</div>
				<button
					aria-label="Chiudi tour"
					className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-table-header text-card-foreground transition-colors duration-150 hover:bg-table-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
					onClick={closeOnborda}
					type="button"
				>
					<X aria-hidden className="size-4" />
				</button>
			</div>
			<div className="text-card-foreground/80 text-sm leading-relaxed">
				{step?.content}
			</div>
			<div className="mt-4 flex items-center justify-between gap-3">
				<button
					className={cn(
						"flex items-center gap-2 rounded-2xl bg-table-header px-3 py-2 text-card-foreground text-sm transition-colors duration-150 hover:bg-table-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
						isFirstStep && "pointer-events-none opacity-40"
					)}
					disabled={isFirstStep}
					onClick={prevStep}
					type="button"
				>
					<ArrowLeft aria-hidden className="size-4" />
					Indietro
				</button>
				<button
					className="flex items-center gap-2 rounded-2xl bg-card-foreground px-4 py-2 text-card text-sm transition-transform duration-150 hover:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
					onClick={isLastStep ? closeOnborda : nextStep}
					type="button"
				>
					{isLastStep ? "Fine" : "Avanti"}
					{isLastStep ? null : <ArrowRight aria-hidden className="size-4" />}
				</button>
			</div>
		</div>
	);
}
```

If Onborda's installed custom-card prop names differ from these assumptions, adapt the prop names to the installed package types while preserving this visual structure.

- [ ] **Step 2: Create first-run start dialog**

Create `apps/web/src/components/onborda-start-dialog.tsx`:

```tsx
"use client";

import { Dialog } from "@base-ui/react/dialog";

interface OnbordaStartDialogProps {
	open: boolean;
	onStart: () => void;
	onSkip: () => void;
}

export function OnbordaStartDialog({
	open,
	onStart,
	onSkip,
}: OnbordaStartDialogProps) {
	return (
		<Dialog.Root open={open}>
			<Dialog.Portal>
				<Dialog.Backdrop className="fixed inset-0 z-50 bg-black/35 backdrop-blur-[2px]" />
				<Dialog.Popup className="-translate-x-1/2 -translate-y-1/2 fixed top-1/2 left-1/2 z-50 w-[min(92vw,28rem)] rounded-3xl bg-popover p-5 text-popover-foreground shadow-2xl ring-1 ring-border/40">
					<Dialog.Title className="text-card-foreground text-xl leading-tight">
						Vuoi fare un tour?
					</Dialog.Title>
					<Dialog.Description className="mt-2 text-card-foreground/80 text-sm leading-relaxed">
						Ti mostriamo in pochi passaggi come funzionano Dashboard, Clienti,
						Trattative, Team e Statistiche in base al tuo ruolo.
					</Dialog.Description>
					<div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
						<button
							className="rounded-2xl bg-table-header px-4 py-2.5 text-card-foreground text-sm transition-colors duration-150 hover:bg-table-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
							onClick={onSkip}
							type="button"
						>
							Salta
						</button>
						<button
							className="rounded-2xl bg-card-foreground px-4 py-2.5 text-card text-sm transition-transform duration-150 hover:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
							onClick={onStart}
							type="button"
						>
							Inizia tour
						</button>
					</div>
				</Dialog.Popup>
			</Dialog.Portal>
		</Dialog.Root>
	);
}
```

- [ ] **Step 3: Verify component syntax**

Run:

```bash
bun --cwd apps/web run build
```

Expected: no TypeScript errors from the new components. If Onborda type integration is not yet used, this task should still compile.

---

### Task 5: Add Global Onborda Provider

**Files:**
- Create: `apps/web/src/components/onborda-tour-provider.tsx`
- Modify: `apps/web/src/components/providers.tsx`

- [ ] **Step 1: Create provider component**

Create `apps/web/src/components/onborda-tour-provider.tsx`:

```tsx
"use client";

import { Onborda, OnbordaProvider, useOnborda } from "onborda";
import { usePathname, useRouter } from "next/navigation";
import { type ReactNode, useEffect, useMemo, useState } from "react";
import { useAuthOptional } from "@/lib/auth/auth-context";
import { buildMainTour } from "@/lib/onborda/tour-steps";
import {
	getTourStorageKey,
	MAIN_TOUR_NAME,
	readTourState,
	writeTourState,
} from "@/lib/onborda/tour-storage";
import { OnbordaStartDialog } from "./onborda-start-dialog";
import { OnbordaTourCard } from "./onborda-tour-card";

const REDO_TOUR_EVENT = "icr-onborda-redo-tour";

function OnbordaTourController({ children }: { children: ReactNode }) {
	const auth = useAuthOptional();
	const pathname = usePathname();
	const router = useRouter();
	const { startOnborda, closeOnborda } = useOnborda();
	const [hasMounted, setHasMounted] = useState(false);
	const [showStartDialog, setShowStartDialog] = useState(false);

	const storageKey = useMemo(
		() =>
			getTourStorageKey({
				email: auth?.user?.email,
				role: auth?.role,
			}),
		[auth?.role, auth?.user?.email]
	);

	useEffect(() => {
		setHasMounted(true);
	}, []);

	useEffect(() => {
		if (!(hasMounted && auth?.isLoaded && auth.user && auth.role)) {
			setShowStartDialog(false);
			return;
		}
		if (pathname === "/login") {
			setShowStartDialog(false);
			return;
		}
		setShowStartDialog(readTourState(storageKey) === null);
	}, [auth?.isLoaded, auth?.role, auth?.user, hasMounted, pathname, storageKey]);

	useEffect(() => {
		const handleRedoTour = () => {
			setShowStartDialog(false);
			router.push("/dashboard");
			window.setTimeout(() => {
				startOnborda(MAIN_TOUR_NAME);
			}, 250);
		};

		window.addEventListener(REDO_TOUR_EVENT, handleRedoTour);
		return () => {
			window.removeEventListener(REDO_TOUR_EVENT, handleRedoTour);
		};
	}, [router, startOnborda]);

	const handleStart = () => {
		setShowStartDialog(false);
		router.push("/dashboard");
		window.setTimeout(() => {
			startOnborda(MAIN_TOUR_NAME);
		}, 250);
	};

	const handleSkip = () => {
		writeTourState(storageKey, "skipped");
		setShowStartDialog(false);
		closeOnborda();
	};

	return (
		<>
			{children}
			<OnbordaStartDialog
				onSkip={handleSkip}
				onStart={handleStart}
				open={showStartDialog}
			/>
		</>
	);
}

export function OnbordaTourProvider({ children }: { children: ReactNode }) {
	const auth = useAuthOptional();
	const tours = useMemo(() => buildMainTour(auth?.role), [auth?.role]);

	return (
		<OnbordaProvider>
			<Onborda
				cardComponent={OnbordaTourCard}
				cardTransition={{ duration: 0.18, type: "tween" }}
				shadowOpacity="0.35"
				shadowRgb="0,0,0"
				showOnborda={false}
				steps={tours}
			>
				<OnbordaTourController>{children}</OnbordaTourController>
			</Onborda>
		</OnbordaProvider>
	);
}

export const dispatchRedoTour = (): void => {
	if (typeof window === "undefined") {
		return;
	}
	window.dispatchEvent(new Event(REDO_TOUR_EVENT));
};
```

If the installed Onborda API uses `customCard` instead of `cardComponent`, update only that prop. Keep the provider/state logic unchanged.

- [ ] **Step 2: Wrap authenticated providers**

Modify `apps/web/src/components/providers.tsx`:

```tsx
import { OnbordaTourProvider } from "./onborda-tour-provider";
```

Wrap the children inside `AuthProvider`:

```tsx
<AuthProvider>
	<OnbordaTourProvider>{children}</OnbordaTourProvider>
	{process.env.NODE_ENV === "development" && (
		<Agentation
			endpoint="http://localhost:4747"
			onSessionCreated={(sessionId) => {
				console.log("Session started:", sessionId);
			}}
		/>
	)}
	{/* <ReactQueryDevtools /> */}
</AuthProvider>
```

- [ ] **Step 3: Verify provider imports**

Run:

```bash
bun --cwd apps/web run build
```

Expected: build gets past Onborda imports. If Onborda's custom card type differs, adjust the component prop names to the installed package's TypeScript types.

---

### Task 6: Add Sidebar Restart Button And Navigation Target IDs

**Files:**
- Modify: `apps/web/src/components/sidebar.tsx`

- [ ] **Step 1: Import restart dispatcher and icon**

Modify imports in `sidebar.tsx`:

```tsx
import { RotateCcw } from "lucide-react";
import { dispatchRedoTour } from "./onborda-tour-provider";
```

If keeping the existing grouped `lucide-react` import, add `RotateCcw` beside `ChevronDown`, `ChevronRight`, and `X`.

- [ ] **Step 2: Extend `FooterItem` with optional id**

Update the interface:

```tsx
interface FooterItem {
	icon: IconComponent;
	label: string;
	onClick?: () => void;
	/** Stable id used by the Onborda tour to highlight footer actions. */
	tourId?: string;
	/** Optional: human-readable keyboard shortcut to show in a tooltip (es. "⌘K" / "Ctrl+K"). */
	shortcutHint?: string;
}
```

- [ ] **Step 3: Add restart item to `navFooter`**

Append after "Preferenze":

```tsx
{
	icon: RotateCcw as IconComponent,
	label: "Rifai tour",
	onClick: () => {
		dispatchRedoTour();
		if (sidebarOpen?.isMobile && sidebarOpen.isOpen) {
			sidebarOpen.setOpen(false);
		}
	},
	tourId: "tour-sidebar-redo-tour",
},
```

- [ ] **Step 4: Add ids to footer buttons**

In both horizontal and vertical `navFooter.map`, add:

```tsx
id={item.tourId}
```

to the `<button>`.

- [ ] **Step 5: Add ids to navigation containers and known footer actions**

Add `id="tour-sidebar-navigation"` to the primary `<nav aria-label="Navigazione principale">` in both horizontal and vertical branches.

Add explicit `tourId` values to the existing footer items:

```tsx
tourId: "tour-sidebar-quick-search",
```

for "Ricerca rapida", and:

```tsx
tourId: "tour-sidebar-preferences",
```

for "Preferenze".

- [ ] **Step 6: Verify layout**

Run:

```bash
bun --cwd apps/web run build
```

Expected: no TypeScript errors. Sidebar still renders "Ricerca rapida", "Preferenze", and "Rifai tour" in vertical and horizontal variants.

---

### Task 7: Add Stable Page Target IDs

**Files:**
- Modify page/component files listed below.

- [ ] **Step 1: Dashboard ids**

In `apps/web/src/app/(main)/dashboard/page.tsx`, add `id="tour-dashboard-shell"` to the root `<main>`.

Add `id="tour-dashboard-stats"` to the stable container around the statistics/card grid. If there is no single wrapper around cards, wrap only the card grid with:

```tsx
<section id="tour-dashboard-stats" className="...existing classes...">
	{/* existing dashboard stats cards */}
</section>
```

Do not change visual classes.

- [ ] **Step 2: Clienti ids**

In `apps/web/src/app/(main)/clienti/page.tsx`, prefer adding the page shell id inside `ClientsTable` so the target remains around the actual UI.

In `apps/web/src/components/clients-table.tsx`:

Add `id="tour-clienti-shell"` to the root `<main>` or outer page container.

Add `id="tour-clienti-search"` to the search input wrapper. If the search wrapper is a `div`, add the id there instead of the raw `input`.

- [ ] **Step 3: Trattative ids**

In `apps/web/src/components/trattative-table.tsx`:

Add `id="tour-trattative-shell"` to the root `<main>` or outer table shell.

Add `id="tour-trattative-controls"` to the header controls wrapper that contains search/filter/add actions.

Do not target table rows.

- [ ] **Step 4: Team ids**

In `apps/web/src/components/teams-view.tsx`:

Add `id="tour-team-shell"` to the root `<main>` or outer page shell.

If the team detail org chart is included in the tour later, add `id="tour-team-org-chart"` to the stable org chart section in `apps/web/src/components/team-org-chart.tsx`. Keep this as a stable page-level target, not a member row.

- [ ] **Step 5: Statistiche ids**

In `apps/web/src/app/(main)/statistiche/page.tsx`, the root `<main>` already has `data-statistiche`. Add:

```tsx
id="tour-statistiche-shell"
```

to the same `<main>`.

Optionally add `id="tour-statistiche-map"`, `id="tour-statistiche-monthly"`, and `id="tour-statistiche-spanco"` to the three existing sections if later steps are split more granularly.

- [ ] **Step 6: Verify selectors exist**

Run:

```bash
rg 'tour-(dashboard|clienti|trattative|team|statistiche|sidebar)' apps/web/src
```

Expected: selectors from `tour-steps.tsx` exist in source files.

---

### Task 8: Complete Tour State On Finish

**Files:**
- Modify: `apps/web/src/components/onborda-tour-provider.tsx`
- Modify: `apps/web/src/components/onborda-tour-card.tsx`

- [ ] **Step 1: Add finish event helper**

In `onborda-tour-provider.tsx`, add:

```tsx
const COMPLETE_TOUR_EVENT = "icr-onborda-complete-tour";
```

Add a listener inside `OnbordaTourController`:

```tsx
useEffect(() => {
	const handleCompleteTour = () => {
		writeTourState(storageKey, "completed");
		setShowStartDialog(false);
	};

	window.addEventListener(COMPLETE_TOUR_EVENT, handleCompleteTour);
	return () => {
		window.removeEventListener(COMPLETE_TOUR_EVENT, handleCompleteTour);
	};
}, [storageKey]);
```

Export dispatcher:

```tsx
export const dispatchCompleteTour = (): void => {
	if (typeof window === "undefined") {
		return;
	}
	window.dispatchEvent(new Event(COMPLETE_TOUR_EVENT));
};
```

- [ ] **Step 2: Dispatch finish from final card**

In `onborda-tour-card.tsx`, import:

```tsx
import { dispatchCompleteTour } from "./onborda-tour-provider";
```

Replace the last-step click handler with:

```tsx
const handlePrimaryAction = () => {
	if (isLastStep) {
		dispatchCompleteTour();
		closeOnborda?.();
		return;
	}
	nextStep?.();
};
```

Use it on the primary button:

```tsx
onClick={handlePrimaryAction}
```

- [ ] **Step 3: Verify completion state compiles**

Run:

```bash
bun --cwd apps/web run build
```

Expected: no circular-import runtime issue. If a circular import warning appears, move event names/dispatchers to `apps/web/src/lib/onborda/tour-events.ts`.

---

### Task 9: Manual Browser QA

**Files:**
- No code changes expected unless issues are found.

- [ ] **Step 1: Start dev server**

Check existing terminals first. If no dev server is already running, run:

```bash
bun dev:web
```

Expected: Next app starts on the configured web port.

- [ ] **Step 2: First-run prompt**

Log in as a director or seller in a browser profile where the new localStorage key is absent.

Expected:

- Soft center modal appears after landing in the app.
- "Salta" closes it and localStorage stores `skipped`.
- Reload does not show the prompt again.

- [ ] **Step 3: Restart tour**

Click "Rifai tour" in the Sidebar/footer.

Expected:

- Tour starts from Dashboard.
- Step card uses ICARU visual style.
- Next/Back controls work.

- [ ] **Step 4: Auto-navigation**

Continue through the tour.

Expected:

- Tour moves across `/dashboard`, `/clienti`, `/trattative/tutte`, `/team`, and `/statistiche` for director/seller.
- Highlighted targets exist and are visible.
- No step points at a missing dynamic table row.

- [ ] **Step 5: Role QA**

Repeat as Admin if available.

Expected:

- Admin does not get steps for hidden or forbidden commercial pages.
- Tour remains short and does not navigate into 403 routes.

- [ ] **Step 6: Mobile/nav variants**

Use the app preferences to test sidebar-left, sidebar-right, top, and bottom navigation positions if practical.

Expected:

- "Rifai tour" remains reachable.
- Tour cards do not trap navigation or point to invisible sidebar controls.

---

### Task 10: Final Verification And Scratchpad Update

**Files:**
- Modify: `.cursor/scratchpad.md`

- [ ] **Step 1: Run static verification**

Run:

```bash
bun --cwd apps/web run build
```

Run lints through Cursor diagnostics for edited files, then run:

```bash
bun x ultracite check
```

Expected: no new errors from the Onborda implementation. If repository-wide pre-existing issues appear, record them separately and verify edited files are clean.

- [ ] **Step 2: Update scratchpad Executor section**

Append a concise implementation note to `.cursor/scratchpad.md` under `Executor's Feedback or Assistance Requests`:

```markdown
- **Onborda Website Tour:** Implementato tour role-aware con prompt iniziale, persistenza localStorage per utente/ruolo, auto-navigation tra pagine principali e bottone Sidebar "Rifai tour". Verificare manualmente first-run, skip, complete, restart, ruoli e mobile/nav variants prima di segnare il task come completato.
```

- [ ] **Step 3: Ask for manual validation**

Report the exact verification results and ask the user to validate the tour visually before marking the project board item complete.

