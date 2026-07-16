import { useState, useEffect } from 'react'
import { Search, Plus, Calendar, ShoppingCart, Settings } from 'lucide-react'
import type { Screen } from '../types'
import { BottomNavigation } from '../components/BottomNavigation'
import { recipeAPI } from '../utils/api'

interface Props {
  onNavigate: (screen: Screen, data?: any) => void
}

const RECIPE_COLORS = ['#d4a574', '#6ba356', '#c67139', '#5b9acd', '#9b7ec8']

const SAMPLE_RECIPES = [
  { id: 's1', name: 'Avocado Toast', prepTime: 10, color: '#6ba356', emoji: '🥑' },
  { id: 's2', name: 'Pasta Carbonara', prepTime: 25, color: '#d4a574', emoji: '🍝' },
  { id: 's3', name: 'Berry Smoothie', prepTime: 5, color: '#9b7ec8', emoji: '🫐' },
]

const SAMPLE_SUGGESTION = {
  name: 'Lemon Herb Salmon',
  category: 'Dinner',
  detail: 'Mediterranean • 20 min',
  color: '#5b9acd',
  emoji: '🐟',
}

const TODAY_MEALS = [
  { type: 'Breakfast', name: 'Shakshuka', time: '30 min', cal: '320 cal', color: '#d4a574', emoji: '🍳' },
  { type: 'Lunch', name: 'Caesar Salad', time: '15 min', cal: '320 cal', color: '#6ba356', emoji: '🥗' },
  { type: 'Dinner', name: 'Thai Green Curry', time: '45 min', cal: '480 cal', color: '#c67139', emoji: '🍛' },
]

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning!'
  if (h < 18) return 'Good afternoon!'
  return 'Good evening!'
}

function getDateLabel() {
  const d = new Date()
  const day = d.toLocaleDateString('en-US', { weekday: 'long' }).toUpperCase()
  const month = d.toLocaleDateString('en-US', { month: 'short' }).toUpperCase()
  return `${day}, ${month} ${d.getDate()}`
}

