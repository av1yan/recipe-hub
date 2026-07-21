import { useState, useEffect, type CSSProperties } from 'react'
import { ArrowLeft, Crown, Sparkles, Loader2, Lightbulb } from 'lucide-react'
import type { Screen, Recipe } from '../types'
import { mealPlanAPI, recipeAPI, insightsAPI } from '../utils/api'
import { getPantry } from '../utils/pantry'
import { getCalorieGoal, getMacroGoals } from '../utils/goals'
import { getDietPrefs } from './DietPreferencesScreen'
import { computeInsights, type PlannedMeal } from '../utils/insights'
import { useProPlan } from '../utils/proPlan'
import { mondayOf, sameWeek, getMeals, DAY_NAMES, MEALS } from './MealPlanScreen'

interface Props {
  onNavigate: (screen: Screen, data?: any) => void
}

// Fallback when the backend returns the read as one `text` blob (e.g. an older
// deploy): break it into separate tips by line, then by sentence.
function splitInsightPoints(text: string): string[] {
  const byLine = text.split('\n').map(l => l.replace(/^\s*(?:\d+[.)]|[-*•])\s*/, '').trim()).filter(Boolean)
  if (byLine.length > 1) return byLine
  const sentences = text.match(/[^.!?]+[.!?]+/g)
  return sentences ? sentences.map(s => s.trim()).filter(Boolean) : (text.trim() ? [text.trim()] : [])
}

