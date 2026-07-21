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
      // First open slot from today onward through the week (dinner first each
      // day); rolls to the next day when today's slots are all taken.
      const todayIdx = (today.getDay() + 6) % 7
      const todayName = DAY_NAMES[todayIdx]
      const slotOrder = ['dinner', 'lunch', 'breakfast', 'snack']
      let day = todayName, slot = 'dinner'
      for (let d = todayIdx; d < DAY_NAMES.length; d++) {
        const dn = DAY_NAMES[d]
        const open = slotOrder.find(s => getMeals(plan, dn, s).length === 0)
        if (open) { day = dn; slot = open; break }
      }
      await mealPlanAPI.addMeal(plan.id, created.id, day, slot)
      setPlannedRecipes(prev => new Set(prev).add(dish.name))
      show(day === todayName ? `Added “${dish.name}” to today’s ${slot}` : `Added “${dish.name}” to ${day}’s ${slot}`)
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
        // Just the item on the shopping list — these are ingredient names, so a
        // "1 piece" amount would only add noise.
        groceryAPI.addItem(list.id, { name, quantity: 1, unit: '', category: 'general' })
      ))
      show(`Added ${missing.length} item${missing.length === 1 ? '' : 's'} to your grocery list`)
    } catch {
      show('Could not add to your list', 'error')
    } finally {
      setAddingList(null)
    }
  }

  const header = (
    <header style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px 24px', background: 'var(--color-bg)', borderBottom: '1px solid var(--color-subtle)', flexShrink: 0 }}>
      <button onClick={() => onNavigate('home')} aria-label="Back" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex' }}>
        <ArrowLeft size={22} color="var(--color-text)" />
      </button>
      <h1 style={{ fontSize: '19px', fontWeight: '700', letterSpacing: '-0.01em', color: 'var(--color-text)', margin: 0 }}>Cook with what I have</h1>
    </header>
  )

  if (!isPro) {
    return (
      <div className="screen" style={{ background: 'var(--color-bg)' }}>
        {header}
        <div style={{ flex: 1, overflowY: 'auto', padding: '40px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '14px' }}>
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
      <div style={{ flex: 1, overflowY: 'auto', padding: '18px 24px 24px' }}>
        {/* Pantry manager */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '0 0 10px' }}>
          <p style={{ fontSize: '12px', fontWeight: '700', color: 'var(--color-text-muted)', letterSpacing: '0.09em', margin: 0 }}>MY PANTRY{pantry.length > 0 ? ` · ${pantry.length}` : ''}</p>
          {pantry.length > 0 && (
            <button onClick={clearPantry} style={{ background: 'none', border: 'none', color: 'var(--color-text-muted)', fontSize: '12px', fontWeight: '700', cursor: 'pointer', fontFamily: 'inherit', padding: 0 }}>
              Clear
            </button>
          )}
        </div>
        <div style={{ display: 'flex', gap: '8px', marginBottom: '14px' }}>
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') addFromInput() }}
            placeholder="Add an ingredient you have…"
            style={{ flex: 1, minWidth: 0, padding: '12px 14px', borderRadius: '12px', border: 'none', fontSize: '15px', color: 'var(--color-text)', background: 'var(--color-subtle)', outline: 'none', fontFamily: 'inherit' }}
          />
          <button onClick={addFromInput} aria-label="Add to pantry" style={{ flexShrink: 0, width: '46px', borderRadius: '12px', background: 'var(--color-primary)', color: '#fff', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            <Plus size={20} />
          </button>
        </div>

        {/* Current pantry */}
        {pantry.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '18px' }}>
            {pantry.map(item => (
              <span key={item} style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', background: 'var(--color-subtle)', color: 'var(--color-text)', borderRadius: '999px', padding: '5px 8px 5px 12px', fontSize: '13px', fontWeight: '600' }}>
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
          <div style={{ marginBottom: '24px' }}>
            <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', margin: '0 0 8px' }}>Quick add</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '7px' }}>
              {staplesToAdd.map(s => (
                <button
                  key={s}
                  onClick={() => add(s)}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: 'transparent', color: 'var(--color-text-secondary)', border: '1px solid var(--color-border)', borderRadius: '999px', padding: '6px 12px', fontSize: '13px', fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit' }}
                >
                  <Plus size={13} color="var(--color-primary)" /> {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* AI cook — dish ideas from whatever's on hand */}
        {pantry.length > 0 && (
          <div style={{ marginBottom: '24px' }}>
            <button
              onClick={runCook}
              disabled={cookLoading}
              style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '13px', borderRadius: '12px', border: '1px solid var(--color-primary-border)', background: 'var(--color-primary-bg)', color: 'var(--color-primary-dark)', fontSize: '14px', fontWeight: '700', cursor: cookLoading ? 'default' : 'pointer', fontFamily: 'inherit' }}
            >
              <Sparkles size={16} /> {cookLoading ? 'Thinking…' : 'Ask AI what to cook'}
            </button>
            {cookDishes.length > 0 && !cookLoading && (
              <div style={{ marginTop: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '12px' }}>
                  <Sparkles size={14} color="var(--color-primary)" />
                  <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--color-primary)', letterSpacing: '0.08em' }}>IDEAS FROM YOUR PANTRY</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {cookDishes.map((d, i) => (
                    <div key={i} style={{ display: 'flex', gap: '12px', padding: '15px', background: 'var(--color-subtle)', borderRadius: '16px' }}>
                      <div style={{ flexShrink: 0, width: '24px', height: '24px', borderRadius: '8px', background: 'var(--color-primary-bg)', color: 'var(--color-primary-dark)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: '800' }}>
                        {i + 1}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <h4 style={{ fontSize: '14.5px', fontWeight: '700', color: 'var(--color-text)', margin: 0 }}>{d.name}</h4>
                        {d.steps && <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', margin: '5px 0 0', lineHeight: 1.5 }}>{d.steps}</p>}
                        {d.nutrition && (
                          <div style={{ marginTop: '8px' }}>
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '12px', fontWeight: '700', color: 'var(--color-primary-dark)', background: 'var(--color-primary-bg)', padding: '3px 9px', borderRadius: '999px' }}>
                              <Flame size={12} /> {d.nutrition}
                            </span>
                          </div>
                        )}
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '12px' }}>
                          <button
                            onClick={() => saveDish(d, i)}
                            disabled={savingIdx === i || savedRecipes.has(d.name)}
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '7px 12px', borderRadius: '10px', border: '1px solid var(--color-primary-border)', background: savedRecipes.has(d.name) ? 'var(--color-primary-bg)' : 'var(--color-card)', color: 'var(--color-primary-dark)', fontSize: '12px', fontWeight: '700', cursor: savingIdx === i || savedRecipes.has(d.name) ? 'default' : 'pointer', fontFamily: 'inherit' }}
                          >
                            {savedRecipes.has(d.name)
                              ? <><Check size={13} /> Saved</>
                              : <><BookmarkPlus size={13} /> {savingIdx === i ? 'Saving…' : 'Save to recipes'}</>}
                          </button>
                          <button
                            onClick={() => planDish(d, i)}
                            disabled={planningIdx === i || plannedRecipes.has(d.name)}
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '7px 12px', borderRadius: '10px', border: '1px solid var(--color-border)', background: plannedRecipes.has(d.name) ? 'var(--color-primary-bg)' : 'var(--color-card)', color: plannedRecipes.has(d.name) ? 'var(--color-primary-dark)' : 'var(--color-text-secondary)', fontSize: '12px', fontWeight: '700', cursor: planningIdx === i || plannedRecipes.has(d.name) ? 'default' : 'pointer', fontFamily: 'inherit' }}
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
          <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--color-text-muted)' }}>
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
              <div style={{ marginBottom: almost.length > 0 ? '28px' : 0 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', paddingBottom: '10px', borderBottom: '1px solid var(--color-subtle)' }}>
                  <h2 style={{ fontSize: '12px', fontWeight: '700', letterSpacing: '0.09em', textTransform: 'uppercase', color: 'var(--color-text-muted)', margin: 0 }}>Ready to cook</h2>
                  <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--color-primary)' }}>{ready.length}</span>
                </div>
                {ready.map(({ r, m }, i) => <RecipeRow key={r.id} r={r} m={m} divider={i > 0} busy={addingList === r.id} onOpen={() => onNavigate('recipe', { recipe: r })} onAddList={() => addMissingToGrocery(r, m.missing)} />)}
              </div>
            )}
            {almost.length > 0 && (
              <div>
                <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', paddingBottom: '10px', borderBottom: '1px solid var(--color-subtle)' }}>
                  <h2 style={{ fontSize: '12px', fontWeight: '700', letterSpacing: '0.09em', textTransform: 'uppercase', color: 'var(--color-text-muted)', margin: 0 }}>Almost there</h2>
                </div>
                {almost.map(({ r, m }, i) => <RecipeRow key={r.id} r={r} m={m} divider={i > 0} busy={addingList === r.id} onOpen={() => onNavigate('recipe', { recipe: r })} onAddList={() => addMissingToGrocery(r, m.missing)} />)}
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
// identity every render, so React remounted every row on each keystroke.
function RecipeRow({ r, m, divider, busy, onOpen, onAddList }: {
  r: any; m: any; divider: boolean; busy: boolean; onOpen: () => void; onAddList: () => void
}) {
  const ready = m.missing.length === 0
  return (
    <div
      onClick={onOpen}
      style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '15px 0', borderTop: divider ? '1px solid var(--color-subtle)' : 'none', cursor: 'pointer' }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <h3 style={{ fontSize: '15.5px', fontWeight: '600', color: 'var(--color-text)', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.name}</h3>
        {ready ? (
          <p style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12.5px', color: 'var(--color-primary)', fontWeight: '600', margin: '3px 0 0' }}>
            <Check size={13} /> You have everything
          </p>
        ) : (
          <p style={{ fontSize: '12.5px', color: 'var(--color-text-muted)', margin: '3px 0 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
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
          style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: '5px', padding: '7px 11px', borderRadius: '10px', border: '1px solid var(--color-primary-border)', background: 'var(--color-primary-bg)', color: 'var(--color-primary-dark)', fontSize: '12px', fontWeight: '700', cursor: busy ? 'default' : 'pointer', fontFamily: 'inherit' }}
        >
          {busy ? <Check size={14} /> : <ShoppingCart size={14} />}
          <span>List</span>
        </button>
      )}
    </div>
  )
}
