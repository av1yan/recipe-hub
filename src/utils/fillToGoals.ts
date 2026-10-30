import { slotTypeOf, type SlotType } from './mealType'

export interface FillRecipe {
  id: string
  name: string
  cuisine?: string
  mealType?: string
  nutrition?: { calories?: number; protein?: number } | null
  calories?: number | null
}

export interface FillPick {
  slot: SlotType
  recipeId: string
  name: string
  cal: number
  protein: number
}

function nutritionOf(r: FillRecipe): { cal: number; protein: number } | null {
  if (r.nutrition && typeof r.nutrition.calories === 'number') {
    return { cal: r.nutrition.calories, protein: r.nutrition.protein || 0 }
  }
  if (typeof r.calories === 'number') return { cal: r.calories, protein: 0 }
  return null
}

// Fill the empty slots of one day from recipes that have nutrition data. Each
// slot gets a fair share of the remaining calories but never more than what is
// left of the day's budget, prefers recipes tagged for that slot, and favours
// protein. A recipe is not repeated within the same day.
export function fillDayToGoals(
  emptySlots: SlotType[],
  recipes: FillRecipe[],
  remainingCal: number,
  remainingProtein: number,
): FillPick[] {
  const picks: FillPick[] = []
  const used = new Set<string>()
  let budget = Math.max(0, remainingCal)
  let proteinLeft = Math.max(0, remainingProtein)

  const candidates = recipes
    .map(r => ({ r, n: nutritionOf(r) }))
    .filter((c): c is { r: FillRecipe; n: { cal: number; protein: number } } => c.n !== null && c.n.cal > 0)

  emptySlots.forEach((slot, idx) => {
    const slotsLeft = emptySlots.length - idx
    const share = budget / slotsLeft
    const fits = (c: { r: FillRecipe; n: { cal: number; protein: number } }) =>
      !used.has(c.r.id) && c.n.cal <= Math.min(budget, share * 1.15)
    const pool = candidates.filter(fits)
    const tagged = pool.filter(c => slotTypeOf(c.r) === slot)
    // A drink slot only takes a drink; food never fills it by fallback.
    const options = tagged.length ? tagged : slot === 'drink' ? [] : pool
    if (!options.length) return

    options.sort((a, b) => {
      const proteinGap = (x: { n: { protein: number } }) => Math.abs(proteinLeft / slotsLeft - x.n.protein)
      return proteinGap(a) - proteinGap(b)
    })
    const best = options[0]
    used.add(best.r.id)
    budget -= best.n.cal
    proteinLeft -= best.n.protein
    picks.push({ slot, recipeId: best.r.id, name: best.r.name, cal: best.n.cal, protein: best.n.protein })
  })

  return picks
}
