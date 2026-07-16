import { useState } from 'react'
import { ChevronRight } from 'lucide-react'
import type { Screen } from '../types'

interface Props {
  onNavigate: (screen: Screen) => void
}

export default function DietPreferencesScreen({ onNavigate }: Props) {
  const [selectedDiet, setSelectedDiet] = useState<string[]>([])

  const dietOptions = [
    { id: 'vegan', label: 'Vegan', color: '#6ba356' },
    { id: 'vegetarian', label: 'Vegetarian', color: '#7a8a5e' },
    { id: 'gluten-free', label: 'Gluten-Free', color: '#6ba356' },
    { id: 'keto', label: 'Keto', color: '#a48a6e' },
    { id: 'paleo', label: 'Paleo', color: '#d4a574' },
    { id: 'dairy-free', label: 'Dairy-Free', color: '#c67139' },
    { id: 'nut-free', label: 'Nut-Free', color: '#8a7d7d' },
    { id: 'low-carb', label: 'Low-Carb', color: '#9d8b7e' },
  ]

  const toggleDiet = (id: string) => {
    setSelectedDiet(prev =>
      prev.includes(id) ? prev.filter(d => d !== id) : [...prev, id]
    )
  }

  return (
    <div style={{ background: '#e8f5f0', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ padding: '40px 24px 24px', textAlign: 'center' }}>
        <div style={{ fontSize: '60px', marginBottom: '16px' }}>🥗</div>
        <h1 style={{ fontSize: '28px', fontWeight: '700', color: '#1e293b', margin: 0, marginBottom: '8px' }}>
          Your Diet
        </h1>
        <p style={{ fontSize: '15px', color: '#64748b', margin: 0 }}>
          Select your preferences so we can tailor suggestions.
        </p>
      </div>

      {/* Diet Options Grid */}
      <div style={{ flex: 1, padding: '24px', overflowY: 'auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          {dietOptions.map(diet => (
            <button
              key={diet.id}
              onClick={() => toggleDiet(diet.id)}
              style={{
                padding: '16px 12px',
                background: selectedDiet.includes(diet.id) ? diet.color : '#f0fffe',
                color: selectedDiet.includes(diet.id) ? '#fff' : '#1e293b',
                border: selectedDiet.includes(diet.id) ? 'none' : '2px solid #d4f0ed',
                borderRadius: '12px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                transform: 'scale(1)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'scale(1.05)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1)'
              }}
            >
              {diet.label}
            </button>
          ))}
        </div>
      </div>

      {/* Continue Button */}
      <div style={{ padding: '24px' }}>
        <button
          onClick={() => {
            localStorage.setItem('onboardingCompleted', 'true')
            onNavigate('home')
          }}
          style={{
            width: '100%',
            padding: '16px',
            background: '#6ba356',
            color: '#fff',
            border: 'none',
            borderRadius: '14px',
            fontSize: '16px',
            fontWeight: '600',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            transition: 'all 0.3s ease',
            boxShadow: '0 4px 12px rgba(107, 163, 86, 0.3)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px)'
            e.currentTarget.style.boxShadow = '0 8px 20px rgba(107, 163, 86, 0.4)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)'
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(107, 163, 86, 0.3)'
          }}
        >
          Continue
          <ChevronRight size={18} />
        </button>
      </div>
    </div>
  )
}
