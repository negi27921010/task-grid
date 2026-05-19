# Task Grid — UI/UX Rehaul Prompt

Paste everything below this line into a fresh LLM session opened at `/Users/admin/Desktop/PW Academy/taskflow`. The app already works end to end — your job is purely visual and interaction polish.

---

## 1. Role and mission

You are a senior product designer who codes. Your mission is a comprehensive UI/UX rehaul of Task Grid, an internal task and project management app for PW Academy. You will not rewrite features. You will align every surface to the existing token system and the aesthetic captured in `Design System.md`, remove inconsistencies, eliminate raw color literals, collapse duplicate styling into shared primitives, and tighten typography, spacing, motion, and empty-state polish. You touch only presentation: components, page composition, CSS, design tokens, and the JSX glue that wires them. You do not touch React Query keys, Supabase queries, server actions, API handlers, RLS, migrations, or auth logic. Treat this as a staff-engineer-reviewed PR — every change must be defensible.

## 2. Stack snapshot

Read from `package.json`, do not assume.

- Next.js `16.2.1` (App Router, React Server Components by default). `AGENTS.md` warns this version diverges from training data; read `node_modules/next/dist/docs/` before any framework-touching change.
- React `19.2.4`.
- Tailwind CSS `^4` via `@tailwindcss/postcss`. No `tailwind.config.js` — theme extensions live in CSS via `@theme` / `@theme inline`.
- Radix UI primitives: avatar, checkbox, dialog, dropdown-menu, popover, scroll-area, select, separator, tooltip.
- TanStack React Query `^5.95.2`.
- Supabase via `@supabase/ssr` and `@supabase/supabase-js` (server: `src/lib/supabase-server.ts`, client: `src/lib/supabase.ts`).
- `@dnd-kit/core` + `@dnd-kit/sortable` for kanban.
- `react-hook-form` + `zod` + `@hookform/resolvers` for forms.
- `nodemailer` for outbound mail (do not touch).
- `lucide-react` for icons. `clsx` + `tailwind-merge` for `cn`.
- TypeScript `^5`, ESLint `^9`, package manager `pnpm`. Do not run `pnpm install`, `pnpm dev`, `pnpm build`, or `pnpm lint` — the user runs scripts.

## 3. Source of truth

Two files, in priority order.

**1. `src/app/globals.css`** — the live token contract. It defines:

- CSS custom properties on `:root` and `[data-theme="dark"]` for canvas, surface, sidebar, borders, hover/pressed, text hierarchy, neutral scale, accent (electric blue), keyboard shortcut chrome, status colors (`--status-backlog` through `--status-stuck`), priority colors, shadows, motion (`--ease-out-expo`, `--ease-spring`, `--duration-fast|normal|slow`), and radii (`--radius-sm|md|lg|xl|full`).
- A Tailwind 4 `@theme inline {}` bridge that exposes the variables as utility tokens (`bg-canvas`, `bg-surface`, `text-text`, `text-text-muted`, `border-border-color`, `bg-accent-soft`, `bg-status-working`, etc.).
- A legacy compatibility `@theme inline {}` block bridging older Tabler-style names (`bg-background`, `text-foreground`, `bg-muted`, `border-border`, `text-primary`, aging/department colors). Keep this bridge — older components depend on it.
- Utilities: `.card-tabler`, `.glass`, `.glass-strong`, `.text-gradient`, `.orb`, `.animate-fade-in-up`, `.animate-scale-in`, `.animate-shimmer`, `.stagger-children`. Use these instead of inventing equivalents.
- A global `*` transition rule and a `focus-visible` ring built on `--accent`. Do not override globally.
- A `@custom-variant dark (&:where([data-theme="dark"], [data-theme="dark"] *))` declaration enabling `dark:` utilities.

**2. `/Users/admin/Desktop/PW Academy/Design System.md`** — a scraped HTML capture of Google Antigravity's marketing site. This is an **aesthetic mood board, not a token registry.** Mine it for hero typography rhythm, dark cinematic canvases with ambient orbs and gradient particles, glass surfaces, soft shadows, confident micro-copy, primary buttons with hover shimmer, and secondary outlined buttons. Do not copy Antigravity branding, names, illustrations, or Angular markup. The `globals.css` header comment confirms this is the intended posture: "Inspired by antigravity.google".

Hierarchy: **tokens beat ad-hoc colors; primitives beat duplicate styling; page-level CSS only when primitives cannot express the layout.**

## 4. Concrete inventory

Routes under `src/app/`:

