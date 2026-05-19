# Page-Level Migration Plan — Design System v2

**Status:** Documentation only. Do not execute as part of this PR.

This catalogue lists, page by page, the className/visual swaps that are
worth doing once the new tokens have landed (see `design-rehaul-spec.md`).
All token names below already exist in `globals.css`; only the page-level
templates need touching.

> **Compatibility contract.** Every change here is purely a className swap.
> No primitive's public API has changed, so pages render correctly today
> without any of these edits — they are *aesthetic upgrades*, not fixes.

---

## Universal find-and-replace

These swaps are global and safe to ripgrep across `src/app/**` and the
out-of-scope component dirs (`shell/`, `layout/`, `board/`, `task/`,
`chat/`, `notifications/`, `search/`).

| Old class / value                                                 | New class / value                                  | Why                          |
|-------------------------------------------------------------------|----------------------------------------------------|------------------------------|
| `bg-neutral-100`                                                  | `bg-[var(--neutral-100)]` (already token-bridged)  | Stays the same, but verify   |
| `text-red-500` / `text-red-600` for error                         | `text-[var(--brand-red)]`                          | Aligns with Antigravity red  |
| `bg-red-500` / `bg-red-600` for destructive                       | `bg-[var(--brand-red)]`                            | "                            |
| `text-emerald-600` / `text-green-600` for success                 | `text-[var(--brand-green)]`                        | Aligns with Antigravity green|
| `bg-blue-100 text-blue-600` (legacy accent)                       | `bg-accent-soft text-[var(--accent)]`              | Single accent everywhere     |
| `rounded-md` on CTAs                                              | `rounded-[var(--radius-pill)]`                     | Pill CTAs                    |
| `shadow-sm` on cards                                              | `shadow-[var(--shadow-sm)]`                        | Token-bound                  |
| `border-neutral-200`                                              | `border-border-color`                              | Token-bound                  |
| `font-bold` for page titles                                       | `font-semibold` + `var(--font-display)`            | Lighter weight per doc       |

---

## `src/app/dashboard/page.tsx`

Out of scope this PR — flagged for the dashboard owner.

1. **Top KPI tiles:** swap `rounded-lg` → `rounded-[var(--radius-xl)]`; add
   `shadow-[var(--shadow-sm)]`; bump padding to `p-6`.
2. **Section headers** ("My active tasks", "Project breakdown"): apply
   `text-h3` class.
3. **Chart card surrounds:** unify to `bg-surface border border-border-color
   rounded-[var(--radius-lg)] shadow-[var(--shadow-sm)]`.
4. **Owner workload bars:** color stops should pull from
   `--status-working`, `--status-done`, `--status-stuck`.
5. **CTA "View all":** replace inline `bg-blue-600 text-white rounded-md`
   with `<Button variant="primary" size="sm" />`.

## `src/app/standups/page.tsx`

1. **Page title bar:** swap to `text-h2` + Figtree display via inline
   `style={{ fontFamily: 'var(--font-display)' }}` if the Tailwind
   helper isn't enough.
2. **Standup card list items:** add `hover:shadow-[var(--shadow-md)]`,
   `transition-shadow`, bump radius to `rounded-[var(--radius-lg)]`.
