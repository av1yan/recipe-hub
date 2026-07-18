# recipHub design system

The pieces every screen shares, so new work stays consistent. Two things matter
most: **use theme tokens, never hardcoded colors** (so dark mode just works), and
**build lists out of the one card pattern** below.

---

## Theme tokens

Defined in [`src/styles/global.css`](../src/styles/global.css). Light lives in
`:root`; dark overrides in `:root[data-theme="dark"]` (set from the saved setting
or the system preference — see [`src/utils/theme.ts`](../src/utils/theme.ts)).
Reference them as `var(--token)` in inline styles — **do not** hardcode hex values
that should flip with the theme.

| Token | Light | Dark | Use |
|---|---|---|---|
| `--color-bg` | `#f8fafc` | `#0f172a` | Screen background. Cards sit on this. |
| `--color-card` | `#ffffff` | `#1e293b` | Card / raised surface. |
| `--color-subtle` | `#f1f5f9` | `#334155` | Card borders, icon-tile fills, chip backgrounds. |
| `--color-border` | `#e2e8f0` | `#334155` | Input / checkbox borders. |
| `--color-text` | `#1e293b` | `#f1f5f9` | Primary text. |
| `--color-text-secondary` | `#64748b` | `#cbd5e1` | Secondary text, quantities, icons. |
| `--color-text-muted` | `#94a3b8` | `#94a3b8` | Subtitles, meta, chevrons. |
| `--color-primary` / `--color-accent` | `#6ba356` | `#6ba356` | Brand green (CTAs, active). Carries over both themes. |
| `--color-primary-bg` | `#f0f7ed` | `rgba(107,163,86,.20)` | Green-tinted fills (selected chips, timers). |
| `--color-primary-border` | `#c8e0bc` | `rgba(107,163,86,.45)` | Green-tinted borders. |
| `--color-warm` / `--color-warm-light` | `#c67139` / `#d4a574` | same | Food/decorative warm accents. |
| `--color-error` / `--color-error-bg` | `#ef4444` / `#fee2e2` | `#ef4444` / `rgba(239,68,68,.20)` | Destructive text, error surfaces. |
| `--color-disabled` | `#cbd5e1` | `#475569` | Disabled button fill. |
| `--color-overlay` | `rgba(255,255,255,.92)` | `rgba(15,23,42,.60)` | Frosted buttons over hero images. |
| `--color-overlay-border` | `rgba(0,0,0,.06)` | `rgba(255,255,255,.14)` | Border for those frosted buttons. |
| `--color-desk` / `--color-nav-bg` / `--color-nav-border` | — | — | Phone-mockup backdrop + translucent bottom nav. |

Brand green (`#6ba356`) and error red (`#ef4444`) are intentionally the same in
both themes, so those specific hexes are fine to inline.

Fonts: `--font-heading` (Caprasimo) for display headings, `--font-body`
(Figtree) for everything else. Radii `--radius-sm..xl` (8/12/16/20) and
`--space-1..8` exist but inline card values below are the de-facto standard.

---

## The card (list-row pattern)

Every list on every screen uses this. A stack of cards, not a grouped container
with dividers.

**Container** — one card:

```jsx
<div style={{
  display: 'flex', alignItems: 'center', gap: '12px',
  padding: '12px 14px',
  background: 'var(--color-card)',
  border: '1px solid var(--color-subtle)',
  borderRadius: '14px',
  boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
}}>
```

**Stack** — cards in a column, 8px apart, on `--color-bg`:

```jsx
<div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
  {items.map(...)}
</div>
```

**Anatomy:** `[ tile ] [ title + subtitle (flex:1, minWidth:0) ] [ trailing ]`

### Tile (leading)

A rounded square holding a photo, emoji, or icon.

- Size **48×48**, `borderRadius: 12px` on content lists (Home, Browse, Favorites,
  Cookbooks, Meal Plan). **40×40**, `borderRadius: 11px` on Settings rows.
