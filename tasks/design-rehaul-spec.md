# Design System Rehaul — Synthesis & Plan

**Source:** `/Users/admin/Desktop/PW Academy/Design System.md` (2293 lines)
**Target:** `taskflow/` — Next.js 16, Tailwind v4 (CSS-first `@theme`), Radix primitives
**Scope:** tokens + primitives ONLY (`globals.css`, `src/components/ui/*`, `src/components/theme/*`)

---

## 0. About the source doc

The "Design System.md" is the **raw rendered HTML of antigravity.google's landing page**. It is not a structured CSS spec — there are no `<style>` blocks, no typography tables, no documented token names. We extract the design language by:

1. **Color sampling** the inline SVGs and rgb()/hex literals in the HTML
2. **Class-name reverse-engineering** (`button-primary`, `heading-3..7`, `caption`, `body`, `glue-cookie-notification`, `feature-title`, `agent-first-text`, etc.)
3. **Structural cues**: hero halos (blurred ellipses on dark canvas), large pill CTAs, condensed nav, light surface chrome on a near-white page in light mode and near-black in dark mode

Where the doc is silent we make **opinionated choices** consistent with the visual reference and call them out as ambiguities at the bottom of this file.

---

## 1. Token system

### 1.1 Color palette (extracted)

**Brand / accent**

| Token            | Hex       | Source in doc                                                |
|------------------|-----------|---------------------------------------------------------------|
| `antigravity-blue` | `#3186FF` | Logo halo, dominant accent (6+ occurrences)                  |
| `antigravity-blue-soft` | `#749BFF` | Halo gradient stops                                    |
| `antigravity-blue-deep` | `#1A73E8` / `#1a73e8` | Google "g" links / footer        |
| `antigravity-blue-alt`  | `#346BF1` | Secondary fill                                       |
| `antigravity-cyan`      | `#2FA1D6` | Tertiary accent                                      |

**Semantic accents**

| Token         | Hex       | Use                                            |
|---------------|-----------|------------------------------------------------|
| `green`       | `#00B95C` | Success                                        |
| `red`         | `#FC413D` | Error / destructive / "Stuck"                  |
| `red-alt`     | `#FF4641` | Hot error variant                              |
| `yellow`      | `#FBBC04` | Warning / Google yellow                        |
| `yellow-vivid`| `#FFE432` | Brand halo                                     |
| `yellow-glow` | `#FFEE48` | Particle / glow                                |

**Neutrals (light)**

| Token         | Hex       | Role                                           |
|---------------|-----------|------------------------------------------------|
| `grey-0`      | `#FFFFFF` | Pure surface                                   |
| `grey-50`     | `#F8F9FC` / `#f8f9fc` | Canvas / page bg                     |
| `grey-100`    | `#F0F1F5` | Hover, subtle bg                               |
| `grey-150`    | `#EFF2F7` | Toolbar, sidebar                               |
| `grey-200`    | `#E6EAF0` | Border                                         |
| `grey-300`    | `#E1E6EC` | Strong border                                  |
| `grey-400`    | `#CDD4DC` | Disabled                                       |
| `grey-500`    | `#B7BFD9` | Muted icon                                     |
| `grey-600`    | `#6A6A71` / `#676A72` | Muted text                           |
| `grey-1000`   | `#202124` | Body text (Google near-black, 68 occurrences)  |
| `grey-1200`   | `#121317` | Dark canvas / deepest                          |

**Dark surface progression** (inferred from `rgba(var(--palette-grey-1000-rgb), …)` patterns):

- canvas → `#121317`
- surface → `#1F1F1F` / `#202124`
- elevated → ~`#262830`

### 1.2 Typography

The doc class names imply a scale `heading-3` (hero), `heading-4` (section), `heading-5` (footer title), `heading-6/7` (eyebrow), `body`, `caption`. Translating to a token scale on the existing Figtree-display + Inter-body pairing:

