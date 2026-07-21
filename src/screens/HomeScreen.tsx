import { useState, useEffect, type CSSProperties } from 'react'
import { Plus, X, Crown, ChefHat, Lightbulb, Users } from 'lucide-react'
import type { Screen } from '../types'
import { BottomNavigation } from '../components/BottomNavigation'
import { recipeAPI, mealPlanAPI, cookbookAPI } from '../utils/api'
import { recipeImageSrc } from '../utils/image'
import { useApp } from '../context/AppContext'
import { useProPlan } from '../utils/proPlan'
import { DAY_NAMES, MEALS, sameWeek, getMeals, mondayOf } from './MealPlanScreen'

interface Props {
  onNavigate: (screen: Screen, data?: any) => void
}

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 18) return 'Good afternoon'
  return 'Good evening'
}

function getDateLabel() {
  const d = new Date()
  const day = d.toLocaleDateString('en-US', { weekday: 'long' }).toUpperCase()
  const month = d.toLocaleDateString('en-US', { month: 'short' }).toUpperCase()
  return `${day}, ${month} ${d.getDate()}`
}

/** One list row on a hairline. No card, no fill -- typography and space do the
    work. Every row past the first carries a top rule so the shelf reads as a
    single ruled list under its label. */
function rowStyle(divider: boolean): CSSProperties {
  return {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '15px 0',
    borderTop: divider ? '1px solid var(--color-subtle)' : 'none',
    cursor: 'pointer',
  }
}

