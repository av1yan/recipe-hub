import { useState, useEffect } from 'react'
import { ArrowLeft, Plus, X, ChevronRight, Check, Crown, ChefHat, ShoppingCart, Sparkles, BookmarkPlus, Flame, CalendarPlus } from 'lucide-react'
import type { Screen, Recipe } from '../types'
import { recipeAPI, groceryAPI, insightsAPI, mealPlanAPI } from '../utils/api'
import { DAY_NAMES, getMeals, sameWeek, mondayOf } from './MealPlanScreen'
import { getPantry, savePantry, pantryMatch } from '../utils/pantry'
import { useProPlan } from '../utils/proPlan'
import { Toast, useToast } from '../components/Toast'

interface Props {
  onNavigate: (screen: Screen, data?: any) => void
}

const TILE_COLORS = ['#e8b4a8', '#d4a574', '#c9a582', '#b8956a', '#a48a6e']

// Common kitchen staples, one tap to add — so filling the pantry doesn't mean
// typing a dozen things.
const STAPLES = [
  'eggs', 'onion', 'garlic', 'chicken', 'pasta', 'rice', 'tomato', 'olive oil',
  'butter', 'milk', 'cheese', 'flour', 'potato', 'bell pepper', 'carrot', 'spinach',
]

type Dish = { name: string; steps: string; nutrition: string }

// Fallback for when the backend returns only a joined `text` string: split it
// into { name, steps, nutrition } tiles on "::", " — " or " - ".
function parseDishes(text: string): Dish[] {
  return text
    .split('\n')
    .map(l => l.trim())
    .filter(Boolean)
    .map(l => l.replace(/^\s*(?:\d+[.)]|[-*•])\s*/, ''))
    .map(l => {
      let name: string, steps: string, nutrition: string
      const parts = l.split('::').map(p => p.trim())
      if (parts.length >= 2) {
        name = parts[0]; steps = parts[1] || ''; nutrition = parts.slice(2).join(' · ').trim()
      } else {
        let sep = l.indexOf(' — '); let width = 3
        if (sep === -1) { sep = l.indexOf(' - '); width = 3 }
        if (sep === -1) { name = l; steps = ''; nutrition = '' }
        else { name = l.slice(0, sep).trim(); steps = l.slice(sep + width).trim(); nutrition = '' }
      }
      // Pull a trailing "…NNN kcal … protein" out of the steps if it got inlined.
      if (!nutrition && steps) {
        const m = steps.match(/[≈~]?\s*\d{2,4}\s*k?cal\b.*$/i)
        if (m && m.index !== undefined && m.index > 0) {
          nutrition = steps.slice(m.index).replace(/^[\s.,;:–—-]+/, '').trim()
          steps = steps.slice(0, m.index).replace(/[\s.,;:–—-]+$/, '').trim()
        }
      }
      return { name, steps, nutrition }
    })
    .filter(d => d.name)
}

