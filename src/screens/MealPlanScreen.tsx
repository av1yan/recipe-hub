import { useState, useEffect } from 'react'
import { Plus, Trash2, CalendarDays, Check, ChevronDown } from 'lucide-react'
import type { Screen, MealPlan, Recipe } from '../types'
import { BottomNavigation } from '../components/BottomNavigation'
import { mealPlanAPI, recipeAPI } from '../utils/api'

interface Props {
  onNavigate: (screen: Screen) => void
}

const DAY_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
export const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

export const MEALS = [
  { key: 'breakfast', label: 'Breakfast', tint: '#fef3c7', emoji: '🍳' },
  { key: 'lunch', label: 'Lunch', tint: '#eaf6e0', emoji: '🥗' },
  { key: 'dinner', label: 'Dinner', tint: '#e5e9ff', emoji: '🍽️' },
  { key: 'snack', label: 'Snack', tint: '#fce7f3', emoji: '🍎' },
]

// Monday (local midnight) of whatever week a date falls in.
export function mondayOf(date: Date | string): Date {
  const d = new Date(date)
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7))
  d.setHours(0, 0, 0, 0)
  return d
}

export function sameWeek(a: Date | string, b: Date | string): boolean {
  return mondayOf(a).getTime() === mondayOf(b).getTime()
}

// "Jul 13 – 19" / "Jul 27 – Aug 2"
function weekLabel(weekStart: Date): string {
  const end = new Date(weekStart)
  end.setDate(end.getDate() + 6)
  const mo = (d: Date) => d.toLocaleDateString('en-US', { month: 'short' })
  return mo(end) !== mo(weekStart)
    ? `${mo(weekStart)} ${weekStart.getDate()} – ${mo(end)} ${end.getDate()}`
    : `${mo(weekStart)} ${weekStart.getDate()} – ${end.getDate()}`
}

// Returns the recipe(s) planned for a given day + meal type as an array.
export function getMeals(plan: MealPlan | undefined, dayName: string, mealType: string): any[] {
  const dayMeals: any = plan?.meals?.[dayName]
  if (!dayMeals) return []
  const value = dayMeals[mealType] ?? dayMeals.snacks
  if (!value) return []
  return Array.isArray(value) ? value : [value]
}

