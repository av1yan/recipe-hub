import { useState, useEffect } from 'react'
import { ChevronLeft, ChevronRight, Sparkles } from 'lucide-react'
import type { Screen, MealPlan, Recipe } from '../types'
import { BottomNavigation } from '../components/BottomNavigation'
import { mealPlanAPI, recipeAPI } from '../utils/api'

interface Props {
  onNavigate: (screen: Screen) => void
}

const DAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN']
const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
const MEAL_TYPES = ['breakfast', 'lunch', 'dinner']

const MEAL_COLORS: { [key: string]: string } = {
  breakfast: '#f4b860',
  lunch: '#6ba356',
  dinner: '#c67139',
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
      const [plansData, recipesData] = await Promise.all([
        mealPlanAPI.list(),
        recipeAPI.list(),
      ])
      setMealPlans(plansData)
      setRecipes(recipesData)
      if (plansData.length > 0) {
        setCurrentPlanId(plansData[0].id)
      }
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
      setMealPlans([...mealPlans, plan])
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

  function getWeekDateRange(weekStart: Date) {
    const start = new Date(weekStart)
    const end = new Date(start)
    end.setDate(end.getDate() + 6)
    return { start, end }
  }

  function getDayNumber(index: number, weekStart: Date) {
    const date = new Date(weekStart)
    date.setDate(date.getDate() + index)
    return date.getDate()
  }

  const currentPlan = mealPlans.find(p => p.id === currentPlanId)

  if (isLoading) {
    return (
      <div className="screen">
        <header style={{ padding: '16px', background: '#fff', borderBottom: '1px solid rgba(15, 23, 42, 0.08)' }}>
          <h1 style={{ fontSize: '24px', fontWeight: '700', margin: 0, color: '#1e293b' }}>Meal Plan</h1>
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
      <div className="screen">
        <header style={{ padding: '16px', background: '#fff', borderBottom: '1px solid rgba(15, 23, 42, 0.08)' }}>
          <h1 style={{ fontSize: '24px', fontWeight: '700', margin: 0, color: '#1e293b' }}>Meal Plan</h1>
        </header>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', gap: '16px' }}>
          <p>No meal plans yet</p>
          <button onClick={createNewMealPlan} className="btn" style={{ background: '#4f46e5', color: '#fff', padding: '12px 24px', fontSize: '16px', fontWeight: '600', borderRadius: '8px' }}>
            Create Your First Meal Plan
          </button>
        </div>
        <BottomNavigation active="meal-plan" onNavigate={(s) => onNavigate(s as Screen)} />
      </div>
    )
  }

  return (
    <div className="screen" style={{ background: '#fafaf9' }}>
      <header style={{ padding: '16px', background: '#fff', borderBottom: '1px solid rgba(15, 23, 42, 0.08)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h1 style={{ fontSize: '24px', fontWeight: '700', margin: 0, color: '#1e293b' }}>Meal Plan</h1>
          <button
            onClick={createNewMealPlan}
            className="btn btn-icon"
            style={{
              background: 'transparent',
              color: '#4f46e5',
              padding: '8px',
              cursor: 'pointer',
              fontSize: '20px',
              transition: 'transform 0.2s',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.1)')}
            onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
          >
            +
          </button>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
          <button
            className="btn btn-icon"
            style={{ background: 'transparent', color: '#1e293b', padding: '4px' }}
          >
            <ChevronLeft size={20} />
          </button>
          <div style={{ flex: 1, textAlign: 'center' }}>
            <select
              value={currentPlanId || mealPlans[0]?.id || ''}
              onChange={(e) => setCurrentPlanId(e.target.value)}
              className="input"
              style={{ fontSize: '12px', textAlign: 'center', background: 'transparent', border: 'none', color: '#94a3b8' }}
            >
              {mealPlans.length === 0 ? (
                <option value="">No meal plans</option>
              ) : (
                mealPlans.map(plan => (
                  <option key={plan.id} value={plan.id}>
                    Jul 14-20, 2025
                  </option>
                ))
              )}
            </select>
          </div>
          <button
            className="btn btn-icon"
            style={{ background: 'transparent', color: '#1e293b', padding: '4px' }}
          >
            <ChevronRight size={20} />
          </button>
        </div>
      </header>

      <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {/* Day Selector Row */}
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '6px', background: '#fff', padding: '12px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          {DAYS.map((day, idx) => (
            <div
              key={day}
              style={{
                textAlign: 'center',
                padding: '10px 8px',
                borderRadius: '8px',
                background: idx === 1 ? '#4f46e5' : 'transparent',
                color: idx === 1 ? '#fff' : '#1e293b',
                fontSize: '10px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => {
                if (idx !== 1) {
                  e.currentTarget.style.background = '#f1f5f9'
                }
              }}
              onMouseLeave={(e) => {
                if (idx !== 1) {
                  e.currentTarget.style.background = 'transparent'
                }
              }}
            >
              <div>{day}</div>
              <div style={{ fontSize: '14px', fontWeight: '700', marginTop: '4px' }}>{getDayNumber(idx, new Date(currentPlan?.weekStart || new Date()))}</div>
            </div>
          ))}
        </div>

        {/* Meals Grid */}
        {['breakfast', 'lunch', 'dinner'].map(mealType => (
          <div key={mealType}>
            <h3 style={{ fontSize: '12px', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '12px', marginTop: 0 }}>
              {mealType}
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', animation: 'fadeIn 0.3s ease' }}>
              {DAYS.map((day, dayIdx) => {
                const dayName = DAY_NAMES[dayIdx]
                const meal = currentPlan?.meals?.[dayName]?.[mealType as keyof typeof currentPlan.meals[typeof dayName]]
                const mealColor = MEAL_COLORS[mealType]

                return (
                  <div
                    key={`${dayName}-${mealType}`}
                    onClick={() => {
                      if (!meal) {
                        setSelectedDay(dayName)
                        setSelectedMealType(mealType)
                        setShowRecipeSelector(true)
                      }
                    }}
                    style={{
                      padding: '12px',
                      background: meal ? mealColor : '#fff',
                      color: meal ? '#fff' : '#1e293b',
                      borderRadius: '12px',
                      cursor: 'pointer',
                      minHeight: '70px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      textAlign: 'center',
                      border: meal ? 'none' : '2px dashed #e2e8f0',
                      fontSize: '13px',
                      fontWeight: '500',
                      transition: 'all 0.3s ease',
                      transform: 'scale(1)',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'scale(1.05)'
                      e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'scale(1)'
                      e.currentTarget.style.boxShadow = 'none'
                    }}
                  >
                    {meal ? (
                      <div>
                        <div style={{ fontWeight: '600', fontSize: '13px' }}>
                          {Array.isArray(meal) ? meal[0]?.name : (meal as Recipe)?.name || 'Meal'}
                        </div>
                      </div>
                    ) : (
                      <div style={{ fontSize: '24px' }}>+</div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        ))}

        {/* Generate Button */}
        <button
          onClick={createNewMealPlan}
          style={{
            width: '100%',
            padding: '16px',
            background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
            color: '#fff',
            border: 'none',
            borderRadius: '12px',
            fontSize: '16px',
            fontWeight: '600',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            transition: 'all 0.3s ease',
            boxShadow: '0 4px 12px rgba(79, 70, 229, 0.3)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px)'
            e.currentTarget.style.boxShadow = '0 8px 20px rgba(79, 70, 229, 0.4)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)'
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(79, 70, 229, 0.3)'
          }}
        >
          <Sparkles size={18} />
          Generate Meal Plan
        </button>
      </div>

      {/* Recipe Selector Modal */}
      {showRecipeSelector && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'flex-end',
          zIndex: 999,
          animation: 'fadeIn 0.2s ease',
        }}>
          <div style={{
            background: '#fff',
            width: '100%',
            borderTopLeftRadius: '20px',
            borderTopRightRadius: '20px',
            maxHeight: '60vh',
            overflowY: 'auto',
            padding: '16px',
            animation: 'slideUp 0.3s ease',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: '600', margin: 0 }}>
                Select {selectedMealType} for {selectedDay}
              </h3>
              <button
                onClick={() => setShowRecipeSelector(false)}
                className="btn btn-icon"
                style={{ background: 'transparent', color: '#1e293b', fontSize: '24px', padding: '0' }}
              >
                ×
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {recipes.map(recipe => (
                <button
                  key={recipe.id}
                  onClick={() => addMealToPlan(recipe.id)}
                  style={{
                    padding: '12px',
                    background: '#f8f9fa',
                    border: '1px solid rgba(15, 23, 42, 0.08)',
                    borderRadius: '8px',
                    textAlign: 'left',
                    cursor: 'pointer',
                    fontSize: '14px',
                    transition: 'all 0.2s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#e8ede5'
                    e.currentTarget.style.transform = 'translateX(4px)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = '#f8f9fa'
                    e.currentTarget.style.transform = 'translateX(0)'
                  }}
                >
                  <div style={{ fontWeight: '600' }}>{recipe.name}</div>
                  <div style={{ fontSize: '12px', color: '#94a3b8' }}>
                    {recipe.cuisine} · {recipe.prepTime + recipe.cookTime} min
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
      `}</style>

      <BottomNavigation active="meal-plan" onNavigate={(s) => onNavigate(s as Screen)} />
    </div>
  )
}