export default function PantryScreen({ onNavigate }: Props) {
  const [isPro] = useProPlan()
  const [pantry, setPantry] = useState<string[]>(() => getPantry())
  const [input, setInput] = useState('')
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [loading, setLoading] = useState(true)
  const [addingList, setAddingList] = useState<string | null>(null)
  const [cookLoading, setCookLoading] = useState(false)
  const [cookDishes, setCookDishes] = useState<{ name: string; steps: string; nutrition: string }[]>([])
  const [cookNote, setCookNote] = useState('')
  const [savingIdx, setSavingIdx] = useState<number | null>(null)
  const [savedRecipes, setSavedRecipes] = useState<Set<string>>(new Set())
  const [planningIdx, setPlanningIdx] = useState<number | null>(null)
  const [plannedRecipes, setPlannedRecipes] = useState<Set<string>>(new Set())
  const { toast, show } = useToast()

  useEffect(() => {
    if (isPro) loadRecipes()
  }, [])

  async function loadRecipes() {
    try {
      setLoading(true)
      const data: Recipe[] = await recipeAPI.list()
      // The list endpoint omits ingredients, so hydrate them from each recipe's
      // detail -- the whole feature matches on ingredient names.
      const hydrated = await Promise.all(
        data.map(async (r: any) => {
          try {
            const detail = await recipeAPI.get(r.id)
            return { ...r, ingredients: detail.ingredients || r.ingredients || [] }
          } catch {
            return r
          }
        })
      )
      setRecipes(hydrated)
    } catch (error) {
      console.error('Failed to load recipes:', error)
    } finally {
      setLoading(false)
    }
  }

  const has = (name: string) => pantry.some(p => p.toLowerCase() === name.toLowerCase())
  const add = (name: string) => {
    const v = name.trim()
    if (!v || has(v)) return
    const next = [...pantry, v]
    setPantry(next); savePantry(next)
  }
  const addFromInput = () => { add(input); setInput('') }
  const removeItem = (item: string) => {
    const next = pantry.filter(p => p !== item)
    setPantry(next); savePantry(next)
  }
  const clearPantry = () => {
    setPantry([]); savePantry([])
    setCookDishes([]); setCookNote(''); setSavedRecipes(new Set()); setPlannedRecipes(new Set())
  }

  // Ask the AI cook for dish ideas from whatever's in the pantry. Falls back to a
  // friendly note when the backend has no API key (rather than a hard error).
  async function runCook() {
    if (!pantry.length || cookLoading) return
    setCookLoading(true); setCookDishes([]); setCookNote(''); setSavedRecipes(new Set()); setPlannedRecipes(new Set())
    try {
      const res: any = await insightsAPI.cook(pantry)
      if (res?.configured === false) setCookNote(res.message || "The AI cook isn't switched on yet.")
      else {
        const dishes = Array.isArray(res?.dishes) && res.dishes.length
          ? res.dishes
          : parseDishes(res?.text || '')
        setCookDishes(dishes)
      }
    } catch {
      setCookNote('Could not reach the AI just now — try again in a moment.')
    } finally {
      setCookLoading(false)
    }
  }

  // Build a recipe from an AI dish idea: pull in the pantry items it mentions as
  // ingredients, split its how-to into steps, and carry over the calorie estimate.
  function dishToRecipePayload(dish: Dish) {
    const hay = (dish.name + ' ' + dish.steps).toLowerCase()
    const ingredients = pantry
      .filter(p => hay.includes(p.toLowerCase()))
      .map(p => ({ name: p, quantity: 1, unit: '' }))
    // Sentence split without lookbehind, so it works on older mobile Safari.
    const sentences = (dish.steps || '').match(/[^.!?]+[.!?]+/g) || (dish.steps ? [dish.steps] : [])
    const steps = sentences.map(s => s.trim()).filter(Boolean)
    const instructions = (steps.length ? steps : [dish.name]).map((text, i) => ({ stepNumber: i + 1, text }))
    const calMatch = (dish.nutrition || '').match(/(\d{2,4})\s*k?cal/i)
    return {
      name: dish.name, cuisine: 'Other', mealType: 'dinner', difficulty: 'easy',
      prepTime: 10, cookTime: 20, servings: 2,
      calories: calMatch ? parseInt(calMatch[1], 10) : null,
      imageUrl: null, sourceUrl: '', tags: ['pantry'],
      ingredients, instructions,
    }
  }

  // Save one dish idea as a recipe in the collection.
  async function saveDish(dish: Dish, idx: number) {
    if (savingIdx !== null || savedRecipes.has(dish.name)) return
    setSavingIdx(idx)
    try {
      await recipeAPI.create(dishToRecipePayload(dish))
      setSavedRecipes(prev => new Set(prev).add(dish.name))
      show(`Saved “${dish.name}” to your recipes`)
    } catch {
      show('Could not save that recipe', 'error')
    } finally {
      setSavingIdx(null)
    }
  }

  // Save the dish as a recipe and drop it into this week's plan, in today's first
  // open slot (dinner first). Creates the week's plan if there isn't one yet.
  async function planDish(dish: Dish, idx: number) {
    if (planningIdx !== null || plannedRecipes.has(dish.name)) return
    setPlanningIdx(idx)
    try {
      const created: any = await recipeAPI.create(dishToRecipePayload(dish))
      const today = new Date()
      const plans: any = await mealPlanAPI.list()
      let plan = (Array.isArray(plans) ? plans : []).find((p: any) => sameWeek(p.weekStart, today))
      if (!plan?.id) plan = await mealPlanAPI.create(mondayOf(today))
      const todayName = DAY_NAMES[(today.getDay() + 6) % 7]
      const slot = ['dinner', 'lunch', 'breakfast', 'snack'].find(s => getMeals(plan, todayName, s).length === 0) || 'dinner'
      await mealPlanAPI.addMeal(plan.id, created.id, todayName, slot)
      setPlannedRecipes(prev => new Set(prev).add(dish.name))
      show(`Added “${dish.name}” to today’s ${slot}`)
    } catch {
      show('Could not add to your meal plan', 'error')
    } finally {
      setPlanningIdx(null)
    }
  }

  const ranked = recipes
    .map(r => ({ r, m: pantryMatch(r, pantry) }))
    .filter(x => x.m.total > 0 && x.m.have > 0)
    .sort((a, b) => (a.m.missing.length - b.m.missing.length) || (b.m.have - a.m.have))
  const ready = ranked.filter(x => x.m.missing.length === 0)
  const almost = ranked.filter(x => x.m.missing.length >= 1 && x.m.missing.length <= 3)
  const staplesToAdd = STAPLES.filter(s => !has(s))

  // Put a recipe's missing ingredients straight onto the grocery list.
  async function addMissingToGrocery(recipe: any, missing: string[]) {
    if (addingList) return
    setAddingList(recipe.id)
    try {
      const lists: any = await groceryAPI.list()
      let list = Array.isArray(lists) ? lists[0] : lists
      if (!list?.id) list = await groceryAPI.create('Groceries')
      await Promise.all(missing.map(name =>
        groceryAPI.addItem(list.id, { name, quantity: 1, unit: 'piece', category: 'general' })
      ))
      show(`Added ${missing.length} item${missing.length === 1 ? '' : 's'} to your grocery list`)
    } catch {
      show('Could not add to your list', 'error')
    } finally {
      setAddingList(null)
    }
  }

  const header = (
    <header style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '14px 16px', background: 'var(--color-card)', borderBottom: '1px solid var(--color-subtle)', flexShrink: 0 }}>
      <button onClick={() => onNavigate('home')} aria-label="Back" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex' }}>
        <ArrowLeft size={22} color="var(--color-text)" />
      </button>
      <h1 style={{ fontSize: '17px', fontWeight: '700', color: 'var(--color-text)', margin: 0 }}>Cook with what I have</h1>
    </header>
  )

  if (!isPro) {
    return (
      <div className="screen">
        {header}
        <div style={{ flex: 1, overflowY: 'auto', padding: '32px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '14px' }}>
          <div style={{ width: '64px', height: '64px', borderRadius: '18px', background: 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ChefHat size={32} color="#fff" />
          </div>
          <h2 style={{ fontSize: '19px', fontWeight: '800', color: 'var(--color-text)', margin: 0 }}>A Pro feature</h2>
          <p style={{ fontSize: '14px', color: 'var(--color-text-secondary)', margin: 0, lineHeight: 1.5, maxWidth: '280px' }}>
            Tell recipHub what's in your kitchen and it shows the recipes you can make right now — ranked by what you already have.
          </p>
          <button onClick={() => onNavigate('settings')} style={{ marginTop: '6px', padding: '13px 22px', background: 'var(--color-primary)', color: '#fff', border: 'none', borderRadius: '12px', fontSize: '15px', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontFamily: 'inherit' }}>
            <Crown size={16} color="#f4b860" /> Upgrade to Pro
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="screen" style={{ background: 'var(--color-bg)', position: 'relative' }}>
      {header}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
        {/* Pantry manager */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '0 0 8px' }}>
          <p style={{ fontSize: '12px', fontWeight: '700', color: 'var(--color-text-muted)', letterSpacing: '0.05em', margin: 0 }}>MY PANTRY{pantry.length > 0 ? ` · ${pantry.length}` : ''}</p>
          {pantry.length > 0 && (
            <button onClick={clearPantry} style={{ background: 'none', border: 'none', color: 'var(--color-text-muted)', fontSize: '12px', fontWeight: '700', letterSpacing: '0.03em', cursor: 'pointer', fontFamily: 'inherit', padding: 0 }}>
              Clear
            </button>
          )}
        </div>
        <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') addFromInput() }}
            placeholder="Add an ingredient you have…"
            style={{ flex: 1, minWidth: 0, padding: '12px 14px', borderRadius: '12px', border: '1.5px solid var(--color-border)', fontSize: '15px', color: 'var(--color-text)', background: 'var(--color-card)', outline: 'none', fontFamily: 'inherit' }}
          />
          <button onClick={addFromInput} aria-label="Add to pantry" style={{ flexShrink: 0, width: '46px', borderRadius: '12px', background: 'var(--color-primary)', color: '#fff', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            <Plus size={20} />
          </button>
        </div>

        {/* Current pantry */}
        {pantry.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '16px' }}>
            {pantry.map(item => (
              <span key={item} style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', background: 'var(--color-primary-bg)', color: 'var(--color-text)', borderRadius: '9px', padding: '5px 8px 5px 11px', fontSize: '13px', fontWeight: '600' }}>
                {item}
                <button onClick={() => removeItem(item)} aria-label={`Remove ${item}`} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', padding: 0, color: 'var(--color-text-muted)' }}>
                  <X size={14} />
                </button>
              </span>
            ))}
          </div>
        )}

        {/* Quick-add staples */}
        {staplesToAdd.length > 0 && (
          <div style={{ marginBottom: '22px' }}>
            <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', margin: '0 0 8px' }}>Quick add:</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '7px' }}>
              {staplesToAdd.map(s => (
                <button
                  key={s}
                  onClick={() => add(s)}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: 'var(--color-card)', color: 'var(--color-text-secondary)', border: '1.5px solid var(--color-border)', borderRadius: '999px', padding: '6px 11px', fontSize: '13px', fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit' }}
                >
                  <Plus size={13} color="var(--color-primary)" /> {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* AI cook — dish ideas from whatever's on hand */}
        {pantry.length > 0 && (
          <div style={{ marginBottom: '22px' }}>
            <button
              onClick={runCook}
              disabled={cookLoading}
              style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '12px', borderRadius: '12px', border: '1.5px solid var(--color-primary-border)', background: 'var(--color-primary-bg)', color: 'var(--color-primary)', fontSize: '14px', fontWeight: '700', cursor: cookLoading ? 'default' : 'pointer', fontFamily: 'inherit' }}
            >
              <Sparkles size={16} /> {cookLoading ? 'Thinking…' : 'Ask AI what to cook'}
            </button>
            {cookDishes.length > 0 && !cookLoading && (
              <div style={{ marginTop: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px' }}>
                  <Sparkles size={14} color="var(--color-primary)" />
                  <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--color-primary)', letterSpacing: '0.04em' }}>IDEAS FROM YOUR PANTRY</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {cookDishes.map((d, i) => (
                    <div key={i} style={{ display: 'flex', gap: '11px', padding: '13px 15px', background: 'var(--color-card)', border: '1px solid var(--color-subtle)', borderRadius: '14px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                      <div style={{ flexShrink: 0, width: '24px', height: '24px', borderRadius: '8px', background: 'var(--color-primary-bg)', color: 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: '800' }}>
                        {i + 1}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <h4 style={{ fontSize: '14px', fontWeight: '700', color: 'var(--color-text)', margin: 0 }}>{d.name}</h4>
                        {d.steps && <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', margin: '4px 0 0', lineHeight: 1.5 }}>{d.steps}</p>}
                        {d.nutrition && (
                          <div style={{ marginTop: '7px' }}>
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '12px', fontWeight: '700', color: 'var(--color-primary)', background: 'var(--color-primary-bg)', padding: '3px 9px', borderRadius: '999px' }}>
                              <Flame size={12} /> {d.nutrition}
                            </span>
                          </div>
                        )}
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '10px' }}>
                          <button
                            onClick={() => saveDish(d, i)}
                            disabled={savingIdx === i || savedRecipes.has(d.name)}
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '6px 11px', borderRadius: '9px', border: '1px solid var(--color-primary-border)', background: savedRecipes.has(d.name) ? 'var(--color-primary-bg)' : 'transparent', color: 'var(--color-primary)', fontSize: '12px', fontWeight: '700', cursor: savingIdx === i || savedRecipes.has(d.name) ? 'default' : 'pointer', fontFamily: 'inherit' }}
                          >
                            {savedRecipes.has(d.name)
                              ? <><Check size={13} /> Saved</>
                              : <><BookmarkPlus size={13} /> {savingIdx === i ? 'Saving…' : 'Save to recipes'}</>}
                          </button>
                          <button
                            onClick={() => planDish(d, i)}
                            disabled={planningIdx === i || plannedRecipes.has(d.name)}
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '6px 11px', borderRadius: '9px', border: '1px solid var(--color-border)', background: plannedRecipes.has(d.name) ? 'var(--color-primary-bg)' : 'transparent', color: plannedRecipes.has(d.name) ? 'var(--color-primary)' : 'var(--color-text-secondary)', fontSize: '12px', fontWeight: '700', cursor: planningIdx === i || plannedRecipes.has(d.name) ? 'default' : 'pointer', fontFamily: 'inherit' }}
                          >
                            {plannedRecipes.has(d.name)
                              ? <><Check size={13} /> Planned</>
                              : <><CalendarPlus size={13} /> {planningIdx === i ? 'Adding…' : 'Add to plan'}</>}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {cookNote && !cookLoading && (
              <div style={{ marginTop: '12px', padding: '12px 14px', background: 'var(--color-subtle)', borderRadius: '12px' }}>
                <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', margin: 0, lineHeight: 1.5 }}>{cookNote}</p>
              </div>
            )}
          </div>
        )}

        {/* Results */}
        {pantry.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--color-text-muted)' }}>
            <div style={{ fontSize: '34px', marginBottom: '8px' }}>🧑‍🍳</div>
            <p style={{ fontSize: '14px', margin: 0, lineHeight: 1.5 }}>Add a few staples above and recipHub will show what you can cook.</p>
          </div>
        ) : loading ? (
          <p style={{ textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '14px', padding: '24px 0' }}>Checking your recipes…</p>
        ) : ready.length === 0 && almost.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--color-text-muted)' }}>
            <div style={{ fontSize: '34px', marginBottom: '8px' }}>🔍</div>
            <p style={{ fontSize: '14px', margin: 0 }}>Nothing matches yet — add more items, or save more recipes.</p>
          </div>
        ) : (
          <>
            {ready.length > 0 && (
              <div style={{ marginBottom: almost.length > 0 ? '22px' : 0 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', margin: '0 0 10px' }}>
                  <h2 style={{ fontSize: '16px', fontWeight: '700', color: 'var(--color-text)', margin: 0 }}>Ready to cook</h2>
                  <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--color-primary)' }}>{ready.length}</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {ready.map(({ r, m }) => <RecipeRow key={r.id} r={r} m={m} busy={addingList === r.id} onOpen={() => onNavigate('recipe', { recipe: r })} onAddList={() => addMissingToGrocery(r, m.missing)} />)}
                </div>
              </div>
            )}
            {almost.length > 0 && (
              <div>
                <div style={{ margin: '0 0 4px' }}>
                  <h2 style={{ fontSize: '16px', fontWeight: '700', color: 'var(--color-text)', margin: 0 }}>Almost there</h2>
                </div>
                <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', margin: '0 0 10px' }}>A few items short — tap <ShoppingCart size={11} style={{ verticalAlign: '-1px' }} /> to add them to your list.</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {almost.map(({ r, m }) => <RecipeRow key={r.id} r={r} m={m} busy={addingList === r.id} onOpen={() => onNavigate('recipe', { recipe: r })} onAddList={() => addMissingToGrocery(r, m.missing)} />)}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {toast && <Toast message={toast.message} tone={toast.tone} bottom="24px" />}
    </div>
  )
}

// Hoisted to module scope: defining it inside PantryScreen gave it a new
// identity every render, so React remounted every row (and reloaded its image)
// on each keystroke in the pantry input.
function RecipeRow({ r, m, busy, onOpen, onAddList }: {
  r: any; m: any; busy: boolean; onOpen: () => void; onAddList: () => void
}) {
  const ready = m.missing.length === 0
  return (
    <div
      onClick={onOpen}
      style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 14px', background: 'var(--color-card)', borderRadius: '14px', border: '1px solid ' + (ready ? 'var(--color-primary-border)' : 'var(--color-subtle)'), boxShadow: '0 1px 3px rgba(0,0,0,0.04)', cursor: 'pointer' }}
    >
      <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: TILE_COLORS[0] + '2e', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', flexShrink: 0, overflow: 'hidden' }}>
        {r.imageUrl
          ? <img src={r.imageUrl} alt="" loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} onError={e => { e.currentTarget.style.display = 'none' }} />
          : '🍽️'}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <h3 style={{ fontSize: '14px', fontWeight: '600', color: 'var(--color-text)', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.name}</h3>
        {ready ? (
          <p style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: 'var(--color-primary)', fontWeight: '600', margin: '3px 0 0' }}>
            <Check size={13} /> You have everything
          </p>
        ) : (
          <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', margin: '3px 0 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            Missing {m.missing.length}: {m.missing.join(', ')}
          </p>
        )}
      </div>
      {ready ? (
        <ChevronRight size={18} color="var(--color-text-muted)" style={{ flexShrink: 0 }} />
      ) : (
        <button
          onClick={(e) => { e.stopPropagation(); onAddList() }}
          disabled={busy}
          aria-label="Add missing to grocery list"
          title="Add missing to grocery list"
          style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: '4px', padding: '7px 10px', borderRadius: '10px', border: '1.5px solid var(--color-primary-border)', background: 'var(--color-primary-bg)', color: 'var(--color-primary)', fontSize: '12px', fontWeight: '700', cursor: busy ? 'default' : 'pointer', fontFamily: 'inherit' }}
        >
          {busy ? <Check size={14} /> : <ShoppingCart size={14} />}
          <span>List</span>
        </button>
      )}
    </div>
  )
}
