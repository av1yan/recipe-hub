import { useState, useEffect, type CSSProperties } from 'react'
import { ArrowLeft, Sparkles, Loader2, Info } from 'lucide-react'
import type { Screen, Recipe } from '../types'
import { mealPlanAPI, recipeAPI, insightsAPI } from '../utils/api'
import { getPantry } from '../utils/pantry'
import { getCalorieGoal, getMacroGoals } from '../utils/goals'
import { getDietPrefs } from './DietPreferencesScreen'
import { computeInsights, type PlannedMeal } from '../utils/insights'
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
  const [loading, setLoading] = useState(true)
  const [planned, setPlanned] = useState<PlannedMeal[]>([])
  const [recipes, setRecipes] = useState<Recipe[]>([])

  const [aiLoading, setAiLoading] = useState(false)
  const [aiPoints, setAiPoints] = useState<string[]>([])
  const [aiNote, setAiNote] = useState('')

  useEffect(() => {
    load()
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

  // Week at a glance: average planned calories and protein per planned day.
  const plannedDays = new Set(planned.map(p => p.day)).size
  const calOf = (r: any): number => (r?.nutrition?.calories ?? r?.calories ?? 0) || 0
  const proteinOf = (r: any): number => (r?.nutrition?.protein ?? 0) || 0
  const avgCal = plannedDays ? Math.round(planned.reduce((t, p) => t + calOf(p.recipe), 0) / plannedDays) : 0
  const avgProtein = plannedDays ? Math.round(planned.reduce((t, p) => t + proteinOf(p.recipe), 0) / plannedDays) : 0
  const hasNutrition = avgCal > 0 || avgProtein > 0

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
    <header style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '16px 24px', background: 'var(--color-bg)', flexShrink: 0 }}>
      <button onClick={() => onNavigate('home')} aria-label="Back" style={{ width: '38px', height: '38px', borderRadius: '13px', background: 'var(--color-card)', border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-sm)', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <ArrowLeft size={19} color="var(--color-text)" />
      </button>
      <h1 style={{ fontSize: '22px', fontWeight: '700', letterSpacing: '-0.02em', color: 'var(--color-text)', margin: 0 }}>Insights</h1>
    </header>
  )


  return (
    <div className="screen" style={{ background: 'var(--color-bg)' }}>
      {header}
      <div style={{ flex: 1, overflowY: 'auto', padding: '18px 24px 24px' }}>
        <p style={{ fontSize: '14px', color: 'var(--color-text-secondary)', margin: 0, lineHeight: 1.5 }}>
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
          <div style={{ marginTop: '14px', textAlign: 'center', padding: '32px 20px 28px', color: 'var(--color-text-muted)', background: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: '20px', boxShadow: 'var(--shadow-md)' }}>
            <div style={{ fontSize: '34px', marginBottom: '8px' }}>🗓️</div>
            <p style={{ fontSize: '14px', margin: '0 0 16px', lineHeight: 1.5 }}>Plan a few meals this week and I'll have something to say.</p>
            <button onClick={() => onNavigate('meal-plan')} style={{ padding: '11px 20px', borderRadius: '999px', border: 'none', background: 'var(--color-primary)', boxShadow: 'var(--shadow-pill)', color: '#fff', fontSize: '14px', fontWeight: '700', cursor: 'pointer', fontFamily: 'inherit' }}>
              Plan your week
            </button>
          </div>
        ) : (
          <div>
            {hasNutrition && (
              <div style={{ marginTop: '14px', padding: '14px 16px 16px', background: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: '20px', boxShadow: 'var(--shadow-md)' }}>
                <div style={{ fontSize: '11px', fontWeight: '700', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--color-text-muted)', marginBottom: '12px' }}>
                  Week at a glance · {plannedDays} day{plannedDays === 1 ? '' : 's'} planned
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '18px' }}>
                  <GlanceBar label="Calories / day" value={avgCal} goal={goalCal} unit="" color="var(--color-primary)" />
                  <GlanceBar label="Protein / day" value={avgProtein} goal={macroGoals.protein} unit="g" color="#a78bfa" />
                </div>
              </div>
            )}
            <div style={{ marginTop: '14px', padding: '4px 16px', background: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: '20px', boxShadow: 'var(--shadow-md)' }}>
              {insights.map((ins, i) => {
                const tile = ins.tone === 'warn'
                  ? { bg: 'color-mix(in srgb, var(--color-warn-text) 14%, transparent)', border: 'color-mix(in srgb, var(--color-warn-text) 38%, transparent)' }
                  : ins.tone === 'good'
                    ? { bg: 'var(--color-primary-bg)', border: 'var(--color-primary-border)' }
                    : { bg: 'var(--color-subtle)', border: 'var(--color-border)' }
                return (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '14px 0', borderTop: i > 0 ? '1px solid var(--color-subtle)' : 'none' }}>
                    <span style={{ width: '44px', height: '44px', borderRadius: '14px', background: tile.bg, border: `1px solid ${tile.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', flexShrink: 0 }}>{ins.emoji}</span>
                    <p style={{ fontSize: '14.5px', color: 'var(--color-text)', margin: 0, lineHeight: 1.45, flex: 1 }}>{ins.text}</p>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Ask AI — a deeper, natural-language read (lights up when a key is set) */}
        {!loading && insights.length > 0 && (
          <div style={{ marginTop: '18px' }}>
            <button
              onClick={askAI}
              disabled={aiLoading}
              style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '13px', borderRadius: '999px', border: '1px solid var(--color-primary-border)', boxShadow: 'var(--shadow-sm)', background: 'var(--color-primary-bg)', color: 'var(--color-primary-dark)', fontSize: '14px', fontWeight: '700', cursor: aiLoading ? 'default' : 'pointer', fontFamily: 'inherit' }}
            >
              {aiLoading ? <><Loader2 size={16} className="rh-spin" /> Thinking…</> : <><Sparkles size={16} /> Ask AI for a deeper read</>}
            </button>

            {aiPoints.length > 0 && (
              <div style={{ marginTop: '14px', padding: '16px', background: 'var(--color-card)', border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-md)', borderRadius: '20px' }}>
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
              <div style={{ marginTop: '12px', padding: '12px 14px', background: 'var(--color-card)', border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-sm)', borderRadius: '16px' }}>
                <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', margin: 0, lineHeight: 1.5 }}>{aiNote}</p>
              </div>
            )}
          </div>
        )}

        {!loading && insights.length > 0 && (
          <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', marginTop: '16px', padding: '10px 12px', background: 'var(--color-primary-bg)', border: '1px solid var(--color-primary-border)', borderRadius: '12px' }}>
            <Info size={14} color="var(--color-primary-dark)" style={{ flexShrink: 0, marginTop: '1px' }} />
            <p style={{ margin: 0, fontSize: '12.5px', lineHeight: 1.5, color: 'var(--color-primary-dark)' }}>
              Insights use estimated nutrition for general reference — not medical advice. Source:{' '}
              <a href="https://fdc.nal.usda.gov/" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--color-primary-dark)', textDecoration: 'underline', fontWeight: 600 }}>
                USDA FoodData Central
              </a>
              .
            </p>
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

/** A label, "value / goal", and a progress bar. Amber once the goal is passed. */
function GlanceBar({ label, value, goal, unit, color }: { label: string; value: number; goal: number; unit: string; color: string }) {
  const pct = goal > 0 ? Math.min(100, Math.round((value / goal) * 100)) : 0
  return (
    <div>
      <div style={{ fontSize: '12px', fontWeight: '600', color: 'var(--color-text-muted)', marginBottom: '4px' }}>{label}</div>
      <div style={{ fontSize: '18px', fontWeight: '800', color: 'var(--color-text)', marginBottom: '8px' }}>
        {value.toLocaleString()}{unit}<span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--color-text-muted)' }}> / {goal.toLocaleString()}{unit}</span>
      </div>
      <div role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={goal} aria-valuenow={value} style={{ height: '6px', borderRadius: '3px', background: 'var(--color-border)', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: value > goal ? '#f59e0b' : color, borderRadius: '3px', transition: 'width 0.3s ease' }} />
      </div>
    </div>
  )
}