| Token          | Size        | Line height | Weight | Use                          |
|----------------|-------------|-------------|--------|------------------------------|
| `text-display` | 56 / 64     | 1.05        | 600    | Hero / landing                |
| `text-h1`      | 40 / 48     | 1.1         | 600    | Page titles (`heading-3`)    |
| `text-h2`      | 30 / 38     | 1.15        | 600    | Section heads (`heading-4`)  |
| `text-h3`      | 22 / 28     | 1.25        | 600    | Card heads (`heading-5`)     |
| `text-h4`      | 18 / 26     | 1.3         | 600    | Block titles                  |
| `text-overline`| 12 / 16     | 1.3         | 600 ✦  | Eyebrow caps (`heading-7`)   |
| `text-body`    | 14 / 22     | 1.55        | 400    | Default (`body`)             |
| `text-body-lg` | 16 / 26     | 1.55        | 400    | Lead paragraphs              |
| `text-caption` | 12 / 18     | 1.4         | 400    | Meta (`caption`)             |
| `text-mono`    | 13 / 20     | 1.4         | 500    | Code / kbd                   |

✦ overline uses tracking +0.04em uppercase.

Font families:

- **Display** → `var(--font-figtree)` (already wired in `layout.tsx`)
- **Body** → `var(--font-inter)` (already wired)
- **Mono** → `var(--font-geist-mono)`

### 1.3 Spacing

The doc uses Bootstrap-style 12-col grid (`grid-container`, `col-md-3/4/6/8/12`). We keep Tailwind defaults but expose intent tokens for the parts the visual reference demands:

```
--space-2xs: 4px
--space-xs:  8px
--space-sm:  12px
--space-md:  16px
--space-lg:  24px
--space-xl:  32px
--space-2xl: 48px
--space-3xl: 64px
--space-4xl: 96px
```

### 1.4 Radius

Antigravity uses **very rounded** CTAs (full pills) and **medium-rounded** cards. Updated scale:

| Token         | Value | Use                                |
|---------------|-------|------------------------------------|
| `radius-xs`   | 4px   | Tags, chips                        |
| `radius-sm`   | 8px   | Inputs, small buttons              |
| `radius-md`   | 12px  | Cards, default buttons             |
| `radius-lg`   | 16px  | Elevated panels, modals            |
| `radius-xl`   | 24px  | Hero cards, large dialogs          |
| `radius-2xl`  | 32px  | Marketing-style cards              |
| `radius-pill` | 9999px| Primary CTAs, badges, status pills |

### 1.5 Shadow

Doc reference uses very soft, low-saturation shadows on a near-white canvas plus heavy ambient blur on dark hero. We expose:

- `shadow-xs` → flat surface offset
- `shadow-sm` → resting card
- `shadow-md` → hover lift
- `shadow-lg` → modal / popover
- `shadow-xl` → high-elevation dialog
- `shadow-glow` → branded blue glow (around CTAs / focus)
- `shadow-glow-strong` → marketing hero halos

### 1.6 Motion

| Token            | Value                              | Use                       |
|------------------|------------------------------------|---------------------------|
| `duration-fast`  | 150ms                              | hover, focus              |
| `duration-normal`| 220ms                              | layout, slide             |
| `duration-slow`  | 360ms                              | modal, page transitions   |
| `ease-out-expo`  | `cubic-bezier(0.16, 1, 0.3, 1)`   | most exits/enters         |
| `ease-spring`    | `cubic-bezier(0.34, 1.56, 0.64, 1)`| pop / scale-in            |
| `ease-standard`  | `cubic-bezier(0.4, 0, 0.2, 1)`    | Material-style default    |

### 1.7 Focus ring

Doc uses a luminous blue ring on dark backgrounds. We keep the existing two-ring pattern (offset + glow) but recolor to the new accent:

```css
*:focus-visible {
  outline: none;
  box-shadow:
    0 0 0 2px var(--surface),
    0 0 0 4px var(--accent);
}
```

---

## 2. Current state per primitive

