import type { Recipe } from '../types'
import { pantryMatch } from './pantry'

export interface Insight {
  emoji: string
  text: string
  tone: 'good' | 'warn' | 'info'
}

export interface PlannedMeal {
  day: string
  slot: string
  recipe: any
}

const VEG_KEYWORDS = [
  'spinach', 'kale', 'broccoli', 'lettuce', 'tomato', 'pepper', 'carrot', 'zucchini', 'courgette',
  'cucumber', 'onion', 'greens', 'vegetable', 'pea', 'bean', 'cabbage', 'cauliflower', 'asparagus',
  'mushroom', 'aubergine', 'eggplant', 'avocado', 'celery', 'leek', 'squash', 'chard',
]

const calOf = (r: any): number => (r?.nutrition?.calories ?? r?.calories ?? 0) || 0
const tagsOf = (r: any): string[] =>
  (r?.tags || []).map((t: any) => (typeof t === 'string' ? t : t?.tag)).filter(Boolean).map((s: string) => s.toLowerCase())

/**
 * Real, computed insights over the planned week -- no model, no cost. Only the
 * ones that actually apply are returned.
 */
export function computeInsights(opts: {
  planned: PlannedMeal[]
  allRecipes: Recipe[]
  pantry: string[]
  goalCal: number
}): Insight[] {
  const { planned, allRecipes, pantry, goalCal } = opts
  const out: Insight[] = []
  const nDays = new Set(planned.map(p => p.day)).size

  // 1. Calorie balance vs goal
  const withCal = planned.filter(p => calOf(p.recipe) > 0)
  if (withCal.length && nDays) {
    const perDay = Math.round(withCal.reduce((s, p) => s + calOf(p.recipe), 0) / nDays)
    const diff = perDay - goalCal
    if (Math.abs(diff) >= 150) {
      out.push({
        emoji: diff > 0 ? '🔥' : '🥗',
        tone: diff > 0 ? 'warn' : 'info',
        text: `Your planned days average ${perDay.toLocaleString()} cal — ${Math.abs(diff).toLocaleString()} ${diff > 0 ? 'over' : 'under'} your ${goalCal.toLocaleString()} goal.`,
      })
    } else {
      out.push({ emoji: '✅', tone: 'good', text: `Nicely balanced — about ${perDay.toLocaleString()} cal/day, right around your goal.` })
    }
  }

  // 2. Cuisine variety
  const cuisines = planned.map(p => p.recipe?.cuisine).filter(Boolean) as string[]
  if (cuisines.length >= 3) {
    const counts: Record<string, number> = {}
    cuisines.forEach(c => { counts[c] = (counts[c] || 0) + 1 })
    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1])
    const [topC, topN] = sorted[0]
    if (topN >= Math.ceil(cuisines.length * 0.6)) {
      out.push({ emoji: '🍽️', tone: 'info', text: `${topN} of ${cuisines.length} meals are ${topC} — mix in another cuisine for variety.` })
    } else {
      out.push({ emoji: '🍽️', tone: 'good', text: `Good variety — ${Object.keys(counts).length} cuisines across your week.` })
    }
  }

  // 3. Vegetables
  if (planned.length >= 3) {
    const withVeg = planned.filter(p => {
      const tags = tagsOf(p.recipe)
      if (tags.includes('vegetarian') || tags.includes('vegan')) return true
      const names = (p.recipe?.ingredients || []).map((i: any) => (i.name || '').toLowerCase())
      return names.some((n: string) => VEG_KEYWORDS.some(k => n.includes(k)))
    }).length
    if (withVeg <= Math.floor(planned.length * 0.4)) {
      out.push({ emoji: '🌿', tone: 'warn', text: `Light on veg — only ${withVeg} of ${planned.length} planned meals feature vegetables.` })
    } else {
      out.push({ emoji: '🌿', tone: 'good', text: `Plenty of veg — ${withVeg} of ${planned.length} meals include vegetables.` })
    }
  }

  // 4. Use up the pantry
  if (pantry.length) {
    const plannedIds = new Set(planned.map(p => p.recipe?.id))
    const makeable = allRecipes
      .filter(r => !plannedIds.has(r.id))
      .map(r => ({ r, m: pantryMatch(r, pantry) }))
      .filter(x => x.m.total > 0 && x.m.missing.length === 0)
    if (makeable.length) {
      const names = makeable.slice(0, 2).map(x => x.r.name).join(' or ')
      out.push({ emoji: '🧊', tone: 'good', text: `Use what you have: you can make ${names} from your pantry right now.` })
    }
  }

  // 5. Shared ingredients — one shop covers several recipes
  if (planned.length >= 2) {
    const counts: Record<string, number> = {}
    planned.forEach(p => {
      new Set((p.recipe?.ingredients || []).map((i: any) => (i.name || '').toLowerCase().trim())).forEach((n: any) => {
        if (n) counts[n] = (counts[n] || 0) + 1
      })
    })
    const shared = Object.entries(counts).filter(([, n]) => n >= 2).map(([n]) => n)
    if (shared.length >= 2) {
      out.push({ emoji: '🛒', tone: 'info', text: `${shared.slice(0, 3).join(', ')} appear in several recipes — buy once, use across the week.` })
    }
  }

  return out
}
