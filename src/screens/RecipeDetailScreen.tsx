import { useState } from 'react'
import { ArrowLeft, Clock, ChefHat, Heart, ExternalLink, Minus, Plus, ShoppingCart, CalendarPlus, Share2, Sparkles, BookmarkPlus, Check } from 'lucide-react'
import type { Screen, Recipe } from '../types'
import { BottomNavigation } from '../components/BottomNavigation'
import { recipeAPI, groceryAPI, mealPlanAPI, insightsAPI } from '../utils/api'
import { Toast, useToast } from '../components/Toast'
import { DAY_NAMES, MEALS, sameWeek, mondayOf, getMeals } from './MealPlanScreen'
import { getDefaultServings, getUnitPref, convertMeasurement } from '../utils/preferences'
import { useProPlan } from '../utils/proPlan'

// Quick adaptations the AI cooking assistant offers.
const ADAPT_GOALS = ['Dairy-free', 'Gluten-free', 'Lower calorie', 'Vegetarian', 'Quicker']

interface Props {
  recipe: Recipe | null
  onNavigate: (screen: Screen, data?: any) => void
  /** Where the back button goes — wherever this recipe was opened from. */
  backTo?: Screen
}

const DIFFICULTY_COLORS: Record<string, string> = {
  easy: 'var(--color-primary)',
  medium: '#f4b860',
  hard: '#ef4444',
}

const MEAL_EMOJIS: Record<string, string> = {
  breakfast: '🍳',
  lunch: '🥗',
  dinner: '🍽️',
  snack: '🍎',
}

const HERO_COLORS = ['#d4a574', 'var(--color-primary)', '#c67139', '#9b7ec8', '#f4b860', '#5b9acd']

/** "View on bbcgoodfood.com" — the host is the useful part, not the full URL. */
function sourceLabel(url: string): string {
  try {
    return `View on ${new URL(url).hostname.replace(/^www\./, '')}`
  } catch {
    return 'View the original'
  }
}

