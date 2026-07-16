import { useState, useEffect } from 'react'
import { Menu, Search, Plus, Calendar, ShoppingCart, Book, Bookmark, Settings, LogOut } from 'lucide-react'
import type { Screen } from '../types'
import { BottomNavigation } from '../components/BottomNavigation'
import { recipeAPI } from '../utils/api'

interface Props {
  onNavigate: (screen: Screen, data?: any) => void
}

const RECIPE_GRADIENTS = [
  'linear-gradient(135deg, #f4a261, #e9c46a)',
  'linear-gradient(135deg, #e76f51, #c67139)',
  'linear-gradient(135deg, #7a8a5e, #52b788)',
  'linear-gradient(135deg, #2a9d8f, #52b788)',
]

export default function HomeScreen({ onNavigate }: Props) {
  const [hamburgerOpen, setHamburgerOpen] = useState(false)
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

  return (
    <div className="screen" style={{ background: '#f1f5f9' }}>
      <header style={{
        background: '#fff',
        padding: '14px 16px 12px',
        borderBottom: '1px solid rgba(15, 23, 42, 0.08)',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        flexShrink: 0,
      }}>
        <div style={{ flex: 1 }}>
          <p style={{ margin: 0, color: '#64748b', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' }).toUpperCase()}
          </p>
          <h2 style={{ fontSize: '22px', color: '#0f172a', margin: '2px 0 0', letterSpacing: '-0.5px' }}>
            Good morning! 👋
          </h2>
        </div>
        <button
          onClick={() => setHamburgerOpen(!hamburgerOpen)}
          className="btn btn-icon"
          style={{ background: 'none', border: 'none' }}
        >
          <Menu size={22} color="#0f172a" />
        </button>
      </header>

      {hamburgerOpen && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.4)',
            zIndex: 100,
          }}
          onClick={() => setHamburgerOpen(false)}
        >
          <div
            style={{
              position: 'absolute',
              right: 0,
              top: 0,
              bottom: 0,
              width: '264px',
              background: '#fff',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '-4px 0 24px rgba(0, 0, 0, 0.12)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ padding: '20px', borderBottom: '1px solid rgba(15, 23, 42, 0.08)' }}>
              <div style={{
                width: '48px',
                height: '48px',
                borderRadius: '50%',
                background: RECIPE_GRADIENTS[0],
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '12px',
                fontSize: '22px',
              }}>
                👤
              </div>
              <div style={{ fontWeight: '700', fontSize: '16px' }}>My Account</div>
              <div style={{ color: '#94a3b8', fontSize: '13px' }}>Logged in</div>
            </div>

            <div style={{ padding: '12px', flex: 1 }}>
              {[
                { label: 'My Cookbooks', icon: Book, screen: 'cookbooks' },
                { label: 'Saved Recipes', icon: Bookmark, screen: 'browse' },
                { label: 'Settings', icon: Settings, screen: 'settings' },
              ].map((item) => (
                <button
                  key={item.screen}
                  onClick={() => {
                    setHamburgerOpen(false)
                    onNavigate(item.screen as Screen)
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '14px',
                    width: '100%',
                    padding: '14px 12px',
                    border: 'none',
                    background: 'none',
                    cursor: 'pointer',
                    borderRadius: '12px',
                    color: '#0f172a',
                    fontSize: '15px',
                    fontWeight: '600',
                  }}
                >
                  <item.icon size={20} color="#c67139" />
                  {item.label}
                </button>
              ))}
            </div>

            <button
              onClick={() => {
                setHamburgerOpen(false)
                onNavigate('signin')
              }}
              style={{
                margin: '16px',
                padding: '12px',
                border: '1px solid #f1f5f9',
                borderRadius: '12px',
                background: 'none',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '600',
                color: '#ef4444',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                justifyContent: 'center',
              }}
            >
              <LogOut size={16} /> Log Out
            </button>
          </div>
        </div>
      )}

      <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
        <div style={{ padding: '12px 16px', background: '#fff', flexShrink: 0 }}>
          <div
            onClick={() => onNavigate('browse')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              background: '#f1f5f9',
              borderRadius: '999px',
              padding: '10px 14px',
              cursor: 'pointer',
            }}
          >
            <Search size={16} color="#94a3b8" />
            <span style={{ flex: 1, color: '#94a3b8', fontSize: '14px' }}>Search recipes...</span>
          </div>
        </div>

        <div style={{ padding: '14px 16px 8px', display: 'flex', gap: '10px' }}>
          <button
            onClick={() => onNavigate('add-recipe')}
            className="btn btn-primary"
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '7px',
              padding: '13px 10px',
            }}
          >
            <Plus size={17} /> Add Recipe
          </button>
          <button
            onClick={() => onNavigate('meal-plan')}
            style={{
              flex: 1,
              background: '#ecfdf5',
              color: '#10b981',
              border: '1px solid #a7f3d0',
              borderRadius: '16px',
              padding: '13px 10px',
              fontSize: '14px',
              fontWeight: '700',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '7px',
              justifyContent: 'center',
            }}
          >
            <Calendar size={17} color="#10b981" /> Meal Plan
          </button>
          <button
            onClick={() => onNavigate('grocery')}
            style={{
              background: '#f1f5f9',
              color: '#64748b',
              border: '1px solid #e2e8f0',
              borderRadius: '16px',
              padding: '13px 12px',
              fontSize: '14px',
              fontWeight: '700',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '7px',
            }}
          >
            <ShoppingCart size={17} color="#64748b" /> List
          </button>
        </div>

        {loading ? (
          <div style={{ padding: '40px 16px', textAlign: 'center', color: '#94a3b8' }}>
            Loading recipes...
          </div>
        ) : recipes.length === 0 ? (
          <div style={{ padding: '40px 16px', textAlign: 'center', color: '#94a3b8' }}>
            <p>No recipes yet. Create your first recipe!</p>
            <button
              onClick={() => onNavigate('add-recipe')}
              className="btn btn-primary"
              style={{ marginTop: '16px' }}
            >
              Add Recipe
            </button>
          </div>
        ) : (
          <>
            <div style={{ padding: '4px 16px 12px' }}>
              <h3 style={{ fontWeight: '700', fontSize: '16px', margin: '0 0 10px' }}>Your Recipes</h3>
              <div style={{ display: 'flex', gap: '12px', overflowX: 'auto', paddingBottom: '2px' }}>
                {recipes.slice(0, 5).map((recipe, idx) => (
                  <div
                    key={recipe.id}
                    onClick={() => handleRecipeClick(recipe)}
                    style={{
                      flexShrink: 0,
                      width: '136px',
                      borderRadius: '16px',
                      overflow: 'hidden',
                      background: '#fff',
                      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.07)',
                      cursor: 'pointer',
                    }}
                  >
                    <div style={{ height: '88px', background: RECIPE_GRADIENTS[idx % 4] }} />
                    <div style={{ padding: '9px 10px 11px' }}>
                      <div style={{ fontWeight: '700', fontSize: '13px', marginBottom: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {recipe.name}
                      </div>
                      <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                        {recipe.prepTime + recipe.cookTime} min
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ padding: '0 16px 24px' }}>
              <h3 style={{ fontWeight: '700', fontSize: '16px', margin: '0 0 10px' }}>All Recipes</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {recipes.map((recipe, idx) => (
                  <div
                    key={recipe.id}
                    onClick={() => handleRecipeClick(recipe)}
                    style={{
                      background: '#fff',
                      borderRadius: '14px',
                      padding: '12px 14px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      boxShadow: '0 1px 4px rgba(0, 0, 0, 0.06)',
                      cursor: 'pointer',
                    }}
                  >
                    <div
                      style={{
                        width: '50px',
                        height: '50px',
                        borderRadius: '12px',
                        background: RECIPE_GRADIENTS[idx % 4],
                        flexShrink: 0,
                      }}
                    />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: '700', fontSize: '14px', marginBottom: '2px' }}>
                        {recipe.name}
                      </div>
                      <div style={{ fontSize: '12px', color: '#64748b' }}>
                        {recipe.cuisine} • {recipe.prepTime + recipe.cookTime} min {recipe.calories ? `• ${recipe.calories} cal` : ''}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      <BottomNavigation active="home" onNavigate={(s) => onNavigate(s as Screen)} />
    </div>
  )
}
