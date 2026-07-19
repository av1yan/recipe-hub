import { useState, useEffect } from 'react'
import { Search, SlidersHorizontal, X, ChevronRight } from 'lucide-react'
import type { Screen, Recipe } from '../types'
import { BottomNavigation } from '../components/BottomNavigation'
import { recipeAPI } from '../utils/api'
import { getDietPrefs } from './DietPreferencesScreen'

const SERIF = "Georgia, 'Iowan Old Style', 'Times New Roman', serif"

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
const POPULAR: { label: string; emoji: string; kind: FilterKind; value: string }[] = [
  { label: 'Vegetarian', emoji: '🥦', kind: 'tag', value: 'vegetarian' },
  { label: 'Vegan', emoji: '🌱', kind: 'tag', value: 'vegan' },
  { label: 'Dinner', emoji: '🍝', kind: 'mealType', value: 'dinner' },
  { label: 'Lunch', emoji: '🥗', kind: 'mealType', value: 'lunch' },
  { label: 'Gluten Free', emoji: '🌾', kind: 'tag', value: 'gluten-free' },
  { label: 'Dairy-Free', emoji: '🥛', kind: 'tag', value: 'dairy-free' },
  { label: 'Keto', emoji: '🥑', kind: 'tag', value: 'keto' },
  { label: 'Italian', emoji: '🍕', kind: 'cuisine', value: 'Italian' },
  { label: 'Asian', emoji: '🍜', kind: 'cuisine', value: 'Asian' },
  { label: 'Mediterranean', emoji: '🫒', kind: 'cuisine', value: 'Mediterranean' },
]

const TILE_COLORS = ['#e8b4a8', '#d4a574', '#c9a582', '#b8956a', '#a48a6e']

interface Props {
  onNavigate: (screen: Screen, data?: any) => void
}

