import { useState, useEffect } from 'react'
import { ChevronLeft, ChevronRight, Plus, Coffee, Salad, Moon, Cookie, ShoppingCart, X } from 'lucide-react'
import type { Screen, MealPlan, Recipe } from '../types'
import { BottomNavigation } from '../components/BottomNavigation'
import { mealPlanAPI, recipeAPI } from '../utils/api'

interface Props {
  onNavigate: (screen: Screen) => void
}

const DAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN']
const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

const MEALS = [
  { key: 'breakfast', label: 'Breakfast', Icon: Coffee, color: '#f59e0b', tint: '#fef3c7', emoji: '🍳' },
  { key: 'lunch', label: 'Lunch', Icon: Salad, color: '#6ba356', tint: '#eaf6e0', emoji: '🥗' },
  { key: 'dinner', label: 'Dinner', Icon: Moon, color: '#6366f1', tint: '#e5e9ff', emoji: '🍽️' },
  { key: 'snack', label: 'Snack', Icon: Cookie, color: '#ec4899', tint: '#fce7f3', emoji: '🍎' },
]

// Layout constants keep the fixed label column aligned with the scrolling day cells.
const HEADER_H = 46
const CELL_H = 62
const ROW_GAP = 10
const DAY_COL_W = 86
const LABEL_W = 58

function getMeal(plan: MealPlan | undefined, dayName: string, mealType: string): any {
  const dayMeals: any = plan?.meals?.[dayName]
  if (!dayMeals) return null
  // The API keys every meal type (including snack) singularly under the day.
  const value = dayMeals[mealType] ?? dayMeals.snacks
  return Array.isArray(value) ? value[0] || null : value || null
}

function weekLabel(weekStart: Date): string {
  const s = new Date(weekStart)
  const e = new Date(s)
  e.setDate(e.getDate() + 6)
  const mo = (d: Date) => d.toLocaleDateString('en-US', { month: 'short' })
  const endPart = mo(e) !== mo(s) ? `${mo(e)} ${e.getDate()}` : `${e.getDate()}`
  return `${mo(s)} ${s.getDate()} – ${endPart}, ${e.getFullYear()}`
}