- Colored fill: `background: <tint> + '2e'` — a saturated color at ~18% alpha for
  a subtle wash (e.g. `RECIPE_COLORS[i] + '2e'`). Neutral fill:
  `background: 'var(--color-subtle)'`.
- Photos: `<img>` with `objectFit: 'cover'`, `width/height: 100%`, `overflow: hidden`
  on the tile.

### Title + subtitle

```jsx
<div style={{ flex: 1, minWidth: 0 }}>
  <h4 style={{ fontSize: '14px', fontWeight: '600', color: 'var(--color-text)',
    margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
    {name}
  </h4>
  <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', margin: '2px 0 0' }}>
    {subtitle}
  </p>
</div>
```

`minWidth: 0` on the flex child is required or long names break the ellipsis.
Settings labels use 15px (single line, no subtitle).

### Trailing control

Pick one:

- **Navigation →** chevron: `<ChevronRight size={18} color="var(--color-text-muted)" />`.
- **Action** (delete / favorite) — a 32×32 subtle rounded square:
  ```jsx
  <button style={{ flexShrink: 0, width: '32px', height: '32px', borderRadius: '10px',
    background: 'var(--color-subtle)', border: 'none',
    display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
    <Trash2 size={15} color="#ef4444" />   {/* or a filled Heart, etc. */}
  </button>
  ```
  Put the action button as a **sibling** of the navigable area (not nested), so
  tapping it doesn't also trigger row navigation.

### Checklist variant (grocery / recipe ingredients)

Leading control is a checkbox instead of a tile:

```jsx
<button style={{ width: '22px', height: '22px', borderRadius: '6px', flexShrink: 0,
  border: `2px solid ${checked ? '#6ba356' : 'var(--color-border)'}`,
  background: checked ? '#6ba356' : 'transparent',
  display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
  {checked && <Check size={14} color="#fff" />}
</button>
```

When checked: strikethrough the name (`textDecoration: 'line-through'`) and dim
the whole card (`opacity: 0.55–0.6`).

---

## Frosted overlay buttons (over hero images)

Recipe-detail back / favorite buttons float on a photo, so they use the overlay
tokens instead of a fixed white that glares in dark mode:

```jsx
style={{
  background: 'var(--color-overlay)',
  border: '1px solid var(--color-overlay-border)',
  backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
  boxShadow: '0 2px 8px rgba(0,0,0,0.18)',
}}
```

---

## Where it lives

- Card pattern: [`HomeScreen`](../src/screens/HomeScreen.tsx) (Favorites,
  Cookbooks), [`BrowseScreen`](../src/screens/BrowseScreen.tsx) (`RecipeList`),
  [`FavoritesScreen`](../src/screens/FavoritesScreen.tsx),
  [`CookbooksScreen`](../src/screens/CookbooksScreen.tsx),
  [`MealPlanScreen`](../src/screens/MealPlanScreen.tsx),
  [`GroceryListScreen`](../src/screens/GroceryListScreen.tsx),
  [`RecipeDetailScreen`](../src/screens/RecipeDetailScreen.tsx) (ingredients),
  [`CookingModeScreen`](../src/screens/CookingModeScreen.tsx) (ingredients
  overlay), [`SettingsScreen`](../src/screens/SettingsScreen.tsx).
- Tokens: [`src/styles/global.css`](../src/styles/global.css).

## Rules of thumb

- **Never** hardcode a color that should change with the theme — use a token.
  (Common trap: `#cbd5e1` for a border/chevron; use `--color-border` /
  `--color-text-muted`.)
- New list of things → the card pattern above. Don't invent a grouped/divider list.
- Card background is `--color-card`; it must sit on `--color-bg` to be visible.
  If a container is already `--color-card` (e.g. an overlay), give it `--color-bg`.
- Verify every visual change in **both** light and dark before shipping (toggle
  in Settings → Appearance).
