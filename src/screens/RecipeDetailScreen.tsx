import { useState } from 'react'
import { ArrowLeft, Clock, Users, Flame, ChefHat, Heart } from 'lucide-react'
import type { Screen, Recipe } from '../types'
import { BottomNavigation } from '../components/BottomNavigation'

interface Props {
  recipe: Recipe | null
  onNavigate: (screen: Screen, data?: any) => void
}

const DIFFICULTY_COLORS: Record<string, string> = {
  easy: '#6ba356',
  medium: '#f4b860',
  hard: '#ef4444',
}

const MEAL_EMOJIS: Record<string, string> = {
  breakfast: '🍳',
  lunch: '🥗',
  dinner: '🍽️',
  snack: '🍎',
}

const HERO_COLORS = ['#d4a574', '#6ba356', '#c67139', '#9b7ec8', '#f4b860', '#5b9acd']

export default function RecipeDetailScreen({ recipe, onNavigate }: Props) {
  const [checkedIngredients, setCheckedIngredients] = useState<Set<string>>(new Set())
  const [isFavorited, setIsFavorited] = useState(recipe?.isFavorite || false)
  const [activeTab, setActiveTab] = useState<'ingredients' | 'instructions'>('ingredients')

  if (!recipe) {
    return (
      <div className="screen" style={{ background: '#f8fafc' }}>
        <header style={{ padding: '12px 16px', borderBottom: '1px solid #e2e8f0', background: '#fff', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button onClick={() => onNavigate('browse')} className="btn btn-icon" style={{ background: 'none' }}>
            <ArrowLeft size={22} />
          </button>
          <h2 style={{ flex: 1, fontSize: '18px', margin: 0 }}>Recipe</h2>
        </header>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
          <p>Recipe not found</p>
        </div>
        <BottomNavigation active="browse" onNavigate={(s) => onNavigate(s as Screen)} />
      </div>
    )
  }

  const heroColor = (recipe as any).color || HERO_COLORS[recipe.name.charCodeAt(0) % HERO_COLORS.length]
  const emoji = (recipe as any).emoji || MEAL_EMOJIS[recipe.mealType] || '🍽️'

  const toggleIngredient = (id: string) => {
    setCheckedIngredients(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const stats = [
    ...(recipe.prepTime != null ? [{ icon: <Clock size={14} />, label: 'PREP', value: `${recipe.prepTime}m` }] : []),
    ...(recipe.cookTime != null ? [{ icon: <Clock size={14} />, label: 'COOK', value: `${recipe.cookTime}m` }] : []),
    ...(recipe.servings != null ? [{ icon: <Users size={14} />, label: 'SERVES', value: String(recipe.servings) }] : []),
    ...(recipe.calories ? [{ icon: <Flame size={14} />, label: 'CAL', value: String(recipe.calories) }] : []),
  ]

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#f8fafc' }}>
      <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>

        {/* Hero */}
        <div style={{
          position: 'relative',
          height: '200px',
          background: `linear-gradient(135deg, ${heroColor}dd, ${heroColor}88)`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}>
          <button
            onClick={() => onNavigate('browse')}
            style={{
              position: 'absolute', top: '12px', left: '12px',
              width: '36px', height: '36px', borderRadius: '10px',
              background: 'rgba(255,255,255,0.92)',
              border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              backdropFilter: 'blur(8px)',
            }}
          >
            <ArrowLeft size={18} color="#1e293b" />
          </button>
          <button
            onClick={() => setIsFavorited(!isFavorited)}
            style={{
              position: 'absolute', top: '12px', right: '12px',
              width: '36px', height: '36px', borderRadius: '10px',
              background: 'rgba(255,255,255,0.92)',
              border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              backdropFilter: 'blur(8px)',
            }}
          >
            <Heart size={18} color={isFavorited ? '#ef4444' : '#94a3b8'} fill={isFavorited ? '#ef4444' : 'none'} />
          </button>
          <div style={{ fontSize: '72px', filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.12))' }}>
            {emoji}
          </div>
        </div>

        {/* Title + stats */}
        <div style={{ background: '#fff', padding: '16px 16px 0', borderBottom: '1px solid #f1f5f9' }}>
          <div style={{ display: 'flex', gap: '6px', marginBottom: '10px', flexWrap: 'wrap' }}>
            {recipe.cuisine && (
              <span style={{ background: '#f0f7ed', color: '#6ba356', fontSize: '11px', fontWeight: '700', padding: '3px 9px', borderRadius: '6px', letterSpacing: '0.04em' }}>
                {recipe.cuisine.toUpperCase()}
              </span>
            )}
            {recipe.mealType && (
              <span style={{ background: '#f1f5f9', color: '#64748b', fontSize: '11px', fontWeight: '600', padding: '3px 9px', borderRadius: '6px', textTransform: 'capitalize' }}>
                {recipe.mealType}
              </span>
            )}
            {recipe.difficulty && (
              <span style={{
                background: (DIFFICULTY_COLORS[recipe.difficulty] ?? '#6ba356') + '18',
                color: DIFFICULTY_COLORS[recipe.difficulty] ?? '#6ba356',
                fontSize: '11px', fontWeight: '600', padding: '3px 9px', borderRadius: '6px', textTransform: 'capitalize',
              }}>
                {recipe.difficulty}
              </span>
            )}
          </div>

          <h1 style={{ fontSize: '22px', fontWeight: '700', color: '#1e293b', margin: '0 0 8px', lineHeight: 1.2 }}>
            {recipe.name}
          </h1>
          {recipe.description && (
            <p style={{ fontSize: '13px', color: '#64748b', margin: '0 0 14px', lineHeight: 1.5 }}>
              {recipe.description}
            </p>
          )}

          {/* Stats row */}
          <div style={{ display: 'flex', borderTop: '1px solid #f1f5f9', paddingTop: '14px', marginBottom: '16px' }}>
            {stats.map((stat, i) => (
              <div key={i} style={{
                flex: 1, textAlign: 'center',
                borderRight: i < stats.length - 1 ? '1px solid #f1f5f9' : 'none',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6ba356', marginBottom: '3px' }}>
                  {stat.icon}
                </div>
                <div style={{ fontSize: '15px', fontWeight: '700', color: '#1e293b' }}>{stat.value}</div>
                <div style={{ fontSize: '10px', color: '#94a3b8', fontWeight: '600', letterSpacing: '0.04em' }}>{stat.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Tabs */}
        <div style={{ background: '#fff', display: 'flex', borderBottom: '1px solid #e2e8f0', marginTop: '8px' }}>
          {(['ingredients', 'instructions'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                flex: 1, padding: '12px 8px',
                background: 'none', border: 'none', borderBottom: `2px solid ${activeTab === tab ? '#6ba356' : 'transparent'}`,
                cursor: 'pointer',
                fontSize: '13px', fontWeight: activeTab === tab ? '700' : '500',
                color: activeTab === tab ? '#6ba356' : '#94a3b8',
                transition: 'all 0.2s',
                textTransform: 'capitalize',
              }}
            >
              {tab === 'ingredients'
                ? `Ingredients${recipe.ingredients?.length ? ` (${recipe.ingredients.length})` : ''}`
                : `Instructions${recipe.instructions?.length ? ` (${recipe.instructions.length})` : ''}`
              }
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div style={{ padding: '16px' }}>
          {activeTab === 'ingredients' ? (
            recipe.ingredients?.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {recipe.ingredients.map(ing => {
                  const checked = checkedIngredients.has(ing.id)
                  return (
                    <div
                      key={ing.id}
                      onClick={() => toggleIngredient(ing.id)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '12px',
                        padding: '12px 14px',
                        background: '#fff', borderRadius: '12px',
                        border: `1px solid ${checked ? '#c8e0bc' : '#f1f5f9'}`,
                        cursor: 'pointer', opacity: checked ? 0.55 : 1,
                        transition: 'all 0.15s',
                      }}
                    >
                      <div style={{
                        width: '20px', height: '20px', borderRadius: '6px', flexShrink: 0,
                        border: `2px solid ${checked ? '#6ba356' : '#e2e8f0'}`,
                        background: checked ? '#6ba356' : 'transparent',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        transition: 'all 0.15s',
                      }}>
                        {checked && <span style={{ color: '#fff', fontSize: '11px', fontWeight: '800', lineHeight: 1 }}>✓</span>}
                      </div>
                      <span style={{ flex: 1, fontSize: '14px', color: '#1e293b', textDecoration: checked ? 'line-through' : 'none' }}>
                        {ing.name}
                      </span>
                      <span style={{ fontSize: '13px', color: '#64748b', fontWeight: '600', flexShrink: 0 }}>
                        {ing.quantity} {ing.unit}
                      </span>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '40px 0', color: '#94a3b8' }}>
                <div style={{ fontSize: '36px', marginBottom: '8px' }}>🥄</div>
                <p style={{ fontSize: '14px', margin: 0 }}>No ingredients added yet</p>
              </div>
            )
          ) : (
            recipe.instructions?.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {recipe.instructions.map((step, i) => (
                  <div key={step.id} style={{
                    display: 'flex', gap: '14px',
                    padding: '14px', background: '#fff', borderRadius: '14px', border: '1px solid #f1f5f9',
                  }}>
                    <div style={{
                      width: '28px', height: '28px', borderRadius: '8px', flexShrink: 0,
                      background: '#6ba356', color: '#fff',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '13px', fontWeight: '700',
                    }}>
                      {step.stepNumber || i + 1}
                    </div>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: '14px', color: '#1e293b', margin: 0, lineHeight: 1.5 }}>{step.text}</p>
                      {step.duration && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '6px', color: '#64748b', fontSize: '12px' }}>
                          <Clock size={12} />
                          <span>{step.duration} min</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '40px 0', color: '#94a3b8' }}>
                <div style={{ fontSize: '36px', marginBottom: '8px' }}>📋</div>
                <p style={{ fontSize: '14px', margin: 0 }}>No instructions added yet</p>
              </div>
            )
          )}
        </div>

        {/* Start Cooking CTA */}
        <div style={{ padding: '0 16px 16px' }}>
          <button
            onClick={() => onNavigate('cooking-mode', { recipe })}
            style={{
              width: '100%', padding: '15px',
              background: 'linear-gradient(135deg, #7ec063, #5a9449)',
              color: '#fff', border: 'none', borderRadius: '14px',
              fontSize: '15px', fontWeight: '700',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(107, 163, 86, 0.35)',
              transition: 'all 0.2s',
            }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 20px rgba(107, 163, 86, 0.4)' }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 14px rgba(107, 163, 86, 0.35)' }}
          >
            <ChefHat size={18} />
            Start Cooking
          </button>
        </div>

      </div>
      <BottomNavigation active="browse" onNavigate={(s) => onNavigate(s as Screen)} />
    </div>
  )
}
