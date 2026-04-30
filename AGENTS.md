# Ultracite Code Standards

This project uses **Ultracite**, a zero-config preset that enforces strict code quality standards through automated formatting and linting.

## Quick Reference

- **Format code**: `bun x ultracite fix`
- **Check for issues**: `bun x ultracite check`
- **Diagnose setup**: `bun x ultracite doctor`

Biome (the underlying engine) provides robust linting and formatting. Most issues are automatically fixable.

---

## Core Principles

Write code that is **accessible, performant, type-safe, and maintainable**. Focus on clarity and explicit intent over brevity.

### Type Safety & Explicitness

- Use explicit types for function parameters and return values when they enhance clarity
- Prefer `unknown` over `any` when the type is genuinely unknown
- Use const assertions (`as const`) for immutable values and literal types
- Leverage TypeScript's type narrowing instead of type assertions
- Use meaningful variable names instead of magic numbers - extract constants with descriptive names

### Modern JavaScript/TypeScript

- Use arrow functions for callbacks and short functions
- Prefer `for...of` loops over `.forEach()` and indexed `for` loops
- Use optional chaining (`?.`) and nullish coalescing (`??`) for safer property access
- Prefer template literals over string concatenation
- Use destructuring for object and array assignments
- Use `const` by default, `let` only when reassignment is needed, never `var`

### Async & Promises

- Always `await` promises in async functions - don't forget to use the return value
- Use `async/await` syntax instead of promise chains for better readability
- Handle errors appropriately in async code with try-catch blocks
- Don't use async functions as Promise executors

### React & JSX

- Use function components over class components
- Call hooks at the top level only, never conditionally
- Specify all dependencies in hook dependency arrays correctly
- Use the `key` prop for elements in iterables (prefer unique IDs over array indices)
- Nest children between opening and closing tags instead of passing as props
- Don't define components inside other components
- Use semantic HTML and ARIA attributes for accessibility:
  - Provide meaningful alt text for images
  - Use proper heading hierarchy
  - Add labels for form inputs
  - Include keyboard event handlers alongside mouse events
  - Use semantic elements (`<button>`, `<nav>`, etc.) instead of divs with roles

### Error Handling & Debugging

- Remove `console.log`, `debugger`, and `alert` statements from production code
- Throw `Error` objects with descriptive messages, not strings or other values
- Use `try-catch` blocks meaningfully - don't catch errors just to rethrow them
- Prefer early returns over nested conditionals for error cases

### Code Organization

- Keep functions focused and under reasonable cognitive complexity limits
- Extract complex conditions into well-named boolean variables
- Use early returns to reduce nesting
- Prefer simple conditionals over nested ternary operators
- Group related code together and separate concerns

### Security

- Add `rel="noopener"` when using `target="_blank"` on links
- Avoid `dangerouslySetInnerHTML` unless absolutely necessary
- Don't use `eval()` or assign directly to `document.cookie`
- Validate and sanitize user input

### Performance

- Avoid spread syntax in accumulators within loops
- Use top-level regex literals instead of creating them in loops
- Prefer specific imports over namespace imports
- Avoid barrel files (index files that re-export everything)
- Use proper image components (e.g., Next.js `<Image>`) over `<img>` tags

### Framework-Specific Guidance

**Next.js:**

- Use Next.js `<Image>` component for images
- Use `next/head` or App Router metadata API for head elements
- Use Server Components for async data fetching instead of async Client Components

**React 19+:**

- Use ref as a prop instead of `React.forwardRef`

**Solid/Svelte/Vue/Qwik:**

- Use `class` and `for` attributes (not `className` or `htmlFor`)

---

## Testing

- Write assertions inside `it()` or `test()` blocks
- Avoid done callbacks in async tests - use async/await instead
- Don't use `.only` or `.skip` in committed code
- Keep test suites reasonably flat - avoid excessive `describe` nesting

## When Biome Can't Help

Biome's linter will catch most issues automatically. Focus your attention on:

1. **Business logic correctness** - Biome can't validate your algorithms
2. **Meaningful naming** - Use descriptive names for functions, variables, and types
3. **Architecture decisions** - Component structure, data flow, and API design
4. **Edge cases** - Handle boundary conditions and error states
5. **User experience** - Accessibility, performance, and usability considerations
6. **Documentation** - Add comments for complex logic, but prefer self-documenting code

---

## Learned User Preferences