- `/` — landing/redirect. Align hero typography with `var(--font-display)`.
- `/login`, `/forgot-password`, `/reset-password` — auth surfaces. Single-column glass card centered on `bg-canvas`.
- `/dashboard` — main "My Tasks / Admin view" landing. Largest payoff for spacing and hierarchy work.
- `/project/[id]` — project detail with table/kanban/hybrid views. Touches `task/` and `board/` heavily.
- `/standups` — daily standup (morning/evening/admin). Emphasize state transitions and empty states.
- `/settings` — user management and permission toggles. Tabbed admin surface.
- `/registry` — workstream registry directory.
- `/design` — preview route. Its own header reads: *"Safe to delete once Phase 4 finishes the page-by-page reskin."* Use it as your living styleguide during the rehaul. Do not delete unless the user explicitly asks.
- `error.tsx`, `loading.tsx` — global boundaries. Must render the cinematic canvas, not a white default.
- `/api/**` — out of scope.

Component folders under `src/components/`:

- `ui/` — base primitives (`button`, `badge`, `dialog`, `dropdown-menu`, `input`, `popover`, `select`, `tooltip`, `toast`, `skeleton`, `empty-state`, `avatar`). All other code must consume these. Audit and fix gaps here first.
- `design-system/` — higher-level visual atoms (`avatar-stack`, `card`, `completion-spark`, `kbd`, `kpi-tile`, `owner-workload`, `priority-tag`, `status-donut`, `status-pill`, `timeline-bar`, plus `tone.ts`). Canonical visualization layer.
- `shell/` — app chrome (`refined-app-shell`, `refined-sidebar`, `refined-page-header`, `refined-toolbar`, `command-palette`, `bulk-bar`). New layouts compose from these.
- `layout/` — older chrome (`app-shell`, `header`, `sidebar`, `notification-bell`, `search-dialog`, `user-switcher`). Migrate consumers to `shell/` where equivalent; bring leftovers to token parity.
- `board/` — `refined-kanban`, `refined-task-card`, `refined-task-table`, `task-hierarchy-children`. Polish drag visuals and column headers.
- `task/` — the richest folder for inconsistency. Sweep colors and spacing systematically.
- `chat/` — streaming AI surface. Typing indicator, bubbles, code blocks all use tokens.
- `notifications/` — alerters. Toast styling flows from `ui/toast.tsx`.
- `theme/` — `theme-provider`, `theme-script`, `theme-toggle`. Already correct. Do not break the pre-paint script.

Library folders under `src/lib/` (`api/`, `hooks/`, `types/`, `utils/`, `supabase*.ts`, `email*.ts`, `storage.ts`, `bolt-skills.ts`) are **out of scope for visual changes** — read for context only. `src/lib/mock-data/` exists; nothing in shipped UI should import from it.

## 5. Migration sequence

Five ordered phases. Define *done* before opening the next phase. After each phase, regenerate the `/design` preview.

**Phase 1 — Tokens.** Audit `globals.css`. Confirm every token a component asks for exists; add missing ones at `:root` and `[data-theme="dark"]` together. Replace ad-hoc hex literals in components with token references. Verify the legacy bridge still maps every name used in older components. **Done when:** `grep -RInE '#[0-9a-fA-F]{3,8}\b|rgba?\(' src/` returns only `globals.css` and justifiable SVG `fill=` attributes.

**Phase 2 — Primitives.** Sweep `src/components/ui/` and `src/components/design-system/`. Each primitive accepts `className`, forwards refs on DOM-wrapping components, and exposes a small variant API rather than encouraging raw Tailwind at call sites. `Button` is the template: variants and sizes via `Record`, `cn` for merge, `forwardRef`, `displayName`. Ensure `Badge`, `StatusBadge`, `PriorityDot`, `AgingBadge`, `Skeleton`, `EmptyState`, `Avatar`, `Kbd`, `StatusPill`, `PriorityTag`, `TimelineBar`, `KpiTile`, `StatusDonut`, `CompletionSpark` all read from tokens, support dark mode, and expose `aria-*` where they convey state. **Done when:** every primitive uses only token utilities and `/design` renders the full inventory without console warnings.

**Phase 3 — Shells.** Every page composes `RefinedAppShell` + `RefinedPageHeader` + `RefinedToolbar` instead of duplicating header markup. Sidebar carries brand, primary nav, project list, AI chat shortcut, user switcher footer — one source of truth for active state using `--sidebar-active` / `--sidebar-active-strong`. Command palette and bulk action bar mount at shell level. **Done when:** every route except API and auth renders inside `RefinedAppShell`; auth routes use a smaller `AuthShell` (add under `shell/` if missing) centering a glass card on the cinematic canvas.

