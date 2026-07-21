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

// Daily macro targets in grams, alongside the calorie goal. Sensible defaults
// for a ~2,000 cal day until the user sets their own.
export interface MacroGoals { protein: number; carbs: number; fat: number }
export const DEFAULT_MACRO_GOALS: MacroGoals = { protein: 120, carbs: 250, fat: 70 }
const MACRO_KEYS: Record<keyof MacroGoals, string> = { protein: 'proteinGoal', carbs: 'carbsGoal', fat: 'fatGoal' }

export function getMacroGoals(): MacroGoals {
  const read = (k: string, d: number) => {
    const v = Number(localStorage.getItem(k))
    return Number.isFinite(v) && v > 0 ? v : d
  }
  return {
    protein: read(MACRO_KEYS.protein, DEFAULT_MACRO_GOALS.protein),
    carbs: read(MACRO_KEYS.carbs, DEFAULT_MACRO_GOALS.carbs),
    fat: read(MACRO_KEYS.fat, DEFAULT_MACRO_GOALS.fat),
  }
}

export function setMacroGoal(macro: keyof MacroGoals, value: number): void {
  const n = Math.min(500, Math.max(0, Math.round(value)))
  localStorage.setItem(MACRO_KEYS[macro], String(n))
}