- In dataweb light, card/panel surfaces use `text-card-foreground` and `hover:text-card-foreground` (not `text-foreground` / `hover:text-foreground`)
- Dataweb light: form inputs on cards/panels use `bg-input` (not `bg-background`) so fields stay readable and distinct from the card/dialog surface
- Dialog close buttons: use `bg-table-header`, `text-card-foreground`, `hover:bg-table-hover` to match input fields
- Stat card values on `bg-card` and empty state headings: use `text-card-foreground` for contrast in dataweb light; empty state subtitles use `text-card-foreground/80`
- "Aperta" status pill: use `bg-sky-200` when on azzurrino/table-header backgrounds in dataweb light
- Pass only numeric values to AnimateNumber; formatted strings cause NaN
- Team member map: zoom first, then click to open detail dialog (same as clients map)
- Table sections: title on row 1, filters plus search bar on row 2 with `justify-between` (like trattative page)
- Editable row icons (pen, envelope): show on detail pages only, not in dialogs
- Default light theme (non-dataweb): adjust neutral gray tokens in `globals.css` `:root` (keep `--table-header` darker than `--card` so `bg-table-header` rows and chips read inside `bg-card` panels; use `bg-table-header-readonly` / `--table-header-readonly` for read-only field rows so they read softer than editable `bg-table-header` chips); rich/dataweb uses `[data-color-scheme="rich"]` and `.dark`—change the matching block for that mode
- Mobile overlay sidebars: close after navigating via sidebar links or the logo. A right-docked mobile sidebar should dismiss from backdrop tap and a clear close control, like the left drawer. If vertical sidebar chrome overflows horizontally, allow horizontal scroll or reflow so items stay reachable. Onborda guide is disabled on mobile; non-tour mobile help dialogs should use the existing bottom-drawer pattern.
- Dataweb light: date picker and calendar popovers stay on light surfaces; selected-day styling must keep foreground readable (avoid dark dialog shells or blue selection chips without contrasting text)

## Learned Workspace Facts

- Global search / command palette: backdrop dimming should cover the full layout including the main content column, not only the sidebar
- API: `api/clients/company` removed; clients and trattative use `/me` endpoints per role. Client import template download uses authenticated `GET /api/import/template`, returning `template_clienti.xlsx` as an XLSX blob.
- Use fallback for `team.creator` when API may omit it (safeCreator pattern with `creator_id`)
- framer-motion: do not use `motion/react`; use package-specific import paths
- Dataweb dark theme: define `--popover`, `--muted`, `--accent`, `--accent-foreground` for dropdowns and avatar fallbacks to match theme
- Onborda: highlights/cards use portals and live target geometry so responsive layouts do not shift targets off screen; desktop trattative steps target `#tour-trattative-filter-search-row` for filters/search and `#tour-trattative-add-desktop` for Add; `@neoconfetti/react` fullscreen confetti needs a fixed top-center anchor because its origin is its own node.
- Recharts: `stackId` merges segments into one shape; for separate pill-shaped bars per month on mobile (gap shows card background), use a custom column layout (`flex`/`ul` per month) or split charts—not stack + spacer hacks; keep a fixed left Y-axis rail so scale labels stay visible while the month row scrolls horizontally
- Statistiche page layout: negotiations map → monthly charts → SPANCO donut; below `md` (768px) the monthly block is four stacked single-series charts in order: importo aperte, importo chiuse, numero aperte, numero chiuse; at `md+` use the two dual-series chart grids
- Dashboard and Statistiche: do not use a global “hero” `main-page-title` on the `h1`—use plain heading styling (inherits body scale). On mobile-heavy routes, root `main` often uses `px-5 sm:px-9` instead of uniform `px-9` (e.g. clienti/trattative detail, statistiche)
- Negotiations map filter panel on statistiche: use `stat-card-bg` with `bg-stat-card` to match monthly stat cards (avoid relying on `bg-background` alone in dataweb light)
- Detail headers: inactive action groups should use `hidden` (not only `opacity-0`) so they do not reserve flex width; long titles need `w-full` and wrapping rather than `truncate` when mobile width is tight
- `update-negotiation-form.tsx`: `SECTION_CARD_CLASSES` stacks each section title above its body (`flex flex-col`). On `md+`, section content uses two-column grids as implemented (Dati trattativa, Allegati list vs upload, Stato e avanzamento e.g. Spanco + Importo with full-width rows for slider/Abbandonata). Field rows still use `flex-col md:flex-row` for label/value pills; editable/read-only values in Dati trattativa use `text-start md:text-start`, and the **Note** label aligns to the top of the textarea. `update-client-form.tsx` mirrors this layout pattern for client details, with editable inputs left-aligned.

---

Most formatting and common issues are automatically fixed by Biome. Run `bun x ultracite fix` before committing to ensure compliance.
