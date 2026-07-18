import { useState, useEffect } from 'react'
import { ArrowLeft, BookOpen, X } from 'lucide-react'
import type { Screen } from '../types'
import { cookbookAPI } from '../utils/api'
import { BottomNavigation } from '../components/BottomNavigation'
import { Toast, useToast } from '../components/Toast'
import { recipeImageSrc } from '../utils/image'

interface Props {
  cookbookId: string | null
  onNavigate: (screen: Screen, data?: any) => void
}

const GREEN = '#6ba356'

/** What's inside one cookbook. Until now nothing could open one. */
export default function CookbookDetailScreen({ cookbookId, onNavigate }: Props) {
  const [book, setBook] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const { toast, show } = useToast()

  useEffect(() => {
    if (!cookbookId) { setLoading(false); return }
    cookbookAPI.get(cookbookId)
      .then(setBook)
      .catch(err => setError(err instanceof Error ? err.message : 'Could not open that cookbook'))
      .finally(() => setLoading(false))
  }, [cookbookId])

  /** Takes the recipe out of this cookbook. The recipe itself is untouched,
      so this needs no confirming -- it is put back by adding it again. */
  const remove = async (recipeId: string, name: string) => {
    const before = book
    // Drop it straight away; put it back if the server disagrees.
    setBook((b: any) => ({ ...b, recipes: b.recipes.filter((r: any) => r.recipe.id !== recipeId) }))
    try {
      await cookbookAPI.removeRecipe(cookbookId!, recipeId)
      show(`Removed ${name} from ${book.name}`)
    } catch {
      setBook(before)
      show('Could not remove that just now', 'error')
    }
  }

  const recipes: any[] = (book?.recipes ?? []).map((r: any) => r.recipe).filter(Boolean)

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
              Pick this cookbook on the Add Recipe form to file one here.
            </p>
            <button
              onClick={() => onNavigate('add-recipe')}
              style={{ padding: '12px 20px', borderRadius: '12px', border: 'none', background: GREEN, color: '#fff', fontSize: '14px', fontWeight: '700', cursor: 'pointer', fontFamily: 'inherit' }}
            >
              Add a recipe
            </button>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            {recipes.map((recipe: any) => (
              // minWidth:0 or the grid item defaults to min-width:auto and grows
              // to fit a long name, so the columns come out uneven and the
              // ellipsis never kicks in.
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

      {toast && <Toast message={toast.message} tone={toast.tone} bottom="84px" />}
      <BottomNavigation active="" onNavigate={onNavigate} />
    </div>
  )
}
