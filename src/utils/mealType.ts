// Which meal slot a recipe belongs to. The stored mealType is the source of
// truth, but imports default to "dinner" and the add form defaults to "lunch",
// so a clearly-named breakfast or drink tagged with one of those defaults is
// reclassified from its name.
export type SlotType = 'breakfast' | 'lunch' | 'dinner' | 'snack' | 'drink'

export const SLOT_LABELS: Record<SlotType, string> = {
  breakfast: 'Breakfast', lunch: 'Lunch', dinner: 'Dinner', snack: 'Snack', drink: 'Drink',
}

const ALIASES: [RegExp, SlotType][] = [
  [/breakfast|brunch/, 'breakfast'],
  [/lunch/, 'lunch'],
  [/dinner|supper|main|entree|entrée/, 'dinner'],
  [/snack|dessert|appetizer|starter|treat/, 'snack'],
  [/drink|beverage|cocktail|mocktail|smoothie/, 'drink'],
]

const NAME_HINTS: [RegExp, SlotType][] = [
  [/\b(smoothie|milkshake|shake|lemonade|latte|cappuccino|mocktail|cocktail|margarita cocktail|juice|iced tea|chai|hot chocolate|cold brew|coffee|punch|sangria|kombucha)\b/i, 'drink'],
  [/\b(pancakes?|waffles?|omelet(te)?s?|oatmeal|porridge|granola|muesli|french toast|scrambled eggs?|breakfast|bagels?|shakshuka|overnight oats|chia pudding|frittata)\b/i, 'breakfast'],
  [/\b(cookies?|brownies?|energy balls?|trail mix|popcorn|hummus|dip|snack bars?|granola bars?|bites)\b/i, 'snack'],
]

function fromLabel(raw: unknown): SlotType | null {
  const s = String(raw || '').toLowerCase()
  const hit = ALIASES.find(([re]) => re.test(s))
  return hit ? hit[1] : null
}

export function slotTypeOf(recipe: { mealType?: string; name?: string } | null | undefined): SlotType {
  const stored = fromLabel(recipe?.mealType)
  const named = NAME_HINTS.find(([re]) => re.test(recipe?.name || ''))?.[1]
  // A drink name is unambiguous, so it beats any tag but breakfast (a breakfast smoothie).
  if (named === 'drink' && stored !== 'breakfast') return 'drink'
  // Otherwise only the default-ish tags are second-guessed; an explicit snack/breakfast stands.
  if (stored && stored !== 'dinner' && stored !== 'lunch') return stored
  return named || stored || 'dinner'
}
