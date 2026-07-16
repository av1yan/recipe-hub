import { useState } from 'react'
import { ArrowLeft } from 'lucide-react'
import type { Screen } from '../types'
import { BottomNavigation } from '../components/BottomNavigation'
import { recipeAPI } from '../utils/api'

interface Props {
  onNavigate: (screen: Screen) => void
}

export default function AddRecipeScreen({ onNavigate }: Props) {
  const [name, setName] = useState('')
  const [cuisine, setCuisine] = useState('Italian')
  const [mealType, setMealType] = useState('lunch')
  const [difficulty, setDifficulty] = useState('easy')
  const [prepTime, setPrepTime] = useState('')
  const [cookTime, setCookTime] = useState('')
  const [servings, setServings] = useState('2')
  const [calories, setCalories] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      await recipeAPI.create({
        name,
        cuisine,
        mealType,
        difficulty,
        prepTime: parseInt(prepTime),
        cookTime: parseInt(cookTime),
        servings: parseInt(servings),
        calories: calories ? parseInt(calories) : null,
        ingredients: [],
        instructions: [],
      })

      alert('Recipe created successfully!')
      onNavigate('home')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create recipe')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="screen">
      <header style={{ padding: '12px 16px', borderBottom: '1px solid rgba(15, 23, 42, 0.08)', background: '#fff', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <button onClick={() => onNavigate('home')} className="btn btn-icon" style={{ background: 'none' }}>
          <ArrowLeft size={22} />
        </button>
        <h2 style={{ flex: 1, fontSize: '18px', margin: 0 }}>Add Recipe</h2>
      </header>

      <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
        {error && (
          <div style={{ background: '#fee2e2', border: '1px solid #fecaca', borderRadius: '8px', padding: '12px', marginBottom: '16px', color: '#ef4444', fontSize: '14px' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="field">
            <label>Recipe Name</label>
            <input type="text" className="input" placeholder="e.g., Pasta Carbonara" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>

          <div className="field">
            <label>Cuisine</label>
            <select className="input" value={cuisine} onChange={(e) => setCuisine(e.target.value)} style={{ background: '#fff', color: '#1e293b', cursor: 'pointer' }}>
              <option>Italian</option>
              <option>Asian</option>
              <option>Mexican</option>
              <option>American</option>
              <option>Mediterranean</option>
              <option>Indian</option>
            </select>
          </div>

          <div className="field">
            <label>Meal Type</label>
            <select className="input" value={mealType} onChange={(e) => setMealType(e.target.value)} style={{ background: '#fff', color: '#1e293b', cursor: 'pointer' }}>
              <option value="breakfast">Breakfast</option>
              <option value="lunch">Lunch</option>
              <option value="dinner">Dinner</option>
              <option value="snack">Snack</option>
            </select>
          </div>

          <div className="field">
            <label>Difficulty</label>
            <select className="input" value={difficulty} onChange={(e) => setDifficulty(e.target.value)} style={{ background: '#fff', color: '#1e293b', cursor: 'pointer' }}>
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div className="field">
              <label>Prep Time (min)</label>
              <input type="number" className="input" placeholder="10" value={prepTime} onChange={(e) => setPrepTime(e.target.value)} required />
            </div>
            <div className="field">
              <label>Cook Time (min)</label>
              <input type="number" className="input" placeholder="20" value={cookTime} onChange={(e) => setCookTime(e.target.value)} required />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div className="field">
              <label>Servings</label>
              <input type="number" className="input" placeholder="2" value={servings} onChange={(e) => setServings(e.target.value)} required />
            </div>
            <div className="field">
              <label>Calories (optional)</label>
              <input type="number" className="input" placeholder="500" value={calories} onChange={(e) => setCalories(e.target.value)} />
            </div>
          </div>

          <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={loading}>
            {loading ? 'Creating...' : 'Create Recipe'}
          </button>
        </form>
      </div>

      <BottomNavigation active="add" onNavigate={(s) => onNavigate(s as Screen)} />
    </div>
  )
}