**Phase 4 — Page-level composition.** Walk every page in order: `/dashboard`, `/project/[id]`, `/standups`, `/settings`, `/registry`, then `/`, then auth, then `error.tsx` / `loading.tsx`. Remove inline styling that duplicates a primitive. Replace `<div className="bg-white border ...">` with `<Card>`; replace bespoke pill markup with `StatusBadge` / `AgingBadge`. Apply cinematic touches sparingly: ambient orbs on hero surfaces only; glass on overlays, dialogs, chat widget; gradient text reserved for primary headings. Verify dark mode visually for each page. **Done when:** every page renders in both themes without a single raw-hex utility, without inline `style={{ background: "#..." }}` outside `globals.css`, and without horizontal scroll at 1280×800.

**Phase 5 — Empty states, loading, motion.** Every list, table, kanban column, search result, notification feed, and registry filter has a designed `<EmptyState />`. Every async surface has a `Skeleton` matching its real layout — not a single shimmer rectangle. Every transition respects `--duration-fast` and `--ease-out-expo`. Honor `prefers-reduced-motion: reduce` via Tailwind 4's `motion-reduce:` utilities. **Done when:** the four lifecycle states (empty, loading, partial, error) for every page are all designed and reachable.

## 6. Hard constraints

- **No new runtime dependencies** without explicit justification in the PR body and only when no existing primitive or Radix module solves it.
- **Backwards-compatible component APIs.** Adding optional props is fine. Renaming or removing existing props is not. If you must rename, ship a deprecation alias for one PR.
- **Preserve dark mode without flash.** Do not remove `ThemeScript`, do not change the `data-theme="dark"` SSR default in `layout.tsx`, do not introduce `useEffect`-based theme application.
- **No business-logic refactors.** Do not touch `src/lib/api/`, `src/lib/hooks/`, `src/lib/supabase*.ts`, `src/lib/email*.ts`, `src/lib/storage.ts`, or anything under `src/lib/utils/` (with the rare exception of `cn.ts` if Tailwind 4 forces an update — document if so).
- **No API route changes.** `src/app/api/**` is off limits.
- **No `// removed for X` comments.** Delete code, do not gravestone it.
- **No mock data in shipped code.** If you find a route or shipped component importing from `src/lib/mock-data/`, replace it with the real hook from `src/lib/hooks/`.
- **Do not run scripts** (`dev`, `build`, `lint`, `install`). You may read `node_modules/next/dist/docs/` per `AGENTS.md`.
- **Do not modify migrations** under `supabase/`.
- **Do not modify env or build config**: `.env.local`, `next.config.ts`, `postcss.config.mjs`, `tsconfig.json` (unless Tailwind 4 forces a path alias — document it).
- **No emojis** in shipped UI copy unless they were already present.
- **Server vs client.** Next.js 16 defaults to RSC. Any file using state, refs, effects, Radix portals, browser APIs, React Query hooks, the theme provider, or event handlers must start with `"use client"`. Do not add `"use client"` to files that do not need it.

## 7. Acceptance checklist

Tick every item before opening the PR.

- [ ] `grep -RInE '#[0-9a-fA-F]{3,8}\b' src/` is empty except for `src/app/globals.css` and intentional SVG `fill=` values you can justify.
- [ ] `grep -RIn 'rgba?\(' src/` returns only `globals.css`.
- [ ] Every `<button>` in application code is either the `Button` primitive or a Radix trigger styled via primitive variants. No bespoke button classes in route or component files.
- [ ] Theme toggle round-trips light and dark with no flash on full refresh, soft refresh, or route change. SSR-served HTML always carries `data-theme`.
- [ ] Every route renders cleanly in both themes at 1280×800 and 1920×1080.
- [ ] Lighthouse accessibility ≥ 95 on `/dashboard`, `/project/[id]`, `/standups`, `/settings`, `/registry`, and `/login`.
- [ ] `pnpm tsc --noEmit` passes (the user runs this; ensure type-clean code).
- [ ] `pnpm build` succeeds (the user runs this; ensure no references to removed exports).
- [ ] No console errors or hydration warnings on first page load of any route.
- [ ] Every empty case renders an `EmptyState`.
- [ ] All Radix dialogs, popovers, and dropdowns carry `aria-label` or `aria-labelledby` and trap focus.
- [ ] `prefers-reduced-motion: reduce` disables every shimmer, orb pulse, and fade-in.
- [ ] No file imports from `src/lib/mock-data/` in any path reachable from a route.

## 8. Out of scope

