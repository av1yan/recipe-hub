import type { Recipe } from '../types'

// The pantry is a plain list of ingredient names the person has on hand, stored
// locally alongside the other preferences.
export const PANTRY_KEY = 'reciphub_pantry'

export function getPantry(): string[] {
  try {
    const raw = localStorage.getItem(PANTRY_KEY)
    const arr = raw ? JSON.parse(raw) : []
    return Array.isArray(arr) ? arr.filter(x => typeof x === 'string') : []
  } catch {
    return []
  }
}

export function savePantry(items: string[]) {
  localStorage.setItem(PANTRY_KEY, JSON.stringify(items))
}

const norm = (s: string) => (s || '').toLowerCase().trim()

// An ingredient counts as "on hand" when a pantry item matches its name either
// way round -- "egg" covers "eggs", "tomato" covers "cherry tomatoes". Generous
// on purpose: over-matching just suggests a recipe, and the missing list stays
// honest about what's actually needed.
function haveIngredient(ingredientName: string, pantry: string[]): boolean {
  const n = norm(ingredientName)
  if (!n) return false
  return pantry.some(p => {
    const pn = norm(p)
    return pn.length >= 2 && (n.includes(pn) || pn.includes(n))
  })
}

export interface PantryMatch {
  have: number
  total: number
  missing: string[]
}

export function pantryMatch(recipe: Recipe, pantry: string[]): PantryMatch {
  const names = (recipe.ingredients || []).map(i => i.name).filter(Boolean)
  const missing: string[] = []
  let have = 0
  for (const name of names) {
    if (haveIngredient(name, pantry)) have++
    else missing.push(name)
  }
  return { have, total: names.length, missing }
}
