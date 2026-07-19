import { useState, useEffect } from 'react'
import { Plus, CalendarDays, BookOpen, X, Heart, ChevronRight, Crown } from 'lucide-react'
import type { Screen } from '../types'
import { BottomNavigation } from '../components/BottomNavigation'
import { recipeAPI, mealPlanAPI, cookbookAPI } from '../utils/api'
import { recipeImageSrc } from '../utils/image'
import { useApp } from '../context/AppContext'
import { useProPlan } from '../utils/proPlan'
import { DAY_NAMES, MEALS, sameWeek, getMeals, mondayOf } from './MealPlanScreen'

interface Props {
  onNavigate: (screen: Screen, data?: any) => void
}

/** Warm tones, matching the covers on the Cookbooks screen. */
const COOKBOOK_COLORS = ['#c67139', '#6ba356', '#d4a574', '#b8956a', '#a48a6e']

const RECIPE_COLORS = ['#d4a574', '#6ba356', '#c67139', '#5b9acd', '#9b7ec8']

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 18) return 'Good afternoon'
  return 'Good evening'
}

function getDateLabel() {
  const d = new Date()
  const day = d.toLocaleDateString('en-US', { weekday: 'long' }).toUpperCase()
  const month = d.toLocaleDateString('en-US', { month: 'short' }).toUpperCase()
  return `${day}, ${month} ${d.getDate()}`
}

