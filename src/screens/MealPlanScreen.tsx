import { useState, useEffect, useRef, type CSSProperties } from 'react'
import { Trash2, Check, ChevronDown, ChevronLeft, ChevronRight, ShoppingCart, Share2, Clock, Info, Plus } from 'lucide-react'
import type { Screen, MealPlan, Recipe } from '../types'
import { Toast, useToast } from '../components/Toast'
import { FrameOverlay } from '../components/FrameOverlay'
import { mealPlanAPI, recipeAPI, groceryAPI } from '../utils/api'
import { toGroceryLine } from '../utils/grocery'
import { getCalorieGoal, getMacroGoals } from '../utils/goals'
import { shareText } from '../utils/share'
import { slotTypeOf, SLOT_LABELS } from '../utils/mealType'
import { tapHaptic } from '../utils/haptics'
import { StatsGrid } from '../components/DesignCards'

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
  { key: 'drink', label: 'Drink', tint: '#e0f2fe', emoji: '🥤' },
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

// Recipes picked recently, most-recent-first, so the picker can float them to
// the top (the same handful of recipes gets planned across many days).
const RECENT_KEY = 'rh-recent-recipes'
function loadRecent(): string[] {
  try {
    const v = JSON.parse(localStorage.getItem(RECENT_KEY) || '[]')
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []
  } catch { return [] }
}
function pushRecent(id: string): string[] {
  const next = [id, ...loadRecent().filter(x => x !== id)].slice(0, 8)
  try { localStorage.setItem(RECENT_KEY, JSON.stringify(next)) } catch { /* private mode */ }
  return next
}

// How the backend folds grocery lines together: same name (case/space-insensitive)
// and same unit. Mirror it here to preview which lines are new vs. a top-up, and
// to find the merged row again when undoing.
function groceryKey(name: string, unit: string): string {
  return `${(name || '').trim().toLowerCase()}|${(unit || '').trim().toLowerCase()}`
}

// A recipe's per-serving calories and protein, from its nutrition or the bare
// calorie field. Null when the recipe has no nutrition data at all.
function nutritionOf(r: any): { cal: number; protein: number } | null {
  const n = r?.nutrition
  if (n && typeof n.calories === 'number') return { cal: n.calories, protein: n.protein || 0 }
  if (typeof r?.calories === 'number') return { cal: r.calories, protein: 0 }
  return null
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
    width: '38px', height: '38px', borderRadius: '13px',
    boxShadow: active ? 'var(--shadow-pill)' : 'var(--shadow-sm)',
    background: active ? 'var(--color-primary)' : 'var(--color-card)',
    color: active ? '#fff' : 'var(--color-text-secondary)',
    border: `1px solid ${active ? 'var(--color-primary)' : 'var(--color-border)'}`, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
  }
}