| File                 | Current state                                                                                          |
|----------------------|---------------------------------------------------------------------------------------------------------|
| `button.tsx`         | 4 variants (primary/secondary/ghost/destructive), 4 sizes. Primary uses inline `--accent-gradient`.    |
| `badge.tsx`          | `Badge`, `StatusBadge`, `PriorityDot`, `AgingBadge`. Pill radius, semantic variants.                   |
| `input.tsx`          | Single Input with label + error. h-9, radius-md, accent focus ring.                                    |
| `dialog.tsx`         | Radix Dialog with `radius-xl`, blurred overlay, slide-in animation.                                    |
| `dropdown-menu.tsx`  | Radix DropdownMenu. Uses hard-coded `rounded-md`, `bg-neutral-100`.                                    |
| `popover.tsx`        | Radix Popover. `radius-lg`, blurred background.                                                        |
| `select.tsx`         | Radix Select. h-9, matches input.                                                                      |
| `avatar.tsx`         | Radix Avatar with initials fallback. Sizes sm/md/lg.                                                   |
| `empty-state.tsx`    | Icon, title, description, action. Centered.                                                            |
| `skeleton.tsx`       | line/circle/rectangle shapes with shimmer.                                                             |
| `toast.tsx`          | ToastProvider + container. 4 variants (success/error/warning/info).                                    |
| `tooltip.tsx`        | Radix Tooltip with hard-coded dark `#0e1117` bg.                                                       |
| `theme-provider.tsx` | data-theme attribute on `<html>`, localStorage persistence.                                            |
| `theme-toggle.tsx`   | Square icon button, sun/moon. Uses border-color tokens.                                                |
| `theme-script.tsx`   | Pre-paint script. Default is `dark` for new visitors.                                                  |

---

## 3. Diff per primitive (what changes)

### `globals.css`
- Replace electric-blue `#0066ff` accent with **Antigravity blue `#3186FF`**.
- Light canvas → `#F8F9FC` (currently `#f0f2f5`).
- Dark canvas → `#121317` (currently `#06080d`) — softer, matches doc.
- Dark surface → `#1F1F1F` (currently `#0e1117`) — matches doc.
- Text in light → `#202124` (currently `#0a0f1e`) — Google near-black.
- Add full `--palette-grey-*` scale (0,50,100,150,200,300,400,500,600,1000,1200) per doc.
- Add **status / priority hex** aligned to the new palette (success `#00B95C`, danger `#FC413D`, warning `#FBBC04`).
- Add **typography tokens**: `--text-display`, `--text-h1..h4`, `--text-overline`, `--text-body`, `--text-caption`, etc.
- Add **radius-pill / radius-2xl** to the scale; bump radius-md to 12px (was 10px), radius-lg to 16px (was 14px).
- Add **shadow-xl / shadow-glow-strong**.
- Bridge all of the above into `@theme` so utilities `bg-accent`, `text-text`, `rounded-pill`, `shadow-glow` etc. work.
- Add a typed `.h1` `.h2` `.body` `.caption` `.overline` class set so marketing pages can use them.

### `button.tsx`
- New variants: `primary | secondary | tertiary | ghost | destructive | link`
  - `primary`: solid Antigravity blue, white text, **pill radius**, soft blue glow on hover (matches `button-primary` from doc)
  - `secondary`: outlined surface, text token, hover lifts border (matches `button-secondary`)
  - `tertiary`: filled neutral surface for in-table actions (new)
  - `ghost`: text-only, hover bg-hover (unchanged)
  - `destructive`: solid red `#FC413D` (was generic Tailwind red-500)
  - `link`: text accent + underline-on-hover
- Sizes: `sm | md | lg | xl | icon` (add `xl` for hero CTAs)
- Drop the inline gradient on primary; use solid `var(--accent)` + glow shadow on hover for a cleaner Antigravity look. **Backwards-compat:** the default render still passes the same DOM/className surface.
- Add optional `iconLeft` / `iconRight` props? **No** — caller still controls children, keeps API stable.

### `badge.tsx`
- Recolor accent variants to new palette (`#00B95C` etc.).
- `StatusBadge` keeps API; tones recolor.
- `PriorityDot`: replace `bg-red-500`/`bg-pink-500` with semantic tokens.
- Add a new `tone` prop on `Badge` for `accent | success | warning | danger | neutral` (alias of `variant` — old `variant` still accepted).