export default function MealPlanScreen({ onNavigate }: Props) {
  const [mealPlans, setMealPlans] = useState<MealPlan[]>([])
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [currentPlanId, setCurrentPlanId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [selectedDay, setSelectedDay] = useState<string | null>(null)
  const [selectedMealType, setSelectedMealType] = useState<string | null>(null)
  const [showRecipeSelector, setShowRecipeSelector] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    try {
      setIsLoading(true)
      const [plansData, recipesData] = await Promise.all([mealPlanAPI.list(), recipeAPI.list()])
      setMealPlans(plansData)
      setRecipes(recipesData)
      if (plansData.length > 0) setCurrentPlanId(plansData[0].id)
    } catch (error) {
      console.error('Failed to load meal plan data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  async function createNewMealPlan() {
    try {
      const weekStart = new Date()
      weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1)
      const plan = await mealPlanAPI.create(weekStart)
      setMealPlans(prev => [...prev, plan])
      setCurrentPlanId(plan.id)
    } catch (error) {
      console.error('Failed to create meal plan:', error)
    }
  }

  async function addMealToPlan(recipeId: string) {
    if (!currentPlanId || !selectedDay || !selectedMealType) return
    try {
      await mealPlanAPI.addMeal(currentPlanId, recipeId, selectedDay, selectedMealType)
      await loadData()
      setShowRecipeSelector(false)
      setSelectedDay(null)
      setSelectedMealType(null)
    } catch (error) {
      console.error('Failed to add meal to plan:', error)
    }
  }

  function getDayNumber(index: number, weekStart: Date) {
    const date = new Date(weekStart)
    date.setDate(date.getDate() + index)
    return date.getDate()
  }

  const currentPlan = mealPlans.find(p => p.id === currentPlanId)
  const weekStart = new Date(currentPlan?.weekStart || new Date())

  // Planning summary
  let plannedCount = 0
  let totalCalories = 0
  DAY_NAMES.forEach(dayName => {
    MEALS.forEach(m => {
      const meal = getMeal(currentPlan, dayName, m.key)
      if (meal) {
        plannedCount++
        totalCalories += meal.calories || 0
      }
    })
  })
  const totalSlots = DAYS.length * MEALS.length
  const pct = totalSlots ? plannedCount / totalSlots : 0

  const openAdd = (dayName: string, mealType: string) => {
    setSelectedDay(dayName)
    setSelectedMealType(mealType)
    setShowRecipeSelector(true)
  }

  if (isLoading) {
    return (
      <div className="screen" style={{ background: '#f7f8f5' }}>
        <header style={{ padding: '16px', background: '#fff' }}>
          <h1 style={{ fontSize: '24px', fontWeight: '800', margin: 0, color: '#1e293b' }}>Meal Plan</h1>
        </header>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
          <p>Loading meal plans...</p>
        </div>
        <BottomNavigation active="meal-plan" onNavigate={(s) => onNavigate(s as Screen)} />
      </div>
    )
  }

  if (mealPlans.length === 0) {
    return (
      <div className="screen" style={{ background: '#f7f8f5' }}>
        <header style={{ padding: '16px', background: '#fff' }}>
          <h1 style={{ fontSize: '24px', fontWeight: '800', margin: 0, color: '#1e293b' }}>Meal Plan</h1>
        </header>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '18px', padding: '24px' }}>
          <div style={{ fontSize: '64px' }}>🗓️</div>
          <div style={{ textAlign: 'center' }}>
            <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#1e293b', margin: '0 0 6px' }}>No meal plan yet</h3>
            <p style={{ fontSize: '14px', color: '#64748b', margin: 0 }}>Plan your week and cook with less guesswork.</p>
          </div>
          <button onClick={createNewMealPlan} style={{ background: 'linear-gradient(135deg, #7ec063, #5a9449)', color: '#fff', padding: '14px 28px', fontSize: '15px', fontWeight: '700', borderRadius: '14px', border: 'none', cursor: 'pointer', boxShadow: '0 4px 14px rgba(107,163,86,0.3)' }}>
            Create a meal plan
          </button>
        </div>
        <BottomNavigation active="meal-plan" onNavigate={(s) => onNavigate(s as Screen)} />
      </div>
    )
  }

  const R = 24
  const CIRC = 2 * Math.PI * R

  return (
    <div className="screen" style={{ background: '#f7f8f5' }}>
      <header style={{ padding: '14px 16px 12px', background: '#fff' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <h1 style={{ fontSize: '24px', fontWeight: '800', margin: 0, color: '#1e293b' }}>Meal Plan</h1>
          <button onClick={createNewMealPlan} aria-label="New week" style={{ width: '36px', height: '36px', borderRadius: '12px', background: '#f0f7ed', color: '#6ba356', border: '1.5px solid #c8e0bc', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Plus size={18} />
          </button>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button style={{ width: '30px', height: '30px', borderRadius: '9px', background: '#f1f5f9', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>
            <ChevronLeft size={18} />
          </button>
          <span style={{ fontSize: '14px', fontWeight: '700', color: '#334155' }}>{weekLabel(weekStart)}</span>
          <button style={{ width: '30px', height: '30px', borderRadius: '9px', background: '#f1f5f9', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>
            <ChevronRight size={18} />
          </button>
        </div>
      </header>

      <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
        {/* Summary card */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', background: '#fff', borderRadius: '18px', padding: '16px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
          <div style={{ position: 'relative', width: '58px', height: '58px', flexShrink: 0 }}>
            <svg width="58" height="58" viewBox="0 0 58 58">
              <circle cx="29" cy="29" r={R} fill="none" stroke="#eef2ee" strokeWidth="7" />
              <circle cx="29" cy="29" r={R} fill="none" stroke="url(#ringGrad)" strokeWidth="7" strokeLinecap="round" strokeDasharray={CIRC} strokeDashoffset={CIRC * (1 - pct)} transform="rotate(-90 29 29)" style={{ transition: 'stroke-dashoffset 0.5s ease' }} />
              <defs>
                <linearGradient id="ringGrad" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0" stopColor="#6ba356" />
                  <stop offset="1" stopColor="#f4b860" />
                </linearGradient>
              </defs>
            </svg>
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '15px', fontWeight: '800', color: '#1e293b' }}>
              {plannedCount}
            </div>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: '15px', fontWeight: '700', color: '#1e293b', margin: 0 }}>
              {plannedCount === 0 ? 'Nothing planned yet' : `${plannedCount} meal${plannedCount === 1 ? '' : 's'} planned`}
            </p>
            <p style={{ fontSize: '13px', color: '#94a3b8', margin: '2px 0 0' }}>
              of {totalSlots} this week{totalCalories > 0 ? ` · ~${totalCalories.toLocaleString()} kcal` : ''}
            </p>
          </div>
        </div>

        {/* Meal matrix */}
        <div style={{ display: 'flex', gap: '8px' }}>
          {/* Fixed meal-type labels */}
          <div style={{ flexShrink: 0, width: `${LABEL_W}px` }}>
            <div style={{ height: `${HEADER_H}px` }} />
            {MEALS.map(m => (
              <div key={m.key} style={{ height: `${CELL_H}px`, marginTop: `${ROW_GAP}px`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '5px' }}>
                <div style={{ width: '34px', height: '34px', borderRadius: '12px', background: m.tint, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <m.Icon size={17} color={m.color} />
                </div>
                <span style={{ fontSize: '9px', fontWeight: '700', color: '#64748b', letterSpacing: '0.02em' }}>{m.label}</span>
              </div>
            ))}
          </div>

          {/* Scrollable day columns */}
          <div style={{ flex: 1, overflowX: 'auto', paddingBottom: '4px' }}>
            <div style={{ display: 'flex', gap: '8px', minWidth: 'max-content' }}>
              {DAYS.map((day, dayIdx) => {
                const dayNum = getDayNumber(dayIdx, weekStart)
                const isToday = new Date().getDate() === dayNum && new Date().getMonth() === new Date(weekStart).getMonth()
                return (
                  <div key={day} style={{ width: `${DAY_COL_W}px` }}>
                    <div style={{ height: `${HEADER_H}px`, borderRadius: '12px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: isToday ? '#6ba356' : 'transparent' }}>
                      <span style={{ fontSize: '10px', fontWeight: '700', color: isToday ? 'rgba(255,255,255,0.85)' : '#94a3b8' }}>{day}</span>
                      <span style={{ fontSize: '16px', fontWeight: '800', color: isToday ? '#fff' : '#1e293b' }}>{dayNum}</span>
                    </div>
                    {MEALS.map(m => {
                      const meal = getMeal(currentPlan, DAY_NAMES[dayIdx], m.key)
                      return (
                        <div
                          key={m.key}
                          onClick={() => { if (!meal) openAdd(DAY_NAMES[dayIdx], m.key) }}
                          title={meal?.name || `Add ${m.label.toLowerCase()}`}
                          style={{
                            height: `${CELL_H}px`, marginTop: `${ROW_GAP}px`, borderRadius: '14px',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            cursor: 'pointer', overflow: 'hidden',
                            background: meal ? m.tint : '#fff',
                            border: meal ? `1.5px solid ${m.color}30` : '1.5px dashed #dbe2d6',
                            transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                          }}
                          onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 14px rgba(0,0,0,0.08)' }}
                          onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none' }}
                        >
                          {meal ? (
                            <span style={{ fontSize: '28px', lineHeight: 1 }}>{(meal as any).emoji || m.emoji}</span>
                          ) : (
                            <Plus size={20} color="#c3cdba" />
                          )}
                        </div>
                      )
                    })}
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* CTA */}
        <button
          onClick={() => onNavigate('grocery')}
          style={{ width: '100%', padding: '15px', background: 'linear-gradient(135deg, #7ec063, #5a9449)', color: '#fff', border: 'none', borderRadius: '14px', fontSize: '15px', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', boxShadow: '0 4px 14px rgba(107,163,86,0.25)', marginTop: '4px' }}
        >
          <ShoppingCart size={17} />
          Go to grocery list
        </button>
      </div>

      {/* Recipe Selector Modal */}
      {showRecipeSelector && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'flex-end', zIndex: 999, animation: 'fadeIn 0.2s ease' }}>
          <div style={{ background: '#fff', width: '100%', borderTopLeftRadius: '22px', borderTopRightRadius: '22px', maxHeight: '66vh', overflowY: 'auto', padding: '16px', animation: 'slideUp 0.3s ease' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: '700', margin: 0, color: '#1e293b', textTransform: 'capitalize' }}>Add {selectedMealType}</h3>
                <p style={{ fontSize: '12px', color: '#94a3b8', margin: '2px 0 0' }}>{selectedDay}</p>
              </div>
              <button onClick={() => setShowRecipeSelector(false)} aria-label="Close" style={{ width: '32px', height: '32px', borderRadius: '10px', background: '#f1f5f9', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>
                <X size={18} />
              </button>
            </div>
            {recipes.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '32px 0', color: '#94a3b8' }}>
                <div style={{ fontSize: '36px', marginBottom: '8px' }}>🍽️</div>
                <p style={{ fontSize: '14px', margin: 0 }}>No recipes yet — add some first.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {recipes.map(recipe => (
                  <button
                    key={recipe.id}
                    onClick={() => addMealToPlan(recipe.id)}
                    style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', background: '#f8fafc', border: '1px solid #eef2f6', borderRadius: '12px', textAlign: 'left', cursor: 'pointer' }}
                  >
                    <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: '#f0f7ed', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', flexShrink: 0 }}>
                      {(recipe as any).emoji || '🍽️'}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: '600', fontSize: '14px', color: '#1e293b' }}>{recipe.name}</div>
                      <div style={{ fontSize: '12px', color: '#94a3b8' }}>
                        {recipe.cuisine} · {(recipe.prepTime || 0) + (recipe.cookTime || 0)} min
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes slideUp { from { transform: translateY(100%) } to { transform: translateY(0) } }
      `}</style>

      <BottomNavigation active="meal-plan" onNavigate={(s) => onNavigate(s as Screen)} />
    </div>
  )
}
