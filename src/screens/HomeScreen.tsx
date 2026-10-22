import { useState, useEffect, type CSSProperties } from 'react'
import { Plus, X, ChefHat, Lightbulb, Users } from 'lucide-react'
import type { Screen } from '../types'
import { recipeAPI, mealPlanAPI, cookbookAPI } from '../utils/api'
import { recipeImageSrc } from '../utils/image'
import { useApp } from '../context/AppContext'
import { DAY_NAMES, MEALS, sameWeek, getMeals, mondayOf } from './MealPlanScreen'
import { slotTypeOf } from '../utils/mealType'
import { InfoCard, TrackerBox } from '../components/DesignCards'

interface Props {
  onNavigate: (screen: Screen, data?: any) => void
}

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 18) return 'Good afternoon'
  return 'Good evening'
}

// A little wink under the greeting. A fresh one each time Home opens keeps the
// landing feeling alive.
const JOKES = [
  "You're basically a chef who occasionally orders takeout.",
  'Warning: prolonged use may cause spontaneous deliciousness.',
  'Preheating your ambitions to 375°…',
  "Chop chop — greatness won't marinate itself.",
  '9 out of 10 spatulas recommend you.',
  'Plot twist: the snacks were the real recipe all along.',
  'You plus a wooden spoon: unstoppable.',
  'Rumor has it your kitchen has a Michelin star.',
  'May your pans be nonstick and your snacks be plentiful.',
  'Breaking: local legend spotted near the stove.',
  "Life's short. Lick the spoon.",
  'Season everything. Especially the vibes.',
  'Your taste buds filed a formal thank-you note.',
  'Whisk it. Whisk it real good.',
  'Garlic makes everything 40% better. It’s basically science.',
  'Hungry? Same. Let’s fix that.',
  'One recipe away from full foodie-influencer status.',
  'Some call it dinner. We call it a masterpiece.',
]

