/** Total prep + cook time as "25 min". A recipe with no time recorded gives '',
    so the card leaves the time out instead of showing "0 min". */
export function timeLabel(recipe: { prepTime?: number | null; cookTime?: number | null }): string {
  const total = (recipe.prepTime || 0) + (recipe.cookTime || 0)
  return total > 0 ? `${total} min` : ''
}
