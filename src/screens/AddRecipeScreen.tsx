import { useState } from 'react'
import { ArrowLeft, Check, Plus, X } from 'lucide-react'
import type { Screen } from '../types'
import { BottomNavigation } from '../components/BottomNavigation'
import { recipeAPI } from '../utils/api'
import { DIET_OPTIONS } from './DietPreferencesScreen'
import { Toast, useToast } from '../components/Toast'

interface Props {
  onNavigate: (screen: Screen) => void
}

type IngredientRow = { name: string; quantity: string; unit: string }
type InstructionRow = { text: string; duration: string }

const rowInput: React.CSSProperties = {
  padding: '9px 10px', borderRadius: '10px', border: '1.5px solid #e2e8f0',
  fontSize: '14px', color: '#1e293b', background: '#fff', outline: 'none',
  boxSizing: 'border-box', fontFamily: 'inherit', width: '100%',
}

const removeBtn: React.CSSProperties = {
  flexShrink: 0, width: '34px', height: '38px', display: 'flex', alignItems: 'center',
  justifyContent: 'center', background: '#fff', border: '1.5px solid #e2e8f0',
  borderRadius: '10px', color: '#94a3b8', cursor: 'pointer',
}

const addBtn: React.CSSProperties = {
  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
  width: '100%', padding: '10px', background: '#f0f7ed', color: '#6ba356',
  border: '1.5px dashed #c8e0bc', borderRadius: '10px', fontSize: '13px',
  fontWeight: '700', cursor: 'pointer',
}

const stepBadge: React.CSSProperties = {
  flexShrink: 0, width: '28px', height: '28px', borderRadius: '8px', background: '#6ba356',
  color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
  fontSize: '13px', fontWeight: '700', marginTop: '5px',
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
  const [tags, setTags] = useState<string[]>([])
  const [ingredients, setIngredients] = useState<IngredientRow[]>([{ name: '', quantity: '', unit: '' }])
  const [instructions, setInstructions] = useState<InstructionRow[]>([{ text: '', duration: '' }])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const { toast, show } = useToast()

  const toggleTag = (id: string) => {
    setTags(prev => (prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]))
  }

  const updateIngredient = (i: number, field: keyof IngredientRow, value: string) =>
    setIngredients(prev => prev.map((row, idx) => (idx === i ? { ...row, [field]: value } : row)))
  const addIngredient = () => setIngredients(prev => [...prev, { name: '', quantity: '', unit: '' }])
  const removeIngredient = (i: number) => setIngredients(prev => prev.filter((_, idx) => idx !== i))

  const updateInstruction = (i: number, field: keyof InstructionRow, value: string) =>
    setInstructions(prev => prev.map((row, idx) => (idx === i ? { ...row, [field]: value } : row)))
  const addInstruction = () => setInstructions(prev => [...prev, { text: '', duration: '' }])
  const removeInstruction = (i: number) => setInstructions(prev => prev.filter((_, idx) => idx !== i))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    const cleanIngredients = ingredients
      .filter(ing => ing.name.trim())
      .map(ing => ({ name: ing.name.trim(), quantity: parseFloat(ing.quantity) || 1, unit: ing.unit.trim() }))

    const cleanInstructions = instructions
      .filter(step => step.text.trim())
      .map((step, i) => {
        const out: { stepNumber: number; text: string; duration?: number } = { stepNumber: i + 1, text: step.text.trim() }
        const d = parseInt(step.duration)
        if (!isNaN(d) && d > 0) out.duration = d
        return out
      })

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
        tags,
        ingredients: cleanIngredients,
        instructions: cleanInstructions,
      })

      show('Recipe created!')
      setTimeout(() => onNavigate('home'), 1100)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create recipe')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="screen" style={{ position: 'relative' }}>
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

          {/* Ingredients */}
          <div className="field">
            <label>Ingredients</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '6px' }}>
              {ingredients.map((ing, i) => (
                <div key={i} style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                  <input placeholder="Ingredient" value={ing.name} onChange={e => updateIngredient(i, 'name', e.target.value)} style={{ ...rowInput, flex: 2, minWidth: 0 }} />
                  <input placeholder="Qty" value={ing.quantity} onChange={e => updateIngredient(i, 'quantity', e.target.value)} inputMode="decimal" style={{ ...rowInput, flex: 1, minWidth: 0 }} />
                  <input placeholder="Unit" value={ing.unit} onChange={e => updateIngredient(i, 'unit', e.target.value)} style={{ ...rowInput, flex: 1, minWidth: 0 }} />
                  <button type="button" onClick={() => removeIngredient(i)} aria-label="Remove ingredient" style={removeBtn}>
                    <X size={15} />
                  </button>
                </div>
              ))}
              <button type="button" onClick={addIngredient} style={addBtn}>
                <Plus size={15} /> Add ingredient
              </button>
            </div>
          </div>

          {/* Instructions */}
          <div className="field">
            <label>Instructions</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '6px' }}>
              {instructions.map((step, i) => (
                <div key={i} style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                  <div style={stepBadge}>{i + 1}</div>
                  <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <textarea placeholder="Describe this step…" value={step.text} onChange={e => updateInstruction(i, 'text', e.target.value)} rows={2} style={{ ...rowInput, resize: 'vertical', lineHeight: 1.5 }} />
                    <input placeholder="Timer in minutes (optional)" value={step.duration} onChange={e => updateInstruction(i, 'duration', e.target.value)} inputMode="numeric" style={rowInput} />
                  </div>
                  <button type="button" onClick={() => removeInstruction(i)} aria-label="Remove step" style={removeBtn}>
                    <X size={15} />
                  </button>
                </div>
              ))}
              <button type="button" onClick={addInstruction} style={addBtn}>
                <Plus size={15} /> Add step
              </button>
            </div>
          </div>

          {/* Dietary Tags */}
          <div className="field">
            <label>Dietary Tags <span style={{ color: '#94a3b8', fontWeight: 400 }}>(optional)</span></label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '6px' }}>
              {DIET_OPTIONS.map(opt => {
                const active = tags.includes(opt.id)
                return (
                  <button
                    type="button"
                    key={opt.id}
                    onClick={() => toggleTag(opt.id)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '5px',
                      padding: '8px 14px',
                      background: active ? '#6ba356' : '#fff',
                      color: active ? '#fff' : '#334155',
                      border: active ? '2px solid #6ba356' : '2px solid #e2e8f0',
                      borderRadius: '999px', fontSize: '13px', fontWeight: '600', cursor: 'pointer',
                    }}
                  >
                    {active && <Check size={13} />}
                    {opt.label}
                  </button>
                )
              })}
            </div>
            <p style={{ fontSize: '12px', color: '#94a3b8', margin: '8px 0 0' }}>
              These let the recipe show up when filtering by diet in Browse.
            </p>
          </div>

          <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={loading}>
            {loading ? 'Creating...' : 'Create Recipe'}
          </button>
        </form>
      </div>

      {toast && <Toast message={toast.message} tone={toast.tone} bottom="84px" />}
      <BottomNavigation active="add" onNavigate={(s) => onNavigate(s as Screen)} />
    </div>
  )
}