// Pick a joke, avoiding an immediate repeat across mounts within the session.
let lastJokeIdx = -1
function pickJoke() {
  if (JOKES.length < 2) return JOKES[0]
  let i = lastJokeIdx
  while (i === lastJokeIdx) i = Math.floor(Math.random() * JOKES.length)
  lastJokeIdx = i
  return JOKES[i]
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

// Kept across mounts so returning to Home (from a favorite, cookbook, etc.)
// paints the last-known content instantly instead of flashing the skeleton and
// refetching from scratch. Keyed by user id so a logout + login as someone else
// never seeds the next person's Home from the previous person's data.
let homeCache: {
  userId: string
  recipes: any[]
  cookbooks: any[]
  todayMeals: { meal: any; cfg: typeof MEALS[number] }[]
  planId: string | null
} | null = null

export default function HomeScreen({ onNavigate }: Props) {
  const { user } = useApp()
  // Only trust the cache when it belongs to the person currently signed in.
  const cache = homeCache && user?.id && homeCache.userId === user.id ? homeCache : null
  const [recipes, setRecipes] = useState<any[]>(cache?.recipes ?? [])
  const [todayMeals, setTodayMeals] = useState<{ meal: any; cfg: typeof MEALS[number] }[]>(cache?.todayMeals ?? [])
  const [cookbooks, setCookbooks] = useState<any[]>(cache?.cookbooks ?? [])
  // One quirky line per Home open (stable for this mount).
  const [joke] = useState(pickJoke)
  const [planId, setPlanId] = useState<string | null>(cache?.planId ?? null)
  // Which slot the add panel is filling, or null when it is closed.
  const [addingSlot, setAddingSlot] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  // Only hold on the skeleton the first time; after that we have cached content.
  const [loading, setLoading] = useState(!cache)

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

  // Keep the cross-mount cache in step with the latest data, tagged with whose
  // it is so it's only reused for the same signed-in person.
  useEffect(() => {
    if (user?.id) homeCache = { userId: user.id, recipes, cookbooks, todayMeals, planId }
  }, [user?.id, recipes, cookbooks, todayMeals, planId])

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

  // The quick-add list offers recipes that suit the chosen slot, or everything
  // when none are tagged for it.
  const slotMatches = addingSlot ? recipes.filter((r: any) => slotTypeOf(r) === addingSlot) : []
  const slotRecipes = addingSlot && slotMatches.length > 0 ? slotMatches : recipes

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'var(--color-bg)' }}>
      <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
        {/* Header -- lives on the page, no panel behind it. Date sits on a
            quiet top line with the avatar; the greeting gets its own full-width
            line so it never wraps mid-phrase. */}
        <div style={{ padding: '20px 24px 0' }}>
          <div style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: '22px', boxShadow: 'var(--shadow-hero)', padding: '18px 18px 20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
              <span style={{ fontSize: '11px', fontWeight: '600', letterSpacing: '0.08em', color: 'var(--color-text-muted)' }}>
                {getDateLabel()}
              </span>
            </div>
            <button
              onClick={() => onNavigate('settings')}
              aria-label="Settings"
              title={user?.name || undefined}
              style={{ width: '44px', height: '44px', borderRadius: '50%', border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-hero)', cursor: 'pointer', background: 'var(--color-card)', color: 'var(--color-primary-dark)', fontSize: '15px', fontWeight: '700', flexShrink: 0 }}
            >
              {initial}
            </button>
          </div>

          <h1 style={{ fontSize: '27px', fontWeight: '700', color: 'var(--color-text)', margin: 0, lineHeight: 1.15, letterSpacing: '-0.02em' }}>
            {getGreeting()}{displayName ? `, ${displayName}` : ''}{' \u{1F44B}'}
          </h1>
          {/* A fresh quirky one-liner each time Home opens. */}
          <p style={{ fontSize: '13.5px', color: 'var(--color-text-secondary)', margin: '6px 0 0', lineHeight: 1.45 }}>
            {joke}
          </p>
          </div>
        </div>

        <div style={{ padding: '30px 24px 0' }}>
          {loading ? <HomeSkeleton /> : <>

          {/* Shortcuts -- three quiet ringed icons, no cards. */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
              {([
                { icon: ChefHat, label: 'Pantry', screen: 'pantry' as Screen },
                { icon: Lightbulb, label: 'Insights', screen: 'insights' as Screen },
                { icon: Users, label: 'Family', screen: 'household' as Screen },
              ]).map(a => (
                <button
                  key={a.label}
                  onClick={() => onNavigate(a.screen)}
                  style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '7px', height: '38px', borderRadius: '999px', border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-sm)', background: 'var(--color-card)', cursor: 'pointer', fontFamily: 'inherit', padding: 0 }}
                >
                  <a.icon size={15} color="var(--color-primary)" />
                  <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--color-text-secondary)' }}>{a.label}</span>
                </button>
              ))}
            </div>

          {/* Today */}
          <section style={{ marginBottom: '20px' }}>
            <div style={{ ...sectionCard, padding: '16px 16px 16px' }}>
            <SectionHead title="Today" action="Plan →" onAction={() => onNavigate('meal-plan')} />

            {todayMeals.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {todayMeals.map(({ meal, cfg }) => (
                  <div key={cfg.key} style={{ display: 'flex', alignItems: 'center', gap: '4px', minWidth: 0 }}>
                    <div style={{ flex: 1, minWidth: 0, cursor: 'pointer' }} onClick={() => onNavigate('recipe', { recipe: recipes.find((r: any) => r.id === meal.id) ?? meal })}>
                      <InfoCard
                        className="info-card--flat"
                        leftBadge={{ label: cfg.label.slice(0, 3).toUpperCase(), value: '🍽️' }}
                        title={meal.name}
                        subtitle={cfg.label}
                        rightInfo={`${(meal.prepTime || 0) + (meal.cookTime || 0)} min`}
                      />
                    </div>
                    <button
                      onClick={() => removeMeal(meal.mealId)}
                      aria-label={`Remove ${meal.name} from ${cfg.label}`}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', width: '44px', height: '44px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
                    >
                      <X size={16} color="var(--color-text-muted)" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyRow compact label="Nothing planned today" onClick={() => onNavigate('meal-plan')} />
            )}

            {/* Add a meal without leaving Home. */}
            {addingSlot === null ? (
              MEALS.some(cfg => !filledSlots.has(cfg.key)) && (
                <button
                  onClick={() => setAddingSlot(MEALS.find(cfg => !filledSlots.has(cfg.key))!.key)}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', marginTop: todayMeals.length > 0 ? '14px' : '10px', background: 'var(--color-primary-bg)', border: '1px solid var(--color-primary-border)', borderRadius: '999px', color: 'var(--color-primary-dark)', fontSize: '13px', fontWeight: '700', cursor: 'pointer', padding: '9px 16px', fontFamily: 'inherit' }}
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
                      style={{ padding: '5px 11px', borderRadius: '999px', boxShadow: 'var(--shadow-sm)', border: '1px solid ' + (addingSlot === cfg.key ? 'var(--color-primary)' : 'var(--color-border)'), background: addingSlot === cfg.key ? 'var(--color-primary)' : 'transparent', color: addingSlot === cfg.key ? '#fff' : 'var(--color-text-secondary)', fontSize: '12px', fontWeight: '700', cursor: 'pointer', fontFamily: 'inherit' }}
                    >
                      {cfg.label}
                    </button>
                  ))}
                </div>
                <div style={{ maxHeight: '168px', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
                  {slotRecipes.map((r: any, idx: number) => (
                    <button
                      key={r.id}
                      onClick={() => addMeal(r.id, addingSlot)}
                      disabled={busy}
                      style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 4px', background: 'none', border: 'none', borderTop: idx > 0 ? '1px solid var(--color-border)' : 'none', cursor: busy ? 'default' : 'pointer', textAlign: 'left', fontFamily: 'inherit', width: '100%' }}
                    >
                      <span style={{ width: '30px', height: '30px', borderRadius: '8px', background: 'var(--color-card)', boxShadow: 'var(--shadow-sm)', flexShrink: 0, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px' }}>
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
          </div>
          </section>

          {/* Feature discovery hint for free users with few recipes */}

          {/* Favorites */}
          <section style={{ marginBottom: '20px' }}>
            {favorites.length > 0 ? (
              <div style={{ ...sectionCard, padding: '16px 16px 6px', display: 'flex', flexDirection: 'column' }}>
                <SectionHead title="Favorites" action="See all →" onAction={() => onNavigate('favorites')} />
                {favorites.slice(0, 5).map((recipe: any) => {
                  const time = (recipe.prepTime || 0) + (recipe.cookTime || 0)
                  return (
                    <InfoCard
                      key={recipe.id}
                      className="info-card--flat"
                      leftBadge={{ label: (recipe.cuisine || 'Fav').slice(0, 3).toUpperCase(), value: '❤️' }}
                      title={recipe.name}
                      subtitle={recipe.cuisine || 'Recipe'}
                      rightInfo={`${time} min`}
                      onClick={() => onNavigate('recipe', { recipe })}
                    />
                  )
                })}
              </div>
            ) : (
              <>
                <SectionHead title="Favorites" />
                <EmptyRow label="No favorites yet" action="Browse →" onClick={() => onNavigate('browse')} />
              </>
            )}
          </section>

          {/* Cookbooks */}
          <section style={{ marginBottom: '20px' }}>
            <div style={{ ...sectionCard, padding: '16px 16px 6px', display: 'flex', flexDirection: 'column' }}>
            <SectionHead title="Cookbooks" action={cookbooks.length > 0 ? 'See all →' : undefined} onAction={() => onNavigate('cookbooks')} />
            {cookbooks.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {cookbooks.slice(0, 5).map((book: any) => {
                  const count = book.recipes?.length ?? 0
                  return (
                    <InfoCard
                      key={book.id}
                      className="info-card--flat"
                      leftBadge={{ label: `${count}`, value: '📚' }}
                      title={book.name}
                      subtitle={`${count} recipe${count === 1 ? '' : 's'}`}
                      rightInfo="→"
                      onClick={() => onNavigate('cookbook', { cookbookId: book.id })}
                    />
                  )
                })}
              </div>
            ) : (
              <EmptyRow label="No cookbooks yet" action="Create →" onClick={() => onNavigate('cookbooks')} />
            )}
            </div>
          </section>

          </>}
        </div>
        <div style={{ height: '24px' }} />
      </div>
    </div>
  )
}

/** The white elevated tile every Home section sits in. */
const sectionCard: CSSProperties = {
  background: 'var(--color-card)',
  border: '1px solid var(--color-border)',
  borderRadius: '20px',
  boxShadow: 'var(--shadow-md)',
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
function EmptyRow({ label, action, onClick, compact }: { label: string; action?: string; onClick: () => void; compact?: boolean }) {
  return (
    <button
      onClick={onClick}
      style={{ display: 'flex', width: '100%', alignItems: 'center', justifyContent: 'space-between', padding: compact ? '14px 0 4px' : '17px 0', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left' }}
    >
      <span style={{ fontSize: '15px', color: 'var(--color-text-secondary)' }}>{label}</span>
      {action && <span style={{ fontSize: '13px', color: 'var(--color-primary)', fontWeight: '600' }}>{action}</span>}
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
    <div style={{ marginBottom: '20px' }}>
      <div style={{ paddingBottom: '10px', borderBottom: '1px solid var(--color-subtle)' }}>
        <Skel w={84} h={11} r={6} />
      </div>
      <SkelTextRow />
      <SkelTextRow divider />
    </div>
  )
}

function HomeSkeleton() {
  return (
    <div>
        <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
          {[0, 1, 2].map(i => (
            <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
              <Skel w={46} h={46} r={23} />
              <Skel w={44} h={10} r={5} />
            </div>
          ))}
        </div>
      <SkelSection />
      <SkelSection />
      <SkelSection />
    </div>
  )
}