export default function HomeScreen({ onNavigate }: Props) {
  const { user } = useApp()
  const [isPro] = useProPlan()
  const [recipes, setRecipes] = useState<any[]>([])
  const [todayMeals, setTodayMeals] = useState<{ meal: any; cfg: typeof MEALS[number] }[]>([])
  const [plannedThisWeek, setPlannedThisWeek] = useState(0)
  const [cookbooks, setCookbooks] = useState<any[]>([])
  const [planId, setPlanId] = useState<string | null>(null)
  // Which slot the add panel is filling, or null when it is closed.
  const [addingSlot, setAddingSlot] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  // Prefer the person's first name; fall back to their username.
  const displayName = (user?.name || '').trim().split(/\s+/)[0] || user?.username || ''
  const initial = (displayName || user?.email || '?').charAt(0).toUpperCase()

  useEffect(() => {
    recipeAPI.list().then(setRecipes).catch(() => {})
    // Home works without cookbooks -- a failure just means an empty shelf.
    cookbookAPI.list().then((c: any) => setCookbooks(Array.isArray(c) ? c : [])).catch(() => {})
    loadToday()
  }, [])

  async function loadToday() {
    try {
      const plans = await mealPlanAPI.list()
      const today = new Date()
      const plan = plans.find((p: any) => sameWeek(p.weekStart, today))
      if (!plan) { setPlanId(null); setTodayMeals([]); return }
      setPlanId(plan.id)
      const dayName = DAY_NAMES[(today.getDay() + 6) % 7]
      const found: { meal: any; cfg: typeof MEALS[number] }[] = []
      MEALS.forEach(cfg => getMeals(plan, dayName, cfg.key).forEach(meal => found.push({ meal, cfg })))
      setTodayMeals(found)
      setPlannedThisWeek(
        DAY_NAMES.reduce((n, d) => n + MEALS.reduce((m, cfg) => m + getMeals(plan, d, cfg.key).length, 0), 0)
      )
    } catch {
      /* home still works without a plan */
    }
  }

  const todayName = DAY_NAMES[(new Date().getDay() + 6) % 7]
  const filledSlots = new Set(todayMeals.map(m => m.cfg.key))

  /** Takes a meal off today. mealId comes from the plan's link row. */
  async function removeMeal(mealId: string) {
    if (!mealId || busy) return
    setBusy(true)
    const before = todayMeals
    setTodayMeals(prev => prev.filter(m => m.meal.mealId !== mealId))
    try {
      await mealPlanAPI.removeMeal(mealId)
      await loadToday()
    } catch {
      setTodayMeals(before)
    } finally {
      setBusy(false)
    }
  }

  /** Puts a recipe in one of today's slots, making this week's plan if needed. */
  async function addMeal(recipeId: string, slot: string) {
    if (busy) return
    setBusy(true)
    try {
      let id = planId
      if (!id) {
        const created: any = await mealPlanAPI.create(mondayOf(new Date()))
        id = created.id
        setPlanId(id)
      }
      await mealPlanAPI.addMeal(id!, recipeId, todayName, slot)
      setAddingSlot(null)
      await loadToday()
    } catch {
      /* leave the panel open so it can be tried again */
    } finally {
      setBusy(false)
    }
  }

  const favorites = recipes.filter((r: any) => r.isFavorite)

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'var(--color-bg)' }}>
      <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
        {/* Header */}
        <div style={{ background: 'var(--color-card)', padding: '16px 16px 0', borderBottom: '1px solid var(--color-subtle)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px', gap: '12px' }}>
            <div style={{ minWidth: 0 }}>
              <p style={{ color: 'var(--color-text-muted)', fontSize: '11px', fontWeight: '600', letterSpacing: '0.06em', margin: '0 0 2px' }}>
                {getDateLabel()}
              </p>
              <h1 style={{ fontSize: '26px', fontWeight: '700', color: 'var(--color-text)', margin: 0, lineHeight: 1.2 }}>
                {/* The wave is joined by a non-breaking space so it wraps with
                    the last word instead of stranding itself on its own line. */}
                {getGreeting()}{displayName ? `,\u00A0${displayName}` : ''}{'\u00A0\u{1F44B}'}
              </h1>
              <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', margin: '6px 0 0' }}>
                {recipes.length} recipe{recipes.length === 1 ? '' : 's'} · {plannedThisWeek} meal{plannedThisWeek === 1 ? '' : 's'} planned this week
              </p>
            </div>
            {/* The avatar is the only way into settings from here -- a gear
                beside it went to the same place and just split the target.
                On Pro, a gold badge rides alongside it so the plan is visible
                the moment you open the app. */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
              {isPro && (
                <button
                  onClick={() => onNavigate('settings')}
                  aria-label="Pro plan"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: 'rgba(244,184,96,0.16)', color: '#f4b860', fontSize: '11px', fontWeight: '800', padding: '5px 9px', borderRadius: '999px', letterSpacing: '0.04em', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}
                >
                  <Crown size={12} /> PRO
                </button>
              )}
              <button
                onClick={() => onNavigate('settings')}
                aria-label="Settings"
                title={user?.name || undefined}
                style={{ width: '38px', height: '38px', borderRadius: '19px', border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg, #7ec063, #5a9449)', color: '#fff', fontSize: '15px', fontWeight: '700', flexShrink: 0 }}
              >
                {initial}
              </button>
            </div>
          </div>

        </div>

        <div style={{ padding: '20px 16px 0' }}>
          {/* Today's meals — real plan data */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h2 style={{ fontSize: '15px', fontWeight: '700', color: 'var(--color-text)', margin: 0, letterSpacing: '-0.01em' }}>
              Today's Meals
            </h2>
            <button onClick={() => onNavigate('meal-plan')} style={{ background: 'none', border: 'none', color: '#6ba356', fontSize: '13px', fontWeight: '600', cursor: 'pointer', padding: 0 }}>
              Plan →
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '24px' }}>
            {todayMeals.length > 0 ? (
              todayMeals.map(({ meal, cfg }, i) => (
                <div
                  key={i}
                  // The meal-plan API strips ingredients from its recipes, so
                  // open the full one we already loaded; the meal is the fallback.
                  onClick={() => onNavigate('recipe', { recipe: recipes.find((r: any) => r.id === meal.id) ?? meal })}
                  style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 14px', background: 'var(--color-card)', borderRadius: '14px', border: '1px solid var(--color-subtle)', boxShadow: '0 1px 3px rgba(0,0,0,0.04)', cursor: 'pointer' }}
                >
                  <div style={{ width: '64px', height: '64px', borderRadius: '14px', background: cfg.tint, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px', flexShrink: 0, overflow: 'hidden' }}>
                    {meal.imageUrl
                      ? <img src={recipeImageSrc(meal.imageUrl, 64, 64)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => { e.currentTarget.style.display = 'none' }} />
                      : cfg.emoji}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: '10px', color: 'var(--color-text-muted)', fontWeight: '600', margin: 0, letterSpacing: '0.06em' }}>
                      {cfg.label.toUpperCase()}
                    </p>
                    <h3 style={{ fontSize: '14px', fontWeight: '600', color: 'var(--color-text)', margin: '2px 0 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {meal.name}
                    </h3>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <p style={{ fontSize: '12px', color: 'var(--color-text-secondary)', fontWeight: '500', margin: 0 }}>
                      {(meal.prepTime || 0) + (meal.cookTime || 0)} min
                    </p>
                    {meal.calories && <p style={{ fontSize: '11px', color: 'var(--color-text-muted)', margin: '2px 0 0' }}>{meal.calories} cal</p>}
                  </div>
                  {/* Taking a meal off the day, not deleting the recipe, so no
                      confirming -- it is put straight back by adding it again. */}
                  <button
                    onClick={e => { e.stopPropagation(); removeMeal(meal.mealId) }}
                    aria-label={`Remove ${meal.name} from ${cfg.label}`}
                    style={{ flexShrink: 0, width: '26px', height: '26px', borderRadius: '13px', background: 'var(--color-bg)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                  >
                    <X size={13} color="var(--color-text-muted)" />
                  </button>
                </div>
              ))
            ) : (
              <button
                onClick={() => onNavigate('meal-plan')}
                style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px', background: 'var(--color-card)', border: '1.5px dashed #dbe2d6', borderRadius: '14px', cursor: 'pointer', textAlign: 'left', width: '100%' }}
              >
                <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'var(--color-primary-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <CalendarDays size={18} color="#6ba356" />
                </div>
                <div style={{ minWidth: 0 }}>
                  <p style={{ fontSize: '14px', fontWeight: '600', color: 'var(--color-text)', margin: 0 }}>Nothing planned today</p>
                  <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', margin: '2px 0 0' }}>Tap to plan your day</p>
                </div>
              </button>
            )}

            {/* Add a meal without leaving Home. Inline, like the meal plan's
                own picker, rather than a popup. */}
            {addingSlot === null ? (
              MEALS.some(cfg => !filledSlots.has(cfg.key)) && (
                <button
                  onClick={() => setAddingSlot(MEALS.find(cfg => !filledSlots.has(cfg.key))!.key)}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', width: '100%', padding: '10px', background: 'var(--color-primary-bg)', color: '#6ba356', border: '1.5px dashed var(--color-primary-border)', borderRadius: '12px', fontSize: '13px', fontWeight: '700', cursor: 'pointer', fontFamily: 'inherit' }}
                >
                  <Plus size={14} /> Add a meal
                </button>
              )
            ) : (
              <div style={{ background: 'var(--color-card)', border: '1px solid #e8eef0', borderRadius: '14px', padding: '12px' }}>
                <div style={{ display: 'flex', gap: '6px', marginBottom: '10px', flexWrap: 'wrap' }}>
                  {MEALS.filter(cfg => !filledSlots.has(cfg.key)).map(cfg => (
                    <button
                      key={cfg.key}
                      onClick={() => setAddingSlot(cfg.key)}
                      style={{ padding: '5px 11px', borderRadius: '999px', border: '1px solid ' + (addingSlot === cfg.key ? '#6ba356' : 'var(--color-border)'), background: addingSlot === cfg.key ? '#6ba356' : 'var(--color-card)', color: addingSlot === cfg.key ? '#fff' : 'var(--color-text-secondary)', fontSize: '12px', fontWeight: '700', cursor: 'pointer', fontFamily: 'inherit' }}
                    >
                      {cfg.label}
                    </button>
                  ))}
                </div>
                <div style={{ maxHeight: '168px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {recipes.map((r: any) => (
                    <button
                      key={r.id}
                      onClick={() => addMeal(r.id, addingSlot)}
                      disabled={busy}
                      style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '7px', background: 'none', border: 'none', borderRadius: '10px', cursor: busy ? 'default' : 'pointer', textAlign: 'left', fontFamily: 'inherit', width: '100%' }}
                    >
                      <span style={{ width: '32px', height: '32px', borderRadius: '9px', background: 'var(--color-subtle)', flexShrink: 0, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '15px' }}>
                        {r.imageUrl
                          ? <img src={recipeImageSrc(r.imageUrl, 32, 32)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => { e.currentTarget.style.display = 'none' }} />
                          : '🍽️'}
                      </span>
                      <span style={{ flex: 1, minWidth: 0, fontSize: '13px', fontWeight: '600', color: 'var(--color-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {r.name}
                      </span>
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => setAddingSlot(null)}
                  style={{ width: '100%', marginTop: '8px', padding: '8px', background: 'var(--color-subtle)', color: 'var(--color-text-secondary)', border: 'none', borderRadius: '10px', fontSize: '12px', fontWeight: '700', cursor: 'pointer', fontFamily: 'inherit' }}
                >
                  Cancel
                </button>
              </div>
            )}
          </div>

          {/* Favorites — the recipes you've hearted, in the shelf shape that
              used to hold "Your Recipes". "See all" opens the full list. */}
          <div style={{ marginBottom: '28px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h2 style={{ fontSize: '15px', fontWeight: '700', color: 'var(--color-text)', margin: 0, letterSpacing: '-0.01em' }}>
                Favorites
              </h2>
              {favorites.length > 0 && (
                <button onClick={() => onNavigate('favorites')} style={{ background: 'none', border: 'none', color: '#6ba356', fontSize: '13px', fontWeight: '600', cursor: 'pointer', padding: 0 }}>
                  See all →
                </button>
              )}
            </div>

            {favorites.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {favorites.slice(0, 6).map((recipe: any, i: number) => {
                  const tint = RECIPE_COLORS[i % RECIPE_COLORS.length]
                  const time = (recipe.prepTime || 0) + (recipe.cookTime || 0)
                  return (
                    <div
                      key={recipe.id}
                      onClick={() => onNavigate('recipe', { recipe })}
                      style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 14px', background: 'var(--color-card)', borderRadius: '14px', border: '1px solid var(--color-subtle)', boxShadow: '0 1px 3px rgba(0,0,0,0.04)', cursor: 'pointer' }}
                    >
                      {/* Recipe photo in the same tile the cookbook cards use, so
                          the whole Home shelf reads as one card system. */}
                      <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: tint + '2e', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', flexShrink: 0, overflow: 'hidden' }}>
                        {recipe.imageUrl
                          ? <img src={recipeImageSrc(recipe.imageUrl, 48, 48)} alt="" loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => { e.currentTarget.style.display = 'none' }} />
                          : '🍽️'}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <h4 style={{ fontSize: '14px', fontWeight: '600', color: 'var(--color-text)', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {recipe.name}
                        </h4>
                        <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', margin: '2px 0 0' }}>
                          {time} min
                        </p>
                      </div>
                      <ChevronRight size={18} color="var(--color-text-muted)" style={{ flexShrink: 0 }} />
                    </div>
                  )
                })}
              </div>
            ) : (
              <button
                onClick={() => onNavigate('browse')}
                style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px', background: 'var(--color-card)', border: '1.5px dashed #dbe2d6', borderRadius: '14px', cursor: 'pointer', textAlign: 'left', width: '100%' }}
              >
                <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'var(--color-error-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Heart size={18} color="#ef4444" />
                </div>
                <div style={{ minWidth: 0 }}>
                  <p style={{ fontSize: '14px', fontWeight: '600', color: 'var(--color-text)', margin: 0 }}>No favorites yet</p>
                  <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', margin: '2px 0 0' }}>Tap the heart on a recipe to save it</p>
                </div>
              </button>
            )}
          </div>

          {/* Cookbooks — same shelf shape as the recipes they group. */}
          <div style={{ marginBottom: '28px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h2 style={{ fontSize: '15px', fontWeight: '700', color: 'var(--color-text)', margin: 0, letterSpacing: '-0.01em' }}>
                Cookbooks
              </h2>
              {cookbooks.length > 0 && (
                <button onClick={() => onNavigate('cookbooks')} style={{ background: 'none', border: 'none', color: '#6ba356', fontSize: '13px', fontWeight: '600', cursor: 'pointer', padding: 0 }}>
                  See all →
                </button>
              )}
            </div>

            {cookbooks.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {cookbooks.slice(0, 6).map((book: any, i: number) => {
                  const count = book.recipes?.length ?? 0
                  const tint = COOKBOOK_COLORS[i % COOKBOOK_COLORS.length]
                  return (
                    <div
                      key={book.id}
                      onClick={() => onNavigate('cookbook', { cookbookId: book.id })}
                      style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 14px', background: 'var(--color-card)', borderRadius: '14px', border: '1px solid var(--color-subtle)', boxShadow: '0 1px 3px rgba(0,0,0,0.04)', cursor: 'pointer' }}
                    >
                      {/* Small tinted book tile, echoing the meal cards' icon squares
                          rather than the old full-bleed colour block. */}
                      <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: tint + '2e', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', flexShrink: 0 }}>
                        📖
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <h4 style={{ fontSize: '14px', fontWeight: '600', color: 'var(--color-text)', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {book.name}
                        </h4>
                        <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', margin: '2px 0 0' }}>
                          {count} recipe{count === 1 ? '' : 's'}
                        </p>
                      </div>
                      <ChevronRight size={18} color="var(--color-text-muted)" style={{ flexShrink: 0 }} />
                    </div>
                  )
                })}
              </div>
            ) : (
              <button
                onClick={() => onNavigate('cookbooks')}
                style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px', background: 'var(--color-card)', border: '1.5px dashed #dbe2d6', borderRadius: '14px', cursor: 'pointer', textAlign: 'left', width: '100%' }}
              >
                <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'var(--color-primary-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <BookOpen size={18} color="#6ba356" />
                </div>
                <div style={{ minWidth: 0 }}>
                  <p style={{ fontSize: '14px', fontWeight: '600', color: 'var(--color-text)', margin: 0 }}>No cookbooks yet</p>
                  <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', margin: '2px 0 0' }}>Group your recipes into one</p>
                </div>
              </button>
            )}
          </div>
        </div>
      </div>
      <BottomNavigation active="home" onNavigate={onNavigate} />
    </div>
  )
}
