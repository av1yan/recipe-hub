import { useState, useRef, useEffect } from 'react'
import { ArrowLeft, Check, Plus, X, Camera } from 'lucide-react'
import type { Screen } from '../types'
import { BottomNavigation } from '../components/BottomNavigation'
import { recipeAPI, cookbookAPI } from '../utils/api'
import { DIET_OPTIONS } from './DietPreferencesScreen'
import { Toast, useToast } from '../components/Toast'
import { fileToCompressedDataUrl } from '../utils/image'
import { useProPlan, FREE_RECIPE_LIMIT, FREE_COOKBOOK_LIMIT } from '../utils/proPlan'

interface Props {
  onNavigate: (screen: Screen, data?: any) => void
  /** A parsed import to review, or null when starting from scratch. */
  draft?: any
  /** Where the back button goes — wherever this form was opened from. */
  backTo?: Screen
  /** When the blank form was opened from the add panel, Back reopens that panel
      over `backTo` instead of just landing on the screen behind it. */
  reopenPanelOnBack?: boolean
  /** When Add Recipe is opened from inside a cookbook, that cookbook is
      pre-selected so the new recipe files into it. */
  presetCookbookId?: string | null
}

/** A small section heading, so the long form reads as groups not one list. */
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ fontSize: '12px', fontWeight: '700', color: 'var(--color-text-muted)', letterSpacing: '0.05em', textTransform: 'uppercase', margin: '8px 0 -4px' }}>
      {children}
    </p>
  )
}

/** Draft numbers arrive as numbers or null; the form's inputs want strings. */
function numField(v: unknown): string {
  return v === null || v === undefined || v === 0 ? '' : String(v)
}

// A <select> given a value it has no option for silently displays its first
// option instead, so anything missing here is quietly rewritten on save. These
// must cover every value the data or the importer can produce -- "Middle
// Eastern" already exists on a saved recipe, and imports emit "Other".
const CUISINES = [
  'Italian', 'Asian', 'Mexican', 'American', 'Mediterranean',
  'Indian', 'Middle Eastern', 'French', 'Other',
]
const MEAL_TYPES = ['breakfast', 'lunch', 'dinner', 'snack', 'dessert']

/** Sentinel for the picker's "make a new one" option. */
const NEW_COOKBOOK = '__new__'

/** Keeps a draft's value only when the form can actually represent it. */
function inList(value: unknown, list: string[], fallback: string): string {
  return typeof value === 'string' && list.includes(value) ? value : fallback
}

type IngredientRow = { name: string; quantity: string; unit: string }
type InstructionRow = { text: string; duration: string }

const rowInput: React.CSSProperties = {
  padding: '10px 12px', borderRadius: '11px', border: 'none',
  fontSize: '14px', color: 'var(--color-text)', background: 'var(--color-subtle)', outline: 'none',
  boxSizing: 'border-box', fontFamily: 'inherit', width: '100%',
}

const removeBtn: React.CSSProperties = {
  flexShrink: 0, width: '34px', height: '38px', display: 'flex', alignItems: 'center',
  justifyContent: 'center', background: 'transparent', border: 'none',
  borderRadius: '11px', color: 'var(--color-text-muted)', cursor: 'pointer',
}

const addBtn: React.CSSProperties = {
  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
  width: '100%', padding: '10px', background: 'var(--color-primary-bg)', color: 'var(--color-primary)',
  border: '1px solid var(--color-primary-border)', borderRadius: '11px', fontSize: '13px',
  fontWeight: '700', cursor: 'pointer',
}

const stepBadge: React.CSSProperties = {
  flexShrink: 0, width: '28px', height: '28px', borderRadius: '14px', background: 'var(--color-primary-bg)',
  color: 'var(--color-primary-dark)', display: 'flex', alignItems: 'center', justifyContent: 'center',
  fontSize: '14px', fontWeight: '700', marginTop: '5px',
}