export default function BrowseScreen({ onNavigate }: Props) {
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [dietPrefs, setDietPrefs] = useState<string[]>(() => getDietPrefs())
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
    r => matchesSearch(r) && matchesFilter(r, activeFilter) && matchesDiet(r, dietPrefs)
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

  const EXPLORE: { key: FilterKind; label: string; bg: string; emoji: string; values: string[] }[] = [
    { key: 'ingredient', label: 'Ingredients', bg: '#c9efa6', emoji: '🥕', values: ingredients },
    { key: 'mealType', label: 'Meal type', bg: '#dbeafe', emoji: '🍽️', values: mealTypes },
    { key: 'tag', label: 'Dietary', bg: '#fde2e4', emoji: '🌾', values: dietTags },
    { key: 'cuisine', label: 'Cuisine', bg: '#e9d5ff', emoji: '🍜', values: cuisines },
  ]

  // Deterministic daily pick from the user's own recipes
  const rotd = recipes.length ? recipes[Math.floor(Date.now() / 86400000) % recipes.length] : null
  const browsing = !q && !activeFilter

  const applyFilter = (f: ActiveFilter) => {
    setActiveFilter(f)
    setExploreCat(null)
  }

  const clearAll = () => {
    setActiveFilter(null)
    setSearchTerm('')
  }

  const labelFor = (kind: FilterKind, value: string) =>
    kind === 'tag' ? DIET_LABELS[value] || value : value

  // The popular filters, grouped so the dropdown reads as sections rather than
  // one long list.
  const FILTER_GROUPS: { label: string; kind: FilterKind }[] = [
    { label: 'Dietary', kind: 'tag' },
    { label: 'Meal', kind: 'mealType' },
    { label: 'Cuisine', kind: 'cuisine' },
  ]

  const header = (
    <header style={{ padding: '14px 16px 12px', background: 'var(--color-card)', flexShrink: 0, position: 'relative', zIndex: 30 }}>
      <h1 style={{ fontFamily: SERIF, fontSize: '28px', fontWeight: '400', color: 'var(--color-text)', margin: '0 0 12px' }}>
        Discover
      </h1>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '10px', background: 'var(--color-card)', border: '1.5px solid var(--color-border)', borderRadius: '999px', padding: '11px 16px', minWidth: 0 }}>
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

        {/* Filters, merged in here from the old "Popular searches" row. */}
        {popularChips.length > 0 && (
          <button
            onClick={() => setFilterOpen(o => !o)}
            aria-label="Filters"
            style={{
              position: 'relative', flexShrink: 0, width: '46px', height: '46px', borderRadius: '999px',
              border: '1.5px solid ' + (activeFilter || filterOpen ? '#6ba356' : 'var(--color-border)'),
              background: activeFilter || filterOpen ? '#6ba356' : 'var(--color-card)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
            }}
          >
            <SlidersHorizontal size={18} color={activeFilter || filterOpen ? '#fff' : 'var(--color-text-secondary)'} />
            {activeFilter && !filterOpen && (
              <span style={{ position: 'absolute', top: '9px', right: '10px', width: '7px', height: '7px', borderRadius: '4px', background: 'var(--color-card)', border: '1.5px solid #6ba356' }} />
            )}
          </button>
        )}
      </div>

      {filterOpen && (
        <>
          {/* Tap-away backdrop. */}
          <div onClick={() => setFilterOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 39 }} />
          <div style={{ position: 'absolute', top: '100%', right: '16px', marginTop: '6px', width: '250px', maxHeight: '340px', overflowY: 'auto', background: 'var(--color-card)', border: '1px solid #e8eef0', borderRadius: '14px', boxShadow: '0 8px 30px rgba(15,23,42,0.14)', zIndex: 40, padding: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <span style={{ fontSize: '13px', fontWeight: '700', color: 'var(--color-text)' }}>Filter by</span>
              {activeFilter && (
                <button onClick={() => { setActiveFilter(null); setFilterOpen(false) }} style={{ background: 'none', border: 'none', color: '#6ba356', fontSize: '12px', fontWeight: '700', cursor: 'pointer', padding: 0, fontFamily: 'inherit' }}>
                  Clear
                </button>
              )}
            </div>
            {FILTER_GROUPS.map(group => {
              const chips = popularChips.filter(c => c.kind === group.kind)
              if (!chips.length) return null
              return (
                <div key={group.kind} style={{ marginBottom: '12px' }}>
                  <p style={{ fontSize: '11px', fontWeight: '700', color: 'var(--color-text-muted)', letterSpacing: '0.05em', margin: '0 0 7px' }}>{group.label.toUpperCase()}</p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {chips.map(c => {
                      const on = activeFilter?.kind === c.kind && activeFilter?.value === c.value
                      return (
                        <button
                          key={c.value}
                          onClick={() => { applyFilter({ kind: c.kind, value: c.value, label: c.label }); setFilterOpen(false) }}
                          style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '6px 11px', borderRadius: '999px', border: '1.5px solid ' + (on ? '#6ba356' : 'var(--color-border)'), background: on ? 'var(--color-primary-bg)' : 'var(--color-card)', color: on ? '#4d7a3c' : 'var(--color-text)', fontSize: '13px', fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit' }}
                        >
                          <span>{c.emoji}</span> {c.label}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}
    </header>
  )

  if (isLoading) {
    return (
      <div className="screen">
        {header}
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-muted)' }}>
          <p>Loading recipes...</p>
        </div>
        <BottomNavigation active="browse" onNavigate={(s) => onNavigate(s as Screen)} />
      </div>
    )
  }

  return (
    <div className="screen" style={{ background: 'var(--color-card)' }}>
      {header}

      {dietPrefs.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', background: 'var(--color-primary-bg)', borderBottom: '1px solid var(--color-border)', overflowX: 'auto', flexShrink: 0 }}>
          <SlidersHorizontal size={15} color="#6ba356" style={{ flexShrink: 0 }} />
          <div style={{ display: 'flex', gap: '6px', flex: 1 }}>
            {dietPrefs.map(pref => (
              <span key={pref} style={{ flexShrink: 0, background: '#6ba356', color: '#fff', fontSize: '12px', fontWeight: '600', padding: '4px 10px', borderRadius: '999px' }}>
                {DIET_LABELS[pref] || pref}
              </span>
            ))}
          </div>
          <button onClick={() => setDietPrefs([])} aria-label="Clear diet filters" style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: '3px', background: 'none', border: 'none', color: 'var(--color-text-secondary)', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}>
            <X size={13} /> Clear
          </button>
        </div>
      )}

      <div style={{ flex: 1, overflowY: 'auto' }}>
        {browsing ? (
          <>
            {/* Recipe of the day */}
            {rotd && (
              <div style={{ margin: '18px 16px 0', background: 'var(--color-card)', border: '1px solid var(--color-subtle)', boxShadow: '0 1px 3px rgba(0,0,0,0.04)', borderRadius: '18px', padding: '18px', cursor: 'pointer' }} onClick={() => onNavigate('recipe', { recipe: rotd })}>
                <p style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: '19px', color: '#6ba356', margin: '0 0 10px' }}>
                  Recipe of the day
                </p>
                <h2 style={{ fontFamily: SERIF, fontSize: '25px', fontWeight: '400', color: 'var(--color-text)', margin: '0 0 8px', lineHeight: 1.2 }}>
                  {rotd.name}
                </h2>
                <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', margin: '0 0 10px' }}>
                  {rotd.cuisine} · {(rotd.prepTime || 0) + (rotd.cookTime || 0)} min
                  {rotd.calories ? ` · ${rotd.calories} cal` : ''}
                </p>
                {rotd.description && (
                  <p style={{ fontSize: '14px', color: 'var(--color-text-secondary)', margin: '0 0 14px', lineHeight: 1.5 }}>{rotd.description}</p>
                )}
                <div style={{ height: '170px', borderRadius: '14px', overflow: 'hidden', background: `linear-gradient(135deg, ${TILE_COLORS[0]}, ${TILE_COLORS[3]})`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '58px' }}>
                  {rotd.imageUrl ? (
                    <img src={rotd.imageUrl} alt={rotd.name} loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} onError={e => { e.currentTarget.style.display = 'none' }} />
                  ) : (
                    '🍽️'
                  )}
                </div>
              </div>
            )}

            {/* Explore recipes by */}
            <div style={{ padding: '22px 16px 0' }}>
              <p style={{ fontSize: '14px', fontWeight: '600', color: 'var(--color-text-secondary)', margin: '0 0 10px' }}>Explore recipes by</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                {EXPLORE.map(cat => {
                  const selected = exploreCat === cat.key
                  return (
                    <button
                      key={cat.key}
                      onClick={() => setExploreCat(selected ? null : cat.key)}
                      disabled={cat.values.length === 0}
                      style={{
                        display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '12px',
                        background: 'var(--color-card)',
                        border: `2px solid ${selected ? '#6ba356' : 'var(--color-subtle)'}`,
                        borderRadius: '14px', padding: '14px',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                        textAlign: 'left', cursor: cat.values.length ? 'pointer' : 'default',
                        opacity: cat.values.length ? 1 : 0.5, fontFamily: 'inherit',
                      }}
                    >
                      {/* Emoji in a category-tinted tile, matching the app's card tiles. */}
                      <div style={{ width: '40px', height: '40px', borderRadius: '11px', background: cat.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>
                        {cat.emoji}
                      </div>
                      <div style={{ fontSize: '15px', fontWeight: '600', color: 'var(--color-text)' }}>{cat.label}</div>
                    </button>
                  )
                })}
              </div>

              {/* Inline values for the chosen category */}
              {exploreCat && (
                <div style={{ marginTop: '12px', border: '1.5px solid var(--color-border)', borderRadius: '14px', padding: '12px', background: 'var(--color-subtle)' }}>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {(EXPLORE.find(c => c.key === exploreCat)?.values || []).map(v => (
                      <button
                        key={v}
                        onClick={() => applyFilter({ kind: exploreCat, value: v, label: labelFor(exploreCat, v) })}
                        style={{ padding: '8px 13px', background: 'var(--color-card)', border: '1.5px solid var(--color-border)', borderRadius: '999px', fontSize: '13px', fontWeight: '500', color: 'var(--color-text)', cursor: 'pointer', textTransform: exploreCat === 'mealType' ? 'capitalize' : 'none' }}
                      >
                        {labelFor(exploreCat, v)}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* All recipes */}
            <div style={{ padding: '22px 16px 16px' }}>
              <h3 style={{ fontFamily: SERIF, fontSize: '20px', fontWeight: '400', color: 'var(--color-text)', margin: '0 0 12px' }}>
                All recipes
              </h3>
              <RecipeList recipes={displayed} onNavigate={onNavigate} />
            </div>
          </>
        ) : (
          <div style={{ padding: '14px 16px 16px' }}>
            {activeFilter && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#334155', color: '#fff', fontSize: '13px', fontWeight: '600', padding: '6px 12px', borderRadius: '999px', textTransform: activeFilter.kind === 'mealType' ? 'capitalize' : 'none' }}>
                  {activeFilter.label}
                  <button onClick={() => setActiveFilter(null)} aria-label="Remove filter" style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', display: 'flex', padding: 0 }}>
                    <X size={13} />
                  </button>
                </span>
                <span style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>
                  {displayed.length} recipe{displayed.length === 1 ? '' : 's'}
                </span>
              </div>
            )}

            {displayed.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--color-text-muted)' }}>
                <div style={{ fontSize: '38px', marginBottom: '10px' }}>🔍</div>
                <p style={{ fontSize: '14px', margin: '0 0 16px' }}>Nothing matches that yet.</p>
                <button onClick={clearAll} style={{ padding: '9px 18px', background: '#6ba356', color: '#fff', border: 'none', borderRadius: '10px', cursor: 'pointer', fontSize: '14px', fontWeight: '700' }}>
                  Clear
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

function RecipeList({ recipes, onNavigate }: { recipes: Recipe[]; onNavigate: (s: Screen, d?: any) => void }) {
  if (recipes.length === 0) {
    return <p style={{ textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '14px', padding: '24px 0', margin: 0 }}>No recipes yet.</p>
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {recipes.map((recipe, index) => {
        const tint = TILE_COLORS[index % TILE_COLORS.length]
        const time = (recipe.prepTime || 0) + (recipe.cookTime || 0)
        const meta = [recipe.cuisine, `${time} min`, recipe.calories ? `${recipe.calories} cal` : '']
          .filter(Boolean).join(' · ')
        return (
          <div
            key={recipe.id}
            onClick={() => onNavigate('recipe', { recipe })}
            style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 14px', background: 'var(--color-card)', borderRadius: '14px', border: '1px solid var(--color-subtle)', boxShadow: '0 1px 3px rgba(0,0,0,0.04)', cursor: 'pointer' }}
          >
            {/* Same tinted tile the Home cards use. */}
            <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: tint + '2e', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', flexShrink: 0, overflow: 'hidden' }}>
              {recipe.imageUrl
                ? <img src={recipe.imageUrl} alt="" loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} onError={e => { e.currentTarget.style.display = 'none' }} />
                : '🍽️'}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <h4 style={{ fontSize: '14px', fontWeight: '600', color: 'var(--color-text)', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {recipe.name}
              </h4>
              <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', margin: '2px 0 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {meta}
              </p>
            </div>
            <ChevronRight size={18} color="var(--color-text-muted)" style={{ flexShrink: 0 }} />
          </div>
        )
      })}
    </div>
  )
}