3. **"Submit standup" button:** ensure it's `<Button variant="primary"
   size="lg" />` for the hero action.
4. **Status pills inline with each line item:** swap any hand-rolled
   `bg-amber-100 text-amber-700` to the new `<Badge tone="warning" />`
   so colors recolor automatically across theme.
5. **Empty state ("No standups yet…"):** use the refreshed `<EmptyState />`.

## `src/app/registry/page.tsx`

1. **Search input row:** replace any raw `<input>` chrome with
   `<Input size="md" />` (now 40px, matches doc).
2. **Table head row background:** `bg-[var(--table-head-bg)]` →
   `bg-[var(--neutral-100)]` (already linked via `--table-head-bg`).
3. **Row hover:** `hover:bg-neutral-50` → `hover:bg-hover`.
4. **Action buttons in column 1:** `<Button variant="ghost" size="icon" />`
   for delete/edit toolbar.
5. **Filter chips strip (if any):** wrap chips in `gap-1.5`, use
   `<Badge tone="accent" />` for active state, `<Badge tone="neutral" />`
   for inactive.

## `src/app/settings/page.tsx`

1. **Section divider headings:** `text-overline` class.
2. **Settings cards:** `rounded-[var(--radius-lg)]` + `border-border-color`
   + `bg-surface`.
3. **Toggle switches (if hand-built):** verify they read accent track
   on enabled; if using a custom Switch primitive, ensure it uses
   `--accent` not `--color-blue-500`.
4. **"Save changes" sticky bar:** `bg-surface/95 backdrop-blur-md
   border-t border-border-color shadow-[var(--shadow-lg)]`.
5. **Delete-account section:** the destructive CTA should be
   `<Button variant="destructive" size="md" />`.

## `src/app/project/[id]/page.tsx`

1. **Tab bar (overview / tasks / activity):** ensure `data-state=active`
   tab uses `border-b-2 border-[var(--accent)] text-text` and inactive
   uses `text-text-muted hover:text-text`.
2. **Hero panel ("Project name + description"):**
   `bg-surface` → `bg-surface-elevated`; `rounded-[var(--radius-xl)]`;
   add `shadow-[var(--shadow-sm)]`.
3. **Task counts strip:** numeric values use `text-h2`, labels use
   `text-overline text-text-faint`.
4. **Status donut surround:** match generic card chrome.

## `src/app/login/page.tsx`, `src/app/forgot-password/page.tsx`, `src/app/reset-password/page.tsx`

These three share a layout. Same plan applies to each.

1. **Background:** swap solid `bg-canvas` for a centered card on a soft
   gradient. Two ambient orbs (`.orb .orb-blue` top-right and `.orb
   .orb-yellow` bottom-left) anchor the scene like the Antigravity hero.
2. **Auth card:** `max-w-md rounded-[var(--radius-xl)] bg-surface
   border-border-color shadow-[var(--shadow-lg)] p-8`.
3. **Title:** `text-h2`, Figtree display. Sub-copy: `text-sm
   text-text-muted`.
4. **Form fields:** `<Input label="…" size="lg" />` for the email/password
   pair (taller chrome looks right on these focused pages).
5. **Primary CTA:** `<Button variant="primary" size="lg"
   className="w-full" />`.
6. **Secondary links ("Forgot password?", "Back to login"):**
   `<Button variant="link" size="sm" />`.
7. **Brand logo at top of card:** keep as is.

## `src/app/error.tsx`, `src/app/loading.tsx`

1. **error.tsx:** swap hand-rolled red box for a centered card with a
   `text-h2` title, `text-text-muted` copy, and
   `<Button variant="secondary" />` "Retry".
2. **loading.tsx:** ensure the existing spinner/skeletons pull from the
   new `<Skeleton />` (now uses accent-tinted shimmer).

## `src/app/design/page.tsx`

Already aligned to the new tokens (it's the playground). No changes
strictly required, but a useful follow-up:

1. Add a "Buttons" group showcasing all six new variants × five sizes.
2. Add an "Inputs" group showing sm/md/lg + error state.
3. Toggle the page background to `bg-canvas` so token swaps read live.

---

## Out-of-scope component dirs that still need swaps later

For visibility — these are not part of this PR's scope but will need a
follow-up sweep:

- `src/components/shell/refined-app-shell.tsx` — already on new tokens
  via the design-system playground; verify after token refresh.
- `src/components/shell/refined-sidebar.tsx` — bump sidebar item radius
  from `rounded-md` to `rounded-[var(--radius-md)]`; active state
  background should be `bg-sidebar-active` not `bg-blue-100`.
- `src/components/shell/refined-toolbar.tsx` — primary "New" button:
  `<Button variant="primary" size="sm" />`.
- `src/components/shell/command-palette.tsx` — already matches
  popover/select chrome via tokens; verify.
- `src/components/layout/sidebar.tsx` (legacy) — pages still using
  `AppShell` should migrate to `RefinedSidebar` per Phase 4, not be
  reskinned in place.
- `src/components/board/*` — kanban columns: `rounded-[var(--radius-xl)]
  bg-[var(--neutral-100)]`; cards: `bg-surface
  border-border-color shadow-[var(--shadow-xs)] rounded-[var(--radius-md)]`.
- `src/components/task/task-detail-panel.tsx` — large side-sheet should
  use `bg-surface-elevated` + `radius-xl`.
- `src/components/chat/*` — message bubbles: sent =
  `bg-accent text-[var(--text-on-accent)] rounded-[var(--radius-lg)]`;
  received = `bg-[var(--neutral-100)] text-text rounded-[var(--radius-lg)]`.
- `src/components/notifications/*` — list items take `divide-y
  divide-border-color`.
- `src/components/search/*` — result rows: `hover:bg-hover` +
  `rounded-[var(--radius-sm)]`.

---

## Execution order (when the time comes)

1. Run the universal find-and-replace globally (low risk).
2. Migrate `login` / `forgot-password` / `reset-password` (visually
   isolated; great smoke test).
3. Migrate `design/page.tsx` to showcase new buttons/inputs.
4. Migrate `dashboard` then `standups` (most visible product pages).
5. Migrate `registry` and `settings`.
6. Migrate `project/[id]`.
7. Sweep out-of-scope component dirs.
8. Delete `card-tabler` and any Tabler legacy bridges from `globals.css`.
