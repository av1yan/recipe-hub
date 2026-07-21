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

export type TempUnit = 'F' | 'C'
const TEMP_KEY = 'reciphub_temp'

export function getTempPref(): TempUnit {
  return localStorage.getItem(TEMP_KEY) === 'C' ? 'C' : 'F'
}
export function setTempPref(t: TempUnit) {
  localStorage.setItem(TEMP_KEY, t)
}

// Convert oven/cooking temperatures written into instruction text to the chosen
// unit, e.g. "bake at 350°F" -> "bake at 175°C". Matches 2-3 digit temps written
// as "350°F", "350 F", "350 degrees Fahrenheit", etc.
export function convertTempInText(text: string, unit: TempUnit): string {
  if (!text) return text
  return text.replace(
    /(\d{2,3})\s*°?\s*(?:degrees?\s*)?(fahrenheit|celsius|[FC])\b/gi,
    (_m, numStr, word) => {
      const n = Number(numStr)
      const from = (String(word)[0].toUpperCase()) as TempUnit
      if (from === unit) return `${n}°${unit}`
      if (from === 'F') return `${Math.round((n - 32) * 5 / 9)}°C`
      return `${Math.round(n * 9 / 5 + 32)}°F`
    },
  )
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
  if (n >= 10) return Math.round(n)       // whole g / ml for anything sizeable
  return Math.round(n * 4) / 4            // nearest quarter for small amounts
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
