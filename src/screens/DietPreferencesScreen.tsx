import { useState } from 'react'
import { ChevronRight, Check } from 'lucide-react'
import type { Screen } from '../types'

interface Props {
  onNavigate: (screen: Screen) => void
}

// Shared key so other screens (e.g. Browse) can tailor recipes to these choices.
export const DIET_PREFS_KEY = 'reciphub_diet_prefs'

export function getDietPrefs(): string[] {
  try {
    const raw = localStorage.getItem(DIET_PREFS_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export const DIET_OPTIONS = [
  { id: 'vegan', label: 'Vegan' },
  { id: 'vegetarian', label: 'Vegetarian' },
  { id: 'gluten-free', label: 'Gluten-Free' },
  { id: 'keto', label: 'Keto' },
  { id: 'paleo', label: 'Paleo' },
  { id: 'dairy-free', label: 'Dairy-Free' },
  { id: 'nut-free', label: 'Nut-Free' },
  { id: 'low-carb', label: 'Low-Carb' },
]

export default function DietPreferencesScreen({ onNavigate }: Props) {
  const [selectedDiet, setSelectedDiet] = useState<string[]>(() => getDietPrefs())

  const toggleDiet = (id: string) => {
    setSelectedDiet(prev => {
      const next = prev.includes(id) ? prev.filter(d => d !== id) : [...prev, id]
      localStorage.setItem(DIET_PREFS_KEY, JSON.stringify(next))
      return next
    })
  }

  const handleContinue = () => {
    localStorage.setItem(DIET_PREFS_KEY, JSON.stringify(selectedDiet))
    localStorage.setItem('onboardingCompleted', 'true')
    onNavigate('home')
  }

  return (
    <div style={{ background: 'var(--color-primary-bg)', height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ padding: '32px 24px 16px', textAlign: 'center', flexShrink: 0 }}>
        <div style={{ fontSize: '52px', marginBottom: '12px' }}>🥗</div>
        <h1 style={{ fontSize: '26px', fontWeight: '700', color: 'var(--color-text)', margin: '0 0 8px' }}>
          Your Diet
        </h1>
        <p style={{ fontSize: '15px', color: 'var(--color-text-secondary)', margin: 0 }}>
          Select your preferences so we can tailor suggestions.
        </p>
      </div>

      {/* Diet Options - Wrapping Pills */}
      <div style={{ flex: 1, padding: '16px 24px', overflowY: 'auto' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', justifyContent: 'center' }}>
          {DIET_OPTIONS.map(diet => {
            const active = selectedDiet.includes(diet.id)
            return (
              <button
                key={diet.id}
                onClick={() => toggleDiet(diet.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '6px',
                  padding: '11px 18px',
                  background: active ? '#6ba356' : 'var(--color-card)',
                  color: active ? '#fff' : '#334155',
                  border: active ? '2px solid #6ba356' : '2px solid #d7e8cd',
                  borderRadius: '999px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  boxShadow: active ? '0 2px 8px rgba(107,163,86,0.3)' : '0 1px 2px rgba(0,0,0,0.04)',
                  transition: 'all 0.15s ease',
                }}
              >
                {active && <Check size={15} />}
                {diet.label}
              </button>
            )
          })}
        </div>

        <p style={{ textAlign: 'center', fontSize: '13px', color: 'var(--color-text-muted)', marginTop: '20px' }}>
          {selectedDiet.length === 0
            ? 'Tap any that apply — or skip for now.'
            : `${selectedDiet.length} selected`}
        </p>
      </div>

      {/* Continue Button */}
      <div style={{ padding: '16px 24px 24px', flexShrink: 0 }}>
        <button
          onClick={handleContinue}
          style={{
            width: '100%',
            padding: '16px',
            background: '#6ba356',
            color: '#fff',
            border: 'none',
            borderRadius: '14px',
            fontSize: '16px',
            fontWeight: '700',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            boxShadow: '0 4px 12px rgba(107, 163, 86, 0.3)',
          }}
        >
          {selectedDiet.length > 0 ? 'Continue' : 'Skip for now'}
          <ChevronRight size={18} />
        </button>
      </div>
    </div>
  )
}
