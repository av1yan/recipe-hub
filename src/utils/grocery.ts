// Recipe measurements (tbsp, cup, g, ml, …) don't belong on a shopping list —
// you buy the jar/bag/bottle, not "3 tbsp" of something. Collapse those to just
// the item, but keep genuinely countable/package units (can, bunch, whole, …)
// so "1 can chickpeas" or "2 whole lemons" survive intact.
const MEASURE_UNITS = new Set([
  'tsp', 'teaspoon', 'teaspoons', 'tbsp', 'tablespoon', 'tablespoons',
  'cup', 'cups', 'ml', 'milliliter', 'milliliters', 'millilitre', 'millilitres',
  'l', 'liter', 'liters', 'litre', 'litres', 'g', 'gram', 'grams',
  'kg', 'kilogram', 'kilograms', 'oz', 'ounce', 'ounces', 'lb', 'lbs',
  'pound', 'pounds', 'fl oz', 'floz', 'pinch', 'pinches', 'dash', 'dashes',
  'handful', 'clove', 'cloves', 'slice', 'slices', 'sprig', 'sprigs',
])

export interface GroceryLine {
  name: string
  quantity: number
  unit: string
  category: string
}

/**
 * Turn a recipe ingredient into a shopping-list line. Cooking measures become a
 * plain "buy the item" line (no confusing amount); countable units are kept and
 * their quantity rounded up to a whole number.
 */
export function toGroceryLine(ing: any): GroceryLine {
  const name = String(ing?.name || '').trim()
  const unit = String(ing?.unit || '').trim()
  const qty = Number(ing?.quantity) || 1
  const category = ing?.category || 'general'
  if (MEASURE_UNITS.has(unit.toLowerCase())) {
    return { name, quantity: 1, unit: '', category }
  }
  return { name, quantity: Math.max(1, Math.round(qty)), unit, category }
}

// Units that stay the same in the plural: measurement abbreviations (2 tbsp,
// 2 oz) and count words used adjectivally (2 whole, 2 dozen).
const NO_PLURAL = new Set([
  'whole', 'dozen', 'g', 'kg', 'mg', 'ml', 'l', 'oz', 'lb', 'lbs',
  'tsp', 'tbsp', 'fl oz', 'floz',
])
const IRREGULAR_PLURAL: Record<string, string> = { loaf: 'loaves', leaf: 'leaves' }
// Singular units that end in "s" and take "es" (glass -> glasses). Without this
// list, an "s" ending is read as already-plural and left alone.
const ES_SINGULAR = new Set(['glass', 'class', 'gas'])

/** Pluralize a shopping unit for display when the quantity isn't 1 ("2 cans",
 *  "2 bunches") while leaving measures and invariant words alone ("2 tbsp").
 *  Idempotent for already-plural units — "balls" stays "balls", not "ballses". */
export function pluralizeUnit(unit: string, quantity: number): string {
  const u = (unit || '').trim()
  if (!u || (Number(quantity) || 0) === 1) return u
  const low = u.toLowerCase()
  if (NO_PLURAL.has(low)) return u
  if (IRREGULAR_PLURAL[low]) return IRREGULAR_PLURAL[low]
  // box -> boxes, inch -> inches, dish -> dishes (these base forms are never
  // already plural).
  if (/(x|ch|sh)$/i.test(u)) return u + 'es'
  // Already ends in "s": treat as plural and leave it (balls, cups, boxes),
  // unless it's a singular "s"-word that needs "es".
  if (/s$/i.test(u)) return ES_SINGULAR.has(low) ? u + 'es' : u
  return u + 's'
}