/** Quiet prev/next chevron flanking the week strip. */
const weekNav: CSSProperties = {
  background: 'none', border: 'none', cursor: 'pointer', padding: '4px', flexShrink: 0,
  display: 'flex', alignItems: 'center', color: 'var(--color-text-muted)',
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
  // Expanded month grid + which month it's showing.
  const [expanded, setExpanded] = useState(false)
  const [monthCursor, setMonthCursor] = useState<Date>(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1))
  const [generating, setGenerating] = useState(false)
  const { toast, show } = useToast()
  const goalCal = getCalorieGoal()
  const macroGoals = getMacroGoals()

  // Recently-picked recipes (floated to the top of the picker).
  const [recentIds, setRecentIds] = useState<string[]>(() => loadRecent())

  // Long-press on a filled meal opens a move/copy sheet targeting another day.
  const [moveState, setMoveState] = useState<{ meal: any; mealType: string; fromDay: string } | null>(null)
  const [moving, setMoving] = useState(false)

  // "Add this week to Groceries" now previews the change before committing, and
  // leaves an undo behind so a merge that topped up existing lines can be rolled
  // back. `preview` holds what the confirm card shows + everything commit needs.
  const [preview, setPreview] = useState<{
    newCount: number; updatedCount: number; lines: any[]; listId: string | null;
    beforeById: Map<string, number>
  } | null>(null)
  const [previewing, setPreviewing] = useState(false)
  const [undoLabel, setUndoLabel] = useState<string | null>(null)
  // Undo restores by item id, not by name+unit — a list can hold two rows that
  // share a name+unit, and a key-based undo would restore the wrong one.
  const undoData = useRef<{ beforeById: Map<string, number>; listId: string } | null>(null)
  const undoTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => () => { if (undoTimer.current) clearTimeout(undoTimer.current) }, [])

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

  // Swipe tracking for the week strip. `swiped` guards the day tap so a swipe
  // doesn't also register as selecting whatever day it started on.
  const swipeX = useRef<number | null>(null)
  const swiped = useRef(false)

  // current week. Selecting a day within the shown week is always free.
  function changeWeek(delta: number) {
    const ws = mondayOf(viewWeek)
    ws.setDate(ws.getDate() + delta * 7)
    setViewWeek(ws)
    setConfirmDelete(false)
  }

  // Jump to a date from the expanded month grid.
  function goToDate(date: Date) {
    setViewWeek(mondayOf(date))
    setSelectedDay(DAY_NAMES[(date.getDay() + 6) % 7])
    setExpanded(false)
    setConfirmDelete(false)
  }

  function toggleExpanded() {
    setExpanded(v => {
      if (!v) setMonthCursor(new Date(viewWeek.getFullYear(), viewWeek.getMonth(), 1))
      return !v
    })
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
      // Create the week's plan lazily, on the first meal added to it. Re-read the
      // plans first: a plan made on another screen or device may already exist
      // for this week, and a second one would split the week's meals.
      let planId = currentPlan?.id
      if (!planId) {
        const latest: MealPlan[] = await mealPlanAPI.list()
        setMealPlans(latest)
        const existing = latest.find(p => sameWeek(p.weekStart, viewWeek))
        if (existing) {
          planId = existing.id
        } else {
          const plan = await mealPlanAPI.create(viewWeek)
          setMealPlans(prev => [...prev, plan])
          planId = plan.id
        }
      }
      await mealPlanAPI.addMeal(planId, recipeId, selectedDay, mealType)
      setRecentIds(pushRecent(recipeId))
      await loadData(false)
    } catch (error) {
      console.error('Failed to add meal to plan:', error)
    }
  }

  // Move (or copy) a planned meal to another day this week. There's no move
  // endpoint, so compose it: add on the target day, then drop the original
  // unless we're copying. Same week => same plan, which already exists (it has
  // this meal in it).
  async function doMoveCopy(targetDay: string, copy: boolean) {
    if (!moveState || moving) return
    const { meal, mealType } = moveState
    const recipeId = meal.recipeId ?? meal.id
    const planId = currentPlan?.id
    if (!planId || !recipeId) { setMoveState(null); return }
    setMoving(true)
    try {
      await mealPlanAPI.addMeal(planId, recipeId, targetDay, mealType)
      if (!copy && meal.mealId) await mealPlanAPI.removeMeal(meal.mealId)
      setRecentIds(pushRecent(recipeId))
      await loadData(false)
      show(`${copy ? 'Copied' : 'Moved'} to ${targetDay}`)
    } catch (error) {
      console.error('Failed to move meal:', error)
      show('Could not update the plan', 'error')
    } finally {
      setMoving(false)
      setMoveState(null)
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

  // Pull every ingredient from the week's planned meals into the
  // grocery list. The list endpoint omits ingredients, so re-fetch the plan by
  // id (that one includes them). Rather than commit straight away — the backend
  // silently tops up existing lines' quantities — work out the change first and
  // surface it for confirmation.
  async function openGroceryPreview() {
    if (previewing || generating) return
    if (!currentPlan) { show('Plan some meals this week first.', 'error'); return }
    setPreviewing(true)
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
      const list = Array.isArray(lists) ? lists[0] : lists
      const items: any[] = list?.items || []
      // For undo: every current item's quantity, keyed by id (id-based so it's
      // safe against duplicate name+unit rows). For the preview counts: which
      // name+unit keys already exist unchecked — those a merge would top up
      // (a checked "already bought" line starts a fresh row instead).
      const beforeById = new Map<string, number>()
      items.forEach(i => beforeById.set(i.id, i.quantity))
      const beforeKeys = new Set(items.filter(i => !i.checked).map(i => groceryKey(i.name, i.unit)))
      const keys = [...new Set(lines.map(l => groceryKey(l.name, l.unit)))]
      let newCount = 0, updatedCount = 0
      keys.forEach(k => { beforeKeys.has(k) ? updatedCount++ : newCount++ })
      setPreview({ newCount, updatedCount, lines, listId: list?.id ?? null, beforeById })
    } catch {
      show('Could not check your grocery list', 'error')
    } finally {
      setPreviewing(false)
    }
  }

  async function commitGroceryAdd() {
    if (!preview || generating) return
    setGenerating(true)
    try {
      let listId = preview.listId
      if (!listId) { const created: any = await groceryAPI.create('Groceries'); listId = created.id }
      await Promise.all(preview.lines.map(l => groceryAPI.addItem(listId!, l)))
      undoData.current = { beforeById: preview.beforeById, listId: listId! }
      const total = preview.newCount + preview.updatedCount
      setPreview(null)
      setUndoLabel(`Added ${total} item${total === 1 ? '' : 's'} to groceries`)
      if (undoTimer.current) clearTimeout(undoTimer.current)
      undoTimer.current = setTimeout(() => { setUndoLabel(null); undoData.current = null }, 6000)
    } catch {
      show('Could not build your grocery list', 'error')
    } finally {
      setGenerating(false)
    }
  }

  // Undo the last add: newly-created lines get deleted, topped-up lines get their
  // original quantity set back (the merge bumped them by a delta we don't track,
  // so restore the snapshot outright).
  async function undoGroceryAdd() {
    const d = undoData.current
    if (!d) return
    if (undoTimer.current) clearTimeout(undoTimer.current)
    setUndoLabel(null)
    undoData.current = null
    try {
      const full: any = await groceryAPI.get(d.listId)
      const items: any[] = full?.items || []
      // Restore each pre-existing item to its snapshot quantity; delete anything
      // the commit newly created (its id won't be in the snapshot).
      for (const it of items) {
        if (d.beforeById.has(it.id)) {
          const q = d.beforeById.get(it.id)!
          if (it.quantity !== q) await groceryAPI.setItemQuantity(it.id, q)
        } else {
          await groceryAPI.removeItem(it.id)
        }
      }
      show('Reverted the grocery changes')
    } catch {
      show('Could not undo', 'error')
    }
  }

  // Share the week's plan as text — native share sheet on a phone,
  // clipboard on desktop.
  async function sharePlan() {
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

  // Full month grid shown when the calendar is expanded. Page months with the
  // chevrons; tap a date to jump to it.
  function renderMonthGrid() {
    const y = monthCursor.getFullYear(), m = monthCursor.getMonth()
    const lead = (new Date(y, m, 1).getDay() + 6) % 7   // Monday-based leading blanks
    const days = new Date(y, m + 1, 0).getDate()
    const cells: (number | null)[] = [...Array(lead).fill(null), ...Array.from({ length: days }, (_, i) => i + 1)]
    const today = new Date(); today.setHours(0, 0, 0, 0)
    const thisWeek = mondayOf(new Date())
    const selDate = new Date(viewWeek); selDate.setDate(selDate.getDate() + DAY_NAMES.indexOf(selectedDay))
    const sameDay = (a: Date, b: Date) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
    const navBtn: CSSProperties = { width: '30px', height: '30px', borderRadius: '9px', background: 'var(--color-subtle)', color: 'var(--color-text-secondary)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }
    return (
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
          <button onClick={() => setMonthCursor(new Date(y, m - 1, 1))} aria-label="Previous month" style={navBtn}><ChevronLeft size={17} /></button>
          <span style={{ fontSize: '15px', fontWeight: '700', color: 'var(--color-text)' }}>{monthCursor.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</span>
          <button onClick={() => setMonthCursor(new Date(y, m + 1, 1))} aria-label="Next month" style={navBtn}><ChevronRight size={17} /></button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', marginBottom: '4px' }}>
          {DAY_SHORT.map(s => (
            <span key={s} style={{ textAlign: 'center', fontSize: '11px', fontWeight: '700', color: 'var(--color-text-muted)' }}>{s[0]}</span>
          ))}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '3px' }}>
          {cells.map((d, i) => {
            if (d === null) return <span key={i} />
            const date = new Date(y, m, d)
            const isSel = sameDay(date, selDate)
            const isToday = sameDay(date, today)
            return (
              <button
                key={i}
                onClick={() => goToDate(date)}
                style={{
                  height: '38px', borderRadius: '10px', fontSize: '14px', fontWeight: '700',
                  border: isToday && !isSel ? '1.5px solid var(--color-primary)' : '1.5px solid transparent',
                  background: isSel ? 'var(--color-primary)' : 'transparent',
                  color: isSel ? '#fff' : 'var(--color-text)',
                  cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                {d}
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  const header = (title: string) => (
    <header style={{ padding: '20px 24px 14px', background: 'var(--color-bg)', flexShrink: 0 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
        <h1 style={{ fontSize: '27px', fontWeight: '700', letterSpacing: '-0.02em', margin: 0, color: 'var(--color-text)' }}>{title}</h1>
        <div style={{ display: 'flex', gap: '8px' }}>
          {hasMeals && (
            <button onClick={sharePlan} aria-label="Share this week's plan" style={iconBtnStyle()}>
              <Share2 size={15} />
            </button>
          )}
          {currentPlan && (
            <button onClick={() => { setConfirmDelete(v => !v); setExpanded(false) }} aria-label="Delete week" style={iconBtnStyle()}>
              <Trash2 size={16} />
            </button>
          )}
        </div>
      </div>

      {/* Week / Month segmented control, with the month label beside it. */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', marginBottom: '12px' }}>
        <span style={{ fontSize: '12px', fontWeight: '700', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--color-text-muted)' }}>{monthLabel}</span>
        <div role="tablist" style={{ display: 'flex', gap: '10px' }}>
          {(['Week', 'Month'] as const).map(mode => {
            const selected = mode === 'Month' ? expanded : !expanded
            return (
              <button
                key={mode}
                role="tab"
                aria-selected={selected}
                onClick={() => { if (selected) return; toggleExpanded() }}
                style={{
                  padding: '8px 18px', borderRadius: '999px', cursor: 'pointer', fontFamily: 'inherit',
                  fontSize: '13px', fontWeight: '700', minWidth: '84px',
                  border: `1px solid ${selected ? 'var(--color-primary-border)' : 'var(--color-border)'}`,
                  background: selected ? 'var(--color-primary-bg)' : 'var(--color-card)',
                  color: selected ? 'var(--color-primary)' : 'var(--color-text-muted)',
                  boxShadow: selected ? 'var(--shadow-pill)' : 'var(--shadow-hero)',
                  transition: 'background 0.2s ease, color 0.2s ease, box-shadow 0.2s ease',
                }}
              >
                {mode}
              </button>
            )
          })}
        </div>
      </div>

      {expanded ? renderMonthGrid() : (
        // Week strip — chevrons or swipe to move between weeks.
        <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
          <button onClick={() => changeWeek(-1)} aria-label="Previous week" style={weekNav}><ChevronLeft size={18} /></button>
          <div
            onPointerDown={e => { swipeX.current = e.clientX; swiped.current = false }}
            onPointerUp={e => {
              if (swipeX.current === null) return
              const dx = e.clientX - swipeX.current
              swipeX.current = null
              if (Math.abs(dx) > 40) { swiped.current = true; changeWeek(dx < 0 ? 1 : -1) }
            }}
            style={{ flex: 1, position: 'relative', touchAction: 'pan-y' }}
          >
            {/* One accent pill that flows to the selected day (sits behind the
                numbers). Column centres are (i + 0.5)/7 of the width. */}
            <div
              className="rh-day-pill"
              style={{ position: 'absolute', top: '24px', left: `calc(${((DAY_NAMES.indexOf(selectedDay) + 0.5) * 100) / 7}% - 17px)`, width: '34px', height: '34px', borderRadius: '17px', background: 'var(--color-primary)', boxShadow: 'var(--shadow-pill)', pointerEvents: 'none' }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              {DAY_SHORT.map((short, idx) => {
                const dayName = DAY_NAMES[idx]
                const num = getDayNumber(idx, weekStart)
                const active = selectedDay === dayName
                return (
                  <button
                    key={dayName}
                    onClick={() => { if (swiped.current) { swiped.current = false; return } setSelectedDay(dayName) }}
                    style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '7px', background: 'none', border: 'none', cursor: 'pointer', padding: '2px 0' }}
                  >
                    <span style={{ fontSize: '12px', fontWeight: '600', color: active ? 'var(--color-primary)' : 'var(--color-text-muted)', transition: 'color 0.2s ease' }}>{short}</span>
                    <span className={active ? 'rh-day-num--active' : undefined} style={{ width: '34px', height: '34px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '15px', fontWeight: '700', color: active ? '#fff' : 'var(--color-text)', transition: 'color 0.2s ease', position: 'relative' }}>
                      {num}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
          <button onClick={() => changeWeek(1)} aria-label="Next week" style={weekNav}><ChevronRight size={18} /></button>
        </div>
      )}
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
      </div>
    )
  }

  return (
    <div className="screen" style={{ background: 'var(--color-bg)' }}>
      {header('Meal Plan')}

      <div style={{ flex: 1, overflowY: 'auto', padding: '18px 24px 24px' }}>
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

        {/* Build the week's grocery list from the plan. Tapping it
            previews the change (new vs. topped-up) before anything is written. */}
        {hasMeals && (preview ? (
          <div style={{ marginBottom: '22px', borderRadius: '14px', border: '1px solid var(--color-primary-border)', background: 'var(--color-primary-bg)', padding: '15px 16px' }}>
            <p style={{ fontSize: '13.5px', fontWeight: '700', color: 'var(--color-primary-dark)', margin: '0 0 3px' }}>Add this week to Groceries</p>
            <p style={{ fontSize: '12.5px', color: 'var(--color-primary-dark)', opacity: 0.85, margin: '0 0 13px', lineHeight: 1.5 }}>
              {preview.newCount === 0 && preview.updatedCount === 0
                ? 'Nothing new to add.'
                : [
                    preview.newCount > 0 ? `${preview.newCount} new item${preview.newCount === 1 ? '' : 's'}` : '',
                    preview.updatedCount > 0 ? `${preview.updatedCount} topped up` : '',
                  ].filter(Boolean).join(' · ')}
            </p>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={() => setPreview(null)} style={{ flex: 1, padding: '11px', borderRadius: '11px', background: 'var(--color-subtle)', color: 'var(--color-text-secondary)', border: 'none', fontSize: '14px', fontWeight: '700', cursor: 'pointer', fontFamily: 'inherit' }}>
                Cancel
              </button>
              <button
                onClick={commitGroceryAdd}
                disabled={generating || (preview.newCount === 0 && preview.updatedCount === 0)}
                style={{ flex: 1.4, padding: '11px', borderRadius: '11px', background: 'var(--color-primary)', boxShadow: 'var(--shadow-pill)', color: '#fff', border: 'none', fontSize: '14px', fontWeight: '700', cursor: 'pointer', opacity: generating || (preview.newCount === 0 && preview.updatedCount === 0) ? 0.6 : 1, fontFamily: 'inherit' }}
              >
                {generating ? 'Adding…' : `Add ${preview.newCount + preview.updatedCount} item${preview.newCount + preview.updatedCount === 1 ? '' : 's'}`}
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={openGroceryPreview}
            disabled={previewing}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px',
              padding: '10px 16px', marginBottom: '16px', borderRadius: '18px',
              background: 'var(--color-card)', color: 'var(--color-text)', border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-md)',
              fontSize: '14px', fontWeight: '700', cursor: previewing ? 'default' : 'pointer',
              fontFamily: 'inherit', opacity: previewing ? 0.7 : 1,
            }}
          >
            <span style={{ width: '30px', height: '30px', borderRadius: '10px', background: 'var(--color-primary)', boxShadow: 'var(--shadow-pill)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <ShoppingCart size={16} color="#fff" />
            </span>
            {previewing ? 'Checking…' : 'Add this week to Groceries'}
          </button>
        ))}

        {/* The selected day's nutrition, summed from the planned recipes.
            Wrapped so it grows in smoothly — adding the day's first meal used to
            snap it in and shove the rows below out from under a finger. */}
        {(
          <Reveal>
          <div style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: '20px', padding: '14px 16px', marginBottom: '20px', boxShadow: 'var(--shadow-md)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
              <span style={{ fontSize: '11px', fontWeight: '700', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--color-text-muted)' }}>Nutrition goals · {selectedDay}</span>
              <button onClick={() => onNavigate('settings')} style={{ background: 'var(--color-primary-bg)', border: '1px solid var(--color-primary-border)', color: 'var(--color-primary-dark)', fontSize: '12.5px', fontWeight: '700', cursor: 'pointer', padding: '6px 12px', borderRadius: '999px', boxShadow: 'var(--shadow-hero)', fontFamily: 'inherit' }}>Edit goals</button>
            </div>
            <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', margin: '6px 0 12px', lineHeight: 1.45 }}>
              {(() => {
                const calLeft = goalCal - dayNutrition.cal
                const proLeft = macroGoals.protein - dayNutrition.protein
                const calText = calLeft >= 0 ? `${calLeft.toLocaleString()} cal left` : `${(-calLeft).toLocaleString()} cal over`
                const proText = proLeft >= 0 ? `${proLeft}g protein left` : `${-proLeft}g protein over`
                return dayHasMeals ? `${calText} · ${proText}` : `Plan within ${goalCal.toLocaleString()} cal and ${macroGoals.protein}g protein`
              })()}
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '18px' }}>
              <CalorieRing cal={dayNutrition.cal} goal={goalCal} />
              <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '9px' }}>
                <MacroStat color="#a78bfa" label="Protein" grams={dayNutrition.protein} goal={macroGoals.protein} />
                <MacroStat color="#fbbf24" label="Carbs" grams={dayNutrition.carbs} goal={macroGoals.carbs} />
                <MacroStat color="var(--color-primary)" label="Fat" grams={dayNutrition.fat} goal={macroGoals.fat} />
              </div>
            </div>
            {/* 1.4.1 citation — same estimated recipe data, summed. Boxed with an
                icon so it's actually noticeable, not fine print under the bars. */}
            <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', marginTop: '12px', padding: '8px 10px', background: 'var(--color-primary-bg)', border: '1px solid var(--color-primary-border)', borderRadius: '12px' }}>
              <Info size={14} color="var(--color-primary-dark)" style={{ flexShrink: 0, marginTop: '1px' }} />
              <p style={{ margin: 0, fontSize: '12px', lineHeight: 1.45, color: 'var(--color-primary-dark)' }}>
                Estimated totals for general reference — not medical advice. Source:{' '}
                <a href="https://fdc.nal.usda.gov/" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--color-primary-dark)', textDecoration: 'underline', fontWeight: 600 }}>
                  USDA FoodData Central
                </a>
                .
              </p>
            </div>
          </div>
          </Reveal>
        )}

        {/* The day's meals as one ruled list — each row is its own recipe
            picker (tap to fill or swap). */}
        <div style={{ borderRadius: '20px', border: '1px solid var(--color-border)', background: 'var(--color-card)', padding: '4px 16px', marginBottom: '16px', boxShadow: 'var(--shadow-md)' }}>
        <div style={{ padding: '12px 0 10px' }}>
          <h2 style={{ fontSize: '13px', fontWeight: '700', color: 'var(--color-text)', margin: 0 }}>{selectedDay}</h2>
        </div>
        {dayRows.map(({ m, meal }, i) => {
          const filled = !!meal
          const servings = meal?.servings || 1
          const canPick = recipes.length > 0
          // Empty rows are always tappable: with recipes, tap opens the picker;
          // with none, tap sends the user to add one instead of doing nothing.
          const rowClickable = !filled || canPick
          // The row content, shared by both the plain (empty) and swipeable
          // (filled) wrappers. `open` drives the chevron rotation.
          const rowContent = (open: boolean) => (
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '14px 0', borderTop: i > 0 ? '1px solid var(--color-subtle)' : 'none', cursor: rowClickable ? 'pointer' : 'default' }}>
              <div style={{ width: '44px', height: '44px', borderRadius: '12px', flexShrink: 0, background: 'var(--color-primary-bg)', border: '1px solid var(--color-primary-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>
                {m.emoji}
              </div>
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
                    {recipes.length === 0 ? 'No recipes yet — import or create one' : `Add a ${m.label.toLowerCase()} recipe`}
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
              {!filled && !canPick && <Plus size={17} color="var(--color-text-muted)" style={{ flexShrink: 0 }} />}
              {canPick && <ChevronDown size={17} color="var(--color-text-muted)" style={{ flexShrink: 0, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s ease' }} />}
            </div>
          )
          // Filled rows: swipe left to remove, long-press to move/copy, tap to
          // swap. Empty rows: just tap to fill.
          return filled ? (
            <SwipeableMealRow
              key={`${m.key}-${i}`}
              recipes={recipes}
              recentIds={recentIds}
              m={m}
              meal={meal}
              onSwap={(id) => addMealToPlan(id, m.key)}
              onRemove={() => { if (meal.mealId) removeMeal(meal.mealId) }}
              onLongPress={() => setMoveState({ meal, mealType: m.key, fromDay: selectedDay })}
            >
              {rowContent}
            </SwipeableMealRow>
          ) : (
            <RecipePicker key={`${m.key}-${i}`} recipes={recipes} recentIds={recentIds} meal={m} remainingCal={goalCal - dayNutrition.cal} onPick={(id) => addMealToPlan(id, m.key)} onNoRecipes={() => onNavigate('add-recipe')}>
              {rowContent}
            </RecipePicker>
          )
        })}
        </div>
      </div>

      {/* Long-press → move or copy a planned meal to another day this week. */}
      {moveState && (
        <MoveCopySheet
          weekStart={weekStart}
          fromDay={moveState.fromDay}
          mealName={moveState.meal.name}
          busy={moving}
          onChoose={doMoveCopy}
          onClose={() => setMoveState(null)}
        />
      )}

      {/* Undo the last grocery add (delete new lines, restore topped-up ones). */}
      {undoLabel && (
        <div style={{ position: 'absolute', bottom: '84px', left: '16px', right: '16px', zIndex: 100, display: 'flex', justifyContent: 'center', pointerEvents: 'none' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', maxWidth: '100%', background: '#334155', color: '#fff', padding: '8px 8px 8px 18px', borderRadius: '999px', boxShadow: '0 10px 28px rgba(0,0,0,0.3)', pointerEvents: 'auto' }}>
            <span style={{ fontSize: '14px', fontWeight: '600', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{undoLabel}</span>
            <button
              onClick={undoGroceryAdd}
              style={{ flexShrink: 0, background: 'rgba(244,184,96,0.16)', border: 'none', color: '#f4b860', fontSize: '13.5px', fontWeight: '800', cursor: 'pointer', fontFamily: 'inherit', padding: '7px 14px', borderRadius: '999px', boxShadow: 'var(--shadow-hero)' }}
            >
              Undo
            </button>
          </div>
        </div>
      )}

      {toast && <Toast message={toast.message} tone={toast.tone} bottom="84px" />}
    </div>
  )
}

/** One macro in the nutrition tile: coloured dot, label, grams against goal, and a progress bar. */
function MacroStat({ color, label, grams, goal }: { color: string; label: string; grams: number; goal: number }) {
  const pct = goal > 0 ? Math.min(100, Math.round((grams / goal) * 100)) : 0
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
        <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: color, flexShrink: 0 }} />
        <span style={{ flex: 1, fontSize: '13px', color: 'var(--color-text-secondary)' }}>{label}</span>
        <span style={{ fontSize: '13px', fontWeight: '700', color: 'var(--color-text)' }}>
          {grams}<span style={{ color: 'var(--color-text-muted)', fontWeight: '600' }}> / {goal}g</span>
        </span>
      </div>
      <div role="progressbar" aria-label={`${label} progress`} aria-valuemin={0} aria-valuemax={goal} aria-valuenow={grams} style={{ height: '6px', borderRadius: '3px', background: 'var(--color-border)', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: '3px', transition: 'width 0.3s ease' }} />
      </div>
    </div>
  )
}

/** Calories eaten against the daily goal as a ring, with the count in the middle. Turns amber once over goal. */
function CalorieRing({ cal, goal }: { cal: number; goal: number }) {
  const size = 92, stroke = 9, r = (size - stroke) / 2, c = 2 * Math.PI * r
  const pct = goal > 0 ? Math.min(1, cal / goal) : 0
  const over = cal > goal
  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }} role="img" aria-label={`${cal.toLocaleString()} of ${goal.toLocaleString()} calories`}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--color-border)" strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={over ? '#f59e0b' : 'var(--color-primary)'} strokeWidth={stroke} strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - pct)} style={{ transition: 'stroke-dashoffset 0.4s ease' }} />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontSize: '20px', fontWeight: '800', color: 'var(--color-text)', lineHeight: 1 }}>{cal.toLocaleString()}</span>
        <span style={{ fontSize: '10.5px', color: 'var(--color-text-muted)', marginTop: '3px' }}>of {goal.toLocaleString()} cal</span>
      </div>
    </div>
  )
}

/**
 * A clean recipe dropdown. `children(open)` renders the trigger (a meal row);
 * clicking it opens a ruled menu of recipe rows -- name, cuisine + time --
 * instead of the browser's native <select>. Click-outside closes it; the
 * current recipe (for a swap) is ticked.
 */
function RecipePicker({ recipes: allRecipes, meal, current, remainingCal, onPick, children, recentIds = [], onNoRecipes }: {
  recipes: Recipe[]
  meal: typeof MEALS[number]
  current?: string
  remainingCal?: number
  onPick: (recipeId: string) => void
  children: (open: boolean) => React.ReactNode
  recentIds?: string[]
  onNoRecipes?: () => void
}) {
  const [open, setOpen] = useState(false)
  const [showAll, setShowAll] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const [positionAbove, setPositionAbove] = useState(false)
  const disabled = allRecipes.length === 0

  // Offer the recipes that belong in this slot; fall back to everything when
  // none are tagged for it, so the slot is never a dead end.
  const matching = allRecipes.filter(r => slotTypeOf(r) === meal.key)
  const noMatches = matching.length === 0
  const listingAll = showAll || noMatches
  const recipes = listingAll ? allRecipes : matching

  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])

  useEffect(() => {
    if (!open || !ref.current) return
    const rect = ref.current.getBoundingClientRect()
    const dropdownHeight = 272
    const spaceBelow = window.innerHeight - rect.bottom
    setPositionAbove(spaceBelow < dropdownHeight + 20)
  }, [open])

  // Float recently-picked recipes to the top; the rest follow in their normal
  // order. Only sections the list when there's actually a recent one to show.
  const recent = recentIds.map(id => recipes.find(r => r.id === id)).filter((r): r is Recipe => !!r)
  const recentSet = new Set(recent.map(r => r.id))
  const fitsBudget = (r: Recipe) => {
    const nut = nutritionOf(r)
    return !!nut && remainingCal !== undefined && nut.cal <= remainingCal
  }
  const rest = recipes
    .filter(r => !recentSet.has(r.id))
    .sort((a, b) => Number(fitsBudget(b)) - Number(fitsBudget(a)))

  const row = (r: Recipe, first: boolean) => {
    const selected = current === r.id
    const totalTime = (r.prepTime || 0) + (r.cookTime || 0)
    const timeDisplay = totalTime > 0 ? `${totalTime} min` : 'N/A'
    const nut = nutritionOf(r)
    const fits = !!nut && remainingCal !== undefined && nut.cal <= remainingCal
    return (
      <button
        key={r.id}
        onClick={() => { onPick(r.id); setOpen(false) }}
        onMouseEnter={(e) => { if (!selected) e.currentTarget.style.background = 'var(--color-subtle)' }}
        onMouseLeave={(e) => { if (!selected) e.currentTarget.style.background = 'transparent' }}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: '12px',
          padding: '12px 14px', background: selected ? 'var(--color-subtle)' : 'transparent',
          border: 'none', borderTop: first ? 'none' : '1px solid var(--color-subtle)',
          cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit',
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--color-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.name}</div>
          <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '2px' }}>
            {[listingAll ? SLOT_LABELS[slotTypeOf(r)] : null, r.cuisine, timeDisplay, nut ? `${nut.cal} cal` : null, nut && nut.protein ? `${nut.protein}g protein` : null].filter(Boolean).join(' · ')}
          </div>
        </div>
        {fits && <span style={{ flexShrink: 0, fontSize: '11px', fontWeight: '700', color: 'var(--color-primary-dark)', background: 'var(--color-primary-bg)', border: '1px solid var(--color-primary-border)', borderRadius: '999px', boxShadow: 'var(--shadow-hero)', padding: '3px 8px' }}>Fits</span>}
        {selected && <Check size={16} color="var(--color-primary)" style={{ flexShrink: 0 }} />}
      </button>
    )
  }

  const sectionLabel = (text: string, withClock: boolean, divider: boolean) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '9px 14px 5px', borderTop: divider ? '1px solid var(--color-subtle)' : 'none' }}>
      {withClock && <Clock size={11} color="var(--color-text-muted)" />}
      <span style={{ fontSize: '10.5px', fontWeight: '700', letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--color-text-muted)' }}>{text}</span>
    </div>
  )

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <div onClick={() => { disabled ? onNoRecipes?.() : setOpen(o => !o) }}>
        {children(open)}
      </div>
      {open && !disabled && (
        <div style={{
          position: 'absolute', [positionAbove ? 'bottom' : 'top']: positionAbove ? 'calc(100% + 2px)' : 'calc(100% + 2px)', left: 0, right: 0, zIndex: 20,
          background: 'var(--color-card)', border: '1px solid var(--color-border)',
          borderRadius: '14px', boxShadow: '0 14px 34px rgba(15,23,42,0.2)',
          overflow: 'hidden', maxHeight: '272px', overflowY: 'auto',
        }}>
          {recent.length > 0 ? (
            <>
              {sectionLabel('Recent', true, false)}
              {recent.map((r, i) => row(r, i === 0))}
              {rest.length > 0 && sectionLabel('All recipes', false, true)}
              {rest.map((r, i) => row(r, i === 0))}
            </>
          ) : (
            recipes.map((r, i) => row(r, i === 0))
          )}
          {noMatches ? (
            <div style={{ padding: '10px 14px', borderTop: '1px solid var(--color-subtle)', fontSize: '12px', color: 'var(--color-text-muted)' }}>
              No {meal.label.toLowerCase()} recipes yet — showing all recipes.
            </div>
          ) : (
            <button
              onClick={() => setShowAll(v => !v)}
              style={{ width: '100%', padding: '11px 14px', background: 'var(--color-subtle)', border: 'none', borderTop: '1px solid var(--color-border)', color: 'var(--color-primary-dark)', fontSize: '12.5px', fontWeight: '700', cursor: 'pointer', fontFamily: 'inherit' }}
            >
              {showAll ? `Only ${meal.label.toLowerCase()} recipes` : `Show all recipes (${allRecipes.length})`}
            </button>
          )}
        </div>
      )}
    </div>
  )
}

/**
 * Grows its child in from zero height on mount (grid-rows 0fr -> 1fr) instead of
 * snapping it into place. Stays mounted as long as it's rendered, so it only
 * animates when it first appears — switching between two days that both have
 * meals just updates the numbers inside, no re-animation.
 */
function Reveal({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  useEffect(() => {
    const id = requestAnimationFrame(() => setOpen(true))
    return () => cancelAnimationFrame(id)
  }, [])
  return (
    <div className={`rh-reveal${open ? ' rh-reveal--open' : ''}`}>
      <div>{children}</div>
    </div>
  )
}

/**
 * A filled meal row you can act on with a gesture: swipe left to remove,
 * long-press to move/copy to another day, or tap to swap the recipe (the picker
 * underneath). One pointer stream decides which: a horizontal drag past a small
 * threshold is a swipe, a still press is a long-press, anything vertical is left
 * to the list's own scroll. `gestured` swallows the click a gesture would
 * otherwise fire, so a swipe never also toggles the picker open.
 */
function SwipeableMealRow({ recipes, recentIds, m, meal, onSwap, onRemove, onLongPress, children }: {
  recipes: Recipe[]
  recentIds: string[]
  m: typeof MEALS[number]
  meal: any
  onSwap: (id: string) => void
  onRemove: () => void
  onLongPress: () => void
  children: (open: boolean) => React.ReactNode
}) {
  const [dx, setDx] = useState(0)
  const [animate, setAnimate] = useState(true)
  const start = useRef<{ x: number; y: number } | null>(null)
  const axis = useRef<'none' | 'x' | 'y'>('none')
  const gestured = useRef(false)
  const lp = useRef<ReturnType<typeof setTimeout> | null>(null)
  const canSwipe = !!meal?.mealId

  const clearLP = () => { if (lp.current) { clearTimeout(lp.current); lp.current = null } }

  const onDown = (e: React.PointerEvent) => {
    if (e.button && e.button !== 0) return
    start.current = { x: e.clientX, y: e.clientY }
    axis.current = 'none'
    gestured.current = false
    setAnimate(false)
    clearLP()
    lp.current = setTimeout(() => {
      if (axis.current === 'none') { gestured.current = true; clearLP(); tapHaptic('medium'); onLongPress() }
    }, 450)
  }
  const onMove = (e: React.PointerEvent) => {
    if (!start.current) return
    const dX = e.clientX - start.current.x
    const dY = e.clientY - start.current.y
    if (axis.current === 'none') {
      if (Math.abs(dX) > 8 && Math.abs(dX) > Math.abs(dY)) {
        axis.current = 'x'
        try { (e.currentTarget as Element).setPointerCapture(e.pointerId) } catch { /* ignore */ }
      } else if (Math.abs(dY) > 8) {
        axis.current = 'y'
        clearLP()
      }
    }
    if (axis.current === 'x') {
      clearLP()
      gestured.current = true
      setDx(dX < 0 ? Math.max(dX, -160) : Math.min(dX * 0.25, 24))
    }
  }
  const finish = (e: React.PointerEvent) => {
    clearLP()
    const s = start.current
    start.current = null
    if (axis.current === 'x' && s) {
      const dX = e.clientX - s.x
      setAnimate(true)
      if (canSwipe && dX <= -70) { tapHaptic('light'); setDx(-380); onRemove() }
      else setDx(0)
    }
    axis.current = 'none'
  }
  // Capture-phase: runs before the picker's own onClick, so a just-finished
  // gesture can cancel the click without the picker toggling.
  const swallow = (e: React.MouseEvent) => { if (gestured.current) { e.stopPropagation(); gestured.current = false } }

  return (
    <div className="rh-swipe-row" onClickCapture={swallow}>
      <div aria-hidden style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '7px', paddingRight: '6px', color: '#dc2626', opacity: dx < -6 ? 1 : 0, transition: 'opacity 0.15s ease', pointerEvents: 'none' }}>
        <Trash2 size={16} />
        <span style={{ fontSize: '13px', fontWeight: '700' }}>Remove</span>
      </div>
      <div
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={finish}
        onPointerCancel={finish}
        style={{ position: 'relative', background: 'var(--color-card)', transform: `translateX(${dx}px)`, transition: animate ? 'transform 0.22s ease' : 'none', touchAction: 'pan-y' }}
      >
        <RecipePicker recipes={recipes} recentIds={recentIds} meal={m} current={meal?.recipeId ?? meal?.id} onPick={onSwap}>
          {children}
        </RecipePicker>
      </div>
    </div>
  )
}

/**
 * Bottom sheet for moving or copying a planned meal to another day this week.
 * Portalled to the frame so it covers the nav. Move drops the original; Copy
 * leaves it. The source day is dimmed and inert.
 */
function MoveCopySheet({ weekStart, fromDay, mealName, busy, onChoose, onClose }: {
  weekStart: Date
  fromDay: string
  mealName: string
  busy: boolean
  onChoose: (targetDay: string, copy: boolean) => void
  onClose: () => void
}) {
  const [copy, setCopy] = useState(false)
  return (
    <FrameOverlay>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, zIndex: 120, background: 'rgba(15,23,42,0.4)', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
        <div onClick={e => e.stopPropagation()} style={{ background: 'var(--color-card)', borderTopLeftRadius: '22px', borderTopRightRadius: '22px', padding: '18px 20px 22px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', marginBottom: '15px' }}>
            <div style={{ minWidth: 0 }}>
              <p style={{ fontSize: '11px', fontWeight: '700', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--color-text-muted)', margin: 0 }}>{copy ? 'Copy to' : 'Move to'}</p>
              <p style={{ fontSize: '15px', fontWeight: '600', color: 'var(--color-text)', margin: '3px 0 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{mealName}</p>
            </div>
            <div style={{ display: 'flex', background: 'var(--color-subtle)', borderRadius: '10px', padding: '3px', flexShrink: 0 }}>
              {([['Move', false], ['Copy', true]] as const).map(([label, val]) => (
                <button
                  key={label}
                  onClick={() => setCopy(val)}
                  style={{ padding: '6px 13px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: '13px', fontWeight: '700', background: copy === val ? 'var(--color-card)' : 'transparent', color: copy === val ? 'var(--color-text)' : 'var(--color-text-muted)', boxShadow: copy === val ? '0 1px 3px rgba(0,0,0,0.14)' : 'none' }}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '6px' }}>
            {DAY_NAMES.map((day, idx) => {
              const date = new Date(weekStart); date.setDate(date.getDate() + idx)
              const isFrom = day === fromDay
              return (
                <button
                  key={day}
                  disabled={isFrom || busy}
                  onClick={() => onChoose(day, copy)}
                  style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px', padding: '9px 0', borderRadius: '12px', border: 'none', cursor: isFrom ? 'default' : 'pointer', fontFamily: 'inherit', background: isFrom ? 'transparent' : 'var(--color-subtle)', opacity: isFrom || busy ? 0.4 : 1 }}
                >
                  <span style={{ fontSize: '10.5px', fontWeight: '700', color: 'var(--color-text-muted)' }}>{DAY_SHORT[idx][0]}</span>
                  <span style={{ fontSize: '15px', fontWeight: '700', color: 'var(--color-text)' }}>{date.getDate()}</span>
                </button>
              )
            })}
          </div>
          <p style={{ fontSize: '11.5px', color: 'var(--color-text-muted)', textAlign: 'center', margin: '13px 0 0' }}>
            {busy ? 'Updating…' : `Pick a day to ${copy ? 'copy' : 'move'} ${fromDay}'s ${mealName.length > 18 ? 'meal' : mealName}`}
          </p>
        </div>
      </div>
    </FrameOverlay>
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
