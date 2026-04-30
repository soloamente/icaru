# Onborda Website Tour Design

## Background and Motivation

ICARU needs a guided product tour that explains how the website works when a user first enters the app. The user should be asked whether they want to take the tour or skip it. After the tour is skipped or completed, a persistent button in the Sidebar footer should let the user restart the tour whenever needed.

The tour should cover the whole website, but it must respect the current role-based navigation. Users should only see tour steps for sections they can access. The first version uses Italian copy only and stores skip/completion state locally in the browser.

## Confirmed Decisions

- Use Onborda as the tour framework.
- Use a full website tour with role-aware steps.
- Save skip/completion state in `localStorage` for now.
- Use a soft center modal for the first-run "Vuoi fare un tour?" prompt.
- Auto-navigate between primary pages during the tour.
- Write tour copy in Italian only for the first implementation.
- Use one global Onborda setup with centralized role-filtered steps, not separate duplicated tours per role.

## Architecture

Add a client-side onboarding layer inside the existing Next.js app shell.

The main pieces are:

- `OnbordaTourProvider`: wraps the authenticated app area, configures Onborda, decides when to show the first-run prompt, and exposes restart behavior.
- `tour-steps.tsx`: centralizes all Italian tour step definitions and assembles the final sequence based on the authenticated user role.
- `OnbordaTourCard`: custom Onborda card styled like ICARU dialogs/cards, with rounded surfaces, muted supporting copy, pill buttons, and short motion.
- `OnbordaStartDialog`: soft center modal shown on first eligible entry with "Inizia tour" and "Salta".
- Sidebar footer integration: add a persistent "Rifai tour" action near "Ricerca rapida" and "Preferenze" for vertical sidebar and top/bottom nav variants.

The provider should wait for auth hydration before doing anything. This avoids showing the prompt during login redirects or while `AuthProvider` is restoring user state from `localStorage`.

## Tour Flow

The main tour starts from Dashboard and auto-navigates through the major sections:

1. Dashboard: landing page, KPI cards, charts, and overall work summary.
2. Sidebar/navigation: primary sections, command palette, preferences, and tour restart.
3. Clienti: client list, search, detail/edit flow, and negotiation shortcut.
4. Trattative: all/open/closed/abandoned sections, filters, creation dialog, SPANCO and progress concepts.
5. Team: shown only to roles with access; explains team cards, detail page, org chart, members, and supervision concepts.
6. Statistiche: shown only to roles with access; explains analytics, charts, map, and exports where available.
7. Wrap-up: points the user to the Sidebar footer "Rifai tour" button.

Steps should use Onborda `selector` ids and `nextRoute`/`prevRoute` route transitions where appropriate. The implementation should prefer stable page-level targets over dynamic row-level elements.

## Role Handling

Shared steps apply to all authenticated users when the target exists.

Role-specific handling:

- Direttore/Venditore: include Clienti, Trattative, Team, and Statistiche steps when those sections are visible.
- Admin: use a shorter tour if admin cannot access those sections. The tour should not target hidden navigation items or pages that return 403.

The step assembler should filter by role before passing steps into Onborda. It should avoid runtime attempts to highlight elements that are not rendered for the current role.

## Persistence

Use `localStorage` for first version persistence.

The storage key should be scoped by:

- tour version
- user identity, preferably email or id if available
- role

This prevents one user's skip/completion from hiding the tour for a different account on the same device. Incrementing the tour version should make the prompt eligible again after meaningful onboarding changes.

## Styling and Interaction

The tour should match ICARU's current visual language:

- Rounded `bg-card` or `bg-popover` surfaces.
- `text-card-foreground` and muted supporting text.
- Pill-style buttons matching existing dialog/action patterns.
- Subtle shadow and overlay, not a harsh default tour appearance.
- Interaction motion under roughly 200ms.
- Icon-only controls need accessible labels.

The first-run prompt should be a soft center modal with two clear actions:

- "Inizia tour"
- "Salta"

On mobile, the tour should use targets that are actually visible in the current navigation mode. If the sidebar is closed or a target is hidden, steps should target a stable visible container or open with a page-level explanation instead of pointing to invisible UI.

## Implementation Boundaries

Do not redesign existing pages as part of this work. Add only stable ids and minimal wrappers needed for Onborda targeting.

Avoid dynamic table row targets because data may be empty or loading. Prefer:

- page header containers
- search/filter bars
- stable stat cards
- route-level shells
- sidebar/nav controls
- empty-state-safe containers

Do not add backend persistence in the first version.

## Testing and Validation

Implementation should verify:

- First-run prompt appears once for an authenticated user/role/browser.
- Clicking "Salta" persists the skip state.
- Completing the tour persists completion state.
- Sidebar "Rifai tour" restarts the tour even after skip/completion.
- Role filtering does not include inaccessible sections.
- Auto-navigation works across Dashboard, Clienti, Trattative, Team, and Statistiche for roles that can access them.
- Admin flow does not target hidden or forbidden pages.
- Mobile and top/bottom navigation variants remain usable during the tour.
- TypeScript and lint checks pass after the dependency and code changes.

## High-Level Implementation Breakdown

1. Add Onborda dependency and Tailwind source support.
2. Add stable tour target ids to the app shell, Sidebar, Dashboard, Clienti, Trattative, Team, and Statistiche.
3. Create centralized role-aware tour definitions.
4. Build the custom Onborda card and first-run prompt modal.
5. Add the global Onborda provider inside the authenticated app shell.
6. Add Sidebar footer restart action in all navigation variants.
7. Validate local persistence, role filtering, route transitions, and mobile behavior.