export default function AddRecipeScreen({ onNavigate, draft, backTo = 'home', reopenPanelOnBack = false, presetCookbookId = null }: Props) {
  // An import arrives here as a draft to be checked over. Seeding useState
  // rather than assigning in an effect means the fields are already filled on
  // first paint, and stay editable like any other.
  const [name, setName] = useState(draft?.name ?? '')
  const [cuisine, setCuisine] = useState(inList(draft?.cuisine, CUISINES, 'Italian'))
  const [mealType, setMealType] = useState(inList(draft?.mealType, MEAL_TYPES, 'lunch'))
  const [difficulty, setDifficulty] = useState(inList(draft?.difficulty, ['easy', 'medium', 'hard'], 'easy'))
  const [prepTime, setPrepTime] = useState(numField(draft?.prepTime))
  const [cookTime, setCookTime] = useState(numField(draft?.cookTime))
  const [servings, setServings] = useState(numField(draft?.servings) || '2')
  const [calories, setCalories] = useState(numField(draft?.calories))
  const [imageUrl, setImageUrl] = useState(draft?.imageUrl ?? '')
  // Where an import came from. Kept so the recipe can credit its source.
  const [sourceUrl] = useState<string | null>(draft?.sourceUrl ?? null)
  const [tags, setTags] = useState<string[]>(draft?.tags ?? [])
  const [ingredients, setIngredients] = useState<IngredientRow[]>(
    draft?.ingredients?.length
      ? draft.ingredients.map((i: any) => ({ name: i.name, quantity: numField(i.quantity), unit: i.unit ?? '' }))
      : [{ name: '', quantity: '', unit: '' }]
  )
  const [instructions, setInstructions] = useState<InstructionRow[]>(
    draft?.instructions?.length
      ? draft.instructions.map((i: any) => ({ text: i.text, duration: numField(i.duration) }))
      : [{ text: '', duration: '' }]
  )
  // Cookbooks to file this under. '' means don't, NEW_COOKBOOK means make one.
  const [cookbooks, setCookbooks] = useState<{ id: string; name: string }[]>([])
  const [cookbookId, setCookbookId] = useState(presetCookbookId ?? '')
  const [newCookbookName, setNewCookbookName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [photoBusy, setPhotoBusy] = useState(false)
  const [photoError, setPhotoError] = useState('')
  const photoInputRef = useRef<HTMLInputElement>(null)
  const { toast, show } = useToast()
  const [isPro] = useProPlan()

  useEffect(() => {
    // Not being able to list cookbooks just means the picker offers "none" and
    // a new one -- never block saving a recipe on it.
    cookbookAPI.list()
      .then((list: any) => setCookbooks(Array.isArray(list) ? list.map((c: any) => ({ id: c.id, name: c.name })) : []))
      .catch(() => {})
  }, [])

  async function handlePhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = '' // let the same file be picked again after a removal
    if (!file) return
    setPhotoError('')
    setPhotoBusy(true)
    try {
      setImageUrl(await fileToCompressedDataUrl(file))
    } catch (err) {
      setPhotoError(err instanceof Error ? err.message : 'Could not read that photo')
    } finally {
      setPhotoBusy(false)
    }
  }

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

    // Free-plan caps (Pro removes them). Check before doing any work so nothing
    // half-saves.
    const makingNewCookbook = cookbookId === NEW_COOKBOOK && !!newCookbookName.trim()
    if (!isPro && makingNewCookbook && cookbooks.length >= FREE_COOKBOOK_LIMIT) {
      setError(`The Free plan is capped at ${FREE_COOKBOOK_LIMIT} cookbook. Upgrade to Pro in Settings for unlimited.`)
      return
    }
    if (!isPro) {
      try {
        const existing = await recipeAPI.list()
        if (Array.isArray(existing) && existing.length >= FREE_RECIPE_LIMIT) {
          setError(`The Free plan is capped at ${FREE_RECIPE_LIMIT} recipes. Upgrade to Pro in Settings for unlimited.`)
          return
        }
      } catch {
        // If the count can't be fetched, don't block the save.
      }
    }

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

    if (!name.trim()) {
      setError('Give your recipe a name.')
      setLoading(false)
      return
    }
    if (cleanIngredients.length === 0 && cleanInstructions.length === 0) {
      setError('Add at least one ingredient or step.')
      setLoading(false)
      return
    }

    try {
      const created: any = await recipeAPI.create({
        name,
        cuisine,
        mealType,
        difficulty,
        prepTime: parseInt(prepTime),
        cookTime: parseInt(cookTime),
        servings: parseInt(servings),
        calories: calories ? parseInt(calories) : null,
        imageUrl: imageUrl.trim() || null,
        sourceUrl,
        tags,
        ingredients: cleanIngredients,
        instructions: cleanInstructions,
      })

      // Filing it is a second step, so a cookbook problem must not lose the
      // recipe that already saved -- say so and carry on.
      let filedInto = ''
      let filedCookbookId: string | null = null
      try {
        if (cookbookId === NEW_COOKBOOK && newCookbookName.trim()) {
          const book: any = await cookbookAPI.create(newCookbookName.trim())
          await cookbookAPI.addRecipe(book.id, created.id)
          filedInto = book.name; filedCookbookId = book.id
        } else if (cookbookId && cookbookId !== NEW_COOKBOOK) {
          await cookbookAPI.addRecipe(cookbookId, created.id)
          filedInto = cookbooks.find(c => c.id === cookbookId)?.name || ''
          filedCookbookId = cookbookId
        }
      } catch {
        show('Recipe saved, but adding it to the cookbook failed', 'error')
        setTimeout(() => onNavigate('home'), 2600)
        return
      }

      show(filedInto ? `Saved to ${filedInto}` : 'Recipe created!')
      // Land where the recipe went: open the cookbook it was filed into so it's
      // visibly there, otherwise Home.
      setTimeout(() => {
        if (filedCookbookId) onNavigate('cookbook', { cookbookId: filedCookbookId })
        else onNavigate('home')
      }, 1600)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create recipe')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="screen" style={{ position: 'relative' }}>
      <header style={{ padding: '16px 24px', borderBottom: '1px solid var(--color-subtle)', background: 'var(--color-bg)', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <button onClick={() => onNavigate(backTo, reopenPanelOnBack ? { openAddSheet: true } : undefined)} aria-label="Back" className="btn btn-icon" style={{ background: 'none' }}>
          <ArrowLeft size={22} />
        </button>
        <h2 style={{ flex: 1, fontSize: '18px', margin: 0 }}>{draft ? 'Review recipe' : 'Add Recipe'}</h2>
      </header>

      <div style={{ flex: 1, overflowY: 'auto', padding: '18px 24px 24px' }}>
        {error && (
          <div style={{ background: 'var(--color-error-bg)', border: '1px solid rgba(239,68,68,0.35)', borderRadius: '8px', padding: '12px', marginBottom: '16px', color: '#ef4444', fontSize: '14px' }}>
            {error}
          </div>
        )}

        {/* An import is a guess. Say which parts the parser was unsure of, so a
            shaky read doesn't look as confident as a clean one. */}
        {draft?.warnings?.length > 0 && (
          <div style={{ background: 'var(--color-subtle)', borderRadius: '12px', padding: '12px 14px', marginBottom: '16px' }}>
            <p style={{ margin: 0, fontSize: '13px', fontWeight: '700', color: 'var(--color-text)' }}>
              Check this import before saving
            </p>
            <ul style={{ margin: '6px 0 0', paddingLeft: '18px' }}>
              {draft.warnings.map((w: string) => (
                <li key={w} style={{ fontSize: '12.5px', color: '#b45309', lineHeight: 1.5 }}>{w}</li>
              ))}
            </ul>
          </div>
        )}

        {draft && !draft.warnings?.length && (
          <div style={{ background: 'var(--color-primary-bg)', border: '1px solid var(--color-primary-border)', borderRadius: '10px', padding: '10px 14px', marginBottom: '16px' }}>
            <p style={{ margin: 0, fontSize: '12.5px', color: 'var(--color-primary)', fontWeight: '600', lineHeight: 1.5 }}>
              Imported — look it over and change anything that isn’t right.
            </p>
          </div>
        )}

        <form id="addRecipeForm" onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <SectionLabel>Basics</SectionLabel>
          <div className="field">
            <label>Recipe Name</label>
            <input type="text" className="input" placeholder="e.g., Pasta Carbonara" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div className="field">
              <label>Cuisine</label>
              <select className="input" value={cuisine} onChange={(e) => setCuisine(e.target.value)} style={{ background: 'var(--color-subtle)', color: 'var(--color-text)', cursor: 'pointer' }}>
                {CUISINES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div className="field">
              <label>Meal Type</label>
              <select className="input" value={mealType} onChange={(e) => setMealType(e.target.value)} style={{ background: 'var(--color-subtle)', color: 'var(--color-text)', cursor: 'pointer' }}>
                {MEAL_TYPES.map(m => (
                  <option key={m} value={m}>{m.charAt(0).toUpperCase() + m.slice(1)}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="field">
            <label>Difficulty</label>
            <select className="input" value={difficulty} onChange={(e) => setDifficulty(e.target.value)} style={{ background: 'var(--color-subtle)', color: 'var(--color-text)', cursor: 'pointer' }}>
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
          </div>

          <SectionLabel>Time &amp; servings</SectionLabel>
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

          <SectionLabel>Photo</SectionLabel>
          <div className="field">
            <label>Photo <span style={{ color: 'var(--color-text-muted)', fontWeight: 400 }}>(optional)</span></label>
            <input ref={photoInputRef} type="file" accept="image/*" onChange={handlePhoto} style={{ display: 'none' }} />

            {imageUrl ? (
              <div style={{ marginTop: '6px' }}>
                <div style={{ position: 'relative', height: '160px', borderRadius: '12px', overflow: 'hidden', background: 'var(--color-subtle)', border: '1px solid var(--color-subtle)' }}>
                  <img src={imageUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                  <button
                    type="button"
                    onClick={() => setImageUrl('')}
                    aria-label="Remove photo"
                    style={{ position: 'absolute', top: '8px', right: '8px', width: '30px', height: '30px', borderRadius: '9px', background: 'var(--color-overlay)', border: '1px solid var(--color-overlay-border)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text)' }}
                  >
                    <X size={16} />
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => photoInputRef.current?.click()}
                  style={{ marginTop: '8px', background: 'none', border: 'none', color: 'var(--color-primary)', fontSize: '13px', fontWeight: '700', cursor: 'pointer', padding: 0 }}
                >
                  Choose a different photo
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => photoInputRef.current?.click()}
                disabled={photoBusy}
                style={{ marginTop: '6px', width: '100%', display: 'flex', alignItems: 'center', gap: '12px', padding: '14px', background: 'var(--color-subtle)', border: 'none', borderRadius: '12px', cursor: 'pointer', textAlign: 'left' }}
              >
                <div style={{ width: '40px', height: '40px', borderRadius: '11px', background: 'var(--color-primary-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Camera size={18} color="var(--color-primary)" />
                </div>
                <span style={{ fontSize: '14px', fontWeight: '600', color: 'var(--color-text-muted)' }}>
                  {photoBusy ? 'Processing photo…' : 'Add a photo'}
                </span>
              </button>
            )}

            {photoError && <p style={{ fontSize: '13px', color: '#ef4444', margin: '8px 0 0' }}>{photoError}</p>}
          </div>

          {/* Ingredients */}
          <SectionLabel>Ingredients</SectionLabel>
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
          <SectionLabel>Instructions</SectionLabel>
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
          <SectionLabel>Dietary tags</SectionLabel>
          <div className="field">
            <label>Dietary Tags <span style={{ color: 'var(--color-text-muted)', fontWeight: 400 }}>(optional)</span></label>
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
                      background: active ? 'var(--color-primary-bg)' : 'transparent',
                      color: active ? 'var(--color-primary-dark)' : 'var(--color-text-secondary)',
                      border: '1px solid ' + (active ? 'var(--color-primary)' : 'var(--color-border)'),
                      borderRadius: '999px', fontSize: '13px', fontWeight: '600', cursor: 'pointer',
                      fontFamily: 'inherit',
                    }}
                  >
                    {active && <Check size={13} />}
                    {opt.label}
                  </button>
                )
              })}
            </div>
            <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', margin: '8px 0 0' }}>
              These let the recipe show up when filtering by diet in Browse.
            </p>
          </div>

          <SectionLabel>Save to a cookbook <span style={{ textTransform: 'none', fontWeight: 400, color: 'var(--color-text-muted)' }}>(optional)</span></SectionLabel>
          <div className="field">
            <select
              className="input"
              value={cookbookId}
              onChange={(e) => setCookbookId(e.target.value)}
              style={{ background: 'var(--color-subtle)', color: 'var(--color-text)', cursor: 'pointer' }}
            >
              <option value="">Don't file it anywhere</option>
              {cookbooks.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              <option value={NEW_COOKBOOK}>+ New cookbook…</option>
            </select>
            {cookbookId === NEW_COOKBOOK && (
              <input
                value={newCookbookName}
                onChange={(e) => setNewCookbookName(e.target.value)}
                placeholder="Name the cookbook, e.g. Weeknights"
                className="input"
                style={{ marginTop: '8px' }}
              />
            )}
          </div>
        </form>
      </div>

      {/* Save is pinned above the nav so it's always in reach, not buried at the
          bottom of a long scroll. */}
      <div style={{ flexShrink: 0, padding: '12px 24px 16px', borderTop: '1px solid var(--color-subtle)', background: 'var(--color-bg)' }}>
        <button
          type="submit"
          form="addRecipeForm"
          disabled={loading}
          style={{ width: '100%', padding: '14px', borderRadius: '12px', border: 'none', background: loading ? 'var(--color-disabled)' : 'var(--color-primary)', color: '#fff', fontSize: '15px', fontWeight: '700', cursor: loading ? 'default' : 'pointer', fontFamily: 'inherit' }}
        >
          {loading ? 'Saving…' : draft ? 'Save recipe' : 'Create recipe'}
        </button>
      </div>

      {toast && <Toast message={toast.message} tone={toast.tone} bottom="150px" />}
      <BottomNavigation active="add" onNavigate={(s) => onNavigate(s as Screen)} />
    </div>
  )
}