### `input.tsx`
- Move from `h-9` to `h-10` (40px) for better touch target (matches doc's generous chrome).
- Update placeholder color, hover/focus tokens to new palette.
- Add `size?: 'sm' | 'md' | 'lg'` while keeping default behaviour. Default = `md` = current.
- Add `prefix` / `suffix` slots? **Skip** — out of scope unless API needs it. Keep stable.

### `dialog.tsx`
- Update radius to `radius-xl` (was already), recolor backdrop to true black at 0.6 opacity in light, 0.7 in dark, with new blur backdrop.
- Title typography: bump to `text-h3` token, Figtree display.

### `dropdown-menu.tsx`
- Migrate hard-coded `bg-neutral-100` / `rounded-md` to tokens (`bg-hover`, `radius-md`).
- Match popover/select chrome: blurred backdrop, accent hover indicator on focused item.

### `popover.tsx`
- Already on tokens. Recolor with new palette implicitly through tokens.

### `select.tsx`
- Same height/radius bump as Input. Item highlight uses `bg-hover` and accent check.

### `avatar.tsx`
- Initials background: use a deterministic accent gradient based on name hash (Antigravity-style: blue, green, yellow, red). Stable, no API change.
- Add `xs` size? Existing playground (`design-system/avatar`) already supports xs/md/lg/xl — that's a **separate component** outside `src/components/ui/`, so we leave the legacy `ui/avatar` with sm/md/lg for API stability and add an optional `xl` variant.

### `empty-state.tsx`
- Bump icon circle radius / size. Use `bg-accent-soft` for icon halo.
- Title uses Figtree display, `text-h4` token.

### `skeleton.tsx`
- Repaint shimmer to current `--accent-soft` tone so it reads as a brand-aligned loader.

### `toast.tsx`
- Recolor with new palette tokens. Bump to `radius-lg`. Keep API.

### `tooltip.tsx`
- Replace hard-coded `#0e1117`/`#1a1e28` with token (`--surface-tooltip`). New token reads `#202124` in light and `#1F1F1F` in dark.

### `theme-provider.tsx`
- Unchanged — solid implementation.

### `theme-toggle.tsx`
- Bump radius to `radius-pill` for an Antigravity-style chip toggle.
- Soft glow on hover.
- Animate icon rotation on swap (180° spin, 220ms).

### `theme-script.tsx`
- Unchanged.

---

## 4. Ambiguities — flag for CTO

1. **Default theme.** Current default is `dark` for new visitors. Antigravity's homepage is dark by default but its product (Gemini, etc.) defaults to light. Keeping `dark` per existing `theme-script.tsx` unless told otherwise.

2. **Gradient on primary button.** Current code uses an inline 135° gradient. Antigravity buttons are **solid** with subtle glow. Switching to solid + glow — **confirm before merging** if marketing requested the gradient explicitly.

3. **Display font.** Doc uses Google Sans / Product Sans (not loadable without license). Keeping Figtree as the closest Open-Font-Library approximation. Could swap to **Geist Sans** alone (also Google-aligned) — flagging.

4. **Status colors.** Doc has no documented status palette. Choosing green/red/amber/grey/indigo per industry default. If product uses a different mapping (e.g. purple for "review"), align in a follow-up.

5. **Radius escalation.** Antigravity buttons are full pills. Existing app uses rounded-md (10–14px). The new `Button` defaults to `radius-pill` for `primary`, but `secondary` keeps `radius-md` to fit dense tables. Flagging because this **visually changes every screen** even before the page migration.

6. **Dark surface hex.** Doc has both `#202124` and `#1F1F1F` for "dark surface". Picking `#1F1F1F` for elevated and `#202124` for the lighter sidebar tier. Confirm.

7. **The doc is HTML, not a spec.** All token names, scale sizes, and motion values are *inferred*, not literal. CTO should sanity-check the synthesized scale before this lands.

---

## 5. Implementation order (kept inside scope)

1. `globals.css` — tokens, `@theme`, base typography, focus
2. `theme-provider.tsx` / `theme-toggle.tsx` / `theme-script.tsx` — restyle toggle, leave logic
3. `button.tsx` — new variants & sizes, preserved API
4. `badge.tsx` — token recolor, new tones
5. `input.tsx` / `select.tsx` — height + chrome
6. `dialog.tsx` / `popover.tsx` / `dropdown-menu.tsx` — chrome + tokens
7. `avatar.tsx` — deterministic accent
8. `empty-state.tsx` — typography + icon
9. `skeleton.tsx` — accent shimmer
10. `toast.tsx` — recolor
11. `tooltip.tsx` — token surface

**Out of scope (per brief):** every `src/app/<route>/`, `src/middleware.ts`, `src/components/{shell,layout,board,task,chat,notifications,search}/**`, all API routes, `next.config.ts`, `package.json`, SQL. Page-level swap recipe lives in `design-page-migration.md`.
