import { useState, useEffect } from 'react'
import { Search, Plus, CalendarDays, BookOpen } from 'lucide-react'
import type { Screen } from '../types'
import { BottomNavigation } from '../components/BottomNavigation'
import { recipeAPI, mealPlanAPI, cookbookAPI } from '../utils/api'
import { recipeImageSrc } from '../utils/image'
import { useApp } from '../context/AppContext'
import { DAY_NAMES, MEALS, sameWeek, getMeals } from './MealPlanScreen'

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
  const [recipes, setRecipes] = useState<any[]>([])
  const [todayMeals, setTodayMeals] = useState<{ meal: any; cfg: typeof MEALS[number] }[]>([])
  const [plannedThisWeek, setPlannedThisWeek] = useState(0)
  const [cookbooks, setCookbooks] = useState<any[]>([])

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
      if (!plan) return
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

  const recent = recipes.slice(0, 6)

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#f8fafc' }}>
      <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
        {/* Header */}
        <div style={{ background: '#fff', padding: '16px 16px 0', borderBottom: '1px solid #f1f5f9' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px', gap: '12px' }}>
            <div style={{ minWidth: 0 }}>
              <p style={{ color: '#94a3b8', fontSize: '11px', fontWeight: '600', letterSpacing: '0.06em', margin: '0 0 2px' }}>
                {getDateLabel()}
              </p>
              <h1 style={{ fontSize: '26px', fontWeight: '700', color: '#1e293b', margin: 0, lineHeight: 1.2 }}>
                {/* The wave is joined by a non-breaking space so it wraps with
                    the last word instead of stranding itself on its own line. */}
                {getGreeting()}{displayName ? `,\u00A0${displayName}` : ''}{'\u00A0\u{1F44B}'}
              </h1>
              <p style={{ fontSize: '13px', color: '#94a3b8', margin: '6px 0 0' }}>
                {recipes.length} recipe{recipes.length === 1 ? '' : 's'} · {plannedThisWeek} meal{plannedThisWeek === 1 ? '' : 's'} planned this week
              </p>
            </div>
            {/* The avatar is the only way into settings from here -- a gear
                beside it went to the same place and just split the target. */}
            <button
              onClick={() => onNavigate('settings')}
              aria-label="Settings"
              title={user?.name || undefined}
              style={{ width: '38px', height: '38px', borderRadius: '19px', border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg, #7ec063, #5a9449)', color: '#fff', fontSize: '15px', fontWeight: '700', flexShrink: 0 }}
            >
              {initial}
            </button>
          </div>

          {/* Search — hands off to Discover, which owns search */}
          <button
            onClick={() => onNavigate('browse')}
            style={{ width: '100%', background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '11px 14px', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', cursor: 'pointer', textAlign: 'left' }}
          >
            <Search size={16} color="#94a3b8" />
            <span style={{ flex: 1, fontSize: '14px', color: '#94a3b8' }}>What would you like to cook?</span>
          </button>
        </div>

        <div style={{ padding: '20px 16px 0' }}>
          {/* Today's meals — real plan data */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h2 style={{ fontSize: '15px', fontWeight: '700', color: '#1e293b', margin: 0, letterSpacing: '-0.01em' }}>
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
                  onClick={() => onNavigate('recipe', { recipe: meal })}
                  style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 14px', background: '#fff', borderRadius: '14px', border: '1px solid #f1f5f9', boxShadow: '0 1px 3px rgba(0,0,0,0.04)', cursor: 'pointer' }}
                >
                  <div style={{ width: '64px', height: '64px', borderRadius: '14px', background: cfg.tint, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px', flexShrink: 0, overflow: 'hidden' }}>
                    {meal.imageUrl
                      ? <img src={recipeImageSrc(meal.imageUrl, 64, 64)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => { e.currentTarget.style.display = 'none' }} />
                      : cfg.emoji}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: '10px', color: '#94a3b8', fontWeight: '600', margin: 0, letterSpacing: '0.06em' }}>
                      {cfg.label.toUpperCase()}
                    </p>
                    <h3 style={{ fontSize: '14px', fontWeight: '600', color: '#1e293b', margin: '2px 0 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {meal.name}
                    </h3>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <p style={{ fontSize: '12px', color: '#64748b', fontWeight: '500', margin: 0 }}>
                      {(meal.prepTime || 0) + (meal.cookTime || 0)} min
                    </p>
                    {meal.calories && <p style={{ fontSize: '11px', color: '#94a3b8', margin: '2px 0 0' }}>{meal.calories} cal</p>}
                  </div>
                </div>
              ))
            ) : (
              <button
                onClick={() => onNavigate('meal-plan')}
                style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px', background: '#fff', border: '1.5px dashed #dbe2d6', borderRadius: '14px', cursor: 'pointer', textAlign: 'left', width: '100%' }}
              >
                <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: '#f0f7ed', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <CalendarDays size={18} color="#6ba356" />
                </div>
                <div style={{ minWidth: 0 }}>
                  <p style={{ fontSize: '14px', fontWeight: '600', color: '#1e293b', margin: 0 }}>Nothing planned today</p>
                  <p style={{ fontSize: '12px', color: '#94a3b8', margin: '2px 0 0' }}>Tap to plan your day</p>
                </div>
              </button>
            )}
          </div>

          {/* Your recipes */}
          <div style={{ marginBottom: '28px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h2 style={{ fontSize: '15px', fontWeight: '700', color: '#1e293b', margin: 0, letterSpacing: '-0.01em' }}>
                Your Recipes
              </h2>
              {recipes.length > 0 && (
                <button onClick={() => onNavigate('browse')} style={{ background: 'none', border: 'none', color: '#6ba356', fontSize: '13px', fontWeight: '600', cursor: 'pointer', padding: 0 }}>
                  See all →
                </button>
              )}
            </div>

            {recent.length > 0 ? (
              <div style={{ display: 'flex', gap: '12px', overflowX: 'auto', paddingBottom: '4px', marginLeft: '-2px', paddingLeft: '2px' }}>
                {recent.map((recipe: any, i: number) => (
                  <div key={recipe.id} onClick={() => onNavigate('recipe', { recipe })} style={{ minWidth: '110px', cursor: 'pointer' }}>
                    <div style={{
                      width: '110px', height: '100px', borderRadius: '14px',
                      background: RECIPE_COLORS[i % RECIPE_COLORS.length] + '33',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '32px', marginBottom: '8px', overflow: 'hidden',
                      border: '1px solid ' + RECIPE_COLORS[i % RECIPE_COLORS.length] + '22',
                    }}>
                      {recipe.imageUrl
                        ? <img src={recipeImageSrc(recipe.imageUrl, 110, 100)} alt="" loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => { e.currentTarget.style.display = 'none' }} />
                        : '🍽️'}
                    </div>
                    <h4 style={{ fontSize: '12px', fontWeight: '600', color: '#1e293b', margin: '0 0 2px', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden', maxWidth: '110px' }}>
                      {recipe.name}
                    </h4>
                    <p style={{ fontSize: '11px', color: '#94a3b8', margin: 0 }}>
                      {(recipe.prepTime || 0) + (recipe.cookTime || 0)} min
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <button
                onClick={() => onNavigate('add-recipe')}
                style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px', background: '#fff', border: '1.5px dashed #dbe2d6', borderRadius: '14px', cursor: 'pointer', textAlign: 'left', width: '100%' }}
              >
                <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: '#f0f7ed', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Plus size={18} color="#6ba356" />
                </div>
                <div style={{ minWidth: 0 }}>
                  <p style={{ fontSize: '14px', fontWeight: '600', color: '#1e293b', margin: 0 }}>No recipes yet</p>
                  <p style={{ fontSize: '12px', color: '#94a3b8', margin: '2px 0 0' }}>Add your first one</p>
                </div>
              </button>
            )}
          </div>
        </div>
      </div>
          {/* Cookbooks — same shelf shape as the recipes they group. */}
          <div style={{ marginBottom: '28px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h2 style={{ fontSize: '15px', fontWeight: '700', color: '#1e293b', margin: 0, letterSpacing: '-0.01em' }}>
                Cookbooks
              </h2>
              {cookbooks.length > 0 && (
                <button onClick={() => onNavigate('cookbooks')} style={{ background: 'none', border: 'none', color: '#6ba356', fontSize: '13px', fontWeight: '600', cursor: 'pointer', padding: 0 }}>
                  See all →
                </button>
              )}
            </div>

            {cookbooks.length > 0 ? (
              <div style={{ display: 'flex', gap: '12px', overflowX: 'auto', paddingBottom: '4px', marginLeft: '-2px', paddingLeft: '2px' }}>
                {cookbooks.slice(0, 6).map((book: any, i: number) => (
                  <div key={book.id} onClick={() => onNavigate('cookbooks')} style={{ minWidth: '110px', cursor: 'pointer' }}>
                    <div style={{
                      width: '110px', height: '100px', borderRadius: '14px',
                      background: COOKBOOK_COLORS[i % COOKBOOK_COLORS.length],
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '32px', marginBottom: '8px',
                    }}>
                      📖
                    </div>
                    <h4 style={{ fontSize: '12px', fontWeight: '600', color: '#1e293b', margin: '0 0 2px', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden', maxWidth: '110px' }}>
                      {book.name}
                    </h4>
                    <p style={{ fontSize: '11px', color: '#94a3b8', margin: 0 }}>
                      {book.recipes?.length ?? 0} recipe{(book.recipes?.length ?? 0) === 1 ? '' : 's'}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <button
                onClick={() => onNavigate('cookbooks')}
                style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px', background: '#fff', border: '1.5px dashed #dbe2d6', borderRadius: '14px', cursor: 'pointer', textAlign: 'left', width: '100%' }}
              >
                <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: '#f0f7ed', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <BookOpen size={18} color="#6ba356" />
                </div>
                <div style={{ minWidth: 0 }}>
                  <p style={{ fontSize: '14px', fontWeight: '600', color: '#1e293b', margin: 0 }}>No cookbooks yet</p>
                  <p style={{ fontSize: '12px', color: '#94a3b8', margin: '2px 0 0' }}>Group your recipes into one</p>
                </div>
              </button>
            )}
          </div>

      <BottomNavigation active="home" onNavigate={onNavigate} />
    </div>
  )
}
