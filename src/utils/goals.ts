// The user's daily calorie target, used by Insights and the meal-plan nutrition
// bar. Stored locally; 2,000 is a sensible default until they set their own.
const KEY = 'calorieGoal'
export const DEFAULT_CALORIE_GOAL = 2000

export function getCalorieGoal(): number {
  const raw = Number(localStorage.getItem(KEY))
  return Number.isFinite(raw) && raw > 0 ? raw : DEFAULT_CALORIE_GOAL
}

export function setCalorieGoal(value: number): void {
  const n = Math.min(6000, Math.max(1000, Math.round(value)))
  localStorage.setItem(KEY, String(n))
}
