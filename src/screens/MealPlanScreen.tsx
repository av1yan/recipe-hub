import { useState, useEffect } from 'react'
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import type { Screen, MealPlan, Recipe } from '../types'
import { BottomNavigation } from '../components/BottomNavigation'
import { mealPlanAPI, recipeAPI } from '../utils/api'

interface Props {
  onNavigate: (screen: Screen) => void
}

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
const MEAL_TYPES = ['breakfast', 'lunch', 'dinner']

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

  const currentPlan = mealPlans.find(p => p.id === currentPlanId)

  if (isLoading) {
    return (
      <div className="screen">
        <header style={{ padding: '12px 16px', borderBottom: '1px solid rgba(15, 23, 42, 0.08)', background: '#fff' }}>
          <h2 style={{ fontSize: '18px', margin: 0 }}>Meal Plan</h2>
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
        <header style={{ padding: '12px 16px', borderBottom: '1px solid rgba(15, 23, 42, 0.08)', background: '#fff' }}>
          <h2 style={{ fontSize: '18px', margin: 0 }}>Meal Plan</h2>
        </header>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', gap: '16px' }}>
          <p>No meal plans yet</p>
          <button onClick={createNewMealPlan} className="btn" style={{ background: '#c67139', color: '#fff' }}>
            Create Meal Plan
          </button>
        </div>
        <BottomNavigation active="meal-plan" onNavigate={(s) => onNavigate(s as Screen)} />
      </div>
    )
  }

  return (
    <div className="screen">
      <header style={{ padding: '12px 16px', borderBottom: '1px solid rgba(15, 23, 42, 0.08)', background: '#fff' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontSize: '18px', margin: 0 }}>Meal Plan</h2>
          <button
            onClick={createNewMealPlan}
            className="btn btn-icon"
            style={{ background: 'transparent', color: '#c67139', padding: '4px' }}
          >
            <Plus size={20} />
          </button>
        </div>
      </header>

      <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* Week Navigation */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', padding: '8px', background: '#f8f9fa', borderRadius: '8px' }}>
          <button
            className="btn btn-icon"
            style={{ background: 'transparent', color: '#1e293b', padding: '4px' }}
          >
            <ChevronLeft size={20} />
          </button>
          <select
            value={currentPlanId || ''}
            onChange={(e) => setCurrentPlanId(e.target.value)}
            className="input"
            style={{ flex: 1, fontSize: '14px' }}
          >
            {mealPlans.map(plan => (
              <option key={plan.id} value={plan.id}>
                Week starting {new Date(plan.weekStart).toLocaleDateString()}
              </option>
            ))}
          </select>
          <button
            className="btn btn-icon"
            style={{ background: 'transparent', color: '#1e293b', padding: '4px' }}
          >
            <ChevronRight size={20} />
          </button>
        </div>

        {/* Daily Meal Grid */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {DAYS.map(day => (
            <div key={day} style={{ background: '#fff', borderRadius: '12px', overflow: 'hidden', border: '1px solid rgba(15, 23, 42, 0.08)' }}>
              <div style={{ padding: '12px 16px', background: '#f8f9fa', borderBottom: '1px solid rgba(15, 23, 42, 0.08)', fontWeight: '600', fontSize: '14px' }}>
                {day}
              </div>
              <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {MEAL_TYPES.map(mealType => {
                  const meal = currentPlan?.meals?.[day]?.[mealType as keyof typeof currentPlan.meals[typeof day]]
                  return (
                    <div key={mealType} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ width: '70px', fontSize: '12px', fontWeight: '600', color: '#94a3b8', textTransform: 'capitalize' }}>
                        {mealType}
                      </div>
                      {meal ? (
                        <div style={{ flex: 1, padding: '8px', background: '#f1f5f9', borderRadius: '6px', fontSize: '13px' }}>
                          {Array.isArray(meal) ? meal[0]?.name : (meal as Recipe)?.name || 'Meal'}
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            setSelectedDay(day)
                            setSelectedMealType(mealType)
                            setShowRecipeSelector(true)
                          }}
                          className="btn btn-icon"
                          style={{ background: '#e8ede5', color: '#7a8a5e', padding: '6px' }}
                        >
                          <Plus size={16} />
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
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
        }}>
          <div style={{
            background: '#fff',
            width: '100%',
            borderTopLeftRadius: '16px',
            borderTopRightRadius: '16px',
            maxHeight: '60vh',
            overflowY: 'auto',
            padding: '16px',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: '600', margin: 0 }}>
                Select {selectedMealType} for {selectedDay}
              </h3>
              <button
                onClick={() => setShowRecipeSelector(false)}
                className="btn btn-icon"
                style={{ background: 'transparent', color: '#1e293b' }}
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

      <BottomNavigation active="meal-plan" onNavigate={(s) => onNavigate(s as Screen)} />
    </div>
  )
}
