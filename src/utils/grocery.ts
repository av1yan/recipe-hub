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
