import { useState, useEffect } from 'react'
import { ArrowLeft, Plus, X, ChevronRight, Check, Crown, ChefHat, ShoppingCart } from 'lucide-react'
import type { Screen, Recipe } from '../types'
import { recipeAPI, groceryAPI } from '../utils/api'
import { getPantry, savePantry, pantryMatch } from '../utils/pantry'
import { useProPlan } from '../utils/proPlan'
import { Toast, useToast } from '../components/Toast'

interface Props {
  onNavigate: (screen: Screen, data?: any) => void
}

const TILE_COLORS = ['#e8b4a8', '#d4a574', '#c9a582', '#b8956a', '#a48a6e']

// Common kitchen staples, one tap to add — so filling the pantry doesn't mean
// typing a dozen things.
const STAPLES = [
  'eggs', 'onion', 'garlic', 'chicken', 'pasta', 'rice', 'tomato', 'olive oil',
  'butter', 'milk', 'cheese', 'flour', 'potato', 'bell pepper', 'carrot', 'spinach',
]

export default function PantryScreen({ onNavigate }: Props) {
  const [isPro] = useProPlan()
  const [pantry, setPantry] = useState<string[]>(() => getPantry())
  const [input, setInput] = useState('')
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [loading, setLoading] = useState(true)
  const [addingList, setAddingList] = useState<string | null>(null)
  const { toast, show } = useToast()

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

  const has = (name: string) => pantry.some(p => p.toLowerCase() === name.toLowerCase())
  const add = (name: string) => {
    const v = name.trim()
    if (!v || has(v)) return
    const next = [...pantry, v]
    setPantry(next); savePantry(next)
  }
  const addFromInput = () => { add(input); setInput('') }
  const removeItem = (item: string) => {
    const next = pantry.filter(p => p !== item)
    setPantry(next); savePantry(next)
  }

  const ranked = recipes
    .map(r => ({ r, m: pantryMatch(r, pantry) }))
    .filter(x => x.m.total > 0 && x.m.have > 0)
    .sort((a, b) => (a.m.missing.length - b.m.missing.length) || (b.m.have - a.m.have))
  const ready = ranked.filter(x => x.m.missing.length === 0)
  const almost = ranked.filter(x => x.m.missing.length >= 1 && x.m.missing.length <= 3)
  const staplesToAdd = STAPLES.filter(s => !has(s))

  // Put a recipe's missing ingredients straight onto the grocery list.
  async function addMissingToGrocery(recipe: any, missing: string[]) {
    if (addingList) return
    setAddingList(recipe.id)
    try {
      const lists: any = await groceryAPI.list()
      let list = Array.isArray(lists) ? lists[0] : lists
      if (!list?.id) list = await groceryAPI.create('Groceries')
      await Promise.all(missing.map(name =>
        groceryAPI.addItem(list.id, { name, quantity: 1, unit: 'piece', category: 'general' })
      ))
      show(`Added ${missing.length} item${missing.length === 1 ? '' : 's'} to your grocery list`)
    } catch {
      show('Could not add to your list', 'error')
    } finally {
      setAddingList(null)
    }
  }

  const header = (
    <header style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '14px 16px', background: 'var(--color-card)', borderBottom: '1px solid var(--color-subtle)', flexShrink: 0 }}>
      <button onClick={() => onNavigate('home')} aria-label="Back" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex' }}>
        <ArrowLeft size={22} color="var(--color-text)" />
      </button>
      <h1 style={{ fontSize: '17px', fontWeight: '700', color: 'var(--color-text)', margin: 0 }}>Cook with what I have</h1>
    </header>
  )

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

  const RecipeRow = ({ r, m }: { r: any; m: any }) => {
    const ready = m.missing.length === 0
    const busy = addingList === r.id
    return (
      <div
        onClick={() => onNavigate('recipe', { recipe: r })}
        style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 14px', background: 'var(--color-card)', borderRadius: '14px', border: '1px solid ' + (ready ? 'var(--color-primary-border)' : 'var(--color-subtle)'), boxShadow: '0 1px 3px rgba(0,0,0,0.04)', cursor: 'pointer' }}
      >
        <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: TILE_COLORS[0] + '2e', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', flexShrink: 0, overflow: 'hidden' }}>
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
              Missing {m.missing.length}: {m.missing.join(', ')}
            </p>
          )}
        </div>
        {ready ? (
          <ChevronRight size={18} color="var(--color-text-muted)" style={{ flexShrink: 0 }} />
        ) : (
          <button
            onClick={(e) => { e.stopPropagation(); addMissingToGrocery(r, m.missing) }}
            disabled={busy}
            aria-label="Add missing to grocery list"
            title="Add missing to grocery list"
            style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: '4px', padding: '7px 10px', borderRadius: '10px', border: '1.5px solid var(--color-primary-border)', background: 'var(--color-primary-bg)', color: 'var(--color-primary)', fontSize: '12px', fontWeight: '700', cursor: busy ? 'default' : 'pointer', fontFamily: 'inherit' }}
          >
            {busy ? <Check size={14} /> : <ShoppingCart size={14} />}
            <span>List</span>
          </button>
        )}
      </div>
    )
  }

  return (
    <div className="screen" style={{ background: 'var(--color-bg)', position: 'relative' }}>
      {header}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
        {/* Pantry manager */}
        <p style={{ fontSize: '12px', fontWeight: '700', color: 'var(--color-text-muted)', letterSpacing: '0.05em', margin: '0 0 8px' }}>MY PANTRY</p>
        <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') addFromInput() }}
            placeholder="Add an ingredient you have…"
            style={{ flex: 1, minWidth: 0, padding: '12px 14px', borderRadius: '12px', border: '1.5px solid var(--color-border)', fontSize: '15px', color: 'var(--color-text)', background: 'var(--color-card)', outline: 'none', fontFamily: 'inherit' }}
          />
          <button onClick={addFromInput} aria-label="Add to pantry" style={{ flexShrink: 0, width: '46px', borderRadius: '12px', background: 'var(--color-primary)', color: '#fff', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            <Plus size={20} />
          </button>
        </div>

        {/* Current pantry */}
        {pantry.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '7px', marginBottom: '14px' }}>
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

        {/* Quick-add staples */}
        {staplesToAdd.length > 0 && (
          <div style={{ marginBottom: '22px' }}>
            <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', margin: '0 0 8px' }}>Quick add:</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '7px' }}>
              {staplesToAdd.map(s => (
                <button
                  key={s}
                  onClick={() => add(s)}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: 'var(--color-card)', color: 'var(--color-text-secondary)', border: '1.5px solid var(--color-border)', borderRadius: '999px', padding: '6px 11px', fontSize: '13px', fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit' }}
                >
                  <Plus size={13} color="var(--color-primary)" /> {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Results */}
        {pantry.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--color-text-muted)' }}>
            <div style={{ fontSize: '34px', marginBottom: '8px' }}>🧑‍🍳</div>
            <p style={{ fontSize: '14px', margin: 0, lineHeight: 1.5 }}>Add a few staples above and recipHub will show what you can cook.</p>
          </div>
        ) : loading ? (
          <p style={{ textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '14px', padding: '24px 0' }}>Checking your recipes…</p>
        ) : ready.length === 0 && almost.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--color-text-muted)' }}>
            <div style={{ fontSize: '34px', marginBottom: '8px' }}>🔍</div>
            <p style={{ fontSize: '14px', margin: 0 }}>Nothing matches yet — add more items, or save more recipes.</p>
          </div>
        ) : (
          <>
            {ready.length > 0 && (
              <div style={{ marginBottom: almost.length > 0 ? '22px' : 0 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', margin: '0 0 10px' }}>
                  <h2 style={{ fontSize: '16px', fontWeight: '700', color: 'var(--color-text)', margin: 0 }}>Ready to cook</h2>
                  <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--color-primary)' }}>{ready.length}</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {ready.map(({ r, m }) => <RecipeRow key={r.id} r={r} m={m} />)}
                </div>
              </div>
            )}
            {almost.length > 0 && (
              <div>
                <div style={{ margin: '0 0 4px' }}>
                  <h2 style={{ fontSize: '16px', fontWeight: '700', color: 'var(--color-text)', margin: 0 }}>Almost there</h2>
                </div>
                <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', margin: '0 0 10px' }}>A few items short — tap <ShoppingCart size={11} style={{ verticalAlign: '-1px' }} /> to add them to your list.</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {almost.map(({ r, m }) => <RecipeRow key={r.id} r={r} m={m} />)}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {toast && <Toast message={toast.message} tone={toast.tone} bottom="24px" />}
    </div>
  )
}
