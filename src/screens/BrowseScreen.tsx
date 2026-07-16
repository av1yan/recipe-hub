import { useState, useEffect } from 'react'
import { Search } from 'lucide-react'
import type { Screen, Recipe } from '../types'
import { BottomNavigation } from '../components/BottomNavigation'
import { recipeAPI } from '../utils/api'

interface Props {
  onNavigate: (screen: Screen) => void
}

export default function BrowseScreen({ onNavigate }: Props) {
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [filteredRecipes, setFilteredRecipes] = useState<Recipe[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    loadRecipes()
  }, [])

  async function loadRecipes() {
    try {
      setIsLoading(true)
      const data = await recipeAPI.list()
      setRecipes(data)
      setFilteredRecipes(data)
    } catch (error) {
      console.error('Failed to load recipes:', error)
    } finally {
      setIsLoading(false)
    }
  }

  function handleSearch(term: string) {
    setSearchTerm(term)
    if (!term.trim()) {
      setFilteredRecipes(recipes)
    } else {
      const lowercaseTerm = term.toLowerCase()
      setFilteredRecipes(
        recipes.filter(recipe =>
          recipe.name.toLowerCase().includes(lowercaseTerm) ||
          recipe.cuisine.toLowerCase().includes(lowercaseTerm)
        )
      )
    }
  }

  function getRecipeColor(index: number): string {
    const colors = ['#e8b4a8', '#d4a574', '#c9a582', '#b8956a', '#a48a6e']
    return colors[index % colors.length]
  }

  if (isLoading) {
    return (
      <div className="screen">
        <header style={{ padding: '14px 16px', borderBottom: '1px solid rgba(15, 23, 42, 0.08)', background: '#fff' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: '#f1f5f9', borderRadius: '999px', padding: '10px 14px' }}>
            <Search size={16} color="#94a3b8" />
            <input
              type="text"
              placeholder="Search recipes..."
              disabled
              style={{ flex: 1, border: 'none', background: 'none', outline: 'none', fontSize: '14px', opacity: 0.5 }}
            />
          </div>
        </header>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
          <p>Loading recipes...</p>
        </div>
        <BottomNavigation active="browse" onNavigate={(s) => onNavigate(s as Screen)} />
      </div>
    )
  }

  return (
    <div className="screen">
      <header style={{ padding: '14px 16px', borderBottom: '1px solid rgba(15, 23, 42, 0.08)', background: '#fff' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: '#f1f5f9', borderRadius: '999px', padding: '10px 14px' }}>
          <Search size={16} color="#94a3b8" />
          <input
            type="text"
            placeholder="Search recipes..."
            value={searchTerm}
            onChange={(e) => handleSearch(e.target.value)}
            style={{ flex: 1, border: 'none', background: 'none', outline: 'none', fontSize: '14px' }}
          />
        </div>
      </header>

      <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
        {filteredRecipes.length === 0 ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#94a3b8', textAlign: 'center', flexDirection: 'column', gap: '16px' }}>
            <p>{searchTerm ? 'No recipes found matching your search' : 'No recipes available'}</p>
            {searchTerm && (
              <button
                onClick={() => handleSearch('')}
                style={{
                  padding: '8px 16px',
                  background: '#6ba356',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '600',
                }}
              >
                Clear Search
              </button>
            )}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {filteredRecipes.map((recipe, index) => (
              <div
                key={recipe.id}
                onClick={() => onNavigate('recipe')}
                style={{
                  display: 'flex',
                  gap: '12px',
                  padding: '12px',
                  background: '#fff',
                  borderRadius: '12px',
                  border: '1px solid rgba(15, 23, 42, 0.08)',
                  cursor: 'pointer',
                  transition: 'box-shadow 0.2s',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.boxShadow = '0 2px 8px rgba(15, 23, 42, 0.1)')}
                onMouseLeave={(e) => (e.currentTarget.style.boxShadow = 'none')}
              >
                <div
                  style={{
                    width: '60px',
                    height: '60px',
                    borderRadius: '8px',
                    background: getRecipeColor(index),
                    flexShrink: 0,
                  }}
                />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '14px', fontWeight: '600', marginBottom: '4px' }}>
                    {recipe.name}
                  </div>
                  <div style={{ fontSize: '12px', color: '#94a3b8', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <span>{recipe.cuisine}</span>
                    <span>•</span>
                    <span>{recipe.prepTime + recipe.cookTime} min</span>
                    {recipe.calories && (
                      <>
                        <span>•</span>
                        <span>{recipe.calories} cal</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <BottomNavigation active="browse" onNavigate={(s) => onNavigate(s as Screen)} />
    </div>
  )
}