export default function InsightsScreen({ onNavigate }: Props) {
  const [isPro] = useProPlan()
  const [loading, setLoading] = useState(true)
  const [planned, setPlanned] = useState<PlannedMeal[]>([])
  const [recipes, setRecipes] = useState<Recipe[]>([])

  const [aiLoading, setAiLoading] = useState(false)
  const [aiPoints, setAiPoints] = useState<string[]>([])
  const [aiNote, setAiNote] = useState('')

  useEffect(() => {
    if (isPro) load()
  }, [])

  async function load() {
    try {
      setLoading(true)
      const [plans, list] = await Promise.all([mealPlanAPI.list(), recipeAPI.list()])
      // Hydrate ingredients + tags from each recipe's detail (the list omits them).
      const hydrated: Recipe[] = await Promise.all(
        (list as any[]).map(async (r: any) => {
          try {
            const d = await recipeAPI.get(r.id)
            return { ...r, ingredients: d.ingredients || [], tags: d.tags || r.tags || [] }
          } catch {
            return r
          }
        })
      )
      setRecipes(hydrated)

      const week = (plans as any[]).find(p => sameWeek(p.weekStart, mondayOf(new Date())))
      const rows: PlannedMeal[] = []
      if (week) {
        DAY_NAMES.forEach(day => MEALS.forEach(m => {
          getMeals(week, day, m.key).forEach((meal: any) => {
            const full = hydrated.find(r => r.id === meal.id) || meal
            rows.push({ day, slot: m.label, recipe: full })
          })
        }))
      }
      setPlanned(rows)
    } catch (e) {
      console.error('insights load failed', e)
    } finally {
      setLoading(false)
    }
  }

  const pantry = getPantry()
  const goalCal = getCalorieGoal()
  const macroGoals = getMacroGoals()
  const insights = computeInsights({ planned, allRecipes: recipes, pantry, goalCal, proteinGoal: macroGoals.protein })

  const askAI = async () => {
    setAiLoading(true); setAiPoints([]); setAiNote('')
    try {
      const summary = {
        goalCaloriesPerDay: goalCal,
        dailyMacroGoals: macroGoals,
        plannedMeals: planned.map(p => ({
          day: p.day, slot: p.slot, name: p.recipe?.name, cuisine: p.recipe?.cuisine,
          calories: p.recipe?.nutrition?.calories ?? p.recipe?.calories ?? null,
          protein: p.recipe?.nutrition?.protein ?? null,
          carbs: p.recipe?.nutrition?.carbs ?? null,
          fat: p.recipe?.nutrition?.fat ?? null,
        })),
        pantry,
        diet: getDietPrefs(),
      }
      const res: any = await insightsAPI.ai(summary)
      if (res?.configured === false) setAiNote(res.message || "AI insights aren't switched on yet.")
      else {
        const pts = Array.isArray(res?.points) && res.points.length
          ? res.points.map((x: any) => String(x))
          : splitInsightPoints(res?.text || '')
        setAiPoints(pts)
      }
    } catch {
      setAiNote('Could not reach the AI just now — try again in a moment.')
    } finally {
      setAiLoading(false)
    }
  }

  const header = (
    <header style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px 24px', background: 'var(--color-bg)', borderBottom: '1px solid var(--color-subtle)', flexShrink: 0 }}>
      <button onClick={() => onNavigate('home')} aria-label="Back" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex' }}>
        <ArrowLeft size={22} color="var(--color-text)" />
      </button>
      <h1 style={{ fontSize: '19px', fontWeight: '700', letterSpacing: '-0.01em', color: 'var(--color-text)', margin: 0 }}>Insights</h1>
    </header>
  )

  if (!isPro) {
    return (
      <div className="screen" style={{ background: 'var(--color-bg)' }}>
        {header}
        <div style={{ flex: 1, overflowY: 'auto', padding: '40px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '14px' }}>
          <div style={{ width: '64px', height: '64px', borderRadius: '18px', background: 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Lightbulb size={32} color="#fff" />
          </div>
          <h2 style={{ fontSize: '19px', fontWeight: '800', color: 'var(--color-text)', margin: 0 }}>A Pro feature</h2>
          <p style={{ fontSize: '14px', color: 'var(--color-text-secondary)', margin: 0, lineHeight: 1.5, maxWidth: '280px' }}>
            recipHub reads your week — calories, variety, veg, your pantry — and tells you what's working and what to tweak.
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
      <div style={{ flex: 1, overflowY: 'auto', padding: '18px 24px 24px' }}>
        <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', margin: '0 0 6px', lineHeight: 1.5 }}>
          Your planned week, read for you.
        </p>

        {loading ? (
          <div>
            {[0, 1, 2].map(i => (
              <div key={i} style={{ display: 'flex', gap: '12px', padding: '16px 0', borderTop: i > 0 ? '1px solid var(--color-subtle)' : 'none' }}>
                <Skel w={22} h={22} r={11} style={{ flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <Skel w="92%" h={12} />
                  <Skel w="60%" h={12} style={{ marginTop: '8px' }} />
                </div>
              </div>
            ))}
          </div>
        ) : insights.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--color-text-muted)' }}>
            <div style={{ fontSize: '34px', marginBottom: '8px' }}>🗓️</div>
            <p style={{ fontSize: '14px', margin: '0 0 16px' }}>Plan a few meals this week and I'll have something to say.</p>
            <button onClick={() => onNavigate('meal-plan')} style={{ padding: '11px 18px', borderRadius: '11px', border: 'none', background: 'var(--color-primary)', color: '#fff', fontSize: '14px', fontWeight: '700', cursor: 'pointer', fontFamily: 'inherit' }}>
              Plan your week
            </button>
          </div>
        ) : (
          <div>
            {insights.map((ins, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '13px', padding: '15px 0', borderTop: i > 0 ? '1px solid var(--color-subtle)' : 'none' }}>
                <span style={{ fontSize: '19px', flexShrink: 0, lineHeight: 1.3 }}>{ins.emoji}</span>
                <p style={{ fontSize: '14.5px', color: 'var(--color-text)', margin: 0, lineHeight: 1.5, flex: 1 }}>{ins.text}</p>
              </div>
            ))}
          </div>
        )}

        {/* Ask AI — a deeper, natural-language read (lights up when a key is set) */}
        {!loading && insights.length > 0 && (
          <div style={{ marginTop: '22px' }}>
            <button
              onClick={askAI}
              disabled={aiLoading}
              style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '13px', borderRadius: '12px', border: '1px solid var(--color-primary-border)', background: 'var(--color-primary-bg)', color: 'var(--color-primary-dark)', fontSize: '14px', fontWeight: '700', cursor: aiLoading ? 'default' : 'pointer', fontFamily: 'inherit' }}
            >
              {aiLoading ? <><Loader2 size={16} className="rh-spin" /> Thinking…</> : <><Sparkles size={16} /> Ask AI for a deeper read</>}
            </button>

            {aiPoints.length > 0 && (
              <div style={{ marginTop: '14px', padding: '16px', background: 'var(--color-subtle)', borderRadius: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '12px' }}>
                  <Sparkles size={14} color="var(--color-primary)" />
                  <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--color-primary)', letterSpacing: '0.08em' }}>AI READ</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {aiPoints.map((pt, i) => (
                    <div key={i} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                      <span style={{ flexShrink: 0, marginTop: '7px', width: '6px', height: '6px', borderRadius: '50%', background: 'var(--color-primary)' }} />
                      <p style={{ fontSize: '14px', color: 'var(--color-text)', margin: 0, lineHeight: 1.5, flex: 1 }}>{pt}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {aiNote && (
              <div style={{ marginTop: '12px', padding: '12px 14px', background: 'var(--color-subtle)', borderRadius: '12px' }}>
                <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', margin: 0, lineHeight: 1.5 }}>{aiNote}</p>
              </div>
            )}
          </div>
        )}
      </div>

      <style>{`.rh-spin { animation: rh-rot 1s linear infinite } @keyframes rh-rot { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}

function Skel({ w = '100%', h, r = 7, style }: { w?: number | string; h: number; r?: number; style?: CSSProperties }) {
  return <div className="rh-skel" style={{ width: w, height: h, borderRadius: r, ...style }} />
}
