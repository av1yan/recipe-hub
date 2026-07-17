import { useState, useEffect } from 'react'
import { Plus, X, Trash2, CalendarDays, Check } from 'lucide-react'
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
  const [pickerFor, setPickerFor] = useState<string | null>(null) // meal-type key whose inline picker is open
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
    setPickerFor(null)
    setConfirmDelete(false)
  }

  async function deleteWeek() {
    if (!currentPlan) return
    setDeleting(true)
    try {
      await mealPlanAPI.delete(currentPlan.id)
      setConfirmDelete(false)
      setPickerFor(null)
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
      setPickerFor(null)
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
        <header style={{ padding: '16px', background: '#fff' }}>
          <h1 style={{ fontSize: '26px', fontWeight: '800', margin: 0, color: '#1e293b' }}>Meal Plan</h1>
        </header>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
          <p>Loading meal plans...</p>
        </div>
        <BottomNavigation active="meal-plan" onNavigate={(s) => onNavigate(s as Screen)} />
      </div>
    )
  }

  return (
    <div className="screen" style={{ background: '#fff' }}>
      <header style={{ padding: '16px 16px 14px', background: '#fff' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
          <h1 style={{ fontSize: '26px', fontWeight: '800', margin: 0, color: '#1e293b' }}>Meal Plan</h1>
          <div style={{ display: 'flex', gap: '8px' }}>
            {currentPlan && (
              <button onClick={() => { setConfirmDelete(v => !v); setShowWeeks(false) }} aria-label="Delete week" style={{ width: '34px', height: '34px', borderRadius: '11px', background: '#fff', color: '#94a3b8', border: '1.5px solid #e9edf2', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
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
                onClick={() => { setSelectedDay(dayName); setPickerFor(null) }}
                style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '7px', background: 'none', border: 'none', cursor: 'pointer', padding: '2px 0' }}
              >
                <span style={{ fontSize: '12px', fontWeight: '600', color: active ? '#f26d5b' : '#94a3b8' }}>{short}</span>
                <span style={{ width: '34px', height: '34px', borderRadius: '17px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '15px', fontWeight: '700', background: active ? '#f26d5b' : 'transparent', color: active ? '#fff' : '#1e293b', boxShadow: active ? '0 4px 10px rgba(242,109,91,0.35)' : 'none', transition: 'all 0.2s ease' }}>
                  {num}
                </span>
              </button>
            )
          })}
        </div>
      </header>

      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px 16px', background: '#f7f8f5' }}>
        {showWeeks && (
          <div style={{ marginBottom: '18px', border: '1.5px solid #f7d2ca', borderRadius: '16px', overflow: 'hidden', background: '#fff' }}>
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
                    <div style={{ fontSize: '14px', fontWeight: '700', color: '#1e293b' }}>
                      {weekLabel(ws)}
                      {offset === 0 && <span style={{ fontSize: '11px', fontWeight: '700', color: '#f26d5b', marginLeft: '7px' }}>THIS WEEK</span>}
                    </div>
                    <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '2px' }}>
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
          <div style={{ marginBottom: '18px', background: '#fff', border: '1.5px solid #fecdca', borderRadius: '14px', padding: '14px' }}>
            <p style={{ fontSize: '14px', fontWeight: '700', color: '#1e293b', margin: '0 0 4px' }}>Delete this week's plan?</p>
            <p style={{ fontSize: '13px', color: '#64748b', margin: '0 0 12px', lineHeight: 1.5 }}>This removes the week and any meals planned in it. It can't be undone.</p>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={() => setConfirmDelete(false)} style={{ flex: 1, padding: '11px', borderRadius: '10px', background: '#f1f5f9', color: '#64748b', border: 'none', fontSize: '14px', fontWeight: '700', cursor: 'pointer' }}>
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
          const pickerOpen = pickerFor === m.key
          return (
            <div key={m.key} style={{ marginBottom: '22px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <h3 style={{ fontSize: '17px', fontWeight: '700', color: '#1e293b', margin: 0 }}>{m.label}</h3>
                {/* A slot holds one recipe. Empty (or picking): offer Add/Close.
                    Filled: no "add" -- offer Edit (swap the recipe) and Remove
                    (clear the slot) instead. */}
                {meals.length === 0 || pickerOpen ? (
                  <button
                    onClick={() => setPickerFor(pickerOpen ? null : m.key)}
                    style={{ background: 'none', border: 'none', color: '#f26d5b', fontSize: '14px', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '3px' }}
                  >
                    {pickerOpen ? <><X size={15} /> Close</> : <><Plus size={15} /> Add</>}
                  </button>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <button
                      onClick={() => setPickerFor(m.key)}
                      style={{ background: 'none', border: 'none', color: '#64748b', fontSize: '14px', fontWeight: '700', cursor: 'pointer' }}
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => meals[0]?.mealId && removeMeal(meals[0].mealId)}
                      style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: '14px', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '3px' }}
                    >
                      <Trash2 size={14} /> Remove
                    </button>
                  </div>
                )}
              </div>

              {/* Planned meal cards */}
              {meals.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: pickerOpen ? '10px' : 0 }}>
                  {meals.map((meal, i) => (
                    <div key={i} style={{ display: 'flex', gap: '12px', alignItems: 'center', background: '#fff', border: '1px solid #f1f5f9', borderRadius: '16px', padding: '10px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
                      <div style={{ width: '62px', height: '62px', borderRadius: '13px', background: m.tint, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '30px', flexShrink: 0 }}>
                        {meal.emoji || m.emoji}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '15px', fontWeight: '700', color: '#1e293b', marginBottom: '5px', lineHeight: 1.25 }}>{meal.name}</div>
                        <div style={{ fontSize: '13px', color: '#94a3b8' }}>
                          {(meal.prepTime || 0) + (meal.cookTime || 0)} Mins · {meal.servings || 1} Serving
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Inline recipe picker */}
              {pickerOpen && (
                <div style={{ border: '1.5px solid #f7d2ca', borderRadius: '16px', overflow: 'hidden', background: '#fff' }}>
                  <div style={{ padding: '9px 14px', fontSize: '11px', fontWeight: '800', color: '#f26d5b', letterSpacing: '0.05em', background: '#fdeeeb' }}>
                    CHOOSE A RECIPE
                  </div>
                  <div style={{ maxHeight: '256px', overflowY: 'auto' }}>
                    {recipes.length === 0 ? (
                      <p style={{ padding: '18px', textAlign: 'center', color: '#94a3b8', fontSize: '14px', margin: 0 }}>No recipes yet — add some first.</p>
                    ) : (
                      recipes.map((r, i) => (
                        <button
                          key={r.id}
                          onClick={() => addMealToPlan(r.id, m.key)}
                          style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 12px', background: 'none', border: 'none', borderTop: i === 0 ? 'none' : '1px solid #f6efed', cursor: 'pointer', textAlign: 'left' }}
                        >
                          <div style={{ width: '40px', height: '40px', borderRadius: '11px', background: m.tint, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', flexShrink: 0 }}>
                            {(r as any).emoji || m.emoji}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: '14px', fontWeight: '600', color: '#1e293b' }}>{r.name}</div>
                            <div style={{ fontSize: '12px', color: '#94a3b8' }}>
                              {r.cuisine} · {(r.prepTime || 0) + (r.cookTime || 0)} min
                            </div>
                          </div>
                          <Plus size={16} color="#f26d5b" />
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* Empty state (no meals, picker closed) */}
              {meals.length === 0 && !pickerOpen && (
                <button onClick={() => setPickerFor(m.key)} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '12px', padding: '14px', background: '#fff', border: '1.5px dashed #f0d8d2', borderRadius: '16px', cursor: 'pointer', textAlign: 'left' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: '#fdeeeb', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Plus size={18} color="#f26d5b" />
                  </div>
                  <span style={{ fontSize: '14px', fontWeight: '600', color: '#94a3b8' }}>Add a {m.label.toLowerCase()} recipe</span>
                </button>
              )}
            </div>
          )
        })}
      </div>

      <BottomNavigation active="meal-plan" onNavigate={(s) => onNavigate(s as Screen)} />
    </div>
  )
}