export default function MealPlanScreen({ onNavigate }: Props) {
  const [mealPlans, setMealPlans] = useState<MealPlan[]>([])
  const [recipes, setRecipes] = useState<Recipe[]>([])
  // The week being viewed. A plan is only created once you actually add a meal,
  // so browsing weeks never litters empty plans.
  const [viewWeek, setViewWeek] = useState<Date>(() => mondayOf(new Date()))
  const [isLoading, setIsLoading] = useState(true)
  const [selectedDay, setSelectedDay] = useState<string>(() => DAY_NAMES[(new Date().getDay() + 6) % 7])
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [showWeeks, setShowWeeks] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    try {
      setIsLoading(true)
      const [plansData, recipesData] = await Promise.all([mealPlanAPI.list(), recipeAPI.list()])
      setMealPlans(plansData)
      setRecipes(recipesData)
    } catch (error) {
      console.error('Failed to load meal plan data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // Viewing a week is free — no plan is created just by looking.
  function openWeek(weekStart: Date) {
    setViewWeek(weekStart)
    setShowWeeks(false)
    setConfirmDelete(false)
  }

  async function deleteWeek() {
    if (!currentPlan) return
    setDeleting(true)
    try {
      await mealPlanAPI.delete(currentPlan.id)
      setConfirmDelete(false)
      await loadData()
    } catch (error) {
      console.error('Failed to delete meal plan:', error)
    } finally {
      setDeleting(false)
    }
  }

  async function addMealToPlan(recipeId: string, mealType: string) {
    if (!selectedDay) return
    try {
      // Create the week's plan lazily, on the first meal added to it.
      let planId = currentPlan?.id
      if (!planId) {
        const plan = await mealPlanAPI.create(viewWeek)
        setMealPlans(prev => [...prev, plan])
        planId = plan.id
      }
      await mealPlanAPI.addMeal(planId, recipeId, selectedDay, mealType)
      await loadData()
    } catch (error) {
      console.error('Failed to add meal to plan:', error)
    }
  }

  async function removeMeal(mealId: string) {
    try {
      await mealPlanAPI.removeMeal(mealId)
      await loadData()
    } catch (error) {
      console.error('Failed to remove meal from plan:', error)
    }
  }

  function getDayNumber(index: number, weekStart: Date) {
    const date = new Date(weekStart)
    date.setDate(date.getDate() + index)
    return date.getDate()
  }

  const currentPlan = mealPlans.find(p => sameWeek(p.weekStart, viewWeek))
  const weekStart = viewWeek

  if (isLoading) {
    return (
      <div className="screen">
        <header style={{ padding: '16px', background: 'var(--color-card)' }}>
          <h1 style={{ fontSize: '26px', fontWeight: '800', margin: 0, color: 'var(--color-text)' }}>Meal Plan</h1>
        </header>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-muted)' }}>
          <p>Loading meal plans...</p>
        </div>
        <BottomNavigation active="meal-plan" onNavigate={(s) => onNavigate(s as Screen)} />
      </div>
    )
  }

  return (
    <div className="screen" style={{ background: 'var(--color-card)' }}>
      <header style={{ padding: '16px 16px 14px', background: 'var(--color-card)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
          <h1 style={{ fontSize: '26px', fontWeight: '800', margin: 0, color: 'var(--color-text)' }}>Meal Plan</h1>
          <div style={{ display: 'flex', gap: '8px' }}>
            {currentPlan && (
              <button onClick={() => { setConfirmDelete(v => !v); setShowWeeks(false) }} aria-label="Delete week" style={{ width: '34px', height: '34px', borderRadius: '11px', background: 'var(--color-card)', color: 'var(--color-text-muted)', border: '1.5px solid var(--color-border)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Trash2 size={16} />
              </button>
            )}
            <button onClick={() => { setShowWeeks(v => !v); setConfirmDelete(false) }} aria-label="Choose week" style={{ width: '34px', height: '34px', borderRadius: '11px', background: showWeeks ? '#f26d5b' : '#fdeeeb', color: showWeeks ? '#fff' : '#f26d5b', border: '1.5px solid #f7d2ca', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CalendarDays size={17} />
            </button>
          </div>
        </div>

        {/* Day selector */}
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '2px' }}>
          {DAY_SHORT.map((short, idx) => {
            const dayName = DAY_NAMES[idx]
            const num = getDayNumber(idx, weekStart)
            const active = selectedDay === dayName
            return (
              <button
                key={dayName}
                onClick={() => setSelectedDay(dayName)}
                style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '7px', background: 'none', border: 'none', cursor: 'pointer', padding: '2px 0' }}
              >
                <span style={{ fontSize: '12px', fontWeight: '600', color: active ? '#f26d5b' : 'var(--color-text-muted)' }}>{short}</span>
                <span style={{ width: '34px', height: '34px', borderRadius: '17px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '15px', fontWeight: '700', background: active ? '#f26d5b' : 'transparent', color: active ? '#fff' : 'var(--color-text)', boxShadow: active ? '0 4px 10px rgba(242,109,91,0.35)' : 'none', transition: 'all 0.2s ease' }}>
                  {num}
                </span>
              </button>
            )
          })}
        </div>
      </header>

      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px 16px', background: 'var(--color-bg)' }}>
        {showWeeks && (
          <div style={{ marginBottom: '18px', border: '1.5px solid #f7d2ca', borderRadius: '16px', overflow: 'hidden', background: 'var(--color-card)' }}>
            <div style={{ padding: '9px 14px', fontSize: '11px', fontWeight: '800', color: '#f26d5b', letterSpacing: '0.05em', background: '#fdeeeb' }}>
              JUMP TO A WEEK
            </div>
            {[-1, 0, 1, 2, 3].map(offset => {
              const ws = mondayOf(new Date())
              ws.setDate(ws.getDate() + offset * 7)
              const plan = mealPlans.find(p => sameWeek(p.weekStart, ws))
              const isCurrent = currentPlan ? sameWeek(currentPlan.weekStart, ws) : false
              const planned = plan
                ? DAY_NAMES.reduce((n, d) => n + MEALS.reduce((m, mt) => m + getMeals(plan, d, mt.key).length, 0), 0)
                : 0
              return (
                <button
                  key={offset}
                  onClick={() => openWeek(ws)}
                  style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '10px', padding: '11px 14px', background: isCurrent ? '#fff7f5' : 'none', border: 'none', borderTop: offset === -1 ? 'none' : '1px solid #f6efed', cursor: 'pointer', textAlign: 'left' }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '14px', fontWeight: '700', color: 'var(--color-text)' }}>
                      {weekLabel(ws)}
                      {offset === 0 && <span style={{ fontSize: '11px', fontWeight: '700', color: '#f26d5b', marginLeft: '7px' }}>THIS WEEK</span>}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                      {plan ? `${planned} meal${planned === 1 ? '' : 's'} planned` : 'Nothing planned'}
                    </div>
                  </div>
                  {isCurrent && <Check size={16} color="#f26d5b" />}
                </button>
              )
            })}
          </div>
        )}

        {confirmDelete && (
          <div style={{ marginBottom: '18px', background: 'var(--color-card)', border: '1.5px solid #fecdca', borderRadius: '14px', padding: '14px' }}>
            <p style={{ fontSize: '14px', fontWeight: '700', color: 'var(--color-text)', margin: '0 0 4px' }}>Delete this week's plan?</p>
            <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', margin: '0 0 12px', lineHeight: 1.5 }}>This removes the week and any meals planned in it. It can't be undone.</p>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={() => setConfirmDelete(false)} style={{ flex: 1, padding: '11px', borderRadius: '10px', background: 'var(--color-subtle)', color: 'var(--color-text-secondary)', border: 'none', fontSize: '14px', fontWeight: '700', cursor: 'pointer' }}>
                Cancel
              </button>
              <button onClick={deleteWeek} disabled={deleting} style={{ flex: 1, padding: '11px', borderRadius: '10px', background: '#ef4444', color: '#fff', border: 'none', fontSize: '14px', fontWeight: '700', cursor: 'pointer', opacity: deleting ? 0.6 : 1 }}>
                {deleting ? 'Deleting…' : 'Delete week'}
              </button>
            </div>
          </div>
        )}

        {MEALS.map(m => {
          const meals = getMeals(currentPlan, selectedDay, m.key)
          const filled = meals.length > 0
          return (
            <div key={m.key} style={{ marginBottom: '22px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <h3 style={{ fontSize: '17px', fontWeight: '700', color: 'var(--color-text)', margin: 0 }}>{m.label}</h3>
                {/* A slot holds one recipe. Filled: Remove clears it; the Swap
                    dropdown below the card changes it. */}
                {filled && (
                  <button
                    onClick={() => meals[0]?.mealId && removeMeal(meals[0].mealId)}
                    style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: '14px', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '3px' }}
                  >
                    <Trash2 size={14} /> Remove
                  </button>
                )}
              </div>

              {/* Planned meal card. The card itself is the swap control: an
                  invisible <select> laid over it means tapping the card opens a
                  dropdown to pick a different recipe, while the card keeps its
                  emoji tile + details. The chevron hints it's tappable. */}
              {filled && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {meals.map((meal, i) => {
                    const servings = meal.servings || 1
                    const canSwap = recipes.length > 0
                    return (
                      <div key={i} style={{ position: 'relative' }}>
                        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', background: 'var(--color-card)', border: '1px solid var(--color-subtle)', borderRadius: '14px', padding: '12px 14px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                          {/* Small tinted tile, matching the Home/Browse cards. */}
                          <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: m.tint + '2e', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', flexShrink: 0 }}>
                            {meal.emoji || m.emoji}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <h4 style={{ fontSize: '14px', fontWeight: '600', color: 'var(--color-text)', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{meal.name}</h4>
                            <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', margin: '2px 0 0' }}>
                              {(meal.prepTime || 0) + (meal.cookTime || 0)} min · {servings} serving{servings === 1 ? '' : 's'}
                            </p>
                          </div>
                          {canSwap && <ChevronDown size={18} color="var(--color-text-muted)" style={{ flexShrink: 0 }} />}
                        </div>
                        {canSwap && (
                          <select
                            value=""
                            onChange={(e) => { if (e.target.value) addMealToPlan(e.target.value, m.key) }}
                            aria-label={`Swap ${m.label.toLowerCase()} recipe`}
                            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', margin: 0, opacity: 0, border: 'none', cursor: 'pointer', appearance: 'none', WebkitAppearance: 'none', MozAppearance: 'none' }}
                          >
                            <option value="" disabled>{meal.name}</option>
                            {recipes.map(r => (
                              <option key={r.id} value={r.id}>
                                {(r as any).emoji || m.emoji} {r.name} · {(r.prepTime || 0) + (r.cookTime || 0)} min
                              </option>
                            ))}
                          </select>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}

              {/* Empty slot: pick a recipe straight from a dropdown. */}
              {!filled && (
                <RecipeDropdown meal={m} recipes={recipes} onPick={(id) => addMealToPlan(id, m.key)} />
              )}
            </div>
          )
        })}
      </div>

      <BottomNavigation active="meal-plan" onNavigate={(s) => onNavigate(s as Screen)} />
    </div>
  )
}

/**
 * The empty-slot recipe picker: a full-width dashed dropdown. One tap opens the
 * native picker listing every recipe; choosing adds it. Full width so the
 * native listbox shows the recipe names in full on every platform. Stays on the
 * placeholder (value="") so it re-arms after each pick. (Swapping a filled slot
 * is handled by the meal card itself, which carries its own <select>.)
 */
function RecipeDropdown({ meal, recipes, onPick }: {
  meal: typeof MEALS[number]
  recipes: Recipe[]
  onPick: (recipeId: string) => void
}) {
  const noRecipes = recipes.length === 0
  const placeholder = noRecipes ? 'No recipes yet — add some first' : `Add a ${meal.label.toLowerCase()} recipe`

  return (
    <div style={{ position: 'relative' }}>
      <div style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)', width: '40px', height: '40px', borderRadius: '12px', background: '#fdeeeb', display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
        <Plus size={18} color="#f26d5b" />
      </div>
      <select
        value=""
        disabled={noRecipes}
        onChange={(e) => { if (e.target.value) onPick(e.target.value) }}
        aria-label={`Add a ${meal.label.toLowerCase()} recipe`}
        style={{
          width: '100%', padding: '18px 40px 18px 60px',
          background: 'var(--color-card)',
          border: '1.5px dashed #f0d8d2', borderRadius: '16px',
          cursor: noRecipes ? 'default' : 'pointer',
          fontSize: '14px', fontWeight: '600', color: 'var(--color-text-muted)',
          appearance: 'none', WebkitAppearance: 'none', MozAppearance: 'none',
          fontFamily: 'inherit',
        }}
      >
        <option value="" disabled>{placeholder}</option>
        {recipes.map(r => (
          <option key={r.id} value={r.id}>
            {(r as any).emoji || meal.emoji} {r.name} · {(r.prepTime || 0) + (r.cookTime || 0)} min
          </option>
        ))}
      </select>
      {!noRecipes && (
        <ChevronDown size={18} color="#f26d5b" style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
      )}
    </div>
  )
}
