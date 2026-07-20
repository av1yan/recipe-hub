import { useState, useEffect } from 'react'
import { ArrowLeft, Plus, X, ChevronRight, Check, Crown, ChefHat } from 'lucide-react'
import type { Screen, Recipe } from '../types'
import { recipeAPI } from '../utils/api'
import { getPantry, savePantry, pantryMatch } from '../utils/pantry'
import { useProPlan } from '../utils/proPlan'

interface Props {
  onNavigate: (screen: Screen, data?: any) => void
}

const TILE_COLORS = ['#e8b4a8', '#d4a574', '#c9a582', '#b8956a', '#a48a6e']

export default function PantryScreen({ onNavigate }: Props) {
  const [isPro] = useProPlan()
  const [pantry, setPantry] = useState<string[]>(() => getPantry())
  const [input, setInput] = useState('')
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (isPro) loadRecipes()
  }, [])

  async function loadRecipes() {
    try {
      setLoading(true)
      const data: Recipe[] = await recipeAPI.list()
      // The list endpoint omits ingredients, so hydrate them from each recipe's
      // detail -- the whole feature matches on ingredient names.
      const hydrated = await Promise.all(
        data.map(async (r: any) => {
          try {
            const detail = await recipeAPI.get(r.id)
            return { ...r, ingredients: detail.ingredients || r.ingredients || [] }
          } catch {
            return r
          }
        })
      )
      setRecipes(hydrated)
    } catch (error) {
      console.error('Failed to load recipes:', error)
    } finally {
      setLoading(false)
    }
  }

  const addItem = () => {
    const v = input.trim()
    if (!v) return
    if (pantry.some(p => p.toLowerCase() === v.toLowerCase())) { setInput(''); return }
    const next = [...pantry, v]
    setPantry(next); savePantry(next); setInput('')
  }
  const removeItem = (item: string) => {
    const next = pantry.filter(p => p !== item)
    setPantry(next); savePantry(next)
  }

  // Recipes you have at least one ingredient for, best matches first (fewest
  // missing, then most already on hand).
  const ranked = recipes
    .map(r => ({ r, m: pantryMatch(r, pantry) }))
    .filter(x => x.m.total > 0 && x.m.have > 0)
    .sort((a, b) => (a.m.missing.length - b.m.missing.length) || (b.m.have - a.m.have))

  const readyCount = ranked.filter(x => x.m.missing.length === 0).length

  const header = (
    <header style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '14px 16px', background: 'var(--color-card)', borderBottom: '1px solid var(--color-subtle)', flexShrink: 0 }}>
      <button onClick={() => onNavigate('home')} aria-label="Back" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex' }}>
        <ArrowLeft size={22} color="var(--color-text)" />
      </button>
      <h1 style={{ fontSize: '17px', fontWeight: '700', color: 'var(--color-text)', margin: 0 }}>Cook with what I have</h1>
    </header>
  )

  // Belt-and-suspenders: the Home entry is Pro-gated, but guard here too.
  if (!isPro) {
    return (
      <div className="screen">
        {header}
        <div style={{ flex: 1, overflowY: 'auto', padding: '32px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '14px' }}>
          <div style={{ width: '64px', height: '64px', borderRadius: '18px', background: 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ChefHat size={32} color="#fff" />
          </div>
          <h2 style={{ fontSize: '19px', fontWeight: '800', color: 'var(--color-text)', margin: 0 }}>A Pro feature</h2>
          <p style={{ fontSize: '14px', color: 'var(--color-text-secondary)', margin: 0, lineHeight: 1.5, maxWidth: '280px' }}>
            Tell recipHub what's in your kitchen and it shows the recipes you can make right now — ranked by what you already have.
          </p>
          <button onClick={() => onNavigate('settings')} style={{ marginTop: '6px', padding: '13px 22px', background: 'var(--color-primary)', color: '#fff', border: 'none', borderRadius: '12px', fontSize: '15px', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontFamily: 'inherit' }}>
            <Crown size={16} color="#f4b860" /> Upgrade to Pro
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="screen" style={{ background: 'var(--color-bg)' }}>
      {header}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
        {/* Pantry manager */}
        <p style={{ fontSize: '12px', fontWeight: '700', color: 'var(--color-text-muted)', letterSpacing: '0.05em', margin: '0 0 8px' }}>MY PANTRY</p>
        <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') addItem() }}
            placeholder="Add an ingredient you have…"
            style={{ flex: 1, minWidth: 0, padding: '12px 14px', borderRadius: '12px', border: '1.5px solid var(--color-border)', fontSize: '15px', color: 'var(--color-text)', background: 'var(--color-card)', outline: 'none', fontFamily: 'inherit' }}
          />
          <button onClick={addItem} aria-label="Add to pantry" style={{ flexShrink: 0, width: '46px', borderRadius: '12px', background: 'var(--color-primary)', color: '#fff', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            <Plus size={20} />
          </button>
        </div>

        {pantry.length === 0 ? (
          <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', margin: '0 0 20px', lineHeight: 1.5 }}>
            Add a few staples — eggs, onion, pasta, chicken — and recipHub will show what you can cook.
          </p>
        ) : (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '7px', marginBottom: '22px' }}>
            {pantry.map(item => (
              <span key={item} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'var(--color-primary-bg)', color: 'var(--color-primary)', border: '1px solid var(--color-primary-border)', borderRadius: '999px', padding: '6px 10px', fontSize: '13px', fontWeight: '600' }}>
                {item}
                <button onClick={() => removeItem(item)} aria-label={`Remove ${item}`} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', padding: 0, color: 'var(--color-primary)' }}>
                  <X size={13} />
                </button>
              </span>
            ))}
          </div>
        )}

        {/* Results */}
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', margin: '0 0 12px' }}>
          <h2 style={{ fontSize: '17px', fontWeight: '700', color: 'var(--color-text)', margin: 0 }}>What you can make</h2>
          {pantry.length > 0 && !loading && readyCount > 0 && (
            <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--color-primary)' }}>{readyCount} ready</span>
          )}
        </div>

        {pantry.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--color-text-muted)' }}>
            <div style={{ fontSize: '34px', marginBottom: '8px' }}>🧑‍🍳</div>
            <p style={{ fontSize: '14px', margin: 0 }}>Add pantry items to see matches.</p>
          </div>
        ) : loading ? (
          <p style={{ textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '14px', padding: '24px 0' }}>Checking your recipes…</p>
        ) : ranked.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--color-text-muted)' }}>
            <div style={{ fontSize: '34px', marginBottom: '8px' }}>🔍</div>
            <p style={{ fontSize: '14px', margin: 0 }}>Nothing matches yet — add more items, or save more recipes.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {ranked.map(({ r, m }, index) => {
              const tint = TILE_COLORS[index % TILE_COLORS.length]
              const ready = m.missing.length === 0
              return (
                <div
                  key={r.id}
                  onClick={() => onNavigate('recipe', { recipe: r })}
                  style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 14px', background: 'var(--color-card)', borderRadius: '14px', border: '1px solid ' + (ready ? 'var(--color-primary-border)' : 'var(--color-subtle)'), boxShadow: '0 1px 3px rgba(0,0,0,0.04)', cursor: 'pointer' }}
                >
                  <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: tint + '2e', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', flexShrink: 0, overflow: 'hidden' }}>
                    {r.imageUrl
                      ? <img src={r.imageUrl} alt="" loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} onError={e => { e.currentTarget.style.display = 'none' }} />
                      : '🍽️'}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h3 style={{ fontSize: '14px', fontWeight: '600', color: 'var(--color-text)', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.name}</h3>
                    {ready ? (
                      <p style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: 'var(--color-primary)', fontWeight: '600', margin: '3px 0 0' }}>
                        <Check size={13} /> You have everything
                      </p>
                    ) : (
                      <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', margin: '3px 0 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        Have {m.have}/{m.total} · need {m.missing.slice(0, 3).join(', ')}{m.missing.length > 3 ? '…' : ''}
                      </p>
                    )}
                  </div>
                  <ChevronRight size={18} color="var(--color-text-muted)" style={{ flexShrink: 0 }} />
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