export default function HomeScreen({ onNavigate }: Props) {
  const { user } = useApp()
  const [isPro] = useProPlan()
  const [recipes, setRecipes] = useState<any[]>([])
  const [todayMeals, setTodayMeals] = useState<{ meal: any; cfg: typeof MEALS[number] }[]>([])
  const [plannedThisWeek, setPlannedThisWeek] = useState(0)
  const [cookbooks, setCookbooks] = useState<any[]>([])
  const [planId, setPlanId] = useState<string | null>(null)
  // Which slot the add panel is filling, or null when it is closed.
  const [addingSlot, setAddingSlot] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [loading, setLoading] = useState(true)

  // Prefer the person's first name; fall back to their username.
  const displayName = (user?.name || '').trim().split(/\s+/)[0] || user?.username || ''
  const initial = (displayName || user?.email || '?').charAt(0).toUpperCase()

  useEffect(() => {
    // Hold the first paint on a skeleton until all three loads settle, so Home
    // never flashes "0 recipes / No favorites" before the data actually lands.
    // Home works without cookbooks or a plan -- a failure just means empty shelf.
    Promise.allSettled([
      recipeAPI.list().then(setRecipes),
      cookbookAPI.list().then((c: any) => setCookbooks(Array.isArray(c) ? c : [])),
      loadToday(),
    ]).finally(() => setLoading(false))
  }, [])

  async function loadToday() {
    try {
      const plans = await mealPlanAPI.list()
      const today = new Date()
      const plan = plans.find((p: any) => sameWeek(p.weekStart, today))
      if (!plan) { setPlanId(null); setTodayMeals([]); return }
      setPlanId(plan.id)
      const dayName = DAY_NAMES[(today.getDay() + 6) % 7]
      const found: { meal: any; cfg: typeof MEALS[number] }[] = []
      MEALS.forEach(cfg => getMeals(plan, dayName, cfg.key).forEach(meal => found.push({ meal, cfg })))
      setTodayMeals(found)
      setPlannedThisWeek(
        DAY_NAMES.reduce((n, d) => n + MEALS.reduce((m, cfg) => m + getMeals(plan, d, cfg.key).length, 0), 0)
      )
    } catch {
      /* home still works without a plan */
    }
  }

  const todayName = DAY_NAMES[(new Date().getDay() + 6) % 7]
  const filledSlots = new Set(todayMeals.map(m => m.cfg.key))

  /** Takes a meal off today. mealId comes from the plan's link row. */
  async function removeMeal(mealId: string) {
    if (!mealId || busy) return
    setBusy(true)
    const before = todayMeals
    setTodayMeals(prev => prev.filter(m => m.meal.mealId !== mealId))
    try {
      await mealPlanAPI.removeMeal(mealId)
      await loadToday()
    } catch {
      setTodayMeals(before)
    } finally {
      setBusy(false)
    }
  }

  /** Puts a recipe in one of today's slots, making this week's plan if needed. */
  async function addMeal(recipeId: string, slot: string) {
    if (busy) return
    setBusy(true)
    try {
      let id = planId
      if (!id) {
        const created: any = await mealPlanAPI.create(mondayOf(new Date()))
        id = created.id
        setPlanId(id)
      }
      await mealPlanAPI.addMeal(id!, recipeId, todayName, slot)
      setAddingSlot(null)
      await loadToday()
    } catch {
      /* leave the panel open so it can be tried again */
    } finally {
      setBusy(false)
    }
  }

  const favorites = recipes.filter((r: any) => r.isFavorite)

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'var(--color-bg)' }}>
      <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
        {/* Header -- lives on the page, no panel behind it. Date + Pro sit on a
            quiet top line with the avatar; the greeting gets its own full-width
            line so it never wraps mid-phrase. */}
        <div style={{ padding: '20px 24px 0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
              <span style={{ fontSize: '11px', fontWeight: '600', letterSpacing: '0.08em', color: 'var(--color-text-muted)' }}>
                {getDateLabel()}
              </span>
              {isPro && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', fontSize: '10px', fontWeight: '800', letterSpacing: '0.08em', color: 'var(--color-primary)' }}>
                  <Crown size={11} /> PRO
                </span>
              )}
            </div>
            <button
              onClick={() => onNavigate('settings')}
              aria-label="Settings"
              title={user?.name || undefined}
              style={{ width: '34px', height: '34px', borderRadius: '17px', border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg, var(--color-primary-light), var(--color-primary-dark))', color: '#fff', fontSize: '14px', fontWeight: '700', flexShrink: 0 }}
            >
              {initial}
            </button>
          </div>

          <h1 style={{ fontSize: '27px', fontWeight: '700', color: 'var(--color-text)', margin: 0, lineHeight: 1.15, letterSpacing: '-0.02em' }}>
            {getGreeting()}{displayName ? `, ${displayName}` : ''}{' \u{1F44B}'}
          </h1>
          {loading ? (
            <div className="rh-skel" style={{ width: '96px', height: '12px', borderRadius: '6px', marginTop: '10px' }} />
          ) : (
            <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', margin: '8px 0 0' }}>
              {recipes.length} recipe{recipes.length === 1 ? '' : 's'}{plannedThisWeek > 0 ? ` · ${plannedThisWeek} planned this week` : ''}
            </p>
          )}
        </div>

        <div style={{ padding: '30px 24px 0' }}>
          {loading ? <HomeSkeleton isPro={isPro} /> : <>

          {/* Pro shortcuts -- three quiet ringed icons, no cards. */}
          {isPro && (
            <div style={{ display: 'flex', gap: '8px', marginBottom: '36px' }}>
              {([
                { icon: ChefHat, label: 'Pantry', screen: 'pantry' as Screen },
                { icon: Lightbulb, label: 'Insights', screen: 'insights' as Screen },
                { icon: Users, label: 'Family', screen: 'household' as Screen },
              ]).map(a => (
                <button
                  key={a.label}
                  onClick={() => onNavigate(a.screen)}
                  style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', padding: '4px', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}
                >
                  <span style={{ width: '46px', height: '46px', borderRadius: '50%', border: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <a.icon size={19} color="var(--color-primary)" />
                  </span>
                  <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--color-text-secondary)' }}>{a.label}</span>
                </button>
              ))}
            </div>
          )}

          {/* Today */}
          <section style={{ marginBottom: '36px' }}>
            <SectionHead title="Today" action="Plan →" onAction={() => onNavigate('meal-plan')} />

            {todayMeals.length > 0 ? (
              todayMeals.map(({ meal, cfg }, i) => (
                <div
                  key={i}
                  // The meal-plan API strips ingredients from its recipes, so
                  // open the full one we already loaded; the meal is the fallback.
                  onClick={() => onNavigate('recipe', { recipe: recipes.find((r: any) => r.id === meal.id) ?? meal })}
                  style={rowStyle(i > 0)}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: '11px', color: 'var(--color-text-muted)', fontWeight: '600', margin: 0, letterSpacing: '0.05em' }}>
                      {cfg.label.toUpperCase()}
                    </p>
                    <h3 style={{ fontSize: '15.5px', fontWeight: '600', color: 'var(--color-text)', margin: '3px 0 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {meal.name}
                    </h3>
                  </div>
                  <span style={{ fontSize: '13px', color: 'var(--color-text-muted)', flexShrink: 0 }}>
                    {(meal.prepTime || 0) + (meal.cookTime || 0)} min
                  </span>
                  {/* Taking a meal off the day, not deleting the recipe. */}
                  <button
                    onClick={e => { e.stopPropagation(); removeMeal(meal.mealId) }}
                    aria-label={`Remove ${meal.name} from ${cfg.label}`}
                    style={{ flexShrink: 0, width: '28px', height: '28px', borderRadius: '14px', background: 'none', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                  >
                    <X size={14} color="var(--color-text-muted)" />
                  </button>
                </div>
              ))
            ) : (
              <EmptyRow label="Nothing planned today" action="Plan →" onClick={() => onNavigate('meal-plan')} />
            )}

            {/* Add a meal without leaving Home. */}
            {addingSlot === null ? (
              MEALS.some(cfg => !filledSlots.has(cfg.key)) && (
                <button
                  onClick={() => setAddingSlot(MEALS.find(cfg => !filledSlots.has(cfg.key))!.key)}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '16px', background: 'none', border: 'none', color: 'var(--color-primary)', fontSize: '13px', fontWeight: '600', cursor: 'pointer', padding: 0, fontFamily: 'inherit' }}
                >
                  <Plus size={14} /> Add a meal
                </button>
              )
            ) : (
              <div style={{ marginTop: '16px', background: 'var(--color-subtle)', borderRadius: '14px', padding: '12px' }}>
                <div style={{ display: 'flex', gap: '6px', marginBottom: '10px', flexWrap: 'wrap' }}>
                  {MEALS.filter(cfg => !filledSlots.has(cfg.key)).map(cfg => (
                    <button
                      key={cfg.key}
                      onClick={() => setAddingSlot(cfg.key)}
                      style={{ padding: '5px 11px', borderRadius: '999px', border: '1px solid ' + (addingSlot === cfg.key ? 'var(--color-primary)' : 'var(--color-border)'), background: addingSlot === cfg.key ? 'var(--color-primary)' : 'transparent', color: addingSlot === cfg.key ? '#fff' : 'var(--color-text-secondary)', fontSize: '12px', fontWeight: '700', cursor: 'pointer', fontFamily: 'inherit' }}
                    >
                      {cfg.label}
                    </button>
                  ))}
                </div>
                <div style={{ maxHeight: '168px', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
                  {recipes.map((r: any, idx: number) => (
                    <button
                      key={r.id}
                      onClick={() => addMeal(r.id, addingSlot)}
                      disabled={busy}
                      style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 4px', background: 'none', border: 'none', borderTop: idx > 0 ? '1px solid var(--color-border)' : 'none', cursor: busy ? 'default' : 'pointer', textAlign: 'left', fontFamily: 'inherit', width: '100%' }}
                    >
                      <span style={{ width: '30px', height: '30px', borderRadius: '8px', background: 'var(--color-card)', flexShrink: 0, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px' }}>
                        {r.imageUrl
                          ? <img src={recipeImageSrc(r.imageUrl, 30, 30)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => { e.currentTarget.style.display = 'none' }} />
                          : '🍽️'}
                      </span>
                      <span style={{ flex: 1, minWidth: 0, fontSize: '14px', fontWeight: '500', color: 'var(--color-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {r.name}
                      </span>
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => setAddingSlot(null)}
                  style={{ width: '100%', marginTop: '8px', padding: '8px', background: 'transparent', color: 'var(--color-text-secondary)', border: 'none', fontSize: '12px', fontWeight: '700', cursor: 'pointer', fontFamily: 'inherit' }}
                >
                  Cancel
                </button>
              </div>
            )}
          </section>

          {/* Favorites */}
          <section style={{ marginBottom: '36px' }}>
            <SectionHead title="Favorites" action={favorites.length > 0 ? 'See all →' : undefined} onAction={() => onNavigate('favorites')} />
            {favorites.length > 0 ? (
              favorites.slice(0, 5).map((recipe: any, i: number) => {
                const time = (recipe.prepTime || 0) + (recipe.cookTime || 0)
                return (
                  <div key={recipe.id} onClick={() => onNavigate('recipe', { recipe })} style={rowStyle(i > 0)}>
                    <h4 style={{ flex: 1, minWidth: 0, fontSize: '15.5px', fontWeight: '600', color: 'var(--color-text)', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {recipe.name}
                    </h4>
                    <span style={{ fontSize: '13px', color: 'var(--color-text-muted)', flexShrink: 0 }}>{time} min</span>
                  </div>
                )
              })
            ) : (
              <EmptyRow label="No favorites yet" action="Browse →" onClick={() => onNavigate('browse')} />
            )}
          </section>

          {/* Cookbooks */}
          <section style={{ marginBottom: '36px' }}>
            <SectionHead title="Cookbooks" action={cookbooks.length > 0 ? 'See all →' : undefined} onAction={() => onNavigate('cookbooks')} />
            {cookbooks.length > 0 ? (
              cookbooks.slice(0, 5).map((book: any, i: number) => {
                const count = book.recipes?.length ?? 0
                return (
                  <div key={book.id} onClick={() => onNavigate('cookbook', { cookbookId: book.id })} style={rowStyle(i > 0)}>
                    <h4 style={{ flex: 1, minWidth: 0, fontSize: '15.5px', fontWeight: '600', color: 'var(--color-text)', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {book.name}
                    </h4>
                    <span style={{ fontSize: '13px', color: 'var(--color-text-muted)', flexShrink: 0 }}>
                      {count} recipe{count === 1 ? '' : 's'}
                    </span>
                  </div>
                )
              })
            ) : (
              <EmptyRow label="No cookbooks yet" action="Create →" onClick={() => onNavigate('cookbooks')} />
            )}
          </section>

          </>}
        </div>
        <div style={{ height: '24px' }} />
      </div>
      <BottomNavigation active="home" onNavigate={onNavigate} />
    </div>
  )
}

/** A ruled section label: small all-caps title on a hairline, optional link. */
function SectionHead({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', paddingBottom: '10px', borderBottom: '1px solid var(--color-subtle)' }}>
      <h2 style={{ fontSize: '12px', fontWeight: '700', letterSpacing: '0.09em', textTransform: 'uppercase', color: 'var(--color-text-muted)', margin: 0 }}>
        {title}
      </h2>
      {action && (
        <button onClick={onAction} style={{ background: 'none', border: 'none', color: 'var(--color-primary)', fontSize: '13px', fontWeight: '600', cursor: 'pointer', padding: 0, fontFamily: 'inherit' }}>
          {action}
        </button>
      )}
    </div>
  )
}

/** Empty shelf: a single muted line with the action floated right. */
function EmptyRow({ label, action, onClick }: { label: string; action: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{ display: 'flex', width: '100%', alignItems: 'center', justifyContent: 'space-between', padding: '17px 0', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left' }}
    >
      <span style={{ fontSize: '15px', color: 'var(--color-text-secondary)' }}>{label}</span>
      <span style={{ fontSize: '13px', color: 'var(--color-primary)', fontWeight: '600' }}>{action}</span>
    </button>
  )
}

/* --- First-load skeleton ----------------------------------------------------
   Mirrors the ruled-list layout so the switch to content is a fill-in. */

function Skel({ w = '100%', h, r = 7, style }: { w?: number | string; h: number; r?: number; style?: CSSProperties }) {
  return <div className="rh-skel" style={{ width: w, height: h, borderRadius: r, ...style }} />
}

function SkelTextRow({ divider = false }: { divider?: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px 0', borderTop: divider ? '1px solid var(--color-subtle)' : 'none' }}>
      <Skel w="52%" h={13} />
      <Skel w={38} h={11} />
    </div>
  )
}

function SkelSection() {
  return (
    <div style={{ marginBottom: '36px' }}>
      <div style={{ paddingBottom: '10px', borderBottom: '1px solid var(--color-subtle)' }}>
        <Skel w={84} h={11} r={6} />
      </div>
      <SkelTextRow />
      <SkelTextRow divider />
    </div>
  )
}

function HomeSkeleton({ isPro }: { isPro: boolean }) {
  return (
    <div>
      {isPro && (
        <div style={{ display: 'flex', gap: '8px', marginBottom: '36px' }}>
          {[0, 1, 2].map(i => (
            <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
              <Skel w={46} h={46} r={23} />
              <Skel w={44} h={10} r={5} />
            </div>
          ))}
        </div>
      )}
      <SkelSection />
      <SkelSection />
      <SkelSection />
    </div>
  )
}
