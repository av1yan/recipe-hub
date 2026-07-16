import { useState, useEffect } from 'react'
import { Search, Plus, Calendar, ShoppingCart, Settings } from 'lucide-react'
import type { Screen } from '../types'
import { BottomNavigation } from '../components/BottomNavigation'
import { recipeAPI } from '../utils/api'

interface Props {
  onNavigate: (screen: Screen, data?: any) => void
}

const RECIPE_COLORS = ['#d4a574', '#6ba356', '#c67139', '#5b9acd']

export default function HomeScreen({ onNavigate }: Props) {
  const [recipes, setRecipes] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadRecipes = async () => {
      try {
        const data = await recipeAPI.list()
        setRecipes(data)
      } catch (error) {
        console.error('Failed to load recipes:', error)
      } finally {
        setLoading(false)
      }
    }

    loadRecipes()
  }, [])

  const handleRecipeClick = (recipe: any) => {
    onNavigate('recipe', { recipe })
  }

  const getColorByIndex = (index: number) => RECIPE_COLORS[index % RECIPE_COLORS.length]

  const todaysMeals = [
    { type: 'Breakfast', name: 'Shakshuka', time: '30 min', cal: '320 cal', color: '#d4a574' },
    { type: 'Lunch', name: 'Caesar Salad', time: '15 min', cal: '320 cal', color: '#6ba356' },
    { type: 'Dinner', name: 'Thai Green Curry', time: '45 min', cal: '480 cal', color: '#c67139' }
  ]

  return (
    <div className="screen" style={{ background: '#fff', paddingBottom: '60px' }}>
      {/* Header */}
      <div style={{ padding: '20px 16px 0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div>
            <p style={{ color: '#94a3b8', fontSize: '12px', fontWeight: '500', margin: '0 0 4px' }}>
              TUESDAY, JUL 15
            </p>
            <h1 style={{ fontSize: '28px', fontWeight: '700', color: '#1e293b', margin: 0 }}>
              Good morning! 👋
            </h1>
          </div>
          <button
            onClick={() => onNavigate('settings')}
            style={{
              background: '#f1f5f9',
              border: 'none',
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer'
            }}
          >
            <Settings size={20} color="#475569" />
          </button>
        </div>

        {/* Search Bar */}
        <div style={{
          background: '#f1f5f9',
          border: '1px solid #e2e8f0',
          borderRadius: '12px',
          padding: '12px 14px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          marginBottom: '20px'
        }}>
          <Search size={18} color="#94a3b8" />
          <input
            type="text"
            placeholder="Search recipes..."
            style={{
              flex: 1,
              border: 'none',
              background: 'transparent',
              fontSize: '14px',
              color: '#1e293b',
              outline: 'none',
              fontFamily: 'inherit'
            }}
          />
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '10px', marginBottom: '28px' }}>
          <button
            onClick={() => onNavigate('add-recipe')}
            style={{
              flex: 1,
              padding: '12px',
              background: '#6ba356',
              color: '#fff',
              border: 'none',
              borderRadius: '10px',
              fontSize: '13px',
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              cursor: 'pointer'
            }}
          >
            <Plus size={16} />
            Add Recipe
          </button>
          <button
            onClick={() => onNavigate('meal-plan')}
            style={{
              flex: 1,
              padding: '12px',
              background: '#e8f5f0',
              color: '#6ba356',
              border: '1px solid #d0ebe4',
              borderRadius: '10px',
              fontSize: '13px',
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              cursor: 'pointer'
            }}
          >
            <Calendar size={16} />
            Meal Plan
          </button>
          <button
            onClick={() => onNavigate('grocery')}
            style={{
              flex: 1,
              padding: '12px',
              background: 'transparent',
              color: '#1e293b',
              border: '1px solid #e2e8f0',
              borderRadius: '10px',
              fontSize: '13px',
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              cursor: 'pointer'
            }}
          >
            <ShoppingCart size={16} />
            List
          </button>
        </div>
      </div>

      {/* Today's Meals */}
      <div style={{ paddingLeft: '16px', paddingRight: '16px', marginBottom: '28px' }}>
        <h2 style={{ fontSize: '16px', fontWeight: '700', color: '#1e293b', margin: '0 0 12px' }}>
          Today's Meals
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {todaysMeals.map((meal, index) => (
            <div key={index} style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '12px',
              background: '#f8fafc',
              borderRadius: '12px',
              cursor: 'pointer'
            }}>
              <div style={{
                width: '48px',
                height: '48px',
                borderRadius: '10px',
                background: meal.color
              }} />
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: '12px', color: '#94a3b8', fontWeight: '500', margin: 0, textTransform: 'uppercase' }}>
                  {meal.type}
                </p>
                <h3 style={{ fontSize: '14px', fontWeight: '600', color: '#1e293b', margin: '4px 0 0' }}>
                  {meal.name}
                </h3>
              </div>
              <div style={{ textAlign: 'right' }}>
                <p style={{ fontSize: '12px', color: '#94a3b8', margin: 0 }}>
                  {meal.time}
                </p>
                <p style={{ fontSize: '12px', color: '#94a3b8', margin: '4px 0 0' }}>
                  {meal.cal}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Recipes */}
      <div style={{ marginBottom: '28px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingLeft: '16px', paddingRight: '16px', marginBottom: '12px' }}>
          <h2 style={{ fontSize: '16px', fontWeight: '700', color: '#1e293b', margin: 0 }}>
            Recent Recipes
          </h2>
          <button
            onClick={() => onNavigate('browse')}
            style={{
              background: 'none',
              border: 'none',
              color: '#6ba356',
              fontSize: '13px',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            See all →
          </button>
        </div>
        <div style={{ display: 'flex', gap: '12px', overflowX: 'auto', paddingLeft: '16px', paddingRight: '16px', paddingBottom: '8px' }}>
          {recipes.slice(0, 3).map((recipe, index) => (
            <div
              key={recipe.id}
              onClick={() => handleRecipeClick(recipe)}
              style={{
                minWidth: '90px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                cursor: 'pointer'
              }}
            >
              <div style={{
                width: '90px',
                height: '90px',
                borderRadius: '12px',
                background: getColorByIndex(index),
                flexShrink: 0
              }} />
              <h4 style={{ fontSize: '12px', fontWeight: '600', color: '#1e293b', margin: 0, whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                {recipe.name}
              </h4>
              <p style={{ fontSize: '11px', color: '#94a3b8', margin: 0 }}>
                {recipe.prepTime} min
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Suggested For You */}
      <div style={{ paddingLeft: '16px', paddingRight: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <h2 style={{ fontSize: '16px', fontWeight: '700', color: '#1e293b', margin: 0 }}>
            Suggested For You
          </h2>
          <span style={{ background: '#d1fae5', color: '#059669', fontSize: '11px', fontWeight: '600', padding: '4px 8px', borderRadius: '6px' }}>
            FREE
          </span>
        </div>
        {recipes.slice(0, 1).map((recipe, index) => (
          <div
            key={recipe.id}
            onClick={() => handleRecipeClick(recipe)}
            style={{
              display: 'flex',
              gap: '12px',
              padding: '12px',
              background: '#f8fafc',
              borderRadius: '12px',
              cursor: 'pointer'
            }}
          >
            <div style={{
              width: '56px',
              height: '56px',
              borderRadius: '10px',
              background: getColorByIndex(index),
              flexShrink: 0
            }} />
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: '12px', color: '#94a3b8', fontWeight: '500', margin: 0, textTransform: 'uppercase' }}>
                Dinner
              </p>
              <h3 style={{ fontSize: '14px', fontWeight: '600', color: '#1e293b', margin: '4px 0 4px' }}>
                {recipe.name}
              </h3>
              <p style={{ fontSize: '12px', color: '#94a3b8', margin: 0 }}>
                {recipe.cuisine} • {recipe.prepTime} min
              </p>
            </div>
          </div>
        ))}
      </div>

      <BottomNavigation currentScreen="home" onNavigate={onNavigate} />
    </div>
  )
}