export default function HomeScreen({ onNavigate }: Props) {
  const [recipes, setRecipes] = useState<any[]>([])

  useEffect(() => {
    recipeAPI.list().then(setRecipes).catch(() => {})
  }, [])

  const displayRecipes = recipes.length > 0 ? recipes.slice(0, 3) : SAMPLE_RECIPES
  const suggestion = recipes.length > 0
    ? { name: recipes[0].name, category: 'Dinner', detail: `${recipes[0].cuisine || 'World'} • ${recipes[0].prepTime} min`, color: RECIPE_COLORS[0], emoji: '🍽️' }
    : SAMPLE_SUGGESTION

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#fafafa' }}>
    <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
      {/* Header */}
      <div style={{ background: '#fff', padding: '16px 16px 0', borderBottom: '1px solid #f1f5f9' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
          <div>
            <p style={{ color: '#94a3b8', fontSize: '11px', fontWeight: '600', letterSpacing: '0.06em', margin: '0 0 2px' }}>
              {getDateLabel()}
            </p>
            <h1 style={{ fontSize: '26px', fontWeight: '700', color: '#1e293b', margin: 0, lineHeight: 1.2 }}>
              {getGreeting()} 👋
            </h1>
          </div>
          <button
            onClick={() => onNavigate('settings')}
            style={{
              background: '#f1f5f9',
              border: 'none',
              width: '38px',
              height: '38px',
              borderRadius: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              flexShrink: 0
            }}
          >
            <Settings size={18} color="#64748b" />
          </button>
        </div>

        {/* Search */}
        <div style={{
          background: '#f1f5f9',
          border: '1px solid #e2e8f0',
          borderRadius: '12px',
          padding: '10px 14px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          marginBottom: '16px'
        }}>
          <Search size={16} color="#94a3b8" />
          <input
            type="text"
            placeholder="Search recipes..."
            style={{ flex: 1, border: 'none', background: 'transparent', fontSize: '14px', color: '#1e293b', outline: 'none', fontFamily: 'inherit' }}
          />
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
          <button
            onClick={() => onNavigate('add-recipe')}
            style={{
              flex: 1, padding: '11px 8px',
              background: '#6ba356', color: '#fff',
              border: 'none', borderRadius: '10px',
              fontSize: '12px', fontWeight: '700',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px',
              cursor: 'pointer'
            }}
          >
            <Plus size={14} />
            Add Recipe
          </button>
          <button
            onClick={() => onNavigate('meal-plan')}
            style={{
              flex: 1, padding: '11px 8px',
              background: '#f0f7ed', color: '#6ba356',
              border: '1.5px solid #c8e0bc', borderRadius: '10px',
              fontSize: '12px', fontWeight: '700',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px',
              cursor: 'pointer'
            }}
          >
            <Calendar size={14} />
            Meal Plan
          </button>
          <button
            onClick={() => onNavigate('grocery')}
            style={{
              flex: 1, padding: '11px 8px',
              background: '#fff', color: '#64748b',
              border: '1.5px solid #e2e8f0', borderRadius: '10px',
              fontSize: '12px', fontWeight: '700',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px',
              cursor: 'pointer'
            }}
          >
            <ShoppingCart size={14} />
            List
          </button>
        </div>
      </div>

      {/* Today's Meals */}
      <div style={{ padding: '20px 16px 0' }}>
        <h2 style={{ fontSize: '15px', fontWeight: '700', color: '#1e293b', margin: '0 0 12px', letterSpacing: '-0.01em' }}>
          Today's Meals
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '24px' }}>
          {TODAY_MEALS.map((meal, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: '12px',
              padding: '12px 14px',
              background: '#fff',
              borderRadius: '14px',
              border: '1px solid #f1f5f9',
              boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
              cursor: 'pointer'
            }}>
              <div style={{
                width: '46px', height: '46px', borderRadius: '12px',
                background: meal.color + '22',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '22px', flexShrink: 0
              }}>
                {meal.emoji}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: '10px', color: '#94a3b8', fontWeight: '600', margin: 0, letterSpacing: '0.06em' }}>
                  {meal.type.toUpperCase()}
                </p>
                <h3 style={{ fontSize: '14px', fontWeight: '600', color: '#1e293b', margin: '2px 0 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {meal.name}
                </h3>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <p style={{ fontSize: '12px', color: '#64748b', fontWeight: '500', margin: 0 }}>{meal.time}</p>
                <p style={{ fontSize: '11px', color: '#94a3b8', margin: '2px 0 0' }}>{meal.cal}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Recent Recipes */}
        <div style={{ marginBottom: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h2 style={{ fontSize: '15px', fontWeight: '700', color: '#1e293b', margin: 0, letterSpacing: '-0.01em' }}>
              Recent Recipes
            </h2>
            <button
              onClick={() => onNavigate('browse')}
              style={{ background: 'none', border: 'none', color: '#6ba356', fontSize: '13px', fontWeight: '600', cursor: 'pointer', padding: 0 }}
            >
              See all →
            </button>
          </div>
          <div style={{ display: 'flex', gap: '12px', overflowX: 'auto', paddingBottom: '4px', marginLeft: '-2px', paddingLeft: '2px' }}>
            {displayRecipes.map((recipe: any, i: number) => (
              <div
                key={recipe.id}
                onClick={() => onNavigate('browse')}
                style={{ minWidth: '110px', cursor: 'pointer' }}
              >
                <div style={{
                  width: '110px', height: '100px', borderRadius: '14px',
                  background: (recipe.color || RECIPE_COLORS[i % RECIPE_COLORS.length]) + '33',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '32px', marginBottom: '8px',
                  border: '1px solid ' + (recipe.color || RECIPE_COLORS[i % RECIPE_COLORS.length]) + '22'
                }}>
                  {recipe.emoji || '🍽️'}
                </div>
                <h4 style={{ fontSize: '12px', fontWeight: '600', color: '#1e293b', margin: '0 0 2px', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden', maxWidth: '110px' }}>
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
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h2 style={{ fontSize: '15px', fontWeight: '700', color: '#1e293b', margin: 0, letterSpacing: '-0.01em' }}>
              Suggested For You
            </h2>
            <span style={{ background: '#dcfce7', color: '#16a34a', fontSize: '10px', fontWeight: '700', padding: '3px 8px', borderRadius: '6px', letterSpacing: '0.04em' }}>
              FREE
            </span>
          </div>
          <div
            onClick={() => onNavigate('browse')}
            style={{
              display: 'flex', gap: '14px',
              padding: '14px',
              background: '#fff',
              borderRadius: '16px',
              border: '1px solid #f1f5f9',
              boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
              cursor: 'pointer'
            }}
          >
            <div style={{
              width: '64px', height: '64px', borderRadius: '14px',
              background: suggestion.color + '22',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '28px', flexShrink: 0,
              border: '1px solid ' + suggestion.color + '22'
            }}>
              {suggestion.emoji}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: '10px', color: '#94a3b8', fontWeight: '600', margin: '0 0 4px', letterSpacing: '0.06em' }}>
                {suggestion.category.toUpperCase()}
              </p>
              <h3 style={{ fontSize: '15px', fontWeight: '600', color: '#1e293b', margin: '0 0 4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {suggestion.name}
              </h3>
              <p style={{ fontSize: '12px', color: '#94a3b8', margin: 0 }}>
                {suggestion.detail}
              </p>
            </div>
          </div>
        </div>
      </div>

      </div>
      <BottomNavigation active="home" onNavigate={onNavigate} />
    </div>
  )
}
