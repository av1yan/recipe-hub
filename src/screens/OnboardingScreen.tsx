import { useState } from 'react'
import { ChevronRight, Sparkles } from 'lucide-react'
import type { Screen } from '../types'

interface Props {
  onNavigate: (screen: Screen) => void
}

const STEPS = [
  {
    icon: '🍳',
    title: 'Welcome to recipHub',
    description: 'Your personal recipe companion. Save, plan, and cook smarter.',
  },
  {
    icon: '📚',
    title: 'Save any recipe',
    description: 'Collect recipes from anywhere — blogs, links, or just type them in. All in one place.',
  },
  {
    icon: '📅',
    title: 'Plan your week',
    description: 'Drop recipes into your meal planner. Stay organised and discover new meals.',
  },
  {
    icon: '🛒',
    title: 'Auto grocery list',
    description: 'One tap turns your meal plan into a full shopping list.',
  },
  {
    icon: '👨‍🍳',
    title: 'Cook smarter',
    description: 'Full-screen step-by-step guides with timers. Hands-free cooking made easy.',
  },
]

export default function OnboardingScreen({ onNavigate }: Props) {
  const [currentStep, setCurrentStep] = useState(0)
  const step = STEPS[currentStep]
  const isLast = currentStep === STEPS.length - 1

  const handleNext = () => {
    if (!isLast) setCurrentStep(currentStep + 1)
    else onNavigate('diet-preferences')
  }

  return (
    <div
      className="screen"
      style={{ background: 'var(--color-bg)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}
    >
      {/* Progress — a widening pill for the step you're on, like the app's
          other step indicators. */}
      <div style={{ padding: '28px 24px', display: 'flex', justifyContent: 'center', gap: '6px' }}>
        {STEPS.map((_, idx) => (
          <div
            key={idx}
            style={{
              width: idx === currentStep ? '20px' : '6px',
              height: '6px',
              borderRadius: '3px',
              background: idx === currentStep ? 'var(--color-primary)' : 'var(--color-border)',
              transition: 'all 0.3s ease',
            }}
          />
        ))}
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 24px', textAlign: 'center' }}>
        <div style={{ fontSize: '76px', marginBottom: '28px' }}>{step.icon}</div>

        <h1 style={{ fontSize: '28px', fontWeight: '700', letterSpacing: '-0.02em', color: 'var(--color-text)', margin: 0, lineHeight: 1.2 }}>
          {step.title}
        </h1>

        <p style={{ fontSize: '15px', color: 'var(--color-text-secondary)', lineHeight: 1.6, margin: '14px 0 0', maxWidth: '280px' }}>
          {step.description}
        </p>
      </div>

      <div style={{ padding: '24px' }}>
        <button
          onClick={handleNext}
          style={{
            width: '100%', padding: '16px',
            background: 'var(--color-primary)', color: '#fff',
            border: 'none', borderRadius: '14px',
            fontSize: '16px', fontWeight: '700', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
            fontFamily: 'inherit',
          }}
        >
          {isLast ? <><Sparkles size={18} /> Get started</> : <>Next <ChevronRight size={18} /></>}
        </button>

        {!isLast && (
          <button
            onClick={() => {
              localStorage.setItem('onboardingCompleted', 'true')
              onNavigate('home')
            }}
            style={{
              width: '100%', padding: '13px', marginTop: '10px',
              background: 'transparent', color: 'var(--color-text-muted)',
              border: 'none', fontSize: '14px', fontWeight: '600',
              cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            Skip
          </button>
        )}
      </div>
    </div>
  )
}
