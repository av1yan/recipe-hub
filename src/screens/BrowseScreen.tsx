import { useState, useEffect, type CSSProperties } from 'react'
import { Search, SlidersHorizontal, X, ChevronRight } from 'lucide-react'
import type { Screen, Recipe } from '../types'
import { BottomNavigation } from '../components/BottomNavigation'
import { recipeAPI } from '../utils/api'
import { getDietPrefs } from './DietPreferencesScreen'
import { ALLERGY_OPTIONS, getAllergies, recipeHasAllergen, saveAllergies } from '../utils/allergies'

const DIET_LABELS: Record<string, string> = {
  vegan: 'Vegan', vegetarian: 'Vegetarian', 'gluten-free': 'Gluten-Free',
  keto: 'Keto', paleo: 'Paleo', 'dairy-free': 'Dairy-Free',
  'nut-free': 'Nut-Free', 'low-carb': 'Low-Carb',
}

type FilterKind = 'tag' | 'cuisine' | 'mealType' | 'ingredient'
type ActiveFilter = { kind: FilterKind; value: string; label: string }

// The API returns tags either as strings or as { tag: string } objects.
function tagsOf(recipe: Recipe): string[] {
  return (recipe.tags || [])
    .map((t: any) => (typeof t === 'string' ? t : t?.tag ?? ''))
    .filter(Boolean)
    .map((s: string) => s.toLowerCase().replace(/\s+/g, '-'))
}

function matchesDiet(recipe: Recipe, prefs: string[]): boolean {
  if (prefs.length === 0) return true
  const tags = tagsOf(recipe)
  return prefs.every(pref => tags.includes(pref))
}

function matchesFilter(recipe: Recipe, f: ActiveFilter | null): boolean {
  if (!f) return true
  if (f.kind === 'cuisine') return recipe.cuisine === f.value
  if (f.kind === 'mealType') return recipe.mealType === f.value
  if (f.kind === 'tag') return tagsOf(recipe).includes(f.value)
  if (f.kind === 'ingredient') {
    return (recipe.ingredients || []).some(i => i.name.toLowerCase() === f.value.toLowerCase())
  }
  return true
}

// Curated quick filters — only the ones that actually match a recipe are shown.
const POPULAR: { label: string; kind: FilterKind; value: string }[] = [
  { label: 'Vegetarian', kind: 'tag', value: 'vegetarian' },
  { label: 'Vegan', kind: 'tag', value: 'vegan' },
  { label: 'Dinner', kind: 'mealType', value: 'dinner' },
  { label: 'Lunch', kind: 'mealType', value: 'lunch' },
  { label: 'Gluten Free', kind: 'tag', value: 'gluten-free' },
  { label: 'Dairy-Free', kind: 'tag', value: 'dairy-free' },
  { label: 'Keto', kind: 'tag', value: 'keto' },
  { label: 'Italian', kind: 'cuisine', value: 'Italian' },
  { label: 'Asian', kind: 'cuisine', value: 'Asian' },
  { label: 'Mediterranean', kind: 'cuisine', value: 'Mediterranean' },
]

interface Props {
  onNavigate: (screen: Screen, data?: any) => void
}

const PAD = '0 24px'

/** One list row on a hairline — typography and space, no card. */
function rowStyle(divider: boolean): CSSProperties {
  return {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '15px 0',
    borderTop: divider ? '1px solid var(--color-subtle)' : 'none',
    cursor: 'pointer',
  }
}

/** Minimal pill — outline by default, accent when selected. */
function chipStyle(on: boolean): CSSProperties {
  return {
    padding: '7px 13px',
    borderRadius: '999px',
    border: '1px solid ' + (on ? 'var(--color-primary)' : 'var(--color-border)'),
    background: on ? 'var(--color-primary-bg)' : 'transparent',
    color: on ? 'var(--color-primary-dark)' : 'var(--color-text-secondary)',
    fontSize: '13px',
    fontWeight: '600',
    cursor: 'pointer',
    fontFamily: 'inherit',
  }
}

