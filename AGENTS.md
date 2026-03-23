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

- In dataweb light theme, use `text-card-foreground` for text on card/table surfaces (not `text-foreground`)
- Hover on card/panel surfaces in dataweb light: use `hover:text-card-foreground` (not `hover:text-foreground`)
- Dataweb light: form inputs on cards/panels use `bg-input` (not `bg-background`) so fields stay readable and distinct from the card/dialog surface
- Dialog close buttons: use `bg-table-header`, `text-card-foreground`, `hover:bg-table-hover` to match input fields
- Stat card values on `bg-card`: use `text-card-foreground` for contrast in dataweb light
- Empty state text: use `text-card-foreground` (heading) and `text-card-foreground/80` (subtitle)
- "Aperta" status pill: use `bg-sky-200` when on azzurrino/table-header backgrounds in dataweb light
- Pass only numeric values to AnimateNumber; formatted strings cause NaN
- Team member map: zoom first, then click to open detail dialog (same as clients map)
- Table sections: title on row 1, filters plus search bar on row 2 with `justify-between` (like trattative page)
- Editable row icons (pen, envelope): show on detail pages only, not in dialogs
- Default light theme (non-dataweb): adjust neutral gray tokens in `globals.css` `:root` (keep `--table-header` darker than `--card` so `bg-table-header` rows and chips read inside `bg-card` panels; use `bg-table-header-readonly` / `--table-header-readonly` for read-only field rows so they read softer than editable `bg-table-header` chips); rich/dataweb uses `[data-color-scheme="rich"]` and `.dark`—change the matching block for that mode
- Mobile left/right overlay sidebar: close the menu after navigating via sidebar links or the logo so the new page is not covered on narrow viewports

## Learned Workspace Facts

- API: `api/clients/company` removed; clients and trattative use `/me` endpoints per role
- Use fallback for `team.creator` when API may omit it (safeCreator pattern with `creator_id`)
- framer-motion: do not use `motion/react`; use package-specific import paths
- Dataweb dark theme: define `--popover`, `--muted`, `--accent`, `--accent-foreground` for dropdowns and avatar fallbacks to match theme
- Tooltips inside scroll-fade-y or masked containers: use Tooltip with FloatingPortal to avoid clipping
- Recharts: `stackId` merges segments into one shape; for separate pill-shaped bars per month on mobile (gap shows card background), use a custom column layout (`flex`/`ul` per month) or split charts—not stack + spacer hacks
- Root `main` on mobile-heavy routes often uses `px-5 sm:px-9` instead of uniform `px-9` (e.g. clienti/trattative detail, statistiche)
- Detail headers: inactive action groups should use `hidden` (not only `opacity-0`) so they do not reserve flex width; long titles need `w-full` and wrapping rather than `truncate` when mobile width is tight
- `update-negotiation-form.tsx`: label and value stack on mobile (`flex-col md:flex-row`); read-only row values use `truncate` when ellipsis is preferred over wrapping

---

Most formatting and common issues are automatically fixed by Biome. Run `bun x ultracite fix` before committing to ensure compliance.
