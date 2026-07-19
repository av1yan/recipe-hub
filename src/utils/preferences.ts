export type MeasurementSystem = 'imperial' | 'metric'

const UNITS_KEY = 'reciphub_units'
const SERVINGS_KEY = 'reciphub_default_servings'

export function getUnitPref(): MeasurementSystem {
  return localStorage.getItem(UNITS_KEY) === 'metric' ? 'metric' : 'imperial'
}
export function setUnitPref(system: MeasurementSystem) {
  localStorage.setItem(UNITS_KEY, system)
}

export function getDefaultServings(): number {
  const n = Number(localStorage.getItem(SERVINGS_KEY))
  return n > 0 ? n : 2
}
export function setDefaultServings(n: number) {
  localStorage.setItem(SERVINGS_KEY, String(n))
}

// --- Unit conversion -------------------------------------------------------
// Normalise a convertible amount to grams / millilitres, then format it in the
// chosen system with a sensible unit. Count-ish units (whole, can, clove,
// pinch…) aren't measurements, so they pass through untouched.
const WEIGHT_TO_G: Record<string, number> = {
  g: 1, gram: 1, grams: 1, kg: 1000,
  oz: 28.35, ounce: 28.35, ounces: 28.35,
  lb: 453.6, lbs: 453.6, pound: 453.6, pounds: 453.6,
}
const VOLUME_TO_ML: Record<string, number> = {
  ml: 1, l: 1000, liter: 1000, litre: 1000, liters: 1000, litres: 1000,
  tsp: 4.929, teaspoon: 4.929, teaspoons: 4.929,
  tbsp: 14.787, tablespoon: 14.787, tablespoons: 14.787,
  cup: 236.6, cups: 236.6, 'fl oz': 29.57,
}

function tidy(n: number): number {
  if (n >= 100) return Math.round(n)
  if (n >= 10) return Math.round(n * 10) / 10
  return Math.round(n * 4) / 4 // nearest quarter for small amounts
}

export function convertMeasurement(quantity: number, unit: string, system: MeasurementSystem): { quantity: number; unit: string } {
  const u = (unit || '').trim().toLowerCase()

  if (u in WEIGHT_TO_G) {
    const grams = quantity * WEIGHT_TO_G[u]
    if (system === 'metric') {
      return grams >= 1000 ? { quantity: tidy(grams / 1000), unit: 'kg' } : { quantity: tidy(grams), unit: 'g' }
    }
    const oz = grams / 28.35
    return oz >= 16 ? { quantity: tidy(oz / 16), unit: 'lb' } : { quantity: tidy(oz), unit: 'oz' }
  }

  if (u in VOLUME_TO_ML) {
    const ml = quantity * VOLUME_TO_ML[u]
    if (system === 'metric') {
      return ml >= 1000 ? { quantity: tidy(ml / 1000), unit: 'l' } : { quantity: tidy(ml), unit: 'ml' }
    }
    if (ml < 15) return { quantity: tidy(ml / 4.929), unit: 'tsp' }
    if (ml < 236.6) return { quantity: tidy(ml / 14.787), unit: 'tbsp' }
    return { quantity: tidy(ml / 236.6), unit: 'cup' }
  }

  return { quantity, unit }
}
