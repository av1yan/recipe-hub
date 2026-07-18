import { useState, useEffect } from 'react'
import { ArrowLeft, Heart } from 'lucide-react'
import type { Screen } from '../types'
import { recipeAPI } from '../utils/api'
import { BottomNavigation } from '../components/BottomNavigation'
import { Toast, useToast } from '../components/Toast'
import { recipeImageSrc } from '../utils/image'

interface Props {
  onNavigate: (screen: Screen, data?: any) => void
}

const RED = '#ef4444'

/** Everything the person has hearted, in one place. The heart used to lead
    nowhere; this is where it lands. */
export default function FavoritesScreen({ onNavigate }: Props) {
  const [recipes, setRecipes] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const { toast, show } = useToast()

  useEffect(() => {
    recipeAPI.getSaved()
      // getSaved returns the join rows; the recipe is what we show.
      .then((saved: any) => setRecipes((Array.isArray(saved) ? saved : []).map((s: any) => s.recipe).filter(Boolean)))
      .catch(err => setError(err instanceof Error ? err.message : 'Could not load your favorites'))
      .finally(() => setLoading(false))
  }, [])

  /** Unfavorite from here. Drop it straight away; put it back if the server
      disagrees. */
  const unfavorite = async (recipeId: string, name: string) => {
    const before = recipes
    setRecipes(rs => rs.filter(r => r.id !== recipeId))
    try {
      await recipeAPI.unsave(recipeId)
      show(`Removed ${name} from favorites`)
    } catch {
      setRecipes(before)
      show('Could not update that just now', 'error')
    }
  }

  return (
    <div className="screen" style={{ position: 'relative', display: 'flex', flexDirection: 'column', height: '100%' }}>
      <header style={{ padding: '12px 16px', borderBottom: '1px solid rgba(15, 23, 42, 0.08)', background: 'var(--color-card)', display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
        <button onClick={() => onNavigate('home')} aria-label="Back" className="btn btn-icon" style={{ background: 'none' }}>
          <ArrowLeft size={22} />
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h2 style={{ fontSize: '18px', margin: 0 }}>Favorites</h2>
          {!loading && !error && (
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
            <div style={{ width: '52px', height: '52px', borderRadius: '26px', background: 'var(--color-error-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
              <Heart size={22} color={RED} />
            </div>
            <p style={{ fontSize: '15px', fontWeight: '700', color: 'var(--color-text)', margin: '0 0 4px' }}>No favorites yet</p>
            <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', margin: '0 0 18px', lineHeight: 1.5 }}>
              Tap the heart on any recipe to save it here.
            </p>
            <button
              onClick={() => onNavigate('home')}
              style={{ padding: '12px 20px', borderRadius: '12px', border: 'none', background: '#6ba356', color: '#fff', fontSize: '14px', fontWeight: '700', cursor: 'pointer', fontFamily: 'inherit' }}
            >
              Find recipes
            </button>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            {recipes.map((recipe: any) => (
              // minWidth:0 or a long name grows the grid column and breaks the
              // ellipsis -- same guard as the cookbook grid.
              <div key={recipe.id} style={{ position: 'relative', minWidth: 0 }}>
                <div onClick={() => onNavigate('recipe', { recipe: { ...recipe, isFavorite: true } })} style={{ cursor: 'pointer' }}>
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
                  onClick={() => unfavorite(recipe.id, recipe.name)}
                  aria-label={`Remove ${recipe.name} from favorites`}
                  title="Remove from favorites"
                  style={{
                    position: 'absolute', top: '6px', right: '6px',
                    width: '26px', height: '26px', borderRadius: '13px',
                    background: 'rgba(255,255,255,0.92)', border: 'none',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer',
                  }}
                >
                  <Heart size={13} fill={RED} color={RED} />
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
