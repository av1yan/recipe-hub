import { useState, useEffect, useRef, type CSSProperties } from 'react'
import { Trash2, Check, ChevronDown, ChevronLeft, ChevronRight, ShoppingCart, Share2, Clock } from 'lucide-react'
import type { Screen, MealPlan, Recipe } from '../types'
import { Toast, useToast } from '../components/Toast'
import { FrameOverlay } from '../components/FrameOverlay'
import { mealPlanAPI, recipeAPI, groceryAPI } from '../utils/api'
import { toGroceryLine } from '../utils/grocery'
import { getCalorieGoal, getMacroGoals } from '../utils/goals'
import { useProPlan } from '../utils/proPlan'
import { shareText } from '../utils/share'
import { tapHaptic } from '../utils/haptics'

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
  const [isPro] = useProPlan()
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

  // Viewing another week is a Pro perk ("Plan any week"); Free stays on the
  // current week. Selecting a day within the shown week is always free.
  function changeWeek(delta: number) {
    if (!isPro) { show('Planning other weeks is a Pro feature — upgrade in Settings.', 'error'); return }
    const ws = mondayOf(viewWeek)
    ws.setDate(ws.getDate() + delta * 7)
    setViewWeek(ws)
    setConfirmDelete(false)
  }

  // Jump to a date from the expanded month grid.
  function goToDate(date: Date) {
    if (!isPro && !sameWeek(date, mondayOf(new Date()))) {
      show('Planning other weeks is a Pro feature — upgrade in Settings.', 'error')
      return
    }
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
      // Create the week's plan lazily, on the first meal added to it.
      let planId = currentPlan?.id
      if (!planId) {
        const plan = await mealPlanAPI.create(viewWeek)
        setMealPlans(prev => [...prev, plan])
        planId = plan.id
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

  // Pro feature: pull every ingredient from the week's planned meals into the
  // grocery list. The list endpoint omits ingredients, so re-fetch the plan by
  // id (that one includes them). Rather than commit straight away — the backend
  // silently tops up existing lines' quantities — work out the change first and
  // surface it for confirmation.
  async function openGroceryPreview() {
    if (previewing || generating) return
    if (!isPro) { show('Auto grocery lists are a Pro feature — upgrade in Settings.', 'error'); return }
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

  // Full month grid shown when the calendar is expanded. Page months with the
  // chevrons; tap a date to jump to it (Pro for weeks other than this one).
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
            const locked = !isPro && !sameWeek(date, thisWeek)
            return (
              <button
                key={i}
                onClick={() => goToDate(date)}
                style={{
                  height: '38px', borderRadius: '10px', fontSize: '14px', fontWeight: '700',
                  border: isToday && !isSel ? '1.5px solid var(--color-primary)' : '1.5px solid transparent',
                  background: isSel ? 'var(--color-primary)' : 'transparent',
                  color: isSel ? '#fff' : locked ? 'var(--color-text-muted)' : 'var(--color-text)',
                  opacity: locked ? 0.5 : 1,
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
          {hasMeals && isPro && (
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

      {/* Month label — tap (or the calendar icon) to expand into a month grid. */}
      <button
        onClick={toggleExpanded}
        aria-expanded={expanded}
        aria-label={expanded ? 'Collapse calendar' : 'Expand calendar'}
        style={{ display: 'flex', alignItems: 'center', gap: '5px', background: 'none', border: 'none', padding: 0, marginBottom: '12px', cursor: 'pointer', fontFamily: 'inherit' }}
      >
        <span style={{ fontSize: '12px', fontWeight: '700', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--color-text-muted)' }}>{monthLabel}</span>
        <ChevronDown size={13} color="var(--color-text-muted)" style={{ transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.18s ease' }} />
      </button>

      {expanded ? renderMonthGrid() : (
        // Week strip — chevrons or swipe (Pro) to move between weeks.
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
              style={{ position: 'absolute', top: '24px', left: `calc(${((DAY_NAMES.indexOf(selectedDay) + 0.5) * 100) / 7}% - 17px)`, width: '34px', height: '34px', borderRadius: '17px', background: 'var(--color-primary)', pointerEvents: 'none' }}
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

        {/* Pro only: build the week's grocery list from the plan. Tapping it
            previews the change (new vs. topped-up) before anything is written. */}
        {hasMeals && isPro && (preview ? (
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
                style={{ flex: 1.4, padding: '11px', borderRadius: '11px', background: 'var(--color-primary)', color: '#fff', border: 'none', fontSize: '14px', fontWeight: '700', cursor: 'pointer', opacity: generating || (preview.newCount === 0 && preview.updatedCount === 0) ? 0.6 : 1, fontFamily: 'inherit' }}
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
              width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              padding: '13px', marginBottom: '22px', borderRadius: '12px',
              background: 'var(--color-primary-bg)', color: 'var(--color-primary-dark)', border: '1px solid var(--color-primary-border)',
              fontSize: '14px', fontWeight: '700', cursor: previewing ? 'default' : 'pointer',
              fontFamily: 'inherit', opacity: previewing ? 0.7 : 1,
            }}
          >
            <ShoppingCart size={16} /> {previewing ? 'Checking…' : 'Add this week to Groceries'}
          </button>
        ))}

        {/* Pro only: the selected day's nutrition, summed from the planned recipes.
            Wrapped so it grows in smoothly — adding the day's first meal used to
            snap it in and shove the rows below out from under a finger. */}
        {dayHasMeals && isPro && (
          <Reveal>
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
            {/* 1.4.1 citation — same estimated recipe data, summed. */}
            <p style={{ margin: '12px 0 0', fontSize: '10.5px', lineHeight: 1.5, color: 'var(--color-text-muted)' }}>
              Estimated totals for general reference; not medical advice. Source:{' '}
              <a href="https://fdc.nal.usda.gov/" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--color-primary)', textDecoration: 'underline' }}>
                USDA FoodData Central
              </a>
              .
            </p>
          </div>
          </Reveal>
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
          // The row content, shared by both the plain (empty) and swipeable
          // (filled) wrappers. `open` drives the chevron rotation.
          const rowContent = (open: boolean) => (
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
            <RecipePicker key={`${m.key}-${i}`} recipes={recipes} recentIds={recentIds} meal={m} onPick={(id) => addMealToPlan(id, m.key)}>
              {rowContent}
            </RecipePicker>
          )
        })}
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
              style={{ flexShrink: 0, background: 'rgba(244,184,96,0.16)', border: 'none', color: '#f4b860', fontSize: '13.5px', fontWeight: '800', cursor: 'pointer', fontFamily: 'inherit', padding: '7px 14px', borderRadius: '999px' }}
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
function RecipePicker({ recipes, meal: _meal, current, onPick, children, recentIds = [] }: {
  recipes: Recipe[]
  meal: typeof MEALS[number]
  current?: string
  onPick: (recipeId: string) => void
  children: (open: boolean) => React.ReactNode
  recentIds?: string[]
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

  // Float recently-picked recipes to the top; the rest follow in their normal
  // order. Only sections the list when there's actually a recent one to show.
  const recent = recentIds.map(id => recipes.find(r => r.id === id)).filter((r): r is Recipe => !!r)
  const recentSet = new Set(recent.map(r => r.id))
  const rest = recipes.filter(r => !recentSet.has(r.id))

  const row = (r: Recipe, first: boolean) => {
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
          border: 'none', borderTop: first ? 'none' : '1px solid var(--color-subtle)',
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
  }

  const sectionLabel = (text: string, withClock: boolean, divider: boolean) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '9px 14px 5px', borderTop: divider ? '1px solid var(--color-subtle)' : 'none' }}>
      {withClock && <Clock size={11} color="var(--color-text-muted)" />}
      <span style={{ fontSize: '10.5px', fontWeight: '700', letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--color-text-muted)' }}>{text}</span>
    </div>
  )

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
        style={{ position: 'relative', background: 'var(--color-bg)', transform: `translateX(${dx}px)`, transition: animate ? 'transform 0.22s ease' : 'none', touchAction: 'pan-y' }}
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