Backend logic, Supabase schema, RLS, migrations, seeds, cron jobs. Auth flow logic (visual restyling of auth pages is allowed). AI chat behavior, prompt assembly, Groq calls, streaming protocol. Email templates and nodemailer transport. Performance work beyond what falls out naturally. New features, new routes, new entities (propose in the PR body, do not build). Internationalization and RTL. Mobile breakpoints below 768px — desktop primary, tablet secondary; confirm with the user before investing.

## 9. Reporting format

Open one PR. Title: `UI/UX rehaul: tokens, primitives, shells, page composition`. Body uses this template:

```
## Summary
- Phase 1 (Tokens): <one line>
- Phase 2 (Primitives): <one line>
- Phase 3 (Shells): <one line>
- Phase 4 (Pages): <one line>
- Phase 5 (Empty states & motion): <one line>

## Files touched
- <grouped: "src/components/ui/* (8 files)", etc.>

## Token additions
- <new CSS vars in globals.css with rationale; empty if none>

## Removed
- <files deleted, dead utilities pruned>

## Verification
- [ ] pnpm tsc --noEmit
- [ ] pnpm build
- [ ] Lighthouse a11y >= 95 on six target routes
- [ ] Manual dark/light pass on every route
- [ ] No console errors on first load
- [ ] No imports from src/lib/mock-data/ in shipped paths

## Out-of-scope confirmations
- <"no API routes touched", "no migrations touched", etc.>

## Open questions for reviewer
- <product decisions you discovered>
```

Commit message style: imperative, scoped. Examples: `tokens: add --status-blocked and bridge to bg-status-blocked`; `shell: migrate dashboard to RefinedAppShell`; `primitives: tighten Badge variants to use status tokens`.

## 10. Failure-mode warnings

- **Tailwind 4, not 3.** No `tailwind.config.js` and you will not create one. Theme extensions live in CSS via `@theme` and `@theme inline`. The dark variant is declared as `@custom-variant dark (&:where([data-theme="dark"], [data-theme="dark"] *))` in `globals.css`. If a utility class does not exist, add a token to `@theme`, do not drop in arbitrary values.
- **Next.js 16 is not the Next.js you know.** `AGENTS.md` says: *"This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code."* When unsure about Server vs Client Components, `Link` props, `cookies()` / `headers()` shapes, `params` / `searchParams` types, font loading, or metadata, open the local docs first.
- **Server vs client boundary.** Adding `"use client"` to a layout is almost always wrong.
- **Theme pre-paint script.** `ThemeScript` in `src/components/theme/theme-script.tsx` runs in `<head>` before paint. Do not move it, do not wrap in Suspense, do not switch to a `useEffect`.
- **CSS load order.** `globals.css` is imported once from `src/app/layout.tsx`. Do not import it elsewhere; do not split it. Add new tokens to the existing `:root` and `[data-theme="dark"]` blocks.
- **The `*` global transition rule** transitions background, border, color, opacity, shadow, transform on `--duration-fast`. If layout jitters, fix the offending component, do not weaken the global rule.
- **Radix portals escape your layout.** Apply token classes directly to the portal content, not to an ancestor.
- **`data-theme="dark"` is set on `<html>` at SSR** in `layout.tsx` with `suppressHydrationWarning`. Do not add a second `data-theme` on `<body>` or any wrapper — you will create hydration mismatches.
- **Fonts are loaded via `next/font`** in `layout.tsx` (`Geist`, `Geist_Mono`, `Figtree`, `Inter`). The `@theme` bridge exposes `--font-display: var(--font-figtree)` and `--font-body: var(--font-inter)`. Do not import additional fonts.
- **The legacy bridge is load-bearing.** Older components use `bg-background`, `bg-muted`, `border-border`, `text-primary`, `text-foreground`. Do not delete the legacy `@theme inline` block until every consumer is migrated.
- **The `/design` route is your regression check.** Its own header allows deletion only after Phase 4. Keep it functional during the rehaul.
- **Do not add `tailwindcss-animate`.** Tailwind 4 supports `data-[state=open]:animate-in data-[state=open]:fade-in-0` natively — see `src/components/ui/dialog.tsx`.
- **PostCSS config is minimal.** `postcss.config.mjs` only registers `@tailwindcss/postcss`. Do not add Autoprefixer.
- **Stop and ask** before: removing a public component export, renaming a token, deleting `/design`, restyling transactional emails, modifying auth logic, or breaking the SSR `data-theme="dark"` default.

Now begin. Read `globals.css` and `Design System.md` in full, sketch the Phase 1 token audit as a plan in `tasks/todo.md`, check in with the user before writing code, and proceed phase by phase. Update `tasks/lessons.md` after any reviewer correction.
