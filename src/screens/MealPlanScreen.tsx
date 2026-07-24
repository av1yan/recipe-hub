import { useState, useEffect, useRef, type CSSProperties } from 'react'
import { Trash2, CalendarDays, Check, ChevronDown, ShoppingCart, Share2 } from 'lucide-react'
import type { Screen, MealPlan, Recipe } from '../types'
import { BottomNavigation } from '../components/BottomNavigation'
import { Toast, useToast } from '../components/Toast'
import { mealPlanAPI, recipeAPI, groceryAPI } from '../utils/api'
import { toGroceryLine } from '../utils/grocery'
import { getCalorieGoal, getMacroGoals } from '../utils/goals'
import { useProPlan } from '../utils/proPlan'
import { shareText } from '../utils/share'

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

/** Quiet square header button — subtle by default, accent when active. */
function iconBtnStyle(active = false): CSSProperties {
  return {
    width: '36px', height: '36px', borderRadius: '11px',
    background: active ? 'var(--color-primary)' : 'var(--color-subtle)',
    color: active ? '#fff' : 'var(--color-text-secondary)',
    border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
  }
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
  const [generating, setGenerating] = useState(false)
  const [isPro] = useProPlan()
  const { toast, show } = useToast()
  const goalCal = getCalorieGoal()
  const macroGoals = getMacroGoals()

  useEffect(() => {
    loadData()
  }, [])

  // showSpinner only on the first load. After a mutation we re-fetch silently
  // and let the cards update in place -- flipping the whole screen to the
  // loading state and back on every add/swap/remove is what read as a jitter.
  async function loadData(showSpinner = true) {
    try {
      if (showSpinner) setIsLoading(true)
      const [plansData, recipesData] = await Promise.all([mealPlanAPI.list(), recipeAPI.list()])
      setMealPlans(plansData)
      setRecipes(recipesData)
    } catch (error) {
      console.error('Failed to load meal plan data:', error)
    } finally {
      if (showSpinner) setIsLoading(false)
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
      await loadData(false)
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
      await loadData(false)
    } catch (error) {
      console.error('Failed to add meal to plan:', error)
    }
  }

  async function removeMeal(mealId: string) {
    try {
      await mealPlanAPI.removeMeal(mealId)
      await loadData(false)
    } catch (error) {
      console.error('Failed to remove meal from plan:', error)
    }
  }

  // Pro feature: pull every ingredient from the week's planned meals into the
  // grocery list. The list endpoint omits ingredients, so re-fetch the plan by
  // id (that one includes them); the backend already merges repeats by name+unit.
  async function addWeekToGroceries() {
    if (generating) return
    if (!isPro) { show('Auto grocery lists are a Pro feature — upgrade in Settings.', 'error'); return }
    if (!currentPlan) { show('Plan some meals this week first.', 'error'); return }
    setGenerating(true)
    try {
      const full: any = await mealPlanAPI.get(currentPlan.id)
      const ingredients: any[] = []
      DAY_NAMES.forEach(day => MEALS.forEach(m => {
        getMeals(full, day, m.key).forEach((meal: any) => {
          (meal.ingredients || []).forEach((ing: any) => ingredients.push(ing))
        })
      }))
      // Normalize recipe measures into shopping-friendly lines (buy the item, not
      // "3 tbsp"); the backend merges repeats by name+unit.
      const lines = ingredients.map(toGroceryLine).filter(l => l.name)
      if (lines.length === 0) { show('No ingredients in this week’s plan yet.', 'error'); return }

      const lists: any = await groceryAPI.list()
      let list = Array.isArray(lists) ? lists[0] : lists
      if (!list?.id) list = await groceryAPI.create('Groceries')
      await Promise.all(lines.map(l => groceryAPI.addItem(list.id, l)))

      const unique = new Set(lines.map(l => `${l.name.toLowerCase()}|${l.unit.toLowerCase()}`)).size
      show(`Added ${unique} ingredient${unique === 1 ? '' : 's'} to your grocery list`)
    } catch {
      show('Could not build your grocery list', 'error')
    } finally {
      setGenerating(false)
    }
  }

  // Pro feature: share the week's plan as text — native share sheet on a phone,
  // clipboard on desktop.
  async function sharePlan() {
    if (!isPro) { show('Sharing your plan is a Pro feature — upgrade in Settings.', 'error'); return }
    if (!currentPlan) { show('Plan some meals this week first.', 'error'); return }
    const lines: string[] = [`🗓 Meal plan · ${weekLabel(viewWeek)}`, '']
    DAY_NAMES.forEach(day => {
      const dayLines = MEALS.flatMap(m =>
        getMeals(currentPlan, day, m.key).map((meal: any) => `  ${m.emoji} ${m.label}: ${meal.name}`)
      )
      if (dayLines.length) lines.push(day, ...dayLines, '')
    })
    const res = await shareText('My meal plan', lines.join('\n').trim())
    if (res === 'failed') show('Could not share the plan', 'error')
    else show(res === 'copied' ? 'Plan copied to clipboard' : 'Plan shared')
  }

  function getDayNumber(index: number, weekStart: Date) {
    const date = new Date(weekStart)
    date.setDate(date.getDate() + index)
    return date.getDate()
  }

  const currentPlan = mealPlans.find(p => sameWeek(p.weekStart, viewWeek))
  const weekStart = viewWeek
  const hasMeals = !!currentPlan && DAY_NAMES.some(d => MEALS.some(m => getMeals(currentPlan, d, m.key).length > 0))

  // Month(s) the shown week covers — a week can straddle two (e.g. Jul → Aug).
  const monthLabel = (() => {
    const end = new Date(weekStart)
    end.setDate(end.getDate() + 6)
    const mo = (d: Date) => d.toLocaleDateString('en-US', { month: 'long' })
    return mo(weekStart) === mo(end) ? mo(weekStart) : `${mo(weekStart)} – ${mo(end)}`
  })()

  // Nutrition for the selected day: sum one serving of each planned recipe.
  // The list plan omits the nutrition relation, so read it off the recipes
  // list (which includes it) matched by recipe id.
  const dayHasMeals = !!currentPlan && MEALS.some(m => getMeals(currentPlan, selectedDay, m.key).length > 0)
  const dayNutrition = (() => {
    let cal = 0, protein = 0, carbs = 0, fat = 0
    if (currentPlan) MEALS.forEach(m => getMeals(currentPlan, selectedDay, m.key).forEach((meal: any) => {
      const r: any = recipes.find(x => x.id === meal.id) || meal
      const n = r?.nutrition
      if (n) { cal += n.calories || 0; protein += n.protein || 0; carbs += n.carbs || 0; fat += n.fat || 0 }
      else cal += r?.calories || 0
    }))
    return { cal, protein, carbs, fat }
  })()

  // Flat list of the selected day's slots, so the meals read as one ruled list.
  const dayRows: { m: typeof MEALS[number]; meal: any | null }[] = []
  MEALS.forEach(m => {
    const meals = getMeals(currentPlan, selectedDay, m.key)
    if (meals.length > 0) meals.forEach(meal => dayRows.push({ m, meal }))
    else dayRows.push({ m, meal: null })
  })

  const header = (title: string) => (
    <header style={{ padding: '20px 24px 14px', background: 'var(--color-bg)', flexShrink: 0 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
        <h1 style={{ fontSize: '27px', fontWeight: '700', letterSpacing: '-0.02em', margin: 0, color: 'var(--color-text)' }}>{title}</h1>
        <div style={{ display: 'flex', gap: '8px' }}>
          {hasMeals && isPro && (
            <button onClick={sharePlan} aria-label="Share this week's plan" style={iconBtnStyle()}>
              <Share2 size={15} />
            </button>
          )}
          {currentPlan && (
            <button onClick={() => { setConfirmDelete(v => !v); setShowWeeks(false) }} aria-label="Delete week" style={iconBtnStyle()}>
              <Trash2 size={16} />
            </button>
          )}
          <button onClick={() => { setShowWeeks(v => !v); setConfirmDelete(false) }} aria-label="Choose week" style={iconBtnStyle(showWeeks)}>
            <CalendarDays size={17} />
          </button>
        </div>
      </div>

      {/* Month for the week on show, above the day/date strip. */}
      <div style={{ fontSize: '12px', fontWeight: '700', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--color-text-muted)', marginBottom: '12px' }}>
        {monthLabel}
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
              <span style={{ fontSize: '12px', fontWeight: '600', color: active ? 'var(--color-primary)' : 'var(--color-text-muted)' }}>{short}</span>
              <span style={{ width: '34px', height: '34px', borderRadius: '17px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '15px', fontWeight: '700', background: active ? 'var(--color-primary)' : 'transparent', color: active ? '#fff' : 'var(--color-text)', transition: 'background 0.2s ease' }}>
                {num}
              </span>
            </button>
          )
        })}
      </div>
    </header>
  )

  if (isLoading) {
    return (
      <div className="screen" style={{ background: 'var(--color-bg)' }}>
        {header('Meal Plan')}
        <div style={{ flex: 1, overflowY: 'auto', padding: '22px 24px 0' }}>
          <Skel w={90} h={11} r={6} style={{ marginBottom: '4px' }} />
          <SkelMealRow />
          <SkelMealRow divider />
          <SkelMealRow divider />
          <SkelMealRow divider />
        </div>
        <BottomNavigation active="meal-plan" onNavigate={(s) => onNavigate(s as Screen)} />
      </div>
    )
  }

  return (
    <div className="screen" style={{ background: 'var(--color-bg)' }}>
      {header('Meal Plan')}

      <div style={{ flex: 1, overflowY: 'auto', padding: '18px 24px 24px' }}>
        {showWeeks && (
          <div style={{ marginBottom: '20px', border: '1px solid var(--color-border)', borderRadius: '16px', overflow: 'hidden', background: 'var(--color-card)' }}>
            <div style={{ padding: '11px 16px', fontSize: '11px', fontWeight: '700', color: 'var(--color-text-muted)', letterSpacing: '0.08em' }}>
              JUMP TO A WEEK
            </div>
            {(isPro ? [-1, 0, 1, 2, 3] : [0]).map((offset, i) => {
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
                  style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 16px', background: 'none', border: 'none', borderTop: i === 0 ? 'none' : '1px solid var(--color-subtle)', cursor: 'pointer', textAlign: 'left' }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--color-text)' }}>
                      {weekLabel(ws)}
                      {offset === 0 && <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--color-primary)', marginLeft: '7px' }}>THIS WEEK</span>}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                      {plan ? `${planned} meal${planned === 1 ? '' : 's'} planned` : 'Nothing planned'}
                    </div>
                  </div>
                  {isCurrent && <Check size={16} color="var(--color-primary)" />}
                </button>
              )
            })}
          </div>
        )}

        {confirmDelete && (
          <div style={{ marginBottom: '20px', border: '1px solid var(--color-border)', borderRadius: '16px', padding: '16px' }}>
            <p style={{ fontSize: '14px', fontWeight: '700', color: 'var(--color-text)', margin: '0 0 4px' }}>Delete this week's plan?</p>
            <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', margin: '0 0 14px', lineHeight: 1.5 }}>This removes the week and any meals planned in it. It can't be undone.</p>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={() => setConfirmDelete(false)} style={{ flex: 1, padding: '11px', borderRadius: '11px', background: 'var(--color-subtle)', color: 'var(--color-text-secondary)', border: 'none', fontSize: '14px', fontWeight: '700', cursor: 'pointer', fontFamily: 'inherit' }}>
                Cancel
              </button>
              <button onClick={deleteWeek} disabled={deleting} style={{ flex: 1, padding: '11px', borderRadius: '11px', background: '#dc2626', color: '#fff', border: 'none', fontSize: '14px', fontWeight: '700', cursor: 'pointer', opacity: deleting ? 0.6 : 1, fontFamily: 'inherit' }}>
                {deleting ? 'Deleting…' : 'Delete week'}
              </button>
            </div>
          </div>
        )}

        {/* Pro only: build the week's grocery list from the plan in one tap. */}
        {hasMeals && isPro && (
          <button
            onClick={addWeekToGroceries}
            disabled={generating}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              padding: '13px', marginBottom: '22px', borderRadius: '12px',
              background: 'var(--color-primary-bg)', color: 'var(--color-primary-dark)', border: '1px solid var(--color-primary-border)',
              fontSize: '14px', fontWeight: '700', cursor: generating ? 'default' : 'pointer',
              fontFamily: 'inherit', opacity: generating ? 0.7 : 1,
            }}
          >
            <ShoppingCart size={16} /> {generating ? 'Adding to groceries…' : 'Add this week to Groceries'}
          </button>
        )}

        {/* Pro only: the selected day's nutrition, summed from the planned recipes. */}
        {dayHasMeals && isPro && (
          <div style={{ background: 'var(--color-subtle)', borderRadius: '16px', padding: '16px', marginBottom: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <span style={{ fontSize: '11px', fontWeight: '700', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--color-text-muted)' }}>Nutrition</span>
              <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>{selectedDay}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ flexShrink: 0, width: '116px' }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                  <span style={{ fontSize: '26px', fontWeight: '800', color: 'var(--color-text)', lineHeight: 1 }}>{dayNutrition.cal.toLocaleString()}</span>
                  <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>cal</span>
                </div>
                <div style={{ height: '6px', borderRadius: '3px', background: 'var(--color-border)', overflow: 'hidden', marginTop: '9px' }}>
                  <div style={{ height: '100%', width: `${Math.min(100, Math.round((dayNutrition.cal / goalCal) * 100))}%`, background: 'var(--color-primary)', borderRadius: '3px', transition: 'width 0.3s ease' }} />
                </div>
                <span style={{ fontSize: '10.5px', color: 'var(--color-text-muted)', marginTop: '4px', display: 'block' }}>of {goalCal.toLocaleString()} cal goal</span>
              </div>
              <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <MacroStat color="#a78bfa" label="Protein" grams={dayNutrition.protein} goal={macroGoals.protein} />
                <MacroStat color="#fbbf24" label="Carbs" grams={dayNutrition.carbs} goal={macroGoals.carbs} />
                <MacroStat color="var(--color-primary)" label="Fat" grams={dayNutrition.fat} goal={macroGoals.fat} />
              </div>
            </div>
          </div>
        )}

        {/* The day's meals as one ruled list — each row is its own recipe
            picker (tap to fill or swap). */}
        <div style={{ paddingBottom: '10px', borderBottom: '1px solid var(--color-subtle)', marginBottom: '2px' }}>
          <h2 style={{ fontSize: '12px', fontWeight: '700', letterSpacing: '0.09em', textTransform: 'uppercase', color: 'var(--color-text-muted)', margin: 0 }}>{selectedDay}</h2>
        </div>
        {dayRows.map(({ m, meal }, i) => {
          const filled = !!meal
          const servings = meal?.servings || 1
          const canPick = recipes.length > 0
          return (
            <RecipePicker key={`${m.key}-${i}`} recipes={recipes} meal={m} current={meal?.recipeId} onPick={(id) => addMealToPlan(id, m.key)}>
              {(open) => (
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '15px 0', borderTop: i > 0 ? '1px solid var(--color-subtle)' : 'none', cursor: canPick ? 'pointer' : 'default' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: '11px', color: 'var(--color-text-muted)', fontWeight: '600', margin: 0, letterSpacing: '0.05em' }}>{m.label.toUpperCase()}</p>
                    {filled ? (
                      <>
                        <h4 style={{ fontSize: '15.5px', fontWeight: '600', color: 'var(--color-text)', margin: '3px 0 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{meal.name}</h4>
                        <p style={{ fontSize: '12.5px', color: 'var(--color-text-muted)', margin: '3px 0 0' }}>
                          {(meal.prepTime || 0) + (meal.cookTime || 0)} min · {servings} serving{servings === 1 ? '' : 's'}
                        </p>
                      </>
                    ) : (
                      <p style={{ fontSize: '15px', color: 'var(--color-text-muted)', margin: '3px 0 0' }}>
                        {recipes.length === 0 ? 'No recipes yet — add some first' : `Add a ${m.label.toLowerCase()} recipe`}
                      </p>
                    )}
                  </div>
                  {filled && (
                    <button
                      onClick={e => { e.stopPropagation(); meal.mealId && removeMeal(meal.mealId) }}
                      aria-label={`Remove ${meal.name}`}
                      style={{ flexShrink: 0, width: '28px', height: '28px', borderRadius: '14px', background: 'none', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                    >
                      <Trash2 size={15} color="var(--color-text-muted)" />
                    </button>
                  )}
                  {canPick && <ChevronDown size={17} color="var(--color-text-muted)" style={{ flexShrink: 0, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s ease' }} />}
                </div>
              )}
            </RecipePicker>
          )
        })}
      </div>

      {toast && <Toast message={toast.message} tone={toast.tone} bottom="84px" />}
      <BottomNavigation active="meal-plan" onNavigate={(s) => onNavigate(s as Screen)} />
    </div>
  )
}

/** One macro line in the nutrition summary: coloured dot, label, grams. */
function MacroStat({ color, label, grams, goal }: { color: string; label: string; grams: number; goal: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: color, flexShrink: 0 }} />
      <span style={{ flex: 1, fontSize: '13px', color: 'var(--color-text-secondary)' }}>{label}</span>
      <span style={{ fontSize: '13px', fontWeight: '700', color: 'var(--color-text)' }}>
        {grams}<span style={{ color: 'var(--color-text-muted)', fontWeight: '600' }}> / {goal}g</span>
      </span>
    </div>
  )
}

/**
 * A clean recipe dropdown. `children(open)` renders the trigger (a meal row);
 * clicking it opens a ruled menu of recipe rows -- name, cuisine + time --
 * instead of the browser's native <select>. Click-outside closes it; the
 * current recipe (for a swap) is ticked.
 */
function RecipePicker({ recipes, meal, current, onPick, children }: {
  recipes: Recipe[]
  meal: typeof MEALS[number]
  current?: string
  onPick: (recipeId: string) => void
  children: (open: boolean) => React.ReactNode
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const disabled = recipes.length === 0

  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <div onClick={() => { if (!disabled) setOpen(o => !o) }}>
        {children(open)}
      </div>
      {open && !disabled && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 2px)', left: 0, right: 0, zIndex: 20,
          background: 'var(--color-card)', border: '1px solid var(--color-border)',
          borderRadius: '14px', boxShadow: '0 14px 34px rgba(15,23,42,0.2)',
          overflow: 'hidden', maxHeight: '272px', overflowY: 'auto',
        }}>
          {recipes.map((r, i) => {
            const selected = current === r.id
            return (
              <button
                key={r.id}
                onClick={() => { onPick(r.id); setOpen(false) }}
                onMouseEnter={(e) => { if (!selected) e.currentTarget.style.background = 'var(--color-subtle)' }}
                onMouseLeave={(e) => { if (!selected) e.currentTarget.style.background = 'transparent' }}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: '12px',
                  padding: '12px 14px', background: selected ? 'var(--color-subtle)' : 'transparent',
                  border: 'none', borderTop: i === 0 ? 'none' : '1px solid var(--color-subtle)',
                  cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit',
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--color-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.name}</div>
                  <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '2px' }}>{[r.cuisine, `${(r.prepTime || 0) + (r.cookTime || 0)} min`].filter(Boolean).join(' · ')}</div>
                </div>
                {selected && <Check size={16} color="var(--color-primary)" style={{ flexShrink: 0 }} />}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

/* --- First-load skeleton ---------------------------------------------------- */

function Skel({ w = '100%', h, r = 7, style }: { w?: number | string; h: number; r?: number; style?: CSSProperties }) {
  return <div className="rh-skel" style={{ width: w, height: h, borderRadius: r, ...style }} />
}

function SkelMealRow({ divider = false }: { divider?: boolean }) {
  return (
    <div style={{ padding: '15px 0', borderTop: divider ? '1px solid var(--color-subtle)' : 'none' }}>
      <Skel w={64} h={10} r={5} />
      <Skel w="55%" h={14} style={{ marginTop: '9px' }} />
      <Skel w="30%" h={11} style={{ marginTop: '8px' }} />
    </div>
  )
}
