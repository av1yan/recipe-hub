import { useState, useEffect } from 'react'
import { ArrowLeft, BookOpen, X, Plus, Check } from 'lucide-react'
import type { Screen, Recipe } from '../types'
import { cookbookAPI, recipeAPI } from '../utils/api'
import { BottomNavigation } from '../components/BottomNavigation'
import { Toast, useToast } from '../components/Toast'
import { recipeImageSrc } from '../utils/image'

interface Props {
  cookbookId: string | null
  onNavigate: (screen: Screen, data?: any) => void
}

const GREEN = 'var(--color-primary)'

/** What's inside one cookbook, plus the two ways to fill it: add recipes you
 *  already have, or create a new one filed straight into it. */
export default function CookbookDetailScreen({ cookbookId, onNavigate }: Props) {
  const [book, setBook] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const { toast, show } = useToast()

  // "Add existing recipes" picker
  const [showAdd, setShowAdd] = useState(false)
  const [allRecipes, setAllRecipes] = useState<Recipe[]>([])
  const [loadingAdd, setLoadingAdd] = useState(false)
  const [addingId, setAddingId] = useState<string | null>(null)

  useEffect(() => {
    if (!cookbookId) { setLoading(false); return }
    cookbookAPI.get(cookbookId)
      .then(setBook)
      .catch(err => setError(err instanceof Error ? err.message : 'Could not open that cookbook'))
      .finally(() => setLoading(false))
  }, [cookbookId])

  const recipes: any[] = (book?.recipes ?? []).map((r: any) => r.recipe).filter(Boolean)
  const inCookbook = new Set(recipes.map(r => r.id))

  const openAdd = async () => {
    setShowAdd(true)
    if (allRecipes.length === 0) {
      setLoadingAdd(true)
      try { setAllRecipes(await recipeAPI.list()) }
      catch { show('Could not load your recipes', 'error') }
      finally { setLoadingAdd(false) }
    }
  }

  const addExisting = async (recipe: any) => {
    if (!cookbookId || addingId) return
    setAddingId(recipe.id)
    try {
      await cookbookAPI.addRecipe(cookbookId, recipe.id)
      setBook((b: any) => ({ ...b, recipes: [...(b?.recipes ?? []), { recipe }] }))
      show(`Added ${recipe.name}`)
    } catch {
      show('Could not add that just now', 'error')
    } finally {
      setAddingId(null)
    }
  }

  /** Takes the recipe out of this cookbook. The recipe itself is untouched. */
  const remove = async (recipeId: string, name: string) => {
    const before = book
    setBook((b: any) => ({ ...b, recipes: b.recipes.filter((r: any) => r.recipe.id !== recipeId) }))
    try {
      await cookbookAPI.removeRecipe(cookbookId!, recipeId)
      show(`Removed ${name} from ${book.name}`)
    } catch {
      setBook(before)
      show('Could not remove that just now', 'error')
    }
  }

  const addable = allRecipes.filter(r => !inCookbook.has(r.id))

  return (
    <div className="screen" style={{ position: 'relative', display: 'flex', flexDirection: 'column', height: '100%' }}>
      <header style={{ padding: '12px 16px', borderBottom: '1px solid rgba(15, 23, 42, 0.08)', background: 'var(--color-card)', display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
        <button onClick={() => onNavigate('cookbooks')} aria-label="Back" className="btn btn-icon" style={{ background: 'none' }}>
          <ArrowLeft size={22} />
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h2 style={{ fontSize: '18px', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {book?.name ?? 'Cookbook'}
          </h2>
          {book && (
            <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', margin: '1px 0 0' }}>
              {recipes.length} recipe{recipes.length === 1 ? '' : 's'}
            </p>
          )}
        </div>
        {book && (
          <button onClick={openAdd} aria-label="Add recipes" style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: '5px', background: GREEN, color: '#fff', border: 'none', borderRadius: '10px', padding: '8px 12px', fontSize: '13px', fontWeight: '700', cursor: 'pointer', fontFamily: 'inherit' }}>
            <Plus size={16} /> Add
          </button>
        )}
      </header>

      <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
        {error && (
          <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '10px', padding: '10px 12px', marginBottom: '12px' }}>
            <p style={{ margin: 0, fontSize: '13px', color: '#b91c1c' }}>{error}</p>
          </div>
        )}

        {loading ? (
          <p style={{ color: 'var(--color-text-muted)', fontSize: '14px', textAlign: 'center', paddingTop: '32px' }}>Loading…</p>
        ) : recipes.length === 0 && !error ? (
          <div style={{ textAlign: 'center', paddingTop: '40px' }}>
            <div style={{ width: '52px', height: '52px', borderRadius: '26px', background: 'var(--color-primary-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
              <BookOpen size={22} color={GREEN} />
            </div>
            <p style={{ fontSize: '15px', fontWeight: '700', color: 'var(--color-text)', margin: '0 0 4px' }}>Nothing in here yet</p>
            <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', margin: '0 0 18px', lineHeight: 1.5 }}>
              Add recipes you've already saved, or create a new one filed straight into this cookbook.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxWidth: '260px', margin: '0 auto' }}>
              <button
                onClick={openAdd}
                style={{ padding: '12px 20px', borderRadius: '12px', border: 'none', background: GREEN, color: '#fff', fontSize: '14px', fontWeight: '700', cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '7px' }}
              >
                <Plus size={16} /> Add recipes
              </button>
              <button
                onClick={() => onNavigate('add-recipe', { cookbookId })}
                style={{ padding: '12px 20px', borderRadius: '12px', border: '1.5px solid var(--color-border)', background: 'var(--color-card)', color: 'var(--color-text)', fontSize: '14px', fontWeight: '700', cursor: 'pointer', fontFamily: 'inherit' }}
              >
                Create a new recipe
              </button>
            </div>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            {recipes.map((recipe: any) => (
              <div key={recipe.id} style={{ position: 'relative', minWidth: 0 }}>
                <div onClick={() => onNavigate('recipe', { recipe })} style={{ cursor: 'pointer' }}>
                  <div style={{
                    width: '100%', height: '100px', borderRadius: '14px', background: 'var(--color-subtle)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '30px', marginBottom: '8px', overflow: 'hidden',
                  }}>
                    {recipe.imageUrl
                      ? <img src={recipeImageSrc(recipe.imageUrl, 160, 100)} alt="" loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => { e.currentTarget.style.display = 'none' }} />
                      : '🍽️'}
                  </div>
                  <h4 style={{ fontSize: '13px', fontWeight: '600', color: 'var(--color-text)', margin: '0 0 2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {recipe.name}
                  </h4>
                  <p style={{ fontSize: '11px', color: 'var(--color-text-muted)', margin: 0 }}>
                    {(recipe.prepTime || 0) + (recipe.cookTime || 0)} min
                  </p>
                </div>
                <button
                  onClick={() => remove(recipe.id, recipe.name)}
                  aria-label={`Remove ${recipe.name} from this cookbook`}
                  title="Remove from this cookbook"
                  style={{
                    position: 'absolute', top: '6px', right: '6px',
                    width: '26px', height: '26px', borderRadius: '13px',
                    background: 'rgba(255,255,255,0.92)', border: 'none',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer',
                  }}
                >
                  <X size={13} color="var(--color-text-secondary)" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add existing recipes */}
      {showAdd && (
        <div style={{ position: 'absolute', inset: 0, zIndex: 30, background: 'var(--color-card)', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--color-subtle)', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button onClick={() => setShowAdd(false)} aria-label="Done" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', display: 'flex' }}>
              <X size={22} color="var(--color-text)" />
            </button>
            <div style={{ flex: 1 }}>
              <h3 style={{ fontSize: '16px', fontWeight: '700', margin: 0, color: 'var(--color-text)' }}>Add to {book?.name}</h3>
              <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', margin: '2px 0 0' }}>Tap a recipe to add it.</p>
            </div>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px' }}>
            {loadingAdd ? (
              <p style={{ textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '14px', paddingTop: '24px' }}>Loading your recipes…</p>
            ) : addable.length === 0 ? (
              <div style={{ textAlign: 'center', paddingTop: '32px', color: 'var(--color-text-muted)' }}>
                <p style={{ fontSize: '14px', margin: '0 0 16px' }}>{allRecipes.length === 0 ? "You haven't saved any recipes yet." : 'Every recipe you have is already in here.'}</p>
                <button onClick={() => { setShowAdd(false); onNavigate('add-recipe', { cookbookId }) }} style={{ padding: '11px 18px', borderRadius: '10px', border: 'none', background: GREEN, color: '#fff', fontSize: '14px', fontWeight: '700', cursor: 'pointer', fontFamily: 'inherit' }}>
                  Create a new recipe
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {addable.map((r: any) => {
                  const busy = addingId === r.id
                  return (
                    <button
                      key={r.id}
                      onClick={() => addExisting(r)}
                      disabled={busy}
                      style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 12px', background: 'var(--color-card)', border: '1px solid var(--color-subtle)', borderRadius: '14px', cursor: busy ? 'default' : 'pointer', textAlign: 'left', fontFamily: 'inherit', width: '100%' }}
                    >
                      <div style={{ width: '46px', height: '46px', borderRadius: '11px', background: 'var(--color-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', flexShrink: 0, overflow: 'hidden' }}>
                        {r.imageUrl
                          ? <img src={recipeImageSrc(r.imageUrl, 46, 46)} alt="" loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => { e.currentTarget.style.display = 'none' }} />
                          : '🍽️'}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--color-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.name}</div>
                        <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '1px' }}>{r.cuisine} · {(r.prepTime || 0) + (r.cookTime || 0)} min</div>
                      </div>
                      <span style={{ flexShrink: 0, width: '30px', height: '30px', borderRadius: '15px', background: GREEN, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {busy ? <Check size={16} /> : <Plus size={17} />}
                      </span>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {toast && <Toast message={toast.message} tone={toast.tone} bottom="84px" />}
      <BottomNavigation active="" onNavigate={onNavigate} />
    </div>
  )
}
