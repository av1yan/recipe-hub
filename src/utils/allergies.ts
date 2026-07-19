import type { Recipe } from '../types'

// Selected allergens are stored here and read by Browse to hide any recipe that
// contains one. Kept in localStorage alongside the diet prefs.
export const ALLERGIES_KEY = 'reciphub_allergies'

// Each allergen maps to the ingredient-name keywords that flag it. Matching is a
// simple case-insensitive substring test -- deliberately generous, since for
// allergies over-hiding is far safer than showing something risky.
export const ALLERGY_OPTIONS: { id: string; label: string; keywords: string[] }[] = [
  { id: 'peanuts', label: 'Peanuts', keywords: ['peanut'] },
  { id: 'tree-nuts', label: 'Tree nuts', keywords: ['almond', 'cashew', 'walnut', 'pecan', 'hazelnut', 'pistachio', 'macadamia', 'pine nut'] },
  { id: 'dairy', label: 'Dairy', keywords: ['milk', 'cheese', 'butter', 'cream', 'yogurt', 'yoghurt', 'dairy', 'mozzarella', 'parmesan', 'feta', 'ghee'] },
  { id: 'eggs', label: 'Eggs', keywords: ['egg'] },
  { id: 'gluten', label: 'Gluten', keywords: ['wheat', 'flour', 'bread', 'pasta', 'noodle', 'gluten', 'breadcrumb', 'dough', 'tortilla', 'couscous', 'barley'] },
  { id: 'soy', label: 'Soy', keywords: ['soy', 'tofu', 'edamame', 'miso', 'tempeh'] },
  { id: 'shellfish', label: 'Shellfish', keywords: ['shrimp', 'prawn', 'crab', 'lobster', 'shellfish', 'clam', 'mussel', 'oyster', 'scallop'] },
  { id: 'fish', label: 'Fish', keywords: ['salmon', 'tuna', 'cod', 'anchovy', 'tilapia', 'halibut', 'sardine', 'mackerel', 'trout'] },
]

export function getAllergies(): string[] {
  try {
    const raw = localStorage.getItem(ALLERGIES_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export function saveAllergies(ids: string[]) {
  localStorage.setItem(ALLERGIES_KEY, JSON.stringify(ids))
}

/** True if any of the recipe's ingredients matches any selected allergen. */
export function recipeHasAllergen(recipe: Recipe, allergyIds: string[]): boolean {
  if (!allergyIds.length) return false
  const names = (recipe.ingredients || []).map(i => (i.name || '').toLowerCase())
  return allergyIds.some(id => {
    const opt = ALLERGY_OPTIONS.find(a => a.id === id)
    return !!opt && names.some(n => opt.keywords.some(k => n.includes(k)))
  })
}
