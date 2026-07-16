import { useState, useEffect } from 'react'
import { Plus, X } from 'lucide-react'
import type { Screen, MealPlan, Recipe } from '../types'
import { BottomNavigation } from '../components/BottomNavigation'
import { mealPlanAPI, recipeAPI } from '../utils/api'

interface Props {
  onNavigate: (screen: Screen) => void
}

const DAY_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

const MEALS = [
  { key: 'breakfast', label: 'Breakfast', tint: '#fef3c7', emoji: '🍳' },
  { key: 'lunch', label: 'Lunch', tint: '#eaf6e0', emoji: '🥗' },
  { key: 'dinner', label: 'Dinner', tint: '#e5e9ff', emoji: '🍽️' },
  { key: 'snack', label: 'Snack', tint: '#fce7f3', emoji: '🍎' },
]

// Returns the recipe(s) planned for a given day + meal type as an array.
function getMeals(plan: MealPlan | undefined, dayName: string, mealType: string): any[] {
  const dayMeals: any = plan?.meals?.[dayName]
  if (!dayMeals) return []
  const value = dayMeals[mealType] ?? dayMeals.snacks
  if (!value) return []
  return Array.isArray(value) ? value : [value]
}

export default function MealPlanScreen({ onNavigate }: Props) {
  const [mealPlans, setMealPlans] = useState<MealPlan[]>([])
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [currentPlanId, setCurrentPlanId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [selectedDay, setSelectedDay] = useState<string>(() => DAY_NAMES[(new Date().getDay() + 6) % 7])
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

  const openAdd = (mealType: string) => {
    setSelectedMealType(mealType)
    setShowRecipeSelector(true)
  }

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

  if (mealPlans.length === 0) {
    return (
      <div className="screen">
        <header style={{ padding: '16px', background: '#fff' }}>
          <h1 style={{ fontSize: '26px', fontWeight: '800', margin: 0, color: '#1e293b' }}>Meal Plan</h1>
        </header>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '18px', padding: '24px' }}>
          <div style={{ fontSize: '64px' }}>🗓️</div>
          <div style={{ textAlign: 'center' }}>
            <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#1e293b', margin: '0 0 6px' }}>No meal plan yet</h3>
            <p style={{ fontSize: '14px', color: '#64748b', margin: 0 }}>Plan your week and cook with less guesswork.</p>
          </div>
          <button onClick={createNewMealPlan} style={{ background: 'linear-gradient(135deg, #fb8a72, #ef5a41)', color: '#fff', padding: '14px 28px', fontSize: '15px', fontWeight: '700', borderRadius: '14px', border: 'none', cursor: 'pointer', boxShadow: '0 4px 14px rgba(242,109,91,0.35)' }}>
            Create a meal plan
          </button>
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
          <button onClick={createNewMealPlan} aria-label="New meal plan" style={{ width: '34px', height: '34px', borderRadius: '11px', background: '#fdeeeb', color: '#f26d5b', border: '1.5px solid #f7d2ca', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Plus size={17} />
          </button>
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
        {MEALS.map(m => {
          const meals = getMeals(currentPlan, selectedDay, m.key)
          return (
            <div key={m.key} style={{ marginBottom: '22px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <h3 style={{ fontSize: '17px', fontWeight: '700', color: '#1e293b', margin: 0 }}>{m.label}</h3>
                <button onClick={() => openAdd(m.key)} style={{ background: 'none', border: 'none', color: '#f26d5b', fontSize: '14px', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '3px' }}>
                  <Plus size={15} /> Add
                </button>
              </div>

              {meals.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
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
              ) : (
                <button onClick={() => openAdd(m.key)} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '12px', padding: '14px', background: '#fff', border: '1.5px dashed #f0d8d2', borderRadius: '16px', cursor: 'pointer', textAlign: 'left' }}>
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
                    <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: '#fdeeeb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', flexShrink: 0 }}>
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