export default function BrowseScreen({ onNavigate }: Props) {
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [dietPrefs, setDietPrefs] = useState<string[]>(() => getDietPrefs())
  const [allergies, setAllergies] = useState<string[]>(() => getAllergies())
  const [activeFilter, setActiveFilter] = useState<ActiveFilter | null>(null)
  const [exploreCat, setExploreCat] = useState<FilterKind | null>(null)
  const [filterOpen, setFilterOpen] = useState(false)

  useEffect(() => {
    loadRecipes()
  }, [])

  async function loadRecipes() {
    try {
      setIsLoading(true)
      const data: Recipe[] = await recipeAPI.list()
      // The list endpoint omits tags, so hydrate them from each recipe's detail —
      // the dietary chips and filters all match on tags.
      const hydrated = await Promise.all(
        data.map(async (r: any) => {
          try {
            const detail = await recipeAPI.get(r.id)
            return { ...r, tags: detail.tags || [], ingredients: detail.ingredients || r.ingredients || [] }
          } catch {
            return r
          }
        })
      )
      setRecipes(hydrated)
    } catch (error) {
      console.error('Failed to load recipes:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const q = searchTerm.trim().toLowerCase()
  const matchesSearch = (r: Recipe) =>
    !q || r.name.toLowerCase().includes(q) || (r.cuisine || '').toLowerCase().includes(q)

  const displayed = recipes.filter(
    r => matchesSearch(r) && matchesFilter(r, activeFilter) && matchesDiet(r, dietPrefs) && !recipeHasAllergen(r, allergies)
  )

  // Real values pulled from the actual recipes
  const uniq = (xs: string[]) => [...new Set(xs.filter(Boolean))]
  const cuisines = uniq(recipes.map(r => r.cuisine))
  const mealTypes = uniq(recipes.map(r => r.mealType))
  const dietTags = uniq(recipes.flatMap(tagsOf))
  const ingredients = uniq(recipes.flatMap(r => (r.ingredients || []).map(i => i.name))).sort()

  const popularChips = POPULAR.filter(c =>
    recipes.some(r => matchesFilter(r, { kind: c.kind, value: c.value, label: c.label }))
  )

  const EXPLORE: { key: FilterKind; label: string; values: string[] }[] = [
    { key: 'ingredient', label: 'Ingredients', values: ingredients },
    { key: 'mealType', label: 'Meal type', values: mealTypes },
    { key: 'tag', label: 'Dietary', values: dietTags },
    { key: 'cuisine', label: 'Cuisine', values: cuisines },
  ]

  // Deterministic daily pick -- from recipes free of any flagged allergen, so
  // the featured dish is never something the person needs to avoid.
  const safeRecipes = recipes.filter(r => !recipeHasAllergen(r, allergies))
  const rotd = safeRecipes.length ? safeRecipes[Math.floor(Date.now() / 86400000) % safeRecipes.length] : null
  const browsing = !q && !activeFilter

  const applyFilter = (f: ActiveFilter) => {
    setActiveFilter(f)
    setExploreCat(null)
  }

  const clearAll = () => {
    setActiveFilter(null)
    setSearchTerm('')
  }

  // Allergies are a persistent safety preference (shared with Settings), so
  // toggling one here saves it and it applies across the app -- not just this
  // session. Recipes containing a checked allergen are hidden from results.
  const toggleAllergy = (id: string) => {
    setAllergies(prev => {
      const next = prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id]
      saveAllergies(next)
      return next
    })
  }
  // Offer an allergen only if some recipe actually contains it (or it's already
  // selected), so we never show a toggle that can't change anything.
  const allergyChoices = ALLERGY_OPTIONS.filter(
    opt => allergies.includes(opt.id) || recipes.some(r => recipeHasAllergen(r, [opt.id]))
  )

  const labelFor = (kind: FilterKind, value: string) =>
    kind === 'tag' ? DIET_LABELS[value] || value : value

  // The popular filters, grouped so the dropdown reads as sections rather than
  // one long list.
  const FILTER_GROUPS: { label: string; kind: FilterKind }[] = [
    { label: 'Dietary', kind: 'tag' },
    { label: 'Meal', kind: 'mealType' },
    { label: 'Cuisine', kind: 'cuisine' },
  ]

  const filterActive = activeFilter || filterOpen

  const header = (
    <header style={{ padding: '20px 24px 14px', background: 'var(--color-bg)', flexShrink: 0, position: 'relative', zIndex: 30 }}>
      <h1 style={{ fontSize: '27px', fontWeight: '700', letterSpacing: '-0.02em', color: 'var(--color-text)', margin: '0 0 16px' }}>
        Discover
      </h1>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '10px', background: 'var(--color-subtle)', borderRadius: '13px', padding: '12px 14px', minWidth: 0 }}>
          <Search size={17} color="var(--color-text-muted)" />
          <input
            type="text"
            placeholder="What would you like to cook?"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            style={{ flex: 1, border: 'none', background: 'none', outline: 'none', fontSize: '15px', color: 'var(--color-text)', fontFamily: 'inherit', minWidth: 0 }}
          />
          {q && (
            <button onClick={() => setSearchTerm('')} aria-label="Clear search" style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', padding: 0, color: 'var(--color-text-muted)' }}>
              <X size={16} />
            </button>
          )}
        </div>

        {(popularChips.length > 0 || allergyChoices.length > 0) && (
          <button
            onClick={() => setFilterOpen(o => !o)}
            aria-label="Filters"
            style={{
              position: 'relative', flexShrink: 0, width: '46px', height: '46px', borderRadius: '13px',
              border: 'none', background: filterActive ? 'var(--color-primary)' : 'var(--color-subtle)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
            }}
          >
            <SlidersHorizontal size={18} color={filterActive ? '#fff' : 'var(--color-text-secondary)'} />
            {activeFilter && !filterOpen && (
              <span style={{ position: 'absolute', top: '9px', right: '10px', width: '7px', height: '7px', borderRadius: '4px', background: 'var(--color-primary)', border: '2px solid var(--color-bg)' }} />
            )}
          </button>
        )}
      </div>

      {filterOpen && (
        <>
          {/* Tap-away backdrop. */}
          <div onClick={() => setFilterOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 39 }} />
          <div style={{ position: 'absolute', top: '100%', right: '24px', marginTop: '6px', width: '250px', maxHeight: '340px', overflowY: 'auto', background: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: '16px', boxShadow: '0 12px 34px rgba(15,23,42,0.18)', zIndex: 40, padding: '14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <span style={{ fontSize: '11px', fontWeight: '700', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--color-text-muted)' }}>Filter by</span>
              {activeFilter && (
                <button onClick={() => { setActiveFilter(null); setFilterOpen(false) }} style={{ background: 'none', border: 'none', color: 'var(--color-primary)', fontSize: '12px', fontWeight: '700', cursor: 'pointer', padding: 0, fontFamily: 'inherit' }}>
                  Clear
                </button>
              )}
            </div>
            {FILTER_GROUPS.map(group => {
              const chips = popularChips.filter(c => c.kind === group.kind)
              if (!chips.length) return null
              return (
                <div key={group.kind} style={{ marginBottom: '14px' }}>
                  <p style={{ fontSize: '10px', fontWeight: '700', color: 'var(--color-text-muted)', letterSpacing: '0.07em', margin: '0 0 8px' }}>{group.label.toUpperCase()}</p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {chips.map(c => {
                      const on = activeFilter?.kind === c.kind && activeFilter?.value === c.value
                      return (
                        <button
                          key={c.value}
                          onClick={() => { applyFilter({ kind: c.kind, value: c.value, label: c.label }); setFilterOpen(false) }}
                          style={chipStyle(on)}
                        >
                          {c.label}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )
            })}

            {allergyChoices.length > 0 && (
              <div>
                <p style={{ fontSize: '10px', fontWeight: '700', color: 'var(--color-text-muted)', letterSpacing: '0.07em', margin: '0 0 8px' }}>ALLERGY</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {allergyChoices.map(opt => {
                    const on = allergies.includes(opt.id)
                    return (
                      <button
                        key={opt.id}
                        onClick={() => toggleAllergy(opt.id)}
                        style={{ padding: '7px 13px', borderRadius: '999px', border: '1px solid ' + (on ? '#d1584f' : 'var(--color-border)'), background: on ? 'rgba(209,88,79,0.12)' : 'transparent', color: on ? '#d1584f' : 'var(--color-text-secondary)', fontSize: '13px', fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit' }}
                      >
                        {opt.label}
                      </button>
                    )
                  })}
                </div>
                <p style={{ fontSize: '11px', color: 'var(--color-text-muted)', margin: '10px 0 0', lineHeight: 1.4 }}>
                  Hides recipes that contain these.
                </p>
              </div>
            )}
          </div>
        </>
      )}
    </header>
  )

  if (isLoading) {
    return (
      <div className="screen" style={{ background: 'var(--color-bg)' }}>
        {header}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px 0' }}>
          <Skel h={188} r={20} />
          <Skel w="46%" h={11} r={6} style={{ marginTop: '16px' }} />
          <Skel w="72%" h={20} r={9} style={{ marginTop: '11px' }} />
          <div style={{ marginTop: '34px', paddingBottom: '10px', borderBottom: '1px solid var(--color-subtle)' }}>
            <Skel w={84} h={11} r={6} />
          </div>
          <SkelTextRow />
          <SkelTextRow divider />
          <SkelTextRow divider />
        </div>
        <BottomNavigation active="browse" onNavigate={(s) => onNavigate(s as Screen)} />
      </div>
    )
  }

  return (
    <div className="screen" style={{ background: 'var(--color-bg)' }}>
      {header}

      {dietPrefs.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '0 24px 8px', overflowX: 'auto', flexShrink: 0 }}>
          <span style={{ fontSize: '11px', fontWeight: '700', letterSpacing: '0.06em', color: 'var(--color-text-muted)', flexShrink: 0 }}>DIET</span>
          <div style={{ display: 'flex', gap: '6px', flex: 1 }}>
            {dietPrefs.map(pref => (
              <span key={pref} style={{ flexShrink: 0, border: '1px solid var(--color-primary-border)', color: 'var(--color-primary)', fontSize: '12px', fontWeight: '600', padding: '4px 11px', borderRadius: '999px' }}>
                {DIET_LABELS[pref] || pref}
              </span>
            ))}
          </div>
          <button onClick={() => setDietPrefs([])} aria-label="Clear diet filters" style={{ flexShrink: 0, background: 'none', border: 'none', color: 'var(--color-text-muted)', fontSize: '12px', fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit' }}>
            Clear
          </button>
        </div>
      )}

      <div style={{ flex: 1, overflowY: 'auto' }}>
        {browsing ? (
          <>
            {/* Recipe of the day — one big image, then quiet text. No card. */}
            {rotd && (
              <div style={{ padding: '20px 24px 0', cursor: 'pointer' }} onClick={() => onNavigate('recipe', { recipe: rotd })}>
                <div style={{ height: '190px', borderRadius: '20px', overflow: 'hidden', background: 'linear-gradient(135deg, var(--color-primary-bg), var(--color-subtle))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '58px' }}>
                  {rotd.imageUrl
                    ? <img src={rotd.imageUrl} alt={rotd.name} loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} onError={e => { e.currentTarget.style.display = 'none' }} />
                    : '🍽️'}
                </div>
                <p style={{ fontSize: '11px', fontWeight: '700', letterSpacing: '0.09em', textTransform: 'uppercase', color: 'var(--color-primary)', margin: '16px 0 0' }}>
                  Recipe of the day
                </p>
                <h2 style={{ fontSize: '22px', fontWeight: '700', letterSpacing: '-0.02em', color: 'var(--color-text)', margin: '6px 0 0', lineHeight: 1.2 }}>
                  {rotd.name}
                </h2>
                <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', margin: '6px 0 0' }}>
                  {[rotd.cuisine, `${(rotd.prepTime || 0) + (rotd.cookTime || 0)} min`, rotd.calories ? `${rotd.calories} cal` : ''].filter(Boolean).join(' · ')}
                </p>
              </div>
            )}

            {/* Explore — a ruled list; each row opens its values inline. */}
            <div style={{ padding: '34px 24px 0' }}>
              <SectionHead title="Explore" />
              {EXPLORE.map((cat, i) => {
                const open = exploreCat === cat.key
                const disabled = cat.values.length === 0
                return (
                  <div key={cat.key}>
                    <button
                      onClick={() => setExploreCat(open ? null : cat.key)}
                      disabled={disabled}
                      style={{ ...rowStyle(i > 0), width: '100%', justifyContent: 'space-between', background: 'none', border: 'none', borderTop: i > 0 ? '1px solid var(--color-subtle)' : 'none', fontFamily: 'inherit', textAlign: 'left', opacity: disabled ? 0.4 : 1, cursor: disabled ? 'default' : 'pointer' }}
                    >
                      <span style={{ fontSize: '15.5px', fontWeight: '600', color: 'var(--color-text)' }}>{cat.label}</span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                        <span style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>{cat.values.length}</span>
                        <ChevronRight size={16} color="var(--color-text-muted)" style={{ transform: open ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s ease' }} />
                      </span>
                    </button>
                    {open && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', padding: '2px 0 16px' }}>
                        {cat.values.map(v => (
                          <button
                            key={v}
                            onClick={() => applyFilter({ kind: cat.key, value: v, label: labelFor(cat.key, v) })}
                            style={{ ...chipStyle(false), textTransform: cat.key === 'mealType' ? 'capitalize' : 'none' }}
                          >
                            {labelFor(cat.key, v)}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            {/* All recipes */}
            <div style={{ padding: '34px 24px 24px' }}>
              <SectionHead title="All recipes" />
              <RecipeList recipes={displayed} onNavigate={onNavigate} />
            </div>
          </>
        ) : (
          <div style={{ padding: '16px 24px 24px' }}>
            {activeFilter && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px', border: '1px solid var(--color-primary)', color: 'var(--color-primary)', fontSize: '13px', fontWeight: '600', padding: '5px 12px', borderRadius: '999px', textTransform: activeFilter.kind === 'mealType' ? 'capitalize' : 'none' }}>
                  {activeFilter.label}
                  <button onClick={() => setActiveFilter(null)} aria-label="Remove filter" style={{ background: 'none', border: 'none', color: 'var(--color-primary)', cursor: 'pointer', display: 'flex', padding: 0 }}>
                    <X size={13} />
                  </button>
                </span>
                <span style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>
                  {displayed.length} recipe{displayed.length === 1 ? '' : 's'}
                </span>
              </div>
            )}

            {displayed.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '64px 0', color: 'var(--color-text-muted)' }}>
                <p style={{ fontSize: '15px', margin: '0 0 16px' }}>Nothing matches that yet.</p>
                <button onClick={clearAll} style={{ background: 'none', border: 'none', color: 'var(--color-primary)', fontSize: '14px', fontWeight: '700', cursor: 'pointer', fontFamily: 'inherit' }}>
                  Clear filters
                </button>
              </div>
            ) : (
              <RecipeList recipes={displayed} onNavigate={onNavigate} />
            )}
          </div>
        )}
      </div>

      <BottomNavigation active="browse" onNavigate={(s) => onNavigate(s as Screen)} />
    </div>
  )
}

/** A ruled section label: small all-caps title on a hairline. */
function SectionHead({ title }: { title: string }) {
  return (
    <div style={{ paddingBottom: '10px', borderBottom: '1px solid var(--color-subtle)', marginBottom: '2px' }}>
      <h2 style={{ fontSize: '12px', fontWeight: '700', letterSpacing: '0.09em', textTransform: 'uppercase', color: 'var(--color-text-muted)', margin: 0 }}>
        {title}
      </h2>
    </div>
  )
}

function RecipeList({ recipes, onNavigate }: { recipes: Recipe[]; onNavigate: (s: Screen, d?: any) => void }) {
  if (recipes.length === 0) {
    return <p style={{ textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '14px', padding: '24px 0', margin: 0 }}>No recipes yet.</p>
  }
  return (
    <div>
      {recipes.map((recipe, index) => {
        const time = (recipe.prepTime || 0) + (recipe.cookTime || 0)
        const meta = [recipe.cuisine, `${time} min`, recipe.calories ? `${recipe.calories} cal` : '']
          .filter(Boolean).join(' · ')
        return (
          <div
            key={recipe.id}
            onClick={() => onNavigate('recipe', { recipe })}
            style={rowStyle(index > 0)}
          >
            <div style={{ flex: 1, minWidth: 0 }}>
              <h4 style={{ fontSize: '15.5px', fontWeight: '600', color: 'var(--color-text)', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {recipe.name}
              </h4>
              <p style={{ fontSize: '12.5px', color: 'var(--color-text-muted)', margin: '3px 0 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {meta}
              </p>
            </div>
          </div>
        )
      })}
    </div>
  )
}

/* --- First-load skeleton ---------------------------------------------------- */

function Skel({ w = '100%', h, r = 7, style }: { w?: number | string; h: number; r?: number; style?: CSSProperties }) {
  return <div className="rh-skel" style={{ width: w, height: h, borderRadius: r, ...style }} />
}

function SkelTextRow({ divider = false }: { divider?: boolean }) {
  return (
    <div style={{ padding: '15px 0', borderTop: divider ? '1px solid var(--color-subtle)' : 'none' }}>
      <Skel w="52%" h={13} />
      <Skel w="34%" h={11} style={{ marginTop: '8px' }} />
    </div>
  )
}