export default function RecipeDetailScreen({ recipe, onNavigate, backTo = 'browse' }: Props) {
  const [checkedIngredients, setCheckedIngredients] = useState<Set<string>>(new Set())
  const [isFavorited, setIsFavorited] = useState(recipe?.isFavorite || false)
  const [favBusy, setFavBusy] = useState(false)
  const [activeTab, setActiveTab] = useState<'ingredients' | 'instructions'>('ingredients')
  // Recipes open at the person's Default Servings preference; ingredient
  // amounts scale to whatever they set here.
  const [servings, setServings] = useState(() => getDefaultServings())
  const [actionBusy, setActionBusy] = useState('')
  const { toast, show } = useToast()
  const [isPro] = useProPlan()
  // AI cooking assistant
  const [adaptOpen, setAdaptOpen] = useState(false)
  const [adaptLoading, setAdaptLoading] = useState(false)
  const [adaptText, setAdaptText] = useState('')
  const [adaptNote, setAdaptNote] = useState('')
  const [adaptGoal, setAdaptGoal] = useState('')
  const [adaptedRecipe, setAdaptedRecipe] = useState<{ name: string; ingredients: string[]; instructions: string[] } | null>(null)
  const [adaptSaving, setAdaptSaving] = useState(false)
  const [adaptSaved, setAdaptSaved] = useState(false)

  async function runAdapt(goal: string) {
    if (!recipe) return
    setAdaptGoal(goal); setAdaptLoading(true); setAdaptText(''); setAdaptNote('')
    setAdaptedRecipe(null); setAdaptSaved(false)
    try {
      const res: any = await insightsAPI.adapt(
        { name: recipe.name, ingredients: recipe.ingredients, instructions: recipe.instructions },
        goal.toLowerCase()
      )
      if (res?.configured === false) setAdaptNote(res.message || "The AI assistant isn't switched on yet.")
      else {
        setAdaptText(res?.text || '')
        setAdaptedRecipe(res?.adapted || null)
      }
    } catch {
      setAdaptNote('Could not reach the AI just now — try again in a moment.')
    } finally {
      setAdaptLoading(false)
    }
  }

  // Save the AI's adapted version as its own recipe, keeping the original's
  // meta (cuisine, timings, image) and using the adapted ingredients/steps.
  async function saveAdapted() {
    if (!recipe || !adaptedRecipe || adaptSaving || adaptSaved) return
    setAdaptSaving(true)
    try {
      await recipeAPI.create({
        name: adaptedRecipe.name,
        cuisine: recipe.cuisine || 'Other',
        mealType: recipe.mealType || 'dinner',
        difficulty: recipe.difficulty || 'easy',
        prepTime: recipe.prepTime || 10,
        cookTime: recipe.cookTime || 20,
        servings: recipe.servings || 2,
        calories: null,
        imageUrl: recipe.imageUrl || null,
        sourceUrl: '',
        tags: ['adapted', adaptGoal.toLowerCase()].filter(Boolean),
        ingredients: adaptedRecipe.ingredients.map(s => ({ name: s, quantity: 1, unit: '' })),
        instructions: adaptedRecipe.instructions.map((text, i) => ({ stepNumber: i + 1, text })),
      })
      setAdaptSaved(true)
      show(`Saved “${adaptedRecipe.name}” to your recipes`)
    } catch {
      show('Could not save that recipe', 'error')
    } finally {
      setAdaptSaving(false)
    }
  }

  // Persist the favorite so it survives leaving the screen. Optimistic: flip
  // the heart first, roll back if the save fails.
  async function toggleFavorite() {
    if (!recipe?.id || favBusy) return
    const next = !isFavorited
    setIsFavorited(next)
    setFavBusy(true)
    try {
      await (next ? recipeAPI.save(recipe.id) : recipeAPI.unsave(recipe.id))
    } catch {
      setIsFavorited(!next)
    } finally {
      setFavBusy(false)
    }
  }

  if (!recipe) {
    return (
      <div className="screen" style={{ background: 'var(--color-bg)' }}>
        <header style={{ padding: '12px 16px', borderBottom: '1px solid var(--color-border)', background: 'var(--color-card)', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button onClick={() => onNavigate(backTo)} className="btn btn-icon" style={{ background: 'none' }}>
            <ArrowLeft size={22} />
          </button>
          <h2 style={{ flex: 1, fontSize: '18px', margin: 0 }}>Recipe</h2>
        </header>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-muted)' }}>
          <p>Recipe not found</p>
        </div>
        <BottomNavigation active={backTo === 'home' ? 'home' : 'browse'} onNavigate={(s) => onNavigate(s as Screen)} />
      </div>
    )
  }

  const heroColor = (recipe as any).color || HERO_COLORS[recipe.name.charCodeAt(0) % HERO_COLORS.length]
  const emoji = (recipe as any).emoji || MEAL_EMOJIS[recipe.mealType] || '🍽️'

  const toggleIngredient = (id: string) => {
    setCheckedIngredients(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  // Ingredient amounts are stored for the recipe's own serving count; scale
  // them to whatever the person set.
  const baseServings = recipe.servings || 1
  const scale = servings / baseServings
  const defaultServ = getDefaultServings()
  const unitPref = getUnitPref()

  async function addToGroceries() {
    if (actionBusy) return
    setActionBusy('groceries')
    try {
      const lists: any = await groceryAPI.list()
      let list = Array.isArray(lists) ? lists[0] : lists
      if (!list?.id) list = await groceryAPI.create('Groceries')
      const items = recipe!.ingredients || []
      await Promise.all(items.map((ing: any) =>
        // category is required by the grocery item model; match the grocery
        // screen's default.
        groceryAPI.addItem(list.id, { name: ing.name, quantity: round2((ing.quantity || 1) * scale), unit: ing.unit, category: 'general' })
      ))
      show(`Added ${items.length} item${items.length === 1 ? '' : 's'} to groceries`)
    } catch {
      show('Could not add to groceries', 'error')
    } finally {
      setActionBusy('')
    }
  }

  async function addToMealPlan() {
    if (actionBusy) return
    setActionBusy('mealplan')
    try {
      const today = new Date()
      const dayName = DAY_NAMES[(today.getDay() + 6) % 7]
      const plans: any = await mealPlanAPI.list()
      let plan = (Array.isArray(plans) ? plans : []).find((p: any) => sameWeek(p.weekStart, today))
      if (!plan) plan = await mealPlanAPI.create(mondayOf(today))
      // A slot holds one recipe -- drop it in the first open one for today.
      const slot = MEALS.find(m => getMeals(plan, dayName, m.key).length === 0)
      if (!slot) { show("Today's meals are already full", 'error'); return }
      await mealPlanAPI.addMeal(plan.id, recipe!.id, dayName, slot.key)
      show(`Added to today's ${slot.label}`)
    } catch {
      show('Could not add to meal plan', 'error')
    } finally {
      setActionBusy('')
    }
  }

  async function share() {
    const text = recipe!.description ? `${recipe!.name} — ${recipe!.description}` : recipe!.name
    const url = recipe!.sourceUrl || window.location.href

    // Prefer the native share sheet on real devices. It throws in embedded or
    // permission-blocked contexts (and AbortError when the person dismisses
    // it), so only a deliberate cancel should stop here -- any other failure
    // falls through to copying, so Share never silently does nothing.
    if (navigator.share) {
      try {
        await navigator.share({ title: recipe!.name, text, url })
        return
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return
      }
    }

    try {
      await navigator.clipboard.writeText(`${text}\n${url}`)
      show('Link copied to clipboard')
    } catch {
      show('Could not share this recipe', 'error')
    }
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'var(--color-bg)' }}>
      <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>

        {/* Hero */}
        <div style={{
          position: 'relative',
          height: '200px',
          background: `linear-gradient(135deg, ${heroColor}dd, ${heroColor}88)`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}>
          <button
            onClick={() => onNavigate(backTo)}
            style={{
              position: 'absolute', top: '12px', left: '12px',
              width: '36px', height: '36px', borderRadius: '10px',
              background: 'var(--color-overlay)',
              border: '1px solid var(--color-overlay-border)', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
              boxShadow: '0 2px 8px rgba(0,0,0,0.18)',
              zIndex: 2,
            }}
          >
            <ArrowLeft size={18} color="var(--color-text)" />
          </button>
          <button
            onClick={toggleFavorite}
            aria-label={isFavorited ? 'Remove from favorites' : 'Save to favorites'}
            aria-pressed={isFavorited}
            style={{
              position: 'absolute', top: '12px', right: '12px',
              height: '36px', borderRadius: '10px',
              padding: isFavorited ? '0 12px 0 10px' : '0', width: isFavorited ? 'auto' : '36px',
              background: 'var(--color-overlay)',
              border: '1px solid var(--color-overlay-border)', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
              backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
              boxShadow: '0 2px 8px rgba(0,0,0,0.18)',
              zIndex: 2,
            }}
          >
            <Heart size={18} color={isFavorited ? '#ef4444' : 'var(--color-text-muted)'} fill={isFavorited ? '#ef4444' : 'none'} />
            {isFavorited && <span style={{ fontSize: '13px', fontWeight: '700', color: '#ef4444' }}>Saved</span>}
          </button>
          {recipe.imageUrl ? (
            <img
              src={recipe.imageUrl}
              alt={recipe.name}
              style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
              onError={e => { e.currentTarget.style.display = 'none' }}
            />
          ) : (
            <div style={{ fontSize: '72px', filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.12))' }}>
              {emoji}
            </div>
          )}
        </div>

        {/* Title + stats */}
        <div style={{ background: 'var(--color-card)', padding: '16px 16px 0', borderBottom: '1px solid var(--color-subtle)' }}>
          <div style={{ display: 'flex', gap: '6px', marginBottom: '10px', flexWrap: 'wrap' }}>
            {recipe.cuisine && (
              <span style={{ background: 'var(--color-primary-bg)', color: 'var(--color-primary)', fontSize: '11px', fontWeight: '700', padding: '3px 9px', borderRadius: '6px', letterSpacing: '0.04em' }}>
                {recipe.cuisine.toUpperCase()}
              </span>
            )}
            {recipe.mealType && (
              <span style={{ background: 'var(--color-subtle)', color: 'var(--color-text-secondary)', fontSize: '11px', fontWeight: '600', padding: '3px 9px', borderRadius: '6px', textTransform: 'capitalize' }}>
                {recipe.mealType}
              </span>
            )}
            {recipe.difficulty && (
              <span style={{
                background: (DIFFICULTY_COLORS[recipe.difficulty] ?? 'var(--color-primary)') + '18',
                color: DIFFICULTY_COLORS[recipe.difficulty] ?? 'var(--color-primary)',
                fontSize: '11px', fontWeight: '600', padding: '3px 9px', borderRadius: '6px', textTransform: 'capitalize',
              }}>
                {recipe.difficulty}
              </span>
            )}
          </div>

          <h1 style={{ fontSize: '22px', fontWeight: '700', color: 'var(--color-text)', margin: '0 0 8px', lineHeight: 1.2 }}>
            {recipe.name}
          </h1>
          {recipe.description && (
            <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', margin: '0 0 14px', lineHeight: 1.5 }}>
              {recipe.description}
            </p>
          )}

          {/* Credit where an imported recipe came from, and let people go read
              the original -- rel/noreferrer because it is a link we did not write. */}
          {recipe.sourceUrl && (
            <a
              href={recipe.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '6px',
                fontSize: '12.5px', color: 'var(--color-primary)', fontWeight: '600',
                textDecoration: 'none', marginBottom: '14px',
              }}
            >
              <ExternalLink size={13} />
              {sourceLabel(recipe.sourceUrl)}
            </a>
          )}

          {/* Quick actions — one tap to shop, plan, or pass it on. */}
          <div style={{ display: 'flex', gap: '10px', borderTop: '1px solid var(--color-subtle)', paddingTop: '16px', paddingBottom: '16px' }}>
            <ActionButton icon={<ShoppingCart size={18} />} label="Groceries" onClick={addToGroceries} busy={actionBusy === 'groceries'} />
            <ActionButton icon={<CalendarPlus size={18} />} label="Meal Plan" onClick={addToMealPlan} busy={actionBusy === 'mealplan'} />
            <ActionButton icon={<Share2 size={18} />} label="Share" onClick={share} />
          </div>

          {/* AI cooking assistant — Pro only. Adapt the recipe to a goal. */}
          {isPro && recipe.ingredients?.length > 0 && (
            <div style={{ borderTop: '1px solid var(--color-subtle)', paddingTop: '16px', paddingBottom: '4px' }}>
              <button
                onClick={() => setAdaptOpen(o => !o)}
                style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '12px', borderRadius: '12px', border: '1.5px solid var(--color-primary-border)', background: 'var(--color-primary-bg)', color: 'var(--color-primary)', fontSize: '14px', fontWeight: '700', cursor: 'pointer', fontFamily: 'inherit' }}
              >
                <Sparkles size={16} /> Adapt this recipe
              </button>

              {adaptOpen && (
                <div style={{ marginTop: '12px' }}>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '7px' }}>
                    {ADAPT_GOALS.map(g => {
                      const on = adaptGoal === g
                      return (
                        <button
                          key={g}
                          onClick={() => runAdapt(g)}
                          disabled={adaptLoading}
                          style={{ padding: '7px 12px', borderRadius: '999px', border: '1.5px solid ' + (on ? 'var(--color-primary)' : 'var(--color-border)'), background: on ? 'var(--color-primary-bg)' : 'var(--color-card)', color: on ? 'var(--color-primary)' : 'var(--color-text)', fontSize: '13px', fontWeight: '600', cursor: adaptLoading ? 'default' : 'pointer', fontFamily: 'inherit' }}
                        >
                          {g}
                        </button>
                      )
                    })}
                  </div>

                  {adaptLoading && (
                    <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', margin: '14px 0 0' }}>Adapting to {adaptGoal.toLowerCase()}…</p>
                  )}

                  {adaptText && !adaptLoading && (
                    <div style={{ marginTop: '12px', padding: '14px 16px', background: 'var(--color-card)', border: '1px solid var(--color-primary-border)', borderRadius: '14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                        <Sparkles size={14} color="var(--color-primary)" />
                        <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--color-primary)', letterSpacing: '0.03em' }}>{adaptGoal.toUpperCase()}</span>
                      </div>
                      <p style={{ fontSize: '14px', color: 'var(--color-text)', margin: 0, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{adaptText}</p>
                      {adaptedRecipe && (
                        <button
                          onClick={saveAdapted}
                          disabled={adaptSaving || adaptSaved}
                          style={{ marginTop: '12px', display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 13px', borderRadius: '10px', border: '1px solid var(--color-primary-border)', background: adaptSaved ? 'var(--color-primary-bg)' : 'transparent', color: 'var(--color-primary)', fontSize: '13px', fontWeight: '700', cursor: adaptSaving || adaptSaved ? 'default' : 'pointer', fontFamily: 'inherit' }}
                        >
                          {adaptSaved
                            ? <><Check size={14} /> Saved to recipes</>
                            : <><BookmarkPlus size={14} /> {adaptSaving ? 'Saving…' : 'Save as a new recipe'}</>}
                        </button>
                      )}
                    </div>
                  )}

                  {adaptNote && !adaptLoading && (
                    <div style={{ marginTop: '12px', padding: '12px 14px', background: 'var(--color-subtle)', borderRadius: '12px' }}>
                      <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', margin: 0, lineHeight: 1.5 }}>{adaptNote}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Tabs */}
        <div style={{ background: 'var(--color-card)', display: 'flex', borderBottom: '1px solid var(--color-border)', marginTop: '8px' }}>
          {(['ingredients', 'instructions'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                flex: 1, padding: '12px 8px',
                background: 'none', border: 'none', borderBottom: `2px solid ${activeTab === tab ? 'var(--color-primary)' : 'transparent'}`,
                cursor: 'pointer',
                fontSize: '13px', fontWeight: activeTab === tab ? '700' : '500',
                color: activeTab === tab ? 'var(--color-primary)' : 'var(--color-text-muted)',
                transition: 'all 0.2s',
                textTransform: 'capitalize',
              }}
            >
              {tab === 'ingredients'
                ? `Ingredients${recipe.ingredients?.length ? ` (${recipe.ingredients.length})` : ''}`
                : `Instructions${recipe.instructions?.length ? ` (${recipe.instructions.length})` : ''}`
              }
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div style={{ padding: '16px' }}>
          {activeTab === 'ingredients' ? (
            recipe.ingredients?.length > 0 ? (
              <>
              {/* Servings scaler — amounts below follow this. */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', border: '1px solid var(--color-border)', borderRadius: '999px' }}>
                    <button onClick={() => setServings(s => Math.max(1, s - 1))} aria-label="Fewer servings" style={stepBtn}><Minus size={15} /></button>
                    <span style={{ minWidth: '26px', textAlign: 'center', fontSize: '15px', fontWeight: '700', color: 'var(--color-text)' }}>{servings}</span>
                    <button onClick={() => setServings(s => s + 1)} aria-label="More servings" style={stepBtn}><Plus size={15} /></button>
                  </div>
                  <span style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>servings</span>
                </div>
                {servings !== defaultServ && (
                  <button onClick={() => setServings(defaultServ)} style={{ background: 'none', border: 'none', color: 'var(--color-primary)', fontSize: '12.5px', fontWeight: '700', cursor: 'pointer' }}>Reset</button>
                )}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {recipe.ingredients.map(ing => {
                  const checked = checkedIngredients.has(ing.id)
                  return (
                    <div
                      key={ing.id}
                      onClick={() => toggleIngredient(ing.id)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '12px',
                        padding: '12px 14px',
                        background: 'var(--color-card)', borderRadius: '14px',
                        border: `1px solid ${checked ? 'var(--color-primary-border)' : 'var(--color-subtle)'}`,
                        boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                        cursor: 'pointer', opacity: checked ? 0.55 : 1,
                        transition: 'all 0.15s',
                      }}
                    >
                      <div style={{
                        width: '22px', height: '22px', borderRadius: '6px', flexShrink: 0,
                        border: `2px solid ${checked ? 'var(--color-primary)' : 'var(--color-border)'}`,
                        background: checked ? 'var(--color-primary)' : 'transparent',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        transition: 'all 0.15s',
                      }}>
                        {checked && <span style={{ color: '#fff', fontSize: '11px', fontWeight: '800', lineHeight: 1 }}>✓</span>}
                      </div>
                      <span style={{ flex: 1, minWidth: 0, fontSize: '14px', fontWeight: '600', color: 'var(--color-text)', textDecoration: checked ? 'line-through' : 'none' }}>
                        {ing.name}
                      </span>
                      <span style={{ fontSize: '13px', color: 'var(--color-text-secondary)', fontWeight: '600', flexShrink: 0 }}>
                        {(() => { const c = convertMeasurement((ing.quantity || 0) * scale, ing.unit, unitPref); return `${fmtQty(c.quantity)} ${c.unit}` })()}
                      </span>
                    </div>
                  )
                })}
              </div>
              </>
            ) : (
              <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--color-text-muted)' }}>
                <div style={{ fontSize: '36px', marginBottom: '8px' }}>🥄</div>
                <p style={{ fontSize: '14px', margin: 0 }}>No ingredients added yet</p>
              </div>
            )
          ) : (
            recipe.instructions?.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {recipe.instructions.map((step, i) => (
                  <div key={step.id} style={{
                    display: 'flex', gap: '12px', alignItems: 'flex-start',
                    padding: '12px 14px', background: 'var(--color-card)', borderRadius: '14px',
                    border: '1px solid var(--color-subtle)', boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                  }}>
                    <div style={{
                      width: '32px', height: '32px', borderRadius: '9px', flexShrink: 0,
                      background: 'var(--color-primary)', color: '#fff',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '14px', fontWeight: '700',
                    }}>
                      {step.stepNumber || i + 1}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: '14px', color: 'var(--color-text)', margin: 0, lineHeight: 1.5 }}>{step.text}</p>
                      {step.duration && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '6px', color: 'var(--color-text-secondary)', fontSize: '12px' }}>
                          <Clock size={12} />
                          <span>{step.duration} min</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--color-text-muted)' }}>
                <div style={{ fontSize: '36px', marginBottom: '8px' }}>📋</div>
                <p style={{ fontSize: '14px', margin: 0 }}>No instructions added yet</p>
              </div>
            )
          )}
        </div>

        {/* Nutrition — per serving, so it doesn't move when servings do. */}
        {recipe.nutrition && (
          <div style={{ padding: '0 16px 8px' }}>
            <div style={{ background: 'var(--color-card)', borderRadius: '16px', border: '1px solid var(--color-subtle)', padding: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <h3 style={{ fontSize: '14px', fontWeight: '700', color: 'var(--color-text)', margin: 0 }}>Nutrition</h3>
                <span style={{ fontSize: '11.5px', color: 'var(--color-text-muted)' }}>Per serving</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '18px' }}>
                <MacroDonut protein={recipe.nutrition.protein} carbs={recipe.nutrition.carbs} fat={recipe.nutrition.fat} calories={recipe.nutrition.calories || recipe.calories || 0} />
                <div style={{ display: 'flex', flexDirection: 'column', gap: '11px', flex: 1 }}>
                  <MacroRow color="#a78bfa" label="Protein" grams={recipe.nutrition.protein} />
                  <MacroRow color="#fbbf24" label="Carbs" grams={recipe.nutrition.carbs} />
                  <MacroRow color="var(--color-primary)" label="Fat" grams={recipe.nutrition.fat} />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Start Cooking CTA */}
        <div style={{ padding: '0 16px 16px' }}>
          <button
            onClick={() => onNavigate('cooking-mode', { recipe })}
            style={{
              width: '100%', padding: '15px',
              background: 'linear-gradient(135deg, var(--color-primary-light), var(--color-primary-dark))',
              color: '#fff', border: 'none', borderRadius: '14px',
              fontSize: '15px', fontWeight: '700',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(107, 163, 86, 0.35)',
              transition: 'all 0.2s',
            }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 20px rgba(107, 163, 86, 0.4)' }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 14px rgba(107, 163, 86, 0.35)' }}
          >
            <ChefHat size={18} />
            Start Cooking
          </button>
        </div>

      </div>
      {toast && <Toast message={toast.message} tone={toast.tone} bottom="84px" />}
      <BottomNavigation active={backTo === 'home' ? 'home' : 'browse'} onNavigate={(s) => onNavigate(s as Screen)} />
    </div>
  )
}

/** Rounds to 2 decimals and drops trailing zeros: 2.00 -> "2", 0.66 -> "0.66". */
function round2(n: number): number {
  return Math.round(n * 100) / 100
}
function fmtQty(n: number): string {
  return String(round2(n))
}

const stepBtn: React.CSSProperties = {
  width: '34px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center',
  background: 'none', border: 'none', color: 'var(--color-text-secondary)', cursor: 'pointer',
}

/** One of the round quick-action buttons under the stats. */
function ActionButton({ icon, label, onClick, busy }: { icon: React.ReactNode; label: string; onClick: () => void; busy?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={busy}
      style={{
        flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px',
        background: 'none', border: 'none', cursor: busy ? 'default' : 'pointer', padding: 0,
        opacity: busy ? 0.5 : 1, fontFamily: 'inherit',
      }}
    >
      <span style={{
        width: '46px', height: '46px', borderRadius: '23px', background: 'var(--color-subtle)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-secondary)',
      }}>
        {icon}
      </span>
      <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--color-text-secondary)' }}>{label}</span>
    </button>
  )
}

function MacroRow({ color, label, grams }: { color: string; label: string; grams: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <span style={{ width: '10px', height: '10px', borderRadius: '3px', background: color, flexShrink: 0 }} />
      <span style={{ fontSize: '13px', color: 'var(--color-text-secondary)', flex: 1 }}>{label}</span>
      <span style={{ fontSize: '13px', fontWeight: '700', color: 'var(--color-text)' }}>{round2(grams)} g</span>
    </div>
  )
}

/** A ring split by each macro's share of the calories, kcal in the middle. */
function MacroDonut({ protein, carbs, fat, calories }: { protein: number; carbs: number; fat: number; calories: number }) {
  const segs = [
    { v: protein * 4, color: '#a78bfa' },
    { v: carbs * 4, color: '#fbbf24' },
    { v: fat * 9, color: 'var(--color-primary)' },
  ]
  const total = segs.reduce((s, x) => s + x.v, 0) || 1
  const r = 34, C = 2 * Math.PI * r
  let offset = 0
  return (
    <svg width="86" height="86" viewBox="0 0 88 88" style={{ flexShrink: 0 }}>
      <circle cx="44" cy="44" r={r} fill="none" stroke="var(--color-subtle)" strokeWidth="10" />
      {segs.map((s, i) => {
        const len = (s.v / total) * C
        const el = (
          <circle
            key={i} cx="44" cy="44" r={r} fill="none" stroke={s.color} strokeWidth="10"
            strokeDasharray={`${len} ${C - len}`} strokeDashoffset={-offset}
            transform="rotate(-90 44 44)"
          />
        )
        offset += len
        return el
      })}
      <text x="44" y="42" textAnchor="middle" fontSize="17" fontWeight="700" fill="var(--color-text)">{calories}</text>
      <text x="44" y="56" textAnchor="middle" fontSize="9" fill="var(--color-text-muted)" letterSpacing="0.5">CAL</text>
    </svg>
  )
}
