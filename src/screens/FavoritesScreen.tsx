import { useState, useEffect } from 'react'
import { ArrowLeft, Heart } from 'lucide-react'
import type { Screen } from '../types'
import { recipeAPI } from '../utils/api'
import { BottomNavigation } from '../components/BottomNavigation'
import { Toast, useToast } from '../components/Toast'

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
    <div className="screen" style={{ position: 'relative', display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--color-bg)' }}>
      <header style={{ padding: '16px 24px', borderBottom: '1px solid var(--color-subtle)', background: 'var(--color-bg)', display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
        <button onClick={() => onNavigate('home')} aria-label="Back" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex' }}>
          <ArrowLeft size={22} color="var(--color-text)" />
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h1 style={{ fontSize: '19px', fontWeight: '700', letterSpacing: '-0.01em', margin: 0, color: 'var(--color-text)' }}>Favorites</h1>
          {!loading && !error && (
            <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', margin: '2px 0 0' }}>
              {recipes.length} recipe{recipes.length === 1 ? '' : 's'}
            </p>
          )}
        </div>
      </header>

      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 24px 24px' }}>
        {error && (
          <div style={{ background: 'var(--color-error-bg)', borderRadius: '12px', padding: '11px 13px', margin: '8px 0 14px' }}>
            <p style={{ margin: 0, fontSize: '13px', color: 'var(--color-error)' }}>{error}</p>
          </div>
        )}

        {loading ? (
          <div>
            {[0, 1, 2].map(i => (
              <div key={i} style={{ padding: '15px 0', borderTop: i > 0 ? '1px solid var(--color-subtle)' : 'none' }}>
                <div className="rh-skel" style={{ width: '52%', height: '14px', borderRadius: '7px' }} />
                <div className="rh-skel" style={{ width: '24%', height: '11px', borderRadius: '6px', marginTop: '8px' }} />
              </div>
            ))}
          </div>
        ) : recipes.length === 0 && !error ? (
          <div style={{ textAlign: 'center', paddingTop: '48px' }}>
            <div style={{ width: '52px', height: '52px', borderRadius: '26px', background: 'var(--color-error-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
              <Heart size={22} color={RED} />
            </div>
            <p style={{ fontSize: '15px', fontWeight: '700', color: 'var(--color-text)', margin: '0 0 4px' }}>No favorites yet</p>
            <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', margin: '0 0 18px', lineHeight: 1.5 }}>
              Tap the heart on any recipe to save it here.
            </p>
            <button
              onClick={() => onNavigate('home')}
              style={{ padding: '12px 20px', borderRadius: '12px', border: 'none', background: 'var(--color-primary)', color: '#fff', fontSize: '14px', fontWeight: '700', cursor: 'pointer', fontFamily: 'inherit' }}
            >
              Find recipes
            </button>
          </div>
        ) : (
          <div>
            {recipes.map((recipe: any, i: number) => {
              const time = (recipe.prepTime || 0) + (recipe.cookTime || 0)
              return (
                <div
                  key={recipe.id}
                  style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '15px 0', borderTop: i > 0 ? '1px solid var(--color-subtle)' : 'none' }}
                >
                  {/* Text opens the recipe; the heart (a sibling, not nested)
                      removes it, so the two taps never collide. */}
                  <div
                    onClick={() => onNavigate('recipe', { recipe: { ...recipe, isFavorite: true } })}
                    style={{ flex: 1, minWidth: 0, cursor: 'pointer' }}
                  >
                    <h4 style={{ fontSize: '15.5px', fontWeight: '600', color: 'var(--color-text)', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {recipe.name}
                    </h4>
                    <p style={{ fontSize: '12.5px', color: 'var(--color-text-muted)', margin: '3px 0 0' }}>
                      {[recipe.cuisine, `${time} min`].filter(Boolean).join(' · ')}
                    </p>
                  </div>
                  <button
                    onClick={() => unfavorite(recipe.id, recipe.name)}
                    aria-label={`Remove ${recipe.name} from favorites`}
                    title="Remove from favorites"
                    style={{ flexShrink: 0, width: '32px', height: '32px', borderRadius: '16px', background: 'none', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                  >
                    <Heart size={17} fill={RED} color={RED} />
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {toast && <Toast message={toast.message} tone={toast.tone} bottom="84px" />}
      <BottomNavigation active="" onNavigate={onNavigate} />
    </div>
  )
}
